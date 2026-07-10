export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guards';
import { createServiceClient } from '@/lib/supabase/server';
import type { RoomType } from '@/types';

async function handleGet(request: NextRequest) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const supabase = createServiceClient();
  const ownerId = authResult.ownerId;

  const { data: roomTypes, error } = await supabase
    .from('room_types')
    .select('*')
    .eq('owner_id', ownerId)
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

  const ownerId = authResult.ownerId;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, base_rent, cot_count, description } = body;

  // Validation
  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 255) {
    return NextResponse.json({ error: 'Invalid room type name' }, { status: 400 });
  }

  if (typeof base_rent !== 'number' || base_rent <= 0) {
    return NextResponse.json({ error: 'Base rent must be a positive number' }, { status: 400 });
  }

  if (typeof cot_count !== 'number' || cot_count <= 0 || cot_count > 10) {
    return NextResponse.json({ error: 'Cot count must be between 1 and 10' }, { status: 400 });
  }

  if (description && (typeof description !== 'string' || description.length > 1000)) {
    return NextResponse.json({ error: 'Invalid description' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Check for uniqueness (owner_id, name)
  const { data: existing, error: checkError } = await supabase
    .from('room_types')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('name', name.trim())
    .maybeSingle();

  if (checkError) {
    console.error('Error checking room type uniqueness:', checkError);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json(
      { error: 'Room type with this name already exists' },
      { status: 400 }
    );
  }

  // Create room type
  const { data: roomType, error: createError } = await supabase
    .from('room_types')
    .insert({
      owner_id: ownerId,
      name: name.trim(),
      base_rent,
      cot_count,
      description: description?.trim() || null,
    })
    .select()
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
