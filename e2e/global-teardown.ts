/**
 * Global teardown: Cleans up test-seeded data from Supabase after E2E tests complete.
 * Does NOT delete the owner user (they are a real user).
 */
// Disable SSL verification for corporate proxy environments
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import { TEST_HOSTELER } from './test-data';

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

  // --- 1. Find the test hosteler ---
  const { data: hosteler } = await supabase
    .from('hostelers')
    .select('id, auth_user_id')
    .eq('phone', TEST_HOSTELER.phone)
    .single();

  if (hosteler) {
    // --- 2. Delete food_preferences created by the test hosteler ---
    const { error: fpError } = await supabase
      .from('food_preferences')
      .delete()
      .eq('hosteler_id', hosteler.id);

    if (fpError) {
      console.warn('  ⚠ Failed to delete food_preferences:', fpError.message);
    } else {
      console.log('  ✓ Cleaned up food_preferences');
    }

    // --- 3. Delete the test hosteler from hostelers table ---
    const { error: hostelerError } = await supabase
      .from('hostelers')
      .delete()
      .eq('id', hosteler.id);

    if (hostelerError) {
      console.warn('  ⚠ Failed to delete test hosteler:', hostelerError.message);
    } else {
      console.log('  ✓ Cleaned up test hosteler record');
    }

    // --- 4. Delete the test hosteler from Supabase Auth ---
    if (hosteler.auth_user_id) {
      const { error: authError } = await supabase.auth.admin.deleteUser(hosteler.auth_user_id);
      if (authError) {
        console.warn('  ⚠ Failed to delete hosteler auth user:', authError.message);
      } else {
        console.log('  ✓ Cleaned up hosteler auth user');
      }
    }
  } else {
    console.log('  ℹ No test hosteler found to clean up');
  }

  // --- 5. Clean up any invite tokens created during tests ---
  const { error: tokenError } = await supabase
    .from('invite_tokens')
    .delete()
    .like('hosteler_id', '%')
    .is('used_at', null);
  // Only clean unused tokens created during test runs — used ones may be needed for history
  if (tokenError) {
    console.warn('  ⚠ Could not clean invite_tokens:', tokenError.message);
  }

  console.log('✅ E2E Global Teardown complete\n');
}

export default globalTeardown;
