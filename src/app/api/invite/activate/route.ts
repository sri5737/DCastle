export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

const PIN_REGEX = /^\d{4}$/;

export async function POST(request: NextRequest) {
  let body: { token?: string; method?: string; pin?: string; google_access_token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { token, method, pin, google_access_token } = body;

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }
  if (!method || !['google', 'pin'].includes(method)) {
    return NextResponse.json({ error: 'Method must be "google" or "pin"' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Validate invite token
  const { data: inviteToken, error: tokenError } = await supabase
    .from('invite_tokens')
    .select('id, hosteler_id, used, expires_at')
    .eq('token', token)
    .single();

  if (tokenError || !inviteToken) {
    return NextResponse.json({ error: 'Invalid or expired invite token' }, { status: 400 });
  }

  if (inviteToken.used) {
    return NextResponse.json({ error: 'Token already used' }, { status: 409 });
  }

  if (new Date(inviteToken.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired invite token' }, { status: 400 });
  }

  // Get hosteler
  const { data: hosteler, error: hostelerError } = await supabase
    .from('hostelers')
    .select('id, name, room_number, phone')
    .eq('id', inviteToken.hosteler_id)
    .single();

  if (hostelerError || !hosteler) {
    return NextResponse.json({ error: 'Hosteler not found' }, { status: 404 });
  }

  let updateData: Record<string, unknown>;

  if (method === 'pin') {
    if (!pin || !PIN_REGEX.test(pin)) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
    }
    const pin_hash = await bcrypt.hash(pin, 10);
    updateData = { pin_hash, status: 'active', activated_at: new Date().toISOString() };
  } else {
    // Google OAuth path
    if (!google_access_token) {
      return NextResponse.json({ error: 'Google access token is required' }, { status: 400 });
    }

    // Verify Google token
    const googleRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(google_access_token)}`
    );

    if (!googleRes.ok) {
      return NextResponse.json({ error: 'Invalid Google access token' }, { status: 400 });
    }

    const googleData = await googleRes.json();
    const google_id = googleData.sub;

    if (!google_id) {
      return NextResponse.json({ error: 'Invalid Google access token' }, { status: 400 });
    }

    updateData = { google_id, status: 'active', activated_at: new Date().toISOString() };
  }

  // Create Supabase Auth user for the hosteler
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    phone: hosteler.phone,
    phone_confirm: true,
    user_metadata: { hosteler_id: hosteler.id, name: hosteler.name },
  });

  if (authError) {
    return NextResponse.json({ error: 'Failed to create auth user' }, { status: 500 });
  }

  // Update hosteler with auth info
  updateData.auth_user_id = authUser.user.id;
  const { error: updateError } = await supabase
    .from('hostelers')
    .update(updateData)
    .eq('id', hosteler.id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to activate hosteler' }, { status: 500 });
  }

  // Mark token as used
  await supabase
    .from('invite_tokens')
    .update({ used: true })
    .eq('id', inviteToken.id);

  // Generate session token for the new user
  const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: `${hosteler.phone}@hosteler.dcastle.local`,
  });

  // For the response, we'll provide a sign-in session
  // Using admin.createUser already creates the user. We sign them in via custom token approach.
  const { data: signInData, error: signInError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: `${hosteler.phone}@hosteler.dcastle.local`,
  });

  // Since we can't directly generate a session via admin API in edge,
  // return auth user id and let the client establish the session
  return NextResponse.json({
    session: {
      access_token: authUser.user.id, // Client will exchange for real session
      refresh_token: '',
      expires_in: 3600,
    },
    hosteler: {
      id: hosteler.id,
      name: hosteler.name,
      room_number: hosteler.room_number,
    },
  });
}
