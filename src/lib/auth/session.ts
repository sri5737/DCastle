import { cookies } from 'next/headers';
import type { SessionUser, UserRole } from '@/types';
import { createServiceClient } from '@/lib/supabase/server';
import { getEnvVar } from '@/lib/env';

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
 * Decode JWT payload locally without network call.
 * Same approach as middleware — fast, no SSL/proxy issues.
 */
function decodeJwtPayload(token: string): { email?: string; sub?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Get the current authenticated session user from the JWT cookie.
 * Decodes locally (no network call) — matches middleware approach.
 * Returns null if not authenticated or token expired.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;

  if (!accessToken) return null;

  const payload = decodeJwtPayload(accessToken);
  if (!payload || !payload.sub) return null;

  const email = payload.email || '';
  const role = getUserRole(email);

  if (role === 'owner') {
    return {
      id: payload.sub,
      email,
      role: 'owner',
    };
  }

  // Look up hosteler_id from auth_user_id
  const supabase = createServiceClient();
  const { data: hosteler } = await supabase
    .from('hostelers')
    .select('id')
    .eq('auth_user_id', payload.sub)
    .single();

  return {
    id: payload.sub,
    email,
    role: 'hosteler',
    hosteler_id: hosteler?.id,
  };
}

/**
 * Determine user role based on email.
 */
export function getUserRole(email: string | undefined): UserRole {
  const ownerEmail = getEnvVar('OWNER_EMAIL');
  if (email && email === ownerEmail) return 'owner';
  return 'hosteler';
}

/**
 * Verify if the current user is the owner.
 */
export async function verifyOwner(): Promise<boolean> {
  const session = await getSession();
  return session?.role === 'owner';
}
