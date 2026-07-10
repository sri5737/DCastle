export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guards';
import { createServiceClient } from '@/lib/supabase/server';
import type { Room, Floor } from '@/types';

const VALID_FLOORS: Floor[] = ['ground', 'first', 'second', null];

async function handleGet(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const ownerId = authResult.ownerId;
  const buildingId = params.id;

  const supabase = createServiceClient();

  // Verify building belongs to owner
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id')
    .eq('id', buildingId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (buildingError) {
    console.error('Error verifying building:', buildingError);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!building) {
    return NextResponse.json({ error: 'Building not found' }, { status: 404 });
  }

  // Fetch rooms with room types and cots
  const { data: rooms, error: roomError } = await supabase
    .from('rooms')
    .select('*, room_types(*)')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false });

  if (roomError) {
    console.error('Error fetching rooms:', roomError);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }

  const roomIds = (rooms ?? []).map((r) => r.id);
  let cotsData: any[] = [];

  if (roomIds.length > 0) {
    const { data: cots, error: cotError } = await supabase
      .from('cots')
      .select('*')
      .in('room_id', roomIds);

    if (cotError) {
      console.error('Error fetching cots:', cotError);
      return NextResponse.json({ error: 'Failed to fetch cots' }, { status: 500 });
    }

    cotsData = cots ?? [];
  }

  // Build response with cots nested
  const cotsMap = new Map<string, any[]>();
  cotsData.forEach((cot) => {
    if (!cotsMap.has(cot.room_id)) cotsMap.set(cot.room_id, []);
    cotsMap.get(cot.room_id)!.push(cot);
  });

  const roomsWithCots = (rooms ?? []).map((room) => ({
    ...room,
    cots: cotsMap.get(room.id) ?? [],
  }));

  return NextResponse.json({ rooms: roomsWithCots });
}

async function handlePost(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const ownerId = authResult.ownerId;
  const buildingId = params.id;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { room_number, floor, room_type_id, current_rent } = body;

  // Validation
  if (!room_number || typeof room_number !== 'string' || room_number.trim().length === 0) {
    return NextResponse.json({ error: 'Invalid room number' }, { status: 400 });
  }

  if (room_number.length > 50) {
    return NextResponse.json({ error: 'Room number too long' }, { status: 400 });
  }

  if (floor !== undefined && floor !== null && !VALID_FLOORS.includes(floor)) {
    return NextResponse.json({ error: 'Invalid floor value' }, { status: 400 });
  }

  if (!room_type_id || typeof room_type_id !== 'string') {
    return NextResponse.json({ error: 'Invalid room type ID' }, { status: 400 });
  }

  if (typeof current_rent !== 'number' || current_rent <= 0) {
    return NextResponse.json({ error: 'Current rent must be a positive number' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify building belongs to owner
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id')
    .eq('id', buildingId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (buildingError) {
    console.error('Error verifying building:', buildingError);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!building) {
    return NextResponse.json({ error: 'Building not found' }, { status: 404 });
  }

  // Verify room_type belongs to owner
  const { data: roomType, error: roomTypeError } = await supabase
    .from('room_types')
    .select('id')
    .eq('id', room_type_id)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (roomTypeError) {
    console.error('Error verifying room type:', roomTypeError);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!roomType) {
    return NextResponse.json({ error: 'Room type not found' }, { status: 404 });
  }

  // Check for uniqueness (building_id, room_number)
  const { data: existing, error: checkError } = await supabase
    .from('rooms')
    .select('id')
    .eq('building_id', buildingId)
    .eq('room_number', room_number.trim())
    .maybeSingle();

  if (checkError) {
    console.error('Error checking room uniqueness:', checkError);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json(
      { error: 'Room with this number already exists in the building' },
      { status: 400 }
    );
  }

  // Create room
  const { data: room, error: createError } = await supabase
    .from('rooms')
    .insert({
      building_id: buildingId,
      room_number: room_number.trim(),
      floor: floor || null,
      room_type_id,
      current_rent,
    })
    .select('*')
    .single();

  if (createError) {
    console.error('Error creating room:', createError);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }

  const responseRoom: Room = {
    ...room,
    cots: [],
  };

  return NextResponse.json({ room: responseRoom }, { status: 201 });
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return handleGet(request, { params });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return handlePost(request, { params });
}
