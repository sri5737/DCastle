export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guards';
import { sortCotsByBunkLabel } from '@/lib/cots';
import { createServiceClient } from '@/lib/supabase/server';

async function getBuildingHierarchy(supabase: ReturnType<typeof createServiceClient>, ownerId: string, buildingId: string) {
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', buildingId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (buildingError) {
    return { error: NextResponse.json({ error: 'Failed to fetch building' }, { status: 500 }) };
  }
  if (!building) {
    return { error: NextResponse.json({ error: 'Building not found' }, { status: 404 }) };
  }

  const { data: rooms, error: roomError } = await supabase
    .from('rooms')
    .select('*, room_types(*)')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: true });

  if (roomError) {
    return { error: NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 }) };
  }

  const roomIds = (rooms ?? []).map((room) => room.id);
  type CotRow = Record<string, unknown> & { room_id: string; cot_id_label: string };
  let cots: CotRow[] = [];

  if (roomIds.length > 0) {
    const { data: cotRows, error: cotError } = await supabase
      .from('cots')
      .select('*')
      .in('room_id', roomIds)
      .order('created_at', { ascending: true });

    if (cotError) {
      return { error: NextResponse.json({ error: 'Failed to fetch cots' }, { status: 500 }) };
    }
    cots = (cotRows ?? []) as CotRow[];
  }

  const cotsByRoom = new Map<string, CotRow[]>();
  for (const cot of cots) {
    const roomId = cot.room_id;
    const existing = cotsByRoom.get(roomId) ?? [];
    existing.push(cot);
    cotsByRoom.set(roomId, existing);
  }

  const hierarchyRooms = (rooms ?? []).map((room) => ({
    ...room,
    cots: sortCotsByBunkLabel(cotsByRoom.get(room.id) ?? []),
  }));

  return {
    data: {
      ...building,
      rooms: hierarchyRooms,
    },
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const { id } = await context.params;
  const supabase = createServiceClient();
  const ownerId = authResult.session.id;

  const result = await getBuildingHierarchy(supabase, ownerId, id);
  if (result.error) return result.error;

  return NextResponse.json({ building: result.data });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const { id } = await context.params;
  const ownerId = authResult.session.id;

  let body: { name?: string; description?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const nextName = body.name?.trim();
  if (nextName !== undefined && (nextName.length < 1 || nextName.length > 255)) {
    return NextResponse.json({ error: 'Invalid building name' }, { status: 400 });
  }
  if (body.description !== undefined && body.description !== null && typeof body.description !== 'string') {
    return NextResponse.json({ error: 'Invalid description' }, { status: 400 });
  }

  if (nextName === undefined && body.description === undefined) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: building, error: fetchError } = await supabase
    .from('buildings')
    .select('id, owner_id, name')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch building' }, { status: 500 });
  }
  if (!building || building.owner_id !== ownerId) {
    return NextResponse.json({ error: 'Building not found' }, { status: 404 });
  }

  if (nextName && nextName !== building.name) {
    const { data: duplicate, error: duplicateError } = await supabase
      .from('buildings')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('name', nextName)
      .neq('id', id)
      .maybeSingle();

    if (duplicateError) {
      return NextResponse.json({ error: 'Failed to validate building name' }, { status: 500 });
    }
    if (duplicate) {
      return NextResponse.json({ error: 'Building with this name already exists' }, { status: 400 });
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('buildings')
    .update({
      ...(nextName !== undefined ? { name: nextName } : {}),
      ...(body.description !== undefined ? { description: body.description?.trim() || null } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update building' }, { status: 500 });
  }

  return NextResponse.json({ building: updated });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const { id } = await context.params;
  const ownerId = authResult.session.id;
  const supabase = createServiceClient();

  const { data: building, error: fetchError } = await supabase
    .from('buildings')
    .select('id, owner_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch building' }, { status: 500 });
  }
  if (!building || building.owner_id !== ownerId) {
    return NextResponse.json({ error: 'Building not found' }, { status: 404 });
  }

  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id')
    .eq('building_id', id);

  if (roomsError) {
    return NextResponse.json({ error: 'Failed to validate rooms' }, { status: 500 });
  }

  const roomIds = (rooms ?? []).map((room) => room.id);
  if (roomIds.length > 0) {
    const { data: occupiedCots, error: cotError } = await supabase
      .from('cots')
      .select('id')
      .in('room_id', roomIds)
      .not('hosteler_id', 'is', null)
      .limit(1);

    if (cotError) {
      return NextResponse.json({ error: 'Failed to validate room occupancy' }, { status: 500 });
    }

    if ((occupiedCots ?? []).length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete building with active room assignments' },
        { status: 400 },
      );
    }
  }

  const { error: deleteError } = await supabase
    .from('buildings')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete building' }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
