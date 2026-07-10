export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { withApiDiagnostic } from '@/lib/diagnostics/events';

async function handleGet(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = createServiceClient();

  // Exchange code for session
  const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);

  if (authError || !authData.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const user = authData.user;
  const googleId = user.user_metadata?.sub || user.identities?.[0]?.id;

  if (!googleId) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Look up hosteler by google_id
  const { data: hosteler } = await supabase
    .from('hostelers')
    .select('id, status')
    .eq('google_id', googleId)
    .single();

  if (!hosteler) {
    return NextResponse.redirect(`${origin}/login?error=not_registered`);
  }

  if (hosteler.status !== 'active') {
    return NextResponse.redirect(`${origin}/login?error=inactive`);
  }

  // Set session cookies
  const response = NextResponse.redirect(`${origin}/dashboard`);

  if (authData.session) {
    response.cookies.set('sb-access-token', authData.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
    response.cookies.set('sb-refresh-token', authData.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
  }

  return response;
}

export async function GET(request: NextRequest) {
  return withApiDiagnostic(
    { route: '/api/auth/callback', method: 'GET', action: 'auth.callback' },
    () => handleGet(request),
  );
}
