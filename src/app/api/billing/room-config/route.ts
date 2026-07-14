export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guards';
import { createServiceClient } from '@/lib/supabase/server';
import { isIsoDate } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('room_id');
  const date = searchParams.get('date');

  if (!roomId) {
    return NextResponse.json({ error: 'room_id is required' }, { status: 400 });
  }
  if (!date || !isIsoDate(date)) {
    return NextResponse.json({ error: 'date must be in YYYY-MM-DD format' }, { status: 400 });
  }

  const ownerId = authResult.session.id;
  const supabase = createServiceClient();

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, current_rent, building:buildings!inner(owner_id), room_type:room_types(cot_count)')
    .eq('id', roomId)
    .maybeSingle();

  if (roomError) {
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 });
  }
  if (!room || !Array.isArray(room.building) || room.building[0].owner_id !== ownerId) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  const { data: history, error: historyError } = await supabase
    .from('room_configuration_history')
    .select('new_sharing_capacity, new_room_class, new_rent, effective_date')
    .eq('room_id', roomId)
    .lte('effective_date', date)
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (historyError) {
    return NextResponse.json({ error: 'Failed to fetch room configuration history' }, { status: 500 });
  }

  if (!history) {
    const roomTypeArray = Array.isArray(room.room_type) ? room.room_type : [room.room_type];
    const cotCount = roomTypeArray[0]?.cot_count ?? 1;
    return NextResponse.json({
      sharing_capacity: Number(cotCount),
      room_class: 'non_ac',
      rent: Number(room.current_rent),
      effective_date: null,
    });
  }

  return NextResponse.json({
    sharing_capacity: history.new_sharing_capacity,
    room_class: history.new_room_class,
    rent: Number(history.new_rent),
    effective_date: history.effective_date,
  });
}
