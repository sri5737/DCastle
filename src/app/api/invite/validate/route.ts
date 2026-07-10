export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { withApiDiagnostic } from '@/lib/diagnostics/events';

const GOOGLE_LINKED_MESSAGE =
  'This account is linked to Google sign-in. Continue with your linked Google account.';

function inviteError(status: number, code: string, message: string, recovery_action: string) {
  return NextResponse.json({ error: { code, message, recovery_action } }, { status });
}

async function handleGet(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return inviteError(400, 'invalid_request', 'Token is required', 'open_invite_link');
  }

  const supabase = createServiceClient();

  const { data: inviteToken, error } = await supabase
    .from('invite_tokens')
    .select('id, hosteler_id, used, expires_at, created_at')
    .eq('token', token)
    .single();

  if (error || !inviteToken) {
    return inviteError(400, 'invite_invalid', 'This invite link is not valid.', 'contact_owner');
  }

  const { data: latestToken } = await supabase
    .from('invite_tokens')
    .select('id, created_at')
    .eq('hosteler_id', inviteToken.hosteler_id)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestToken && latestToken.id !== inviteToken.id) {
    return inviteError(
      409,
      'invite_superseded',
      'This invite link has been replaced by a newer one.',
      'open_latest_invite_link',
    );
  }

  if (inviteToken.used) {
    return inviteError(
      409,
      'invite_used',
      'This invite link has already been used.',
      'contact_owner',
    );
  }

  if (new Date(inviteToken.expires_at) < new Date()) {
    return inviteError(410, 'invite_expired', 'This invite link has expired.', 'contact_owner');
  }

  // Get hosteler info
  const { data: hosteler } = await supabase
    .from('hostelers')
    .select('id, name, room_number, status, pin_hash, google_id')
    .eq('id', inviteToken.hosteler_id)
    .single();

  if (!hosteler) {
    return inviteError(404, 'invite_invalid', 'Hosteler not found.', 'contact_owner');
  }

  if (hosteler.status === 'active') {
    if (hosteler.pin_hash === null && hosteler.google_id) {
      return NextResponse.json({
        valid: true,
        flow: 'google_linked',
        message: GOOGLE_LINKED_MESSAGE,
        hosteler: {
          name: hosteler.name,
          room_number: hosteler.room_number,
        },
      });
    }

    if (hosteler.pin_hash) {
      return NextResponse.json({
        valid: true,
        flow: 'reset',
        hosteler: {
          name: hosteler.name,
          room_number: hosteler.room_number,
        },
      });
    }

    return inviteError(
      403,
      'reset_not_allowed_non_active',
      'PIN reset is allowed only for active PIN-linked hostelers.',
      'contact_owner',
    );
  }

  if (hosteler.status !== 'pending') {
    return inviteError(
      403,
      'reset_not_allowed_non_active',
      'PIN reset is allowed only for active hostelers.',
      'contact_owner',
    );
  }

  return NextResponse.json({
    valid: true,
    flow: 'activation',
    hosteler: {
      name: hosteler.name,
      room_number: hosteler.room_number,
    },
  });
}

export async function GET(request: NextRequest) {
  return withApiDiagnostic(
    { route: '/api/invite/validate', method: 'GET', action: 'invite.validate' },
    () => handleGet(request),
  );
}
