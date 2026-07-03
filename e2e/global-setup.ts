/**
 * Global setup: Seeds test users in Supabase before E2E tests run.
 * Uses the service role key to create/reset test data.
 */
// Disable SSL verification for corporate proxy environments
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { TEST_OWNER, TEST_HOSTELER } from './test-data';

// Ensure env vars are loaded (playwright.config.ts also loads them, but this is a safety net)
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ijamwcpvboctjeejajzk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function globalSetup() {
  if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set. E2E tests cannot seed data.');
    console.error('   Set it in .env.local or as an environment variable.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('🔧 E2E Global Setup: Seeding test data...');

  // --- 1. Verify owner user exists (do NOT modify — this is a real user) ---
  if (!TEST_OWNER.password) {
    console.error('❌ E2E_TEST_OWNER_PASSWORD not set in .env.local');
    console.error('   Add E2E_TEST_OWNER_PASSWORD=<your-password> to .env.local');
    process.exit(1);
  }

  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const ownerUser = existingUsers?.users?.find(u => u.email === TEST_OWNER.email);

  if (ownerUser) {
    console.log('  ✓ Owner user exists:', TEST_OWNER.email);
  } else {
    console.warn('  ⚠ Owner user not found in Supabase Auth:', TEST_OWNER.email);
    console.warn('    Owner must register manually. Tests requiring owner login may fail.');
  }

  // --- 2. Ensure test hosteler auth user exists ---
  let hostelerAuthUser = existingUsers?.users?.find(u => u.email === TEST_HOSTELER.email);

  if (!hostelerAuthUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_HOSTELER.email,
      password: TEST_HOSTELER.password,
      email_confirm: true,
    });
    if (error) {
      console.error('  ❌ Failed to create hosteler auth user:', error.message);
    } else {
      hostelerAuthUser = data.user;
      console.log('  ✓ Hosteler auth user created');
    }
  } else {
    // Ensure password is correct
    await supabase.auth.admin.updateUserById(hostelerAuthUser.id, {
      password: TEST_HOSTELER.password,
    });
    console.log('  ✓ Hosteler auth user password reset');
  }

  // --- 3. Ensure test hosteler exists in hostelers table ---
  if (hostelerAuthUser) {
    const { data: existingHosteler } = await supabase
      .from('hostelers')
      .select('id')
      .eq('phone', TEST_HOSTELER.phone)
      .single();

    const pinHash = await bcrypt.hash(TEST_HOSTELER.pin, 10);

    if (existingHosteler) {
      // Update to ensure correct state
      await supabase
        .from('hostelers')
        .update({
          name: TEST_HOSTELER.name,
          room_number: TEST_HOSTELER.room_number,
          pin_hash: pinHash,
          status: 'active',
          auth_user_id: hostelerAuthUser.id,
          activated_at: new Date().toISOString(),
        })
        .eq('id', existingHosteler.id);
      console.log('  ✓ Test hosteler updated');
    } else {
      // Create the hosteler
      const { error } = await supabase.from('hostelers').insert({
        name: TEST_HOSTELER.name,
        phone: TEST_HOSTELER.phone,
        room_number: TEST_HOSTELER.room_number,
        pin_hash: pinHash,
        status: 'active',
        auth_user_id: hostelerAuthUser.id,
        activated_at: new Date().toISOString(),
      });
      if (error) {
        console.error('  ❌ Failed to create test hosteler:', error.message);
      } else {
        console.log('  ✓ Test hosteler created');
      }
    }
  }

  // --- 4. Set deadline to 23:59 so E2E tests are never blocked by time ---
  const { error: settingsError } = await supabase
    .from('settings')
    .upsert({ key: 'deadline_time', value: '23:59' }, { onConflict: 'key' });

  if (settingsError) {
    console.warn('  ⚠ Could not set deadline_time:', settingsError.message);
  } else {
    console.log('  ✓ Deadline set to 23:59 for E2E tests');
  }

  console.log('✅ E2E Global Setup complete\n');
}

export default globalSetup;
