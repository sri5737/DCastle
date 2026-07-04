export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guards';
import { createServiceClient } from '@/lib/supabase/server';

const INVITE_EXPIRY_DAYS = 7;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  const { id } = await params;
  const supabase = createServiceClient();

  // Verify hosteler exists
  const { data: hosteler, error: fetchError } = await supabase
    .from('hostelers')
    .select('id, name, status')
    .eq('id', id)
    .single();

  if (fetchError || !hosteler) {
    return NextResponse.json({ error: 'Hosteler not found' }, { status: 404 });
  }

  if (hosteler.status === 'deleted') {
    return NextResponse.json(
      { error: 'Deleted hostelers are audit-only and cannot receive new invites' },
      { status: 400 }
    );
  }

  // Invalidate all existing unused tokens for this hosteler
  await supabase
    .from('invite_tokens')
    .update({ used: true })
    .eq('hosteler_id', id)
    .eq('used', false);

  // Generate new invite token
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error: tokenError } = await supabase
    .from('invite_tokens')
    .insert({
      hosteler_id: id,
      token,
      used: false,
      expires_at: expiresAt,
    });

  if (tokenError) {
    return NextResponse.json({ error: 'Failed to generate invite token' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const invite_url = `${appUrl}/join/${token}`;

  return NextResponse.json({
    token,
    invite_url,
    expires_at: expiresAt,
  });
}
