import { createClient } from '@supabase/supabase-js';

export function requireE2EEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for E2E setup and cleanup`);
  }
  return value;
}

export function createSupabaseTestClient() {
  const supabaseUrl = requireE2EEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requireE2EEnv('SUPABASE_SERVICE_ROLE_KEY');

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
