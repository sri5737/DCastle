export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guards';
import { createServiceClient } from '@/lib/supabase/server';
import { withApiDiagnostic } from '@/lib/diagnostics/events';

const UNASSIGNED_ROOM_NUMBER = 'UNASSIGNED';

type AssignmentBody = {
  hosteler_id?: string;
  building_id?: string;
  room_id?: string;
  cot_id?: string;
};

type HostelerRow = {
  id: string;
  status: 'pending' | 'active' | 'inactive' | 'deleted';
  building_id: string | null;
  room_id: string | null;
  cot_id: string | null;
};

async function fetchHosteler(supabase: ReturnType<typeof createServiceClient>, hostelerId: string) {
  const { data: hosteler, error } = await supabase
    .from('hostelers')
    .select('id, status, building_id, room_id, cot_id')
    .eq('id', hostelerId)
    .maybeSingle();

  if (error) {
    return { error: NextResponse.json({ error: 'Failed to fetch hosteler' }, { status: 500 }) };
  }

  if (!hosteler) {
    return { error: NextResponse.json({ error: 'Hosteler not found' }, { status: 404 }) };
  }

  return { hosteler: hosteler as HostelerRow };
}

async function handleAssign(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwner();
  if ('response' in auth) return auth.response;

  const { id: hostelerId } = await context.params;

  let body: AssignmentBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.hosteler_id && body.hosteler_id !== hostelerId) {
    return NextResponse.json(
      { error: 'hosteler_id in payload must match route id' },
      { status: 400 },
    );
  }

  const buildingId = body.building_id?.trim();
  const roomId = body.room_id?.trim();
  const cotId = body.cot_id?.trim();

  if (!buildingId || !roomId || !cotId) {
    return NextResponse.json(
      { error: 'building_id, room_id, and cot_id are required' },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  const hostelerResult = await fetchHosteler(supabase, hostelerId);
  if (hostelerResult.error) return hostelerResult.error;
  const hosteler = hostelerResult.hosteler;

  if (hosteler.status !== 'active' && hosteler.status !== 'pending') {
    return NextResponse.json(
      { error: 'Only pending or active hostelers can be assigned accommodation' },
      { status: 400 },
    );
  }

  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id, owner_id')
    .eq('id', buildingId)
    .maybeSingle();

  if (buildingError) {
    return NextResponse.json({ error: 'Failed to verify building' }, { status: 500 });
  }

  if (!building || building.owner_id !== auth.session.id) {
    return NextResponse.json({ error: 'Building not found' }, { status: 404 });
  }

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, building_id, room_number')
    .eq('id', roomId)
    .eq('building_id', buildingId)
    .maybeSingle();

  if (roomError) {
    return NextResponse.json({ error: 'Failed to verify room' }, { status: 500 });
  }

  if (!room) {
    return NextResponse.json({ error: 'Room not found in this building' }, { status: 404 });
  }

  const { data: targetCot, error: targetCotError } = await supabase
    .from('cots')
    .select('id, room_id, hosteler_id')
    .eq('id', cotId)
    .eq('room_id', roomId)
    .maybeSingle();

  if (targetCotError) {
    return NextResponse.json({ error: 'Failed to verify cot' }, { status: 500 });
  }

  if (!targetCot) {
    return NextResponse.json({ error: 'Cot not found in this room' }, { status: 404 });
  }

  if (targetCot.hosteler_id && targetCot.hosteler_id !== hostelerId) {
    return NextResponse.json(
      { error: 'Selected cot is already occupied' },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const previousCotId = hosteler.cot_id;
  const alreadyAssignedToTarget = previousCotId === cotId;

  if (!alreadyAssignedToTarget && !targetCot.hosteler_id) {
    const { data: claimedCot, error: claimError } = await supabase
      .from('cots')
      .update({ hosteler_id: hostelerId, updated_at: now })
      .eq('id', cotId)
      .is('hosteler_id', null)
      .select('id')
      .maybeSingle();

    if (claimError) {
      return NextResponse.json({ error: 'Failed to assign target cot' }, { status: 500 });
    }

    if (!claimedCot) {
      return NextResponse.json(
        { error: 'Selected cot is already occupied' },
        { status: 409 },
      );
    }
  }

  const { error: hostelerUpdateError } = await supabase
    .from('hostelers')
    .update({
      building_id: buildingId,
      room_id: roomId,
      cot_id: cotId,
      room_number: room.room_number,
      updated_at: now,
    })
    .eq('id', hostelerId);

  if (hostelerUpdateError) {
    if (!alreadyAssignedToTarget) {
      await supabase
        .from('cots')
        .update({ hosteler_id: null, updated_at: now })
        .eq('id', cotId)
        .eq('hosteler_id', hostelerId);
    }

    return NextResponse.json({ error: 'Failed to update hosteler assignment' }, { status: 500 });
  }

  if (previousCotId && previousCotId !== cotId) {
    const { error: releaseError } = await supabase
      .from('cots')
      .update({ hosteler_id: null, updated_at: now })
      .eq('id', previousCotId)
      .eq('hosteler_id', hostelerId);

    if (releaseError) {
      // Best effort rollback to keep old/new assignment coherent.
      await supabase
        .from('hostelers')
        .update({
          building_id: hosteler.building_id,
          room_id: hosteler.room_id,
          cot_id: hosteler.cot_id,
          room_number: UNASSIGNED_ROOM_NUMBER,
          updated_at: now,
        })
        .eq('id', hostelerId);

      await supabase
        .from('cots')
        .update({ hosteler_id: null, updated_at: now })
        .eq('id', cotId)
        .eq('hosteler_id', hostelerId);

      await supabase
        .from('cots')
        .update({ hosteler_id: hostelerId, updated_at: now })
        .eq('id', previousCotId);

      return NextResponse.json({ error: 'Failed to release previous cot' }, { status: 500 });
    }
  }

  return NextResponse.json({
    assigned: true,
    hosteler: {
      id: hostelerId,
      building_id: buildingId,
      room_id: roomId,
      cot_id: cotId,
      room_number: room.room_number,
    },
  });
}

async function handleUnassign(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireOwner();
  if ('response' in auth) return auth.response;

  const { id: hostelerId } = await context.params;
  const supabase = createServiceClient();

  const hostelerResult = await fetchHosteler(supabase, hostelerId);
  if (hostelerResult.error) return hostelerResult.error;
  const hosteler = hostelerResult.hosteler;

  if (!hosteler.cot_id) {
    const { error: hostelerUpdateError } = await supabase
      .from('hostelers')
      .update({
        building_id: null,
        room_id: null,
        cot_id: null,
        room_number: UNASSIGNED_ROOM_NUMBER,
        updated_at: new Date().toISOString(),
      })
      .eq('id', hostelerId);

    if (hostelerUpdateError) {
      return NextResponse.json({ error: 'Failed to unassign hosteler' }, { status: 500 });
    }

    return NextResponse.json({
      unassigned: true,
      hosteler: {
        id: hostelerId,
        building_id: null,
        room_id: null,
        cot_id: null,
        room_number: UNASSIGNED_ROOM_NUMBER,
      },
    });
  }

  const now = new Date().toISOString();

  const { error: releaseError } = await supabase
    .from('cots')
    .update({ hosteler_id: null, updated_at: now })
    .eq('id', hosteler.cot_id)
    .eq('hosteler_id', hostelerId);

  if (releaseError) {
    return NextResponse.json({ error: 'Failed to release cot assignment' }, { status: 500 });
  }

  const { error: hostelerUpdateError } = await supabase
    .from('hostelers')
    .update({
      building_id: null,
      room_id: null,
      cot_id: null,
      room_number: UNASSIGNED_ROOM_NUMBER,
      updated_at: now,
    })
    .eq('id', hostelerId);

  if (hostelerUpdateError) {
    await supabase
      .from('cots')
      .update({ hosteler_id: hostelerId, updated_at: now })
      .eq('id', hosteler.cot_id);

    return NextResponse.json({ error: 'Failed to unassign hosteler' }, { status: 500 });
  }

  return NextResponse.json({
    unassigned: true,
    hosteler: {
      id: hostelerId,
      building_id: null,
      room_id: null,
      cot_id: null,
      room_number: UNASSIGNED_ROOM_NUMBER,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return withApiDiagnostic(
    {
      route: '/api/admin/hostelers/[id]/accommodation',
      method: 'PATCH',
      action: 'hosteler.accommodation.assign',
    },
    () => handleAssign(request, context),
  );
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return withApiDiagnostic(
    {
      route: '/api/admin/hostelers/[id]/accommodation',
      method: 'DELETE',
      action: 'hosteler.accommodation.unassign',
    },
    () => handleUnassign(request, context),
  );
}
