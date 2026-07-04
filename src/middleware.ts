import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getEnvVar } from '@/lib/env';

// Decode JWT payload without network call (for routing decisions only)
function decodeJwtPayload(token: string): { email?: string; exp?: number; sub?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Routes that don't require authentication
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/admin/login',
  '/join',
  '/api/auth/callback',
  '/api/invite/activate',
  '/api/invite/validate',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    isPublicPath(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Get access token from cookie
  const accessToken = request.cookies.get('sb-access-token')?.value;

  if (!accessToken) {
    // Redirect unauthenticated users to landing page
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Decode JWT locally (no network call — fast and reliable)
  const payload = decodeJwtPayload(accessToken);

  if (!payload || !payload.email) {
    // Invalid or expired token — redirect to landing
    const url = request.nextUrl.clone();
    url.pathname = '/';
    const response = NextResponse.redirect(url);
    response.cookies.delete('sb-access-token');
    response.cookies.delete('sb-refresh-token');
    return response;
  }

  const isOwner = payload.email === getEnvVar('OWNER_EMAIL');

  // Protect owner routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/hostelers') || pathname.startsWith('/history') || pathname.startsWith('/billing') || pathname.startsWith('/settings')) {
    // These are under (owner) group — check if user is owner
    // Note: In App Router, route groups don't affect URLs
  }

  // Role-based route protection
  if (pathname.startsWith('/admin') && !isOwner) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)',
  ],
};
