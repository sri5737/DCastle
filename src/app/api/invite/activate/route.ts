export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getHostelerAuthPassword } from '@/lib/auth/pin-password';
import { withApiDiagnostic } from '@/lib/diagnostics/events';
import bcrypt from 'bcryptjs';

const PIN_REGEX = /^\d{4}$/;

type InviteErrorCode =
  | 'invalid_request'
  | 'invite_invalid'
  | 'invite_used'
  | 'invite_expired'
  | 'invite_superseded'
  | 'reset_not_allowed_non_active'
  | 'auth_user_missing'
  | 'activation_failed'
  | 'reset_failed';

const GOOGLE_LINKED_MESSAGE =
  'This account is linked to Google sign-in. Continue with your linked Google account.';

function inviteError(
  status: number,
  code: InviteErrorCode,
  message: string,
  recovery_action: string,
) {
  return NextResponse.json({ error: { code, message, recovery_action } }, { status });
}

async function handlePost(request: NextRequest) {
  let body: { token?: string; method?: string; pin?: string; google_access_token?: string };
  try {
    body = await request.json();
  } catch {
    return inviteError(400, 'invalid_request', 'Invalid JSON body', 'submit_valid_request');
  }

  const { token, method, pin, google_access_token } = body;

  if (!token) {
    return inviteError(400, 'invalid_request', 'Token is required', 'open_invite_link');
  }
  if (!method || !['google', 'pin'].includes(method)) {
    return inviteError(
      400,
      'invalid_request',
      'Method must be "google" or "pin"',
      'submit_valid_method',
    );
  }

  const supabase = createServiceClient();

  // Validate invite token
  const { data: inviteToken, error: tokenError } = await supabase
    .from('invite_tokens')
    .select('id, hosteler_id, used, expires_at, created_at')
    .eq('token', token)
    .single();

  if (tokenError || !inviteToken) {
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

  // Get hosteler
  const { data: hosteler, error: hostelerError } = await supabase
    .from('hostelers')
    .select('id, name, room_number, phone, status, pin_hash, google_id, auth_user_id')
    .eq('id', inviteToken.hosteler_id)
    .single();

  if (hostelerError || !hosteler) {
    return inviteError(404, 'invite_invalid', 'Hosteler not found.', 'contact_owner');
  }

  if (hosteler.status === 'active') {
    if (hosteler.pin_hash === null && hosteler.google_id) {
      return NextResponse.json({
        flow: 'google_linked',
        message: GOOGLE_LINKED_MESSAGE,
        hosteler: {
          id: hosteler.id,
          name: hosteler.name,
          room_number: hosteler.room_number,
        },
      });
    }

    if (method !== 'pin') {
      return inviteError(
        400,
        'invalid_request',
        'PIN reset requires a new 4-digit PIN.',
        'submit_valid_pin',
      );
    }

    if (!hosteler.pin_hash) {
      return inviteError(
        403,
        'reset_not_allowed_non_active',
        'PIN reset is allowed only for active PIN-linked hostelers.',
        'contact_owner',
      );
    }

    if (!hosteler.auth_user_id) {
      return inviteError(
        409,
        'auth_user_missing',
        'This account cannot reset PIN until owner support refreshes the login credential.',
        'contact_owner',
      );
    }

    if (!pin || !PIN_REGEX.test(pin)) {
      return inviteError(400, 'invalid_request', 'PIN must be exactly 4 digits', 'submit_valid_pin');
    }

    const previousPinHash = hosteler.pin_hash;
    const pin_hash = bcrypt.hashSync(pin, 10);

    const { error: tokenUseError } = await supabase
      .from('invite_tokens')
      .update({ used: true })
      .eq('id', inviteToken.id)
      .eq('used', false);

    if (tokenUseError) {
      return inviteError(500, 'reset_failed', 'Failed to reset PIN.', 'try_again_or_contact_owner');
    }

    const { error: updateError } = await supabase
      .from('hostelers')
      .update({ pin_hash })
      .eq('id', hosteler.id)
      .eq('status', 'active');

    if (updateError) {
      await supabase.from('invite_tokens').update({ used: false }).eq('id', inviteToken.id);
      return inviteError(500, 'reset_failed', 'Failed to reset PIN.', 'try_again_or_contact_owner');
    }

    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
      hosteler.auth_user_id,
      { password: getHostelerAuthPassword(hosteler.phone, pin) },
    );

    if (authUpdateError) {
      await supabase.from('hostelers').update({ pin_hash: previousPinHash }).eq('id', hosteler.id);
      await supabase.from('invite_tokens').update({ used: false }).eq('id', inviteToken.id);
      return inviteError(500, 'reset_failed', 'Failed to reset PIN.', 'try_again_or_contact_owner');
    }

    return NextResponse.json({
      flow: 'reset',
      hosteler: {
        id: hosteler.id,
        name: hosteler.name,
        room_number: hosteler.room_number,
      },
    });
  }

  if (hosteler.status !== 'pending') {
    return inviteError(
      403,
      'reset_not_allowed_non_active',
      'PIN reset is allowed only for active hostelers.',
      'contact_owner',
    );
  }

  let updateData: Record<string, unknown>;

  if (method === 'pin') {
    if (!pin || !PIN_REGEX.test(pin)) {
      return inviteError(400, 'invalid_request', 'PIN must be exactly 4 digits', 'submit_valid_pin');
    }
    const pin_hash = bcrypt.hashSync(pin, 10);
    updateData = { pin_hash, status: 'active', activated_at: new Date().toISOString() };
  } else {
    // Google OAuth path
    if (!google_access_token) {
      return inviteError(
        400,
        'invalid_request',
        'Google access token is required',
        'continue_google_sign_in',
      );
    }

    // Verify Google token
    const googleRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(google_access_token)}`
    );

    if (!googleRes.ok) {
      return inviteError(
        400,
        'invalid_request',
        'Invalid Google access token',
        'continue_google_sign_in',
      );
    }

    const googleData = await googleRes.json();
    const google_id = googleData.sub;

    if (!google_id) {
      return inviteError(
        400,
        'invalid_request',
        'Invalid Google access token',
        'continue_google_sign_in',
      );
    }

    updateData = { google_id, status: 'active', activated_at: new Date().toISOString() };
  }

  // Create Supabase Auth user for the hosteler
  // Check if an auth user already exists with this email (from incomplete deletion)
  // If it does, update it instead of trying to delete and recreate
  const authEmail = `${hosteler.phone}@hosteler.dcastle.local`;
  
  let authUser: any;
  let authError: any;

  try {
    // Query for existing auth user with this email
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (!listError && existingUsers?.users) {
      const existingAuthUser = existingUsers.users.find(u => u.email === authEmail);
      if (existingAuthUser) {
        console.warn(`Found existing auth user for ${authEmail}, updating instead of recreating`, {
          existingUserId: existingAuthUser.id,
        });
        
        // Update the existing auth user with new metadata and password
        const updatePayload: Record<string, unknown> = {
          email_confirm: true,
          phone_confirm: true,
          user_metadata: { hosteler_id: hosteler.id, name: hosteler.name },
        };
        
        // For PIN-based activation, update the password using the proper format
        if (method === 'pin' && pin) {
          updatePayload.password = getHostelerAuthPassword(hosteler.phone, pin);
        }
        
        const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
          existingAuthUser.id,
          updatePayload as Parameters<typeof supabase.auth.admin.updateUserById>[1]
        );
        
        if (updateError) {
          console.error('Failed to update existing auth user:', updateError);
          authError = updateError;
        } else {
          authUser = updatedUser?.user;
          console.warn('Successfully updated existing auth user', {
            authUserId: authUser?.id,
            authUserEmail: authUser?.email,
          });
        }
      }
    } else if (listError) {
      console.warn('Could not list existing auth users, will attempt create:', listError);
    }
  } catch (listError) {
    console.warn('Error checking for existing auth users, will attempt create:', listError);
  }

  // If no existing user was found or updated, create a new one
  if (!authUser && !authError) {
    const createUserPayload: Record<string, unknown> = {
      email: authEmail,
      email_confirm: true,
      phone: hosteler.phone,
      phone_confirm: true,
      user_metadata: { hosteler_id: hosteler.id, name: hosteler.name },
    };

    // For PIN-based activation, set the PIN as the Supabase Auth password
    // so that signInWithPassword works in the PIN verify flow
    if (method === 'pin' && pin) {
      createUserPayload.password = getHostelerAuthPassword(hosteler.phone, pin);
    }

    const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser(
      createUserPayload as Parameters<typeof supabase.auth.admin.createUser>[0]
    );
    
    authUser = newAuthUser?.user;
    authError = createError;
    if (!authError) {
      console.warn('Successfully created new auth user', {
        authUserId: authUser?.id,
        authUserEmail: authUser?.email,
      });
    }
  }

  if (authError) {
    console.error('Auth user creation/update failed:', {
      error: authError,
      email: authEmail,
      code: authError?.status,
      message: authError?.message,
    });
    return inviteError(500, 'activation_failed', 'Failed to create auth user', 'try_again_or_contact_owner');
  }

  // Update hosteler with auth info
  updateData.auth_user_id = authUser.id;
  
  // Clear this auth_user_id from any other hosteler records (e.g., old deleted rows)
  // to avoid unique constraint violations when re-activating
  const { error: clearError } = await supabase
    .from('hostelers')
    .update({ auth_user_id: null })
    .eq('auth_user_id', authUser.id)
    .neq('id', hosteler.id);
  
  if (clearError) {
    console.warn('Could not clear orphaned auth_user_id references:', clearError);
    // Don't fail on this - proceed with the update
  }
  
  const { error: updateError } = await supabase
    .from('hostelers')
    .update(updateData)
    .eq('id', hosteler.id);

  if (updateError) {
    console.error('Hosteler update failed:', {
      error: updateError,
      updateData,
      hosteler_id: hosteler.id,
    });
    return inviteError(500, 'activation_failed', 'Failed to activate hosteler', 'try_again_or_contact_owner');
  }

  // Mark token as used
  const { error: activationTokenUseError } = await supabase
    .from('invite_tokens')
    .update({ used: true })
    .eq('id', inviteToken.id)
    .eq('used', false);

  if (activationTokenUseError) {
    return inviteError(500, 'activation_failed', 'Failed to activate hosteler', 'try_again_or_contact_owner');
  }

  return NextResponse.json({
    flow: 'activation',
    hosteler: {
      id: hosteler.id,
      name: hosteler.name,
      room_number: hosteler.room_number,
    },
  });
}

export async function POST(request: NextRequest) {
  return withApiDiagnostic(
    { route: '/api/invite/activate', method: 'POST', action: 'invite.activate' },
    () => handlePost(request),
  );
}
