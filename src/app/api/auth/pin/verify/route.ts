export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';

const PHONE_REGEX = /^[6-9]\d{9}$/;
const PIN_REGEX = /^\d{4}$/;

export async function POST(request: NextRequest) {
  let body: { phone?: string; pin?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { phone, pin } = body;

  if (!phone || !PHONE_REGEX.test(phone)) {
    return NextResponse.json({ error: 'Invalid phone number or PIN' }, { status: 401 });
  }

  if (!pin || !PIN_REGEX.test(pin)) {
    return NextResponse.json({ error: 'Invalid phone number or PIN' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Look up hosteler by phone
  const { data: hosteler, error: hostelerError } = await supabase
    .from('hostelers')
    .select('id, name, room_number, phone, pin_hash, status, auth_user_id')
    .eq('phone', phone)
    .single();

  if (hostelerError || !hosteler) {
    // Generic error — no info leakage about whether phone exists
    return NextResponse.json({ error: 'Invalid phone number or PIN' }, { status: 401 });
  }

  // Check if account is active
  if (hosteler.status !== 'active') {
    return NextResponse.json(
      { error: 'Account is inactive. Contact your PG owner.' },
      { status: 403 }
    );
  }

  // Verify PIN (use compareSync — async compare uses setImmediate which isn't Edge-compatible)
  if (!hosteler.pin_hash) {
    return NextResponse.json({ error: 'Invalid phone number or PIN' }, { status: 401 });
  }

  const isValidPin = bcrypt.compareSync(pin, hosteler.pin_hash);
  if (!isValidPin) {
    return NextResponse.json({ error: 'Invalid phone number or PIN' }, { status: 401 });
  }

  if (!hosteler.auth_user_id) {
    return NextResponse.json({ error: 'Invalid phone number or PIN' }, { status: 401 });
  }

  // Sign in with Supabase Auth to get a real JWT session (server-side)
  try {
    const authClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
      email: `${phone}@hosteler.dcastle.local`,
      password: pin,
    });

    if (signInError || !signInData?.session) {
      console.error('Supabase signIn error:', signInError?.message);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }

    return NextResponse.json({
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        expires_in: signInData.session.expires_in,
      },
      hosteler: {
        id: hosteler.id,
        name: hosteler.name,
        room_number: hosteler.room_number,
      },
    });
  } catch (err) {
    console.error('signInWithPassword threw:', err);
    return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
  }
}
