export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guards';
import { createServiceClient } from '@/lib/supabase/server';

async function getOwnedRoomType(
  supabase: ReturnType<typeof createServiceClient>,
  roomTypeId: string,
  ownerId: string,
) {
  const { data: roomType, error } = await supabase
    .from('room_types')
    .select('id, owner_id, name, sharing_capacity, cot_count, active, description, created_at, updated_at')
    .eq('id', roomTypeId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (error) {
    return { error: NextResponse.json({ error: 'Failed to fetch room type' }, { status: 500 }) };
  }

  if (!roomType) {
    return { error: NextResponse.json({ error: 'Room type not found' }, { status: 404 }) };
  }

  return { roomType };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const ownerId = authResult.session.id;
  const { id } = await context.params;
  const supabase = createServiceClient();

  let body: { active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'active must be a boolean' }, { status: 400 });
  }

  const owned = await getOwnedRoomType(supabase, id, ownerId);
  if (owned.error) return owned.error;

  const { data: updated, error: updateError } = await supabase
    .from('room_types')
    .update({ active: body.active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', ownerId)
    .select('id, owner_id, name, sharing_capacity, cot_count, active, description, created_at, updated_at')
    .single();

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update room type' }, { status: 500 });
  }

  return NextResponse.json({ room_type: updated });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const ownerId = authResult.session.id;
  const { id } = await context.params;
  const supabase = createServiceClient();

  const owned = await getOwnedRoomType(supabase, id, ownerId);
  if (owned.error) return owned.error;

  const { data: references, error: referenceError } = await supabase
    .from('rooms')
    .select('id')
    .eq('room_type_id', id);

  if (referenceError) {
    return NextResponse.json({ error: 'Failed to validate room type references' }, { status: 500 });
  }

  const usageCount = (references ?? []).length;
  if (usageCount > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete room type because it is currently used by ${usageCount} room(s).`,
        usage_count: usageCount,
        archive_guidance: 'Archive this room type instead to keep existing room assignments.',
      },
      { status: 400 },
    );
  }

  const { error: deleteError } = await supabase
    .from('room_types')
    .delete()
    .eq('id', id)
    .eq('owner_id', ownerId);

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete room type' }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}