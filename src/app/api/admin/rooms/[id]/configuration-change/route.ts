export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guards';
import { createServiceClient } from '@/lib/supabase/server';
import { compareWithTodayIST, isIsoDate } from '@/lib/utils';

type RoomClass = 'ac' | 'non_ac';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const { id: roomId } = await context.params;
  const ownerId = authResult.session.id;
  const supabase = createServiceClient();

  let body: {
    new_sharing_capacity?: number;
    new_room_class?: RoomClass;
    new_rent?: number;
    effective_date?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Number.isInteger(body.new_sharing_capacity) || (body.new_sharing_capacity ?? 0) < 1) {
    return NextResponse.json({ error: 'new_sharing_capacity must be an integer >= 1' }, { status: 400 });
  }
  if (body.new_room_class !== 'ac' && body.new_room_class !== 'non_ac') {
    return NextResponse.json({ error: 'new_room_class must be ac or non_ac' }, { status: 400 });
  }
  if (typeof body.new_rent !== 'number' || body.new_rent <= 0) {
    return NextResponse.json({ error: 'new_rent must be a positive number' }, { status: 400 });
  }
  if (!body.effective_date || !isIsoDate(body.effective_date)) {
    return NextResponse.json({ error: 'effective_date must be in YYYY-MM-DD format' }, { status: 400 });
  }
  if (compareWithTodayIST(body.effective_date) < 0) {
    return NextResponse.json({ error: 'Effective date cannot be in the past' }, { status: 400 });
  }

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, building_id, room_type_id, current_rent, building:buildings!inner(owner_id), room_type:room_types(cot_count)')
    .eq('id', roomId)
    .maybeSingle();

  if (roomError) {
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 });
  }
  const building = Array.isArray(room?.building) ? room?.building[0] : room?.building;
  const roomType = Array.isArray(room?.room_type) ? room?.room_type[0] : room?.room_type;

  if (!room || !building || building.owner_id !== ownerId) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const { data: latestEffective, error: latestError } = await supabase
    .from('room_configuration_history')
    .select('new_sharing_capacity, new_room_class, new_rent, effective_date')
    .eq('room_id', roomId)
    .lte('effective_date', body.effective_date)
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    return NextResponse.json({ error: 'Failed to resolve existing room configuration' }, { status: 500 });
  }

  const oldSharingCapacity = latestEffective?.new_sharing_capacity ?? Number(roomType?.cot_count ?? 1);
  const oldRoomClass = (latestEffective?.new_room_class ?? 'non_ac') as RoomClass;
  const oldRent = Number(latestEffective?.new_rent ?? room.current_rent);

  const { data: inserted, error: insertError } = await supabase
    .from('room_configuration_history')
    .insert({
      room_id: roomId,
      old_sharing_capacity: oldSharingCapacity,
      new_sharing_capacity: body.new_sharing_capacity,
      old_room_class: oldRoomClass,
      new_room_class: body.new_room_class,
      old_rent: oldRent,
      new_rent: body.new_rent,
      effective_date: body.effective_date,
      created_by: ownerId,
    })
    .select('*')
    .single();

  if (insertError) {
    if ((insertError.message || '').toLowerCase().includes('duplicate')) {
      return NextResponse.json(
        { error: 'A configuration change already exists for this room and effective date' },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Failed to create configuration change' }, { status: 500 });
  }

  if (compareWithTodayIST(body.effective_date) === 0) {
    await supabase
      .from('rooms')
      .update({ current_rent: body.new_rent, updated_at: new Date().toISOString() })
      .eq('id', roomId);
  }

  return NextResponse.json({ configuration_change: inserted }, { status: 201 });
}
