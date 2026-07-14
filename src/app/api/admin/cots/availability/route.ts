export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guards';
import { sortCotsByBunkLabel } from '@/lib/cots';
import { createServiceClient } from '@/lib/supabase/server';

async function handleGet(request: NextRequest) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const ownerId = authResult.session.id;
  const supabase = createServiceClient();

  // Fetch all buildings for owner
  const { data: buildings, error: buildingError } = await supabase
    .from('buildings')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true });

  if (buildingError) {
    console.error('Error fetching buildings:', buildingError);
    return NextResponse.json({ error: 'Failed to fetch buildings' }, { status: 500 });
  }

  if (!buildings || buildings.length === 0) {
    return NextResponse.json({ availability: [] });
  }

  const buildingIds = buildings.map((b) => b.id);

  // Fetch all rooms for owner's buildings
  const { data: rooms, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .in('building_id', buildingIds)
    .order('created_at', { ascending: true });

  if (roomError) {
    console.error('Error fetching rooms:', roomError);
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
  }

  const roomIds = (rooms ?? []).map((r) => r.id);

  // Fetch all cots for owner's rooms
  let cots: any[] = [];
  if (roomIds.length > 0) {
    const { data: cotsData, error: cotError } = await supabase
      .from('cots')
      .select('*')
      .in('room_id', roomIds)
      .order('created_at', { ascending: true });

    if (cotError) {
      console.error('Error fetching cots:', cotError);
      return NextResponse.json({ error: 'Failed to fetch cots' }, { status: 500 });
    }

    cots = cotsData ?? [];
  }

  // Build hierarchy
  const cotsMap = new Map<string, any[]>();
  cots.forEach((cot) => {
    if (!cotsMap.has(cot.room_id)) cotsMap.set(cot.room_id, []);
    cotsMap.get(cot.room_id)!.push({
      ...cot,
      occupancy_status: cot.hosteler_id ? 'occupied' : 'free',
    });
  });

  const roomsMap = new Map<string, any[]>();
  (rooms ?? []).forEach((room) => {
    const roomCots = sortCotsByBunkLabel(cotsMap.get(room.id) ?? []);
    const occupiedCount = roomCots.filter((c) => c.hosteler_id).length;
    const freeCount = roomCots.filter((c) => !c.hosteler_id).length;

    if (!roomsMap.has(room.building_id)) roomsMap.set(room.building_id, []);
    roomsMap.get(room.building_id)!.push({
      id: room.id,
      room_number: room.room_number,
      floor: room.floor,
      current_rent: room.current_rent,
      occupied_cots: occupiedCount,
      free_cots: freeCount,
      total_cots: roomCots.length,
      cots: roomCots,
    });
  });

  const availability = buildings.map((building) => ({
    id: building.id,
    name: building.name,
    rooms: roomsMap.get(building.id) ?? [],
  }));

  return NextResponse.json({ availability });
}

export async function GET(request: NextRequest) {
  return handleGet(request);
}
