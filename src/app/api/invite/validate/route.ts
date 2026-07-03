export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: inviteToken, error } = await supabase
    .from('invite_tokens')
    .select('id, hosteler_id, used, expires_at')
    .eq('token', token)
    .single();

  if (error || !inviteToken) {
    return NextResponse.json({ error: 'Invalid or expired invite token' }, { status: 400 });
  }

  if (inviteToken.used) {
    return NextResponse.json({ error: 'Token already used' }, { status: 409 });
  }

  if (new Date(inviteToken.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired invite token' }, { status: 400 });
  }

  // Get hosteler info
  const { data: hosteler } = await supabase
    .from('hostelers')
    .select('name, room_number')
    .eq('id', inviteToken.hosteler_id)
    .single();

  if (!hosteler) {
    return NextResponse.json({ error: 'Hosteler not found' }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    hosteler: {
      name: hosteler.name,
      room_number: hosteler.room_number,
    },
  });
}
