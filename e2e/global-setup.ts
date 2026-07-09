/**
 * Global setup: Verifies immutable E2E authentication principals.
 * Mutable business data is created per test through factories.
 */
// Disable SSL verification for corporate proxy environments
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { TEST_OWNER, TEST_HOSTELER_AUTH_PRINCIPAL } from './test-data';

// Ensure env vars are loaded (playwright.config.ts also loads them, but this is a safety net)
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ijamwcpvboctjeejajzk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BASELINE_HOSTELER_NAME = 'E2E Auth Principal Hosteler';
const BASELINE_HOSTELER_ROOM = 'AUTH-001';

async function globalSetup() {
  if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set. E2E tests cannot seed data.');
    console.error('   Set it in .env.local or as an environment variable.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('🔧 E2E Global Setup: Verifying authentication principals...');

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

  // --- 2. Ensure baseline hosteler auth principal exists ---
  let hostelerAuthUser = existingUsers?.users?.find(u => u.email === TEST_HOSTELER_AUTH_PRINCIPAL.email);

  if (!hostelerAuthUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_HOSTELER_AUTH_PRINCIPAL.email,
      password: TEST_HOSTELER_AUTH_PRINCIPAL.password,
      email_confirm: true,
    });
    if (error) {
      console.error('  ❌ Failed to create hosteler auth user:', error.message);
    } else {
      hostelerAuthUser = data.user;
      console.log('  ✓ Hosteler auth user created');
    }
  } else {
    console.log('  ✓ Hosteler auth principal exists');
  }

  // --- 3. Ensure baseline hosteler row exists only when missing ---
  if (hostelerAuthUser) {
    const { data: existingHosteler } = await supabase
      .from('hostelers')
      .select('id')
      .eq('phone', TEST_HOSTELER_AUTH_PRINCIPAL.phone)
      .single();

    const pinHash = await bcrypt.hash(TEST_HOSTELER_AUTH_PRINCIPAL.pin, 10);

    if (existingHosteler) {
      console.log('  ✓ Baseline hosteler row exists');
    } else {
      // Create the hosteler
      const { error } = await supabase.from('hostelers').insert({
        name: BASELINE_HOSTELER_NAME,
        phone: TEST_HOSTELER_AUTH_PRINCIPAL.phone,
        room_number: BASELINE_HOSTELER_ROOM,
        pin_hash: pinHash,
        status: 'active',
        auth_user_id: hostelerAuthUser.id,
        activated_at: new Date().toISOString(),
      });
      if (error) {
        console.error('  ❌ Failed to create test hosteler:', error.message);
      } else {
        console.log('  ✓ Baseline hosteler row created');
      }
    }
  }

  console.log('✅ E2E Global Setup complete\n');
}

export default globalSetup;
