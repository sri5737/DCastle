/**
 * One-time cleanup script: removes all E2E test hostelers from Supabase.
 * Run with: npx tsx e2e/cleanup-e2e-data.ts
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { cleanupRegisteredRecords } from './cleanup-registry';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function cleanup() {
  const registryResult = await cleanupRegisteredRecords(supabase);
  if (registryResult.failures.length > 0) {
    console.warn('Registry cleanup failures:', registryResult.failures.join('; '));
  } else if (registryResult.attempted > 0) {
    console.log(`✓ Cleaned/restored ${registryResult.attempted} tracked registry records`);
  }

  const { data: e2eHostelers, error: findErr } = await supabase
    .from('hostelers')
    .select('id, auth_user_id, name')
    .like('name', 'E2E %');

  if (findErr) {
    console.error('Find error:', findErr.message);
    process.exit(1);
  }

  if (!e2eHostelers || e2eHostelers.length === 0) {
    console.log('✅ No E2E hostelers found. Database is clean.');
    process.exit(0);
  }

  console.log(`Found ${e2eHostelers.length} E2E hostelers to clean up:`);
  e2eHostelers.forEach(h => console.log(`  - ${h.name}`));

  const ids = e2eHostelers.map(h => h.id);

  await supabase.from('invite_tokens').delete().in('hosteler_id', ids);
  await supabase.from('food_preferences').delete().in('hosteler_id', ids);

  const { error: delErr } = await supabase.from('hostelers').delete().in('id', ids);
  if (delErr) {
    console.error('Delete error:', delErr.message);
    process.exit(1);
  }
  console.log(`✓ Deleted ${e2eHostelers.length} E2E hosteler records`);

  const authIds = e2eHostelers.map(h => h.auth_user_id).filter((id): id is string => !!id);
  for (const authId of authIds) {
    await supabase.auth.admin.deleteUser(authId);
  }
  console.log(`✓ Cleaned up ${authIds.length} auth users`);
  console.log('✅ Done! All E2E test data removed.');
}

cleanup();
