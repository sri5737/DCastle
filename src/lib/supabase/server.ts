import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getEnvVar } from '@/lib/env';

/**
 * Server client with service role key — bypasses RLS.
 * Use only in API routes for admin operations.
 */
export function createServiceClient() {
  const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseServiceRoleKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Server client with anon key + user's access token for RLS-respecting queries.
 * Use in API routes to query as the authenticated user.
 */
export async function createServerClient() {
  const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });

  return client;
}
