import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import type { SessionUser, UserRole } from '@/types';

const OWNER_EMAIL = process.env.OWNER_EMAIL || '';

/** Session expiry durations in seconds */
export const SESSION_EXPIRY = {
  hosteler: 60 * 60 * 24 * 30, // 30 days
  owner: 60 * 60 * 24 * 7,    // 7 days
} as const;

/**
 * Get the session max-age (in seconds) based on user role.
 */
export function getSessionMaxAge(role: UserRole): number {
  return role === 'owner' ? SESSION_EXPIRY.owner : SESSION_EXPIRY.hosteler;
}

/**
 * Get the current authenticated session user from Supabase Auth.
 * Returns null if not authenticated.
 */
export async function getSession(): Promise<SessionUser | null> {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return null;

  const role = getUserRole(user.email);

  if (role === 'owner') {
    return {
      id: user.id,
      email: user.email,
      role: 'owner',
    };
  }

  // Look up the hosteler linked to this auth user
  const serviceClient = createServiceClient();
  const { data: hosteler } = await serviceClient
    .from('hostelers')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!hosteler) return null;

  return {
    id: user.id,
    email: user.email,
    role: 'hosteler',
    hosteler_id: hosteler.id,
  };
}

/**
 * Determine user role based on email.
 */
export function getUserRole(email: string | undefined): UserRole {
  if (email && email === OWNER_EMAIL) return 'owner';
  return 'hosteler';
}

/**
 * Verify if the current user is the owner.
 */
export async function verifyOwner(): Promise<boolean> {
  const session = await getSession();
  return session?.role === 'owner';
}
