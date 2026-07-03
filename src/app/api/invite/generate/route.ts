export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guards';
import { createServiceClient } from '@/lib/supabase/server';

const INVITE_EXPIRY_DAYS = 7;

export async function POST(request: NextRequest) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  let body: { hosteler_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { hosteler_id } = body;
  if (!hosteler_id) {
    return NextResponse.json({ error: 'hosteler_id is required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify hosteler exists
  const { data: hosteler, error: hostelerError } = await supabase
    .from('hostelers')
    .select('id')
    .eq('id', hosteler_id)
    .single();

  if (hostelerError || !hosteler) {
    return NextResponse.json({ error: 'Hosteler not found' }, { status: 404 });
  }

  // Invalidate any existing unused tokens for this hosteler
  await supabase
    .from('invite_tokens')
    .update({ used: true })
    .eq('hosteler_id', hosteler_id)
    .eq('used', false);

  // Generate new token
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await supabase
    .from('invite_tokens')
    .insert({
      hosteler_id,
      token,
      used: false,
      expires_at: expiresAt,
    });

  if (insertError) {
    return NextResponse.json({ error: 'Failed to generate invite token' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const invite_url = `${appUrl}/join/${token}`;

  return NextResponse.json(
    { token, invite_url, expires_at: expiresAt },
    { status: 201 }
  );
}
