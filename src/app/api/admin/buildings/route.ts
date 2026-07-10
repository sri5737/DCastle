export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guards';
import { createServiceClient } from '@/lib/supabase/server';
import type { Building } from '@/types';

async function handleGet(request: NextRequest) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const supabase = createServiceClient();
  const ownerId = authResult.ownerId;

  // Fetch buildings with nested rooms and cots
  const { data: buildings, error: buildingError } = await supabase
    .from('buildings')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (buildingError) {
    console.error('Error fetching buildings:', buildingError);
    return NextResponse.json({ error: 'Failed to fetch buildings' }, { status: 500 });
  }

  if (!buildings) {
    return NextResponse.json({ buildings: [] });
  }

  // Fetch rooms and cots for all buildings
  const buildingIds = buildings.map((b) => b.id);
  if (buildingIds.length === 0) {
    return NextResponse.json({ buildings: buildings.map((b) => ({ ...b, rooms: [] })) });
  }

  const { data: rooms, error: roomError } = await supabase
    .from('rooms')
    .select('*, room_types(*)')
    .in('building_id', buildingIds);

  if (roomError) {
    console.error('Error fetching rooms:', roomError);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }

  const roomIds = (rooms ?? []).map((r) => r.id);
  const { data: cots, error: cotError } = await supabase
    .from('cots')
    .select('*')
    .in('room_id', roomIds);

  if (cotError) {
    console.error('Error fetching cots:', cotError);
    return NextResponse.json({ error: 'Failed to fetch cots' }, { status: 500 });
  }

  // Build hierarchy
  const cotsMap = new Map<string, any[]>();
  (cots ?? []).forEach((cot) => {
    if (!cotsMap.has(cot.room_id)) cotsMap.set(cot.room_id, []);
    cotsMap.get(cot.room_id)!.push(cot);
  });

  const roomsMap = new Map<string, any[]>();
  (rooms ?? []).forEach((room) => {
    room.cots = cotsMap.get(room.id) ?? [];
    if (!roomsMap.has(room.building_id)) roomsMap.set(room.building_id, []);
    roomsMap.get(room.building_id)!.push(room);
  });

  const buildingsWithHierarchy = buildings.map((b) => ({
    ...b,
    rooms: roomsMap.get(b.id) ?? [],
  }));

  return NextResponse.json({ buildings: buildingsWithHierarchy });
}

async function handlePost(request: NextRequest) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const ownerId = authResult.ownerId;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, description } = body;

  // Validation
  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 255) {
    return NextResponse.json({ error: 'Invalid building name' }, { status: 400 });
  }

  if (description && (typeof description !== 'string' || description.length > 1000)) {
    return NextResponse.json({ error: 'Invalid description' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Check for uniqueness (owner_id, name)
  const { data: existing, error: checkError } = await supabase
    .from('buildings')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('name', name.trim())
    .maybeSingle();

  if (checkError) {
    console.error('Error checking building uniqueness:', checkError);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json(
      { error: 'Building with this name already exists' },
      { status: 400 }
    );
  }

  // Create building
  const { data: building, error: createError } = await supabase
    .from('buildings')
    .insert({
      owner_id: ownerId,
      name: name.trim(),
      description: description?.trim() || null,
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating building:', createError);
    return NextResponse.json({ error: 'Failed to create building' }, { status: 500 });
  }

  const responseBuilding: Building = {
    ...building,
    rooms: [],
  };

  return NextResponse.json({ building: responseBuilding }, { status: 201 });
}

export async function GET(request: NextRequest) {
  return handleGet(request);
}

export async function POST(request: NextRequest) {
  return handlePost(request);
}
