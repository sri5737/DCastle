export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guards';
import { createServiceClient } from '@/lib/supabase/server';
import type { DeletedFromStatus, HostelerStatus } from '@/types';

const PHONE_REGEX = /^[6-9]\d{9}$/;
const INVITE_EXPIRY_DAYS = 7;

type HostelerListRow = {
  id: string;
  name: string;
  phone: string;
  room_number: string;
  status: HostelerStatus;
  activated_at: string | null;
  deleted_at: string | null;
  deleted_from_status: DeletedFromStatus | null;
  deletion_effective_date: string | null;
  created_at: string;
};

type HostelerListResponseRow = HostelerListRow & {
  canceled_future_preference_count?: number;
};

export async function GET(request: NextRequest) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const validStatuses = ['active', 'pending', 'inactive', 'deleted'];

  let query = supabase
    .from('hostelers')
    .select(
      'id, name, phone, room_number, status, activated_at, deleted_at, deleted_from_status, deletion_effective_date, created_at'
    )
    .order('created_at', { ascending: false });

  if (status && validStatuses.includes(status)) {
    query = query.eq('status', status);
  }

  const { data: hostelers, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch hostelers' }, { status: 500 });
  }

  // Get counts
  const { data: allHostelers } = await supabase
    .from('hostelers')
    .select('status');

  const counts = {
    active: 0,
    pending: 0,
    inactive: 0,
    deleted: 0,
  };

  if (allHostelers) {
    for (const h of allHostelers) {
      if (h.status === 'active') counts.active++;
      else if (h.status === 'pending') counts.pending++;
      else if (h.status === 'inactive') counts.inactive++;
      else if (h.status === 'deleted') counts.deleted++;
    }
  }

  const hostelerRows = (hostelers ?? []) as HostelerListRow[];
  const deletedActiveIds = hostelerRows
    .filter((hosteler) => hosteler.status === 'deleted' && hosteler.deleted_from_status === 'active')
    .map((hosteler) => hosteler.id);

  const canceledCounts = new Map<string, number>();
  if (deletedActiveIds.length > 0) {
    const { data: canceledRows } = await supabase
      .from('food_preferences')
      .select('hosteler_id')
      .in('hosteler_id', deletedActiveIds)
      .not('canceled_at', 'is', null);

    for (const row of canceledRows ?? []) {
      canceledCounts.set(row.hosteler_id, (canceledCounts.get(row.hosteler_id) ?? 0) + 1);
    }
  }

  const responseHostelers: HostelerListResponseRow[] = hostelerRows.map((hosteler) => ({
    ...hosteler,
    ...(hosteler.status === 'deleted'
      ? {
          canceled_future_preference_count:
            canceledCounts.get(hosteler.id) ?? 0,
        }
      : {}),
  }));

  return NextResponse.json({ hostelers: responseHostelers, counts });
}

export async function POST(request: NextRequest) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  let body: { name?: string; phone?: string; room_number?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = body.name?.trim();
  const phone = body.phone?.trim();
  const room_number = body.room_number?.trim();

  // Validation
  if (!name || name.length < 2 || name.length > 100) {
    return NextResponse.json({ error: 'Name must be 2-100 characters' }, { status: 400 });
  }
  if (!phone || !PHONE_REGEX.test(phone)) {
    return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
  }
  if (!room_number || room_number.length < 1 || room_number.length > 10) {
    return NextResponse.json({ error: 'Room number must be 1-10 characters' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Create hosteler
  const { data: hosteler, error: hostelerError } = await supabase
    .from('hostelers')
    .insert({ name, phone, room_number, status: 'pending' })
    .select('id, name, phone, room_number, status, created_at')
    .single();

  if (hostelerError) {
    if (hostelerError.code === '23505') {
      return NextResponse.json(
        { error: 'A hosteler with this phone number already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to create hosteler' }, { status: 500 });
  }

  // Generate invite token
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error: tokenError } = await supabase
    .from('invite_tokens')
    .insert({
      hosteler_id: hosteler.id,
      token,
      used: false,
      expires_at: expiresAt,
    });

  if (tokenError) {
    return NextResponse.json({ error: 'Failed to generate invite token' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const invite_url = `${appUrl}/join/${token}`;

  return NextResponse.json(
    {
      hosteler,
      invite: {
        token,
        invite_url,
        expires_at: expiresAt,
      },
    },
    { status: 201 }
  );
}
