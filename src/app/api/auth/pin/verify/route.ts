export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
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

  // Verify PIN
  if (!hosteler.pin_hash) {
    return NextResponse.json({ error: 'Invalid phone number or PIN' }, { status: 401 });
  }

  const isValidPin = await bcrypt.compare(pin, hosteler.pin_hash);
  if (!isValidPin) {
    return NextResponse.json({ error: 'Invalid phone number or PIN' }, { status: 401 });
  }

  // Generate session for the authenticated hosteler
  // Use the existing auth_user_id to create a session via admin generateLink
  if (!hosteler.auth_user_id) {
    return NextResponse.json({ error: 'Invalid phone number or PIN' }, { status: 401 });
  }

  // Return session info for the authenticated hosteler
  return NextResponse.json({
    session: {
      access_token: hosteler.auth_user_id,
      refresh_token: '',
      expires_in: 60 * 60 * 24 * 30, // 30 days
    },
    hosteler: {
      id: hosteler.id,
      name: hosteler.name,
      room_number: hosteler.room_number,
    },
  });
}
