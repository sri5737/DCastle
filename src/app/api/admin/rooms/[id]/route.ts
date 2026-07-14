export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guards';
import { sortCotsByBunkLabel } from '@/lib/cots';
import { createServiceClient } from '@/lib/supabase/server';
import { getTodayIST } from '@/lib/utils';
import type { Floor } from '@/types';

const VALID_FLOORS: Floor[] = ['ground', 'first', 'second', null];
const VALID_ROOM_CLASS = ['AC', 'non-AC'] as const;

async function getOwnedRoom(
  supabase: ReturnType<typeof createServiceClient>,
  roomId: string,
  ownerId: string,
) {
  const { data: room, error } = await supabase
    .from('rooms')
    .select('*, buildings!inner(id, owner_id), room_types(*)')
    .eq('id', roomId)
    .maybeSingle();

  if (error) {
    return { error: NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 }) };
  }

  if (!room || room.buildings.owner_id !== ownerId) {
    return { error: NextResponse.json({ error: 'Room not found' }, { status: 404 }) };
  }

  return { room };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const { id } = await context.params;
  const ownerId = authResult.session.id;
  const supabase = createServiceClient();

  const owned = await getOwnedRoom(supabase, id, ownerId);
  if (owned.error) return owned.error;

  const { data: cots, error: cotsError } = await supabase
    .from('cots')
    .select('*')
    .eq('room_id', id)
    .order('created_at', { ascending: true });

  if (cotsError) {
    return NextResponse.json({ error: 'Failed to fetch cots' }, { status: 500 });
  }

  const today = getTodayIST();
  const { data: pendingChange, error: pendingError } = await supabase
    .from('room_configuration_history')
    .select('new_sharing_capacity, new_room_class, new_rent, effective_date')
    .eq('room_id', id)
    .gt('effective_date', today)
    .order('effective_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (pendingError) {
    return NextResponse.json({ error: 'Failed to fetch pending configuration' }, { status: 500 });
  }

  return NextResponse.json({
    room: {
      ...owned.room,
      cots: sortCotsByBunkLabel(cots ?? []),
      pending_change: pendingChange
        ? {
            new_sharing_capacity: pendingChange.new_sharing_capacity,
            new_room_class: pendingChange.new_room_class,
            new_rent: pendingChange.new_rent,
            effective_date: pendingChange.effective_date,
          }
        : null,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const { id } = await context.params;
  const ownerId = authResult.session.id;
  const supabase = createServiceClient();

  const owned = await getOwnedRoom(supabase, id, ownerId);
  if (owned.error) return owned.error;

  let body: {
    room_number?: string;
    floor?: Floor;
    room_type_id?: string;
    current_rent?: number;
    cot_count?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.room_number !== undefined) {
    const roomNumber = body.room_number.trim();
    if (!roomNumber || roomNumber.length > 50) {
      return NextResponse.json({ error: 'Invalid room number' }, { status: 400 });
    }

    const { data: duplicate, error: duplicateError } = await supabase
      .from('rooms')
      .select('id')
      .eq('building_id', owned.room.building_id)
      .eq('room_number', roomNumber)
      .neq('id', id)
      .maybeSingle();

    if (duplicateError) {
      return NextResponse.json({ error: 'Failed to validate room number' }, { status: 500 });
    }
    if (duplicate) {
      return NextResponse.json(
        { error: 'Room with this number already exists in this building' },
        { status: 400 },
      );
    }

    updates.room_number = roomNumber;
  }

  if (body.floor !== undefined) {
    if (!VALID_FLOORS.includes(body.floor ?? null)) {
      return NextResponse.json({ error: 'Invalid floor value' }, { status: 400 });
    }
    updates.floor = body.floor ?? null;
  }

  if (body.current_rent !== undefined) {
    if (typeof body.current_rent !== 'number' || body.current_rent <= 0) {
      return NextResponse.json({ error: 'Current rent must be a positive number' }, { status: 400 });
    }
    updates.current_rent = body.current_rent;
  }

  if (body.room_type_id !== undefined) {
    const { data: roomType, error: roomTypeError } = await supabase
      .from('room_types')
      .select('id, active')
      .eq('id', body.room_type_id)
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (roomTypeError) {
      return NextResponse.json({ error: 'Failed to validate room type' }, { status: 500 });
    }
    if (!roomType) {
      return NextResponse.json({ error: 'Room type not found' }, { status: 404 });
    }
    if (roomType.active === false) {
      return NextResponse.json({ error: 'Inactive room type cannot be assigned to rooms' }, { status: 400 });
    }

    updates.room_type_id = body.room_type_id;
  }

  if (body.cot_count !== undefined) {
    if (!Number.isInteger(body.cot_count) || body.cot_count < 1 || body.cot_count > 10) {
      return NextResponse.json({ error: 'cot_count must be an integer between 1 and 10' }, { status: 400 });
    }

    const currentRoomType = owned.room.room_types as {
      id: string;
      name: string;
      sharing_capacity: number;
      cot_count: number;
      active: boolean;
    } | null;

    if (!currentRoomType) {
      return NextResponse.json({ error: 'Room has no associated room type' }, { status: 400 });
    }

    if (currentRoomType.cot_count !== body.cot_count) {
      // The unique constraint is (owner_id, name, sharing_capacity), so we update
      // cot_count in-place on the existing template rather than creating a new row.
      const { error: updateRoomTypeError } = await supabase
        .from('room_types')
        .update({ cot_count: body.cot_count, updated_at: new Date().toISOString() })
        .eq('id', currentRoomType.id)
        .eq('owner_id', ownerId);

      if (updateRoomTypeError) {
        return NextResponse.json({ error: 'Failed to update cot count on room type' }, { status: 500 });
      }
    }
  }

  if (Object.keys(updates).length === 0 && body.cot_count === undefined) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // If only cot_count was submitted (template updated in-place above), return success without
  // touching the rooms row.
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ updated: true });
  }

  const { data: updated, error: updateError } = await supabase
    .from('rooms')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, room_types(*)')
    .single();

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }

  return NextResponse.json({ room: updated });
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

  const owned = await getOwnedRoom(supabase, id, ownerId);
  if (owned.error) return owned.error;

  const { data: assignedCots, error: cotError } = await supabase
    .from('cots')
    .select('id, hosteler_id')
    .eq('room_id', id)
    .not('hosteler_id', 'is', null);

  if (cotError) {
    return NextResponse.json({ error: 'Failed to check cot assignment' }, { status: 500 });
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
        { error: 'Cannot delete room with cots assigned to active hostelers' },
        { status: 400 },
      );
    }
  }

  const { error: deleteError } = await supabase
    .from('rooms')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
