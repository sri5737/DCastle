/**
 * Global teardown: Cleans up test-seeded data from Supabase after E2E tests complete.
 * Does NOT delete the owner user (they are a real user).
 */
// Disable SSL verification for corporate proxy environments
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { cleanupRegisteredRecords } from './cleanup-registry';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ijamwcpvboctjeejajzk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function globalTeardown() {
  if (!supabaseServiceKey) {
    console.warn('⚠ SUPABASE_SERVICE_ROLE_KEY not set. Skipping teardown.');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('🧹 E2E Global Teardown: Cleaning up test data...');

  const registryResult = await cleanupRegisteredRecords(supabase);
  if (registryResult.failures.length > 0) {
    console.warn('  ⚠ Registry cleanup completed with failures:', registryResult.failures.join('; '));
  } else if (registryResult.attempted > 0) {
    console.log(`  ✓ Registry cleanup removed/restored ${registryResult.attempted} tracked records`);
  }

  // --- 1. Clean up stable-marker E2E hostelers left by interrupted setup ---
  const { data: e2eHostelers } = await supabase
    .from('hostelers')
    .select('id, auth_user_id, name')
    .like('name', 'E2E %');

  if (e2eHostelers && e2eHostelers.length > 0) {
    const e2eIds = e2eHostelers.map(h => h.id);

    // Delete invite tokens for all E2E hostelers
    const { error: tokenError } = await supabase
      .from('invite_tokens')
      .delete()
      .in('hosteler_id', e2eIds);

    if (tokenError) {
      console.warn('  ⚠ Could not clean invite_tokens:', tokenError.message);
    } else {
      console.log('  ✓ Cleaned up invite_tokens for E2E hostelers');
    }

    // Delete food_preferences for all E2E hostelers
    const { error: fpError } = await supabase
      .from('food_preferences')
      .delete()
      .in('hosteler_id', e2eIds);

    if (fpError) {
      console.warn('  ⚠ Failed to delete food_preferences:', fpError.message);
    } else {
      console.log('  ✓ Cleaned up food_preferences for E2E hostelers');
    }

    // Delete all E2E hostelers from hostelers table
    const { error: hostelerError } = await supabase
      .from('hostelers')
      .delete()
      .in('id', e2eIds);

    if (hostelerError) {
      console.warn('  ⚠ Failed to delete E2E hostelers:', hostelerError.message);
    } else {
      console.log(`  ✓ Cleaned up ${e2eHostelers.length} E2E hosteler records`);
    }

    // Delete auth users for E2E hostelers
    const authUserIds = e2eHostelers
      .map(h => h.auth_user_id)
      .filter((id): id is string => !!id);

    for (const authUserId of authUserIds) {
      const { error: authError } = await supabase.auth.admin.deleteUser(authUserId);
      if (authError) {
        console.warn(`  ⚠ Failed to delete auth user ${authUserId}:`, authError.message);
      }
    }
    if (authUserIds.length > 0) {
      console.log(`  ✓ Cleaned up ${authUserIds.length} E2E auth users`);
    }
  } else {
    console.log('  ℹ No E2E hostelers found to clean up');
  }

  console.log('✅ E2E Global Teardown complete\n');
}

export default globalTeardown;
