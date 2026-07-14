export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guards';
import type { CotConfigurationType } from '@/lib/cots';
import { createCotPayloadFromBunkCount, sortCotsByBunkLabel } from '@/lib/cots';
import { createServiceClient } from '@/lib/supabase/server';

function getCotConfigurationType(body: unknown): CotConfigurationType | null {
  if (!body || typeof body !== 'object') return null;
  const value = (body as { cot_configuration_type?: unknown }).cot_configuration_type;
  return value === 'bunker' || value === 'normal' ? value : null;
}

async function getOwnedRoom(
  supabase: ReturnType<typeof createServiceClient>,
  roomId: string,
  ownerId: string,
) {
  const { data: room, error } = await supabase
    .from('rooms')
    .select('id, room_type_id, building_id')
    .eq('id', roomId)
    .maybeSingle();

  if (error) {
    return { error: NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 }) };
  }
  if (!room) {
    return { error: NextResponse.json({ error: 'Room not found' }, { status: 404 }) };
  }

  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('owner_id')
    .eq('id', room.building_id)
    .maybeSingle();

  if (buildingError) {
    return { error: NextResponse.json({ error: 'Failed to verify building ownership' }, { status: 500 }) };
  }
  if (!building || building.owner_id !== ownerId) {
    return { error: NextResponse.json({ error: 'Room not found' }, { status: 404 }) };
  }

  const { data: roomType, error: roomTypeError } = await supabase
    .from('room_types')
    .select('cot_count')
    .eq('id', room.room_type_id)
    .maybeSingle();

  if (roomTypeError) {
    return { error: NextResponse.json({ error: 'Failed to fetch room type' }, { status: 500 }) };
  }

  return { room: { ...room, room_type: roomType } };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const { id: roomId } = await context.params;
  const supabase = createServiceClient();
  const ownerId = authResult.session.id;

  const owned = await getOwnedRoom(supabase, roomId, ownerId);
  if (owned.error) return owned.error;

  const { data: cots, error: cotsError } = await supabase
    .from('cots')
    .select('id, room_id, cot_id_label, cot_type, hosteler_id, created_at, updated_at')
    .eq('room_id', roomId)
    .order('cot_id_label', { ascending: true });

  if (cotsError) {
    return NextResponse.json({ error: 'Failed to fetch cots' }, { status: 500 });
  }

  const orderedCots = sortCotsByBunkLabel(cots ?? []);

  return NextResponse.json({
    cots: orderedCots.map((cot) => ({
      ...cot,
      occupancy_status: cot.hosteler_id ? 'occupied' : 'free',
    })),
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const { id: roomId } = await context.params;
  const supabase = createServiceClient();
  const ownerId = authResult.session.id;

  const owned = await getOwnedRoom(supabase, roomId, ownerId);
  if (owned.error) return owned.error;

  const { data: existing, error: existingError } = await supabase
    .from('cots')
    .select('id')
    .eq('room_id', roomId)
    .limit(1);

  if (existingError) {
    return NextResponse.json({ error: 'Failed to check existing cots' }, { status: 500 });
  }

  if ((existing ?? []).length > 0) {
    return NextResponse.json({ error: 'Cots already configured for this room' }, { status: 400 });
  }

  let cotConfigurationType: CotConfigurationType;
  try {
    const body = await request.json();
    const value = getCotConfigurationType(body);

    if (!value) {
      return NextResponse.json(
        { error: 'cot_configuration_type is required and must be bunker or normal' },
        { status: 400 },
      );
    }

    cotConfigurationType = value;
  } catch {
    return NextResponse.json(
      { error: 'cot_configuration_type is required and must be bunker or normal' },
      { status: 400 },
    );
  }

  // room_types.cot_count is the number of configured cot indexes for a room type.
  const bunkCount = Number(owned.room.room_type?.cot_count ?? 0);
  if (!Number.isInteger(bunkCount) || bunkCount <= 0) {
    return NextResponse.json({ error: 'Invalid bunk count on room type' }, { status: 400 });
  }

  const payload = createCotPayloadFromBunkCount(roomId, bunkCount, cotConfigurationType);
  const { data: created, error: createError } = await supabase
    .from('cots')
    .insert(payload)
    .select('*');

  if (createError) {
    return NextResponse.json({ error: 'Failed to create cots' }, { status: 500 });
  }

  return NextResponse.json({ cots: sortCotsByBunkLabel(created ?? []) }, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const { id: roomId } = await context.params;
  const supabase = createServiceClient();
  const ownerId = authResult.session.id;

  const owned = await getOwnedRoom(supabase, roomId, ownerId);
  if (owned.error) return owned.error;

  let body: { action?: string; cot_configuration_type?: CotConfigurationType };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.action !== 'reset') {
    return NextResponse.json({ error: 'action must be reset' }, { status: 400 });
  }

  const cotConfigurationType = getCotConfigurationType(body);
  if (!cotConfigurationType) {
    return NextResponse.json(
      { error: 'cot_configuration_type is required and must be bunker or normal' },
      { status: 400 },
    );
  }

  const { data: assignedCots, error: cotError } = await supabase
    .from('cots')
    .select('id, hosteler_id')
    .eq('room_id', roomId)
    .not('hosteler_id', 'is', null);

  if (cotError) {
    return NextResponse.json({ error: 'Failed to validate existing cot assignments' }, { status: 500 });
  }

  const hostelerIds = (assignedCots ?? []).map((cot) => cot.hosteler_id).filter(Boolean);
  if (hostelerIds.length > 0) {
    const { data: activeHostelers, error: activeError } = await supabase
      .from('hostelers')
      .select('id')
      .in('id', hostelerIds)
      .eq('status', 'active')
      .limit(1);

    if (activeError) {
      return NextResponse.json({ error: 'Failed to validate hosteler status' }, { status: 500 });
    }

    if ((activeHostelers ?? []).length > 0) {
      return NextResponse.json(
        { error: 'Cannot reset cots while an active hosteler is assigned to this room' },
        { status: 400 },
      );
    }
  }

  const { error: deleteError } = await supabase
    .from('cots')
    .delete()
    .eq('room_id', roomId);

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to clear existing cots for reset' }, { status: 500 });
  }

  const bunkCount = Number(owned.room.room_type?.cot_count ?? 0);
  if (!Number.isInteger(bunkCount) || bunkCount <= 0) {
    return NextResponse.json({ error: 'Invalid bunk count on room type' }, { status: 400 });
  }

  const payload = createCotPayloadFromBunkCount(roomId, bunkCount, cotConfigurationType);
  const { data: created, error: createError } = await supabase
    .from('cots')
    .insert(payload)
    .select('*');

  if (createError) {
    return NextResponse.json({ error: 'Failed to regenerate cots' }, { status: 500 });
  }

  return NextResponse.json(
    { reset: true, cots: sortCotsByBunkLabel(created ?? []) },
    { status: 200 },
  );
}
