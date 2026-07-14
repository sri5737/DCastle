export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guards';
import { createServiceClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const { id: cotId } = await context.params;
  const ownerId = authResult.session.id;
  const supabase = createServiceClient();

  let body: { hosteler_id?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.hosteler_id !== undefined && body.hosteler_id !== null && typeof body.hosteler_id !== 'string') {
    return NextResponse.json({ error: 'Invalid hosteler_id' }, { status: 400 });
  }

  const { data: cot, error: cotError } = await supabase
    .from('cots')
    .select('id, room_id, hosteler_id')
    .eq('id', cotId)
    .maybeSingle();

  if (cotError) {
    return NextResponse.json({ error: 'Failed to fetch cot' }, { status: 500 });
  }
  if (!cot) {
    return NextResponse.json({ error: 'Cot not found' }, { status: 404 });
  }

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, building_id')
    .eq('id', cot.room_id)
    .maybeSingle();

  if (roomError) {
    return NextResponse.json({ error: 'Failed to fetch room for cot' }, { status: 500 });
  }

  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('owner_id')
    .eq('id', room?.building_id)
    .maybeSingle();

  if (buildingError) {
    return NextResponse.json({ error: 'Failed to verify building ownership' }, { status: 500 });
  }

  if (!cot || !room || !building || building.owner_id !== ownerId) {
    return NextResponse.json({ error: 'Cot not found' }, { status: 404 });
  }

  const nextHostelerId = body.hosteler_id ?? null;

  if (nextHostelerId) {
    const { data: hosteler, error: hostelerError } = await supabase
      .from('hostelers')
      .select('id, status')
      .eq('id', nextHostelerId)
      .maybeSingle();

    if (hostelerError) {
      return NextResponse.json({ error: 'Failed to verify hosteler' }, { status: 500 });
    }
    if (!hosteler) {
      return NextResponse.json({ error: 'Hosteler not found' }, { status: 404 });
    }
    if (hosteler.status !== 'active') {
      return NextResponse.json({ error: 'Only active hostelers can be assigned to cots' }, { status: 400 });
    }

    const { data: occupiedElsewhere, error: occupiedError } = await supabase
      .from('cots')
      .select('id')
      .eq('hosteler_id', nextHostelerId)
      .neq('id', cotId)
      .limit(1);

    if (occupiedError) {
      return NextResponse.json({ error: 'Failed to verify cot assignment' }, { status: 500 });
    }
    if ((occupiedElsewhere ?? []).length > 0) {
      return NextResponse.json({ error: 'Hosteler is already assigned to another cot' }, { status: 400 });
    }
  }

  const { data: updatedCot, error: updateError } = await supabase
    .from('cots')
    .update({ hosteler_id: nextHostelerId, updated_at: new Date().toISOString() })
    .eq('id', cotId)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update cot assignment' }, { status: 500 });
  }

  if (cot.hosteler_id && cot.hosteler_id !== nextHostelerId) {
    await supabase
      .from('hostelers')
      .update({ cot_id: null, updated_at: new Date().toISOString() })
      .eq('id', cot.hosteler_id);
  }

  if (nextHostelerId) {
    await supabase
      .from('hostelers')
      .update({ cot_id: cotId, room_id: cot.room_id, building_id: room.building_id, updated_at: new Date().toISOString() })
      .eq('id', nextHostelerId);
  }

  return NextResponse.json({ cot: updatedCot });
}
