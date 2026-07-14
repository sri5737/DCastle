export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guards';
import type { CotConfigurationType } from '@/lib/cots';
import { createCotPayloadFromBunkCount, sortCotsByBunkLabel } from '@/lib/cots';
import { createServiceClient } from '@/lib/supabase/server';
import type { Floor } from '@/types';

const VALID_FLOORS: Floor[] = ['ground', 'first', 'second', null];
const VALID_ROOM_CLASS = ['AC', 'non-AC'] as const;
const UNRESOLVED_GLOBAL_RENT_PLACEHOLDER = 1;

function getCotConfigurationType(value: unknown): CotConfigurationType | null {
  if (value === 'bunker' || value === 'normal') return value;
  return null;
}

async function resolveOrCreateActiveRoomType(
  supabase: ReturnType<typeof createServiceClient>,
  ownerId: string,
  body: {
    room_type_id?: string;
    room_class?: string;
    sharing_capacity?: number;
    cot_count?: number;
  },
) {
  if (body.room_type_id) {
    const { data: roomType, error: roomTypeError } = await supabase
      .from('room_types')
      .select('id, active, cot_count')
      .eq('id', body.room_type_id)
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (roomTypeError) {
      return { error: NextResponse.json({ error: 'Failed to verify room type' }, { status: 500 }) };
    }
    if (!roomType) {
      return { error: NextResponse.json({ error: 'Room type not found' }, { status: 404 }) };
    }
    if (roomType.active === false) {
      return {
        error: NextResponse.json(
          { error: 'Inactive room type cannot be assigned to rooms' },
          { status: 400 },
        ),
      };
    }

    return {
      roomType,
      roomTypeResolution: 'existing' as const,
    };
  }

  if (
    typeof body.room_class !== 'string' ||
    !VALID_ROOM_CLASS.includes(body.room_class as (typeof VALID_ROOM_CLASS)[number])
  ) {
    return { error: NextResponse.json({ error: 'Room class must be AC or non-AC' }, { status: 400 }) };
  }

  if (
    !Number.isInteger(body.sharing_capacity) ||
    Number(body.sharing_capacity) < 1 ||
    Number(body.sharing_capacity) > 10
  ) {
    return {
      error: NextResponse.json(
        { error: 'Sharing capacity must be between 1 and 10' },
        { status: 400 },
      ),
    };
  }

  if (!Number.isInteger(body.cot_count) || Number(body.cot_count) < 1 || Number(body.cot_count) > 10) {
    return {
      error: NextResponse.json(
        { error: 'Cot count must be between 1 and 10' },
        { status: 400 },
      ),
    };
  }

  const { data: existing, error: existingError } = await supabase
    .from('room_types')
    .select('id, active, cot_count')
    .eq('owner_id', ownerId)
    .eq('name', body.room_class)
    .eq('sharing_capacity', body.sharing_capacity)
    .eq('active', true)
    .maybeSingle();

  if (existingError) {
    return { error: NextResponse.json({ error: 'Failed to resolve room template' }, { status: 500 }) };
  }

  if (existing) {
    return {
      roomType: existing,
      roomTypeResolution: 'resolved' as const,
    };
  }

  const { data: created, error: createRoomTypeError } = await supabase
    .from('room_types')
    .insert({
      owner_id: ownerId,
      name: body.room_class,
      sharing_capacity: body.sharing_capacity,
      cot_count: body.cot_count,
      active: true,
      description: null,
    })
    .select('id, active, cot_count')
    .single();

  if (createRoomTypeError) {
    const { data: racedExisting, error: raceLookupError } = await supabase
      .from('room_types')
      .select('id, active, cot_count')
      .eq('owner_id', ownerId)
      .eq('name', body.room_class)
      .eq('sharing_capacity', body.sharing_capacity)
      .eq('active', true)
      .maybeSingle();

    if (raceLookupError || !racedExisting) {
      return { error: NextResponse.json({ error: 'Failed to create room template' }, { status: 500 }) };
    }

    return {
      roomType: racedExisting,
      roomTypeResolution: 'resolved' as const,
    };
  }

  return {
    roomType: created,
    roomTypeResolution: 'created' as const,
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const { id: buildingId } = await context.params;
  const ownerId = authResult.session.id;
  const supabase = createServiceClient();

  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id')
    .eq('id', buildingId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (buildingError) {
    return NextResponse.json({ error: 'Failed to verify building' }, { status: 500 });
  }
  if (!building) {
    return NextResponse.json({ error: 'Building not found' }, { status: 404 });
  }

  const { data: rooms, error: roomError } = await supabase
    .from('rooms')
    .select('*, room_types(*)')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: true });

  if (roomError) {
    return NextResponse.json({ error: 'Failed to fetch rooms' }, { status: 500 });
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
      return NextResponse.json({ error: 'Failed to fetch cots' }, { status: 500 });
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

  const responseRooms = (rooms ?? []).map((room) => ({
    ...room,
    cots: sortCotsByBunkLabel(cotsByRoom.get(room.id) ?? []),
  }));

  return NextResponse.json({ rooms: responseRooms });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const { id: buildingId } = await context.params;
  const ownerId = authResult.session.id;

  let body: {
    room_number?: string;
    floor?: Floor;
    room_type_id?: string;
    room_class?: string;
    sharing_capacity?: number;
    cot_count?: number;
    cot_configuration_type?: CotConfigurationType;
    current_rent?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const roomNumber = body.room_number?.trim();
  if (!roomNumber || roomNumber.length > 50) {
    return NextResponse.json({ error: 'Invalid room number' }, { status: 400 });
  }
  if (body.floor !== undefined && !VALID_FLOORS.includes(body.floor ?? null)) {
    return NextResponse.json({ error: 'Invalid floor value' }, { status: 400 });
  }

  const cotConfigurationType = getCotConfigurationType(body.cot_configuration_type);
  if (!cotConfigurationType) {
    return NextResponse.json(
      { error: 'cot_configuration_type is required and must be bunker or normal' },
      { status: 400 },
    );
  }

  if (body.current_rent !== undefined && (typeof body.current_rent !== 'number' || body.current_rent <= 0)) {
    return NextResponse.json({ error: 'Current rent must be a positive number' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id')
    .eq('id', buildingId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (buildingError) {
    return NextResponse.json({ error: 'Failed to verify building' }, { status: 500 });
  }
  if (!building) {
    return NextResponse.json({ error: 'Building not found' }, { status: 404 });
  }

  const resolvedTemplate = await resolveOrCreateActiveRoomType(supabase, ownerId, body);
  if (resolvedTemplate.error) return resolvedTemplate.error;

  const rentValue =
    typeof body.current_rent === 'number' ? body.current_rent : UNRESOLVED_GLOBAL_RENT_PLACEHOLDER;

  const { data: duplicate, error: duplicateError } = await supabase
    .from('rooms')
    .select('id')
    .eq('building_id', buildingId)
    .eq('room_number', roomNumber)
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

  const { data: room, error: createError } = await supabase
    .from('rooms')
    .insert({
      building_id: buildingId,
      room_number: roomNumber,
      floor: body.floor ?? null,
      room_type_id: resolvedTemplate.roomType.id,
      current_rent: rentValue,
    })
    .select('*, room_types(*)')
    .single();

  if (createError) {
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }

  // Prefer the user-submitted cot_count for this room's cot generation.
  // The template's cot_count is a stored default but the user may submit a
  // different count when creating a room that reuses an existing template.
  const bunkCount = Number(body.cot_count ?? resolvedTemplate.roomType.cot_count ?? 0);
  if (!Number.isInteger(bunkCount) || bunkCount <= 0) {
    await supabase.from('rooms').delete().eq('id', room.id);
    return NextResponse.json({ error: 'Invalid bunk count on room template' }, { status: 400 });
  }

  const cotPayload = createCotPayloadFromBunkCount(room.id, bunkCount, cotConfigurationType);
  const { data: cots, error: cotCreateError } = await supabase.from('cots').insert(cotPayload).select('*');

  if (cotCreateError) {
    await supabase.from('rooms').delete().eq('id', room.id);
    return NextResponse.json({ error: 'Failed to create room cots' }, { status: 500 });
  }

  return NextResponse.json(
    {
      room: {
        ...room,
        cots: sortCotsByBunkLabel(cots ?? []),
      },
      room_type_resolution: resolvedTemplate.roomTypeResolution,
      rent_state:
        typeof body.current_rent === 'number' ? 'manual' : 'global_rent_managed_unresolved',
    },
    { status: 201 },
  );
}
