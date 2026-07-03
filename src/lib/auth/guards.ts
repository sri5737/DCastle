import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import type { SessionUser } from '@/types';

/**
 * Require any authenticated user. Returns session or 401 response.
 */
export async function requireAuth(): Promise<
  { session: SessionUser } | { response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return {
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    };
  }
  return { session };
}

/**
 * Require an authenticated hosteler. Returns session or error response.
 */
export async function requireHosteler(): Promise<
  { session: SessionUser } | { response: NextResponse }
> {
  const result = await requireAuth();
  if ('response' in result) return result;

  if (result.session.role !== 'hosteler') {
    return {
      response: NextResponse.json(
        { error: 'Forbidden: hosteler access required' },
        { status: 403 }
      ),
    };
  }
  return result;
}

/**
 * Require an authenticated owner. Returns session or error response.
 */
export async function requireOwner(): Promise<
  { session: SessionUser } | { response: NextResponse }
> {
  const result = await requireAuth();
  if ('response' in result) return result;

  if (result.session.role !== 'owner') {
    return {
      response: NextResponse.json(
        { error: 'Forbidden: owner access required' },
        { status: 403 }
      ),
    };
  }
  return result;
}
