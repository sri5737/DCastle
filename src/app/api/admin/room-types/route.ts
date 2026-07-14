export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guards';
import { createServiceClient } from '@/lib/supabase/server';

const ROOM_TYPE_NAMES = ['AC', 'non-AC'] as const;

async function handleGet(request: NextRequest) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const supabase = createServiceClient();
  const ownerId = authResult.session.id;

  const { data: roomTypes, error } = await supabase
    .from('room_types')
    .select('*')
    .eq('owner_id', ownerId)
    .order('active', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching room types:', error);
    return NextResponse.json({ error: 'Failed to fetch room types' }, { status: 500 });
  }

  return NextResponse.json({ room_types: roomTypes ?? [] });
}

async function handlePost(request: NextRequest) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const ownerId = authResult.session.id;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, sharing_capacity, cot_count, description } = body;

  // Validation
  if (typeof name !== 'string' || !ROOM_TYPE_NAMES.includes(name as (typeof ROOM_TYPE_NAMES)[number])) {
    return NextResponse.json({ error: 'Room type name must be AC or non-AC' }, { status: 400 });
  }

  if (!Number.isInteger(sharing_capacity) || sharing_capacity < 1 || sharing_capacity > 10) {
    return NextResponse.json({ error: 'Sharing capacity must be between 1 and 10' }, { status: 400 });
  }

  // cot_count represents bunk pairs; each bunk creates one lower and one upper cot.
  if (!Number.isInteger(cot_count) || cot_count <= 0 || cot_count > 10) {
    return NextResponse.json({ error: 'Bunk count must be between 1 and 10' }, { status: 400 });
  }

  if (description && (typeof description !== 'string' || description.length > 1000)) {
    return NextResponse.json({ error: 'Invalid description' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Check for uniqueness (owner_id, name, sharing_capacity)
  const { data: existing, error: checkError } = await supabase
    .from('room_types')
    .select('id, active')
    .eq('owner_id', ownerId)
    .eq('name', name)
    .eq('sharing_capacity', sharing_capacity)
    .maybeSingle();

  if (checkError) {
    console.error('Error checking room type uniqueness:', checkError);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (existing) {
    if (existing.active === false) {
      return NextResponse.json(
        {
          error:
            'Room type with this name and sharing capacity already exists but is archived. Unarchive it from Room Type Lifecycle.',
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Room type with this name and sharing capacity already exists' },
      { status: 409 }
    );
  }

  // Create room type
  const { data: roomType, error: createError } = await supabase
    .from('room_types')
    .insert({
      owner_id: ownerId,
      name,
      sharing_capacity,
      cot_count,
      active: true,
      description: description?.trim() || null,
    })
    .select('id, owner_id, name, sharing_capacity, cot_count, active, description, created_at, updated_at')
    .single();

  if (createError) {
    console.error('Error creating room type:', createError);
    return NextResponse.json({ error: 'Failed to create room type' }, { status: 500 });
  }

  return NextResponse.json({ room_type: roomType }, { status: 201 });
}

export async function GET(request: NextRequest) {
  return handleGet(request);
}

export async function POST(request: NextRequest) {
  return handlePost(request);
}
