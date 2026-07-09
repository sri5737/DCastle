import bcrypt from 'bcryptjs';
import { getHostelerAuthPassword } from '../src/lib/auth/pin-password';
import { createSupabaseTestClient } from './supabase-test-client';
import { createCleanupRecord, registerCleanupRecords } from './cleanup-registry';
import { createShortId, createStableMarker, createTestCaseId, getTestRunId } from './test-run';

export interface FactoryOptions {
  specPath: string;
  testTitle: string;
  markerScope?: string;
}

function baseFactoryContext(options: FactoryOptions) {
  const testRunId = getTestRunId();
  const testCaseId = createTestCaseId(options.specPath, options.testTitle);
  const marker = createStableMarker(options.markerScope || testCaseId, testRunId);
  return { testRunId, testCaseId, marker };
}

function futureDate(daysFromNow = 1) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

export async function createPendingHosteler(options: FactoryOptions) {
  const supabase = createSupabaseTestClient();
  const context = baseFactoryContext(options);
  const suffix = createShortId('pending');
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: hosteler, error: hostelerError } = await supabase
    .from('hostelers')
    .insert({ name: `${context.marker} Pending`, phone: `98${Date.now().toString().slice(-8)}`, room_number: suffix, status: 'pending' })
    .select('id, name, phone, room_number')
    .single();
  if (hostelerError) throw hostelerError;

  const { data: inviteToken, error: tokenError } = await supabase
    .from('invite_tokens')
    .insert({ hosteler_id: hosteler.id, token, expires_at: expiresAt, used: false })
    .select('id')
    .single();
  if (tokenError) throw tokenError;

  await registerCleanupRecords([
    createCleanupRecord({ ...context, resource: 'invite_tokens', recordId: inviteToken.id, deleteOrder: 10, cleanupStrategy: 'delete' }),
    createCleanupRecord({ ...context, resource: 'hostelers', recordId: hosteler.id, deleteOrder: 30, cleanupStrategy: 'delete' }),
  ]);

  return {
    hostelerId: hosteler.id,
    name: hosteler.name,
    phone: hosteler.phone,
    roomNumber: hosteler.room_number,
    inviteTokenId: inviteToken.id,
    inviteUrl: `/join/${token}`,
    cleanupIds: [inviteToken.id, hosteler.id],
    testRunId: context.testRunId,
  };
}

export async function createActivePinHosteler(options: FactoryOptions) {
  const supabase = createSupabaseTestClient();
  const context = baseFactoryContext(options);
  const suffix = createShortId('pin');
  const pin = '1234';
  const phone = `97${Date.now().toString().slice(-8)}`;
  const name = `${context.marker} Active PIN`;
  const email = `${phone}@hosteler.dcastle.local`;

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: getHostelerAuthPassword(phone, pin),
    email_confirm: true,
  });
  if (authError) throw authError;

  const pinHash = await bcrypt.hash(pin, 10);
  const { data: hosteler, error: hostelerError } = await supabase
    .from('hostelers')
    .insert({
      name,
      phone,
      room_number: suffix,
      pin_hash: pinHash,
      status: 'active',
      auth_user_id: authUser.user.id,
      activated_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (hostelerError) throw hostelerError;

  await registerCleanupRecords([
    createCleanupRecord({ ...context, resource: 'food_preferences', recordId: hosteler.id, deleteOrder: 20, cleanupStrategy: 'delete' }),
    createCleanupRecord({ ...context, resource: 'hostelers', recordId: hosteler.id, deleteOrder: 30, cleanupStrategy: 'delete' }),
    createCleanupRecord({ ...context, resource: 'auth.users', recordId: authUser.user.id, deleteOrder: 40, cleanupStrategy: 'delete' }),
  ]);

  return { hostelerId: hosteler.id, name, phone, pin, authUserId: authUser.user.id, cleanupIds: [hosteler.id, authUser.user.id], testRunId: context.testRunId };
}

export async function createActiveGoogleHosteler(options: FactoryOptions) {
  const supabase = createSupabaseTestClient();
  const context = baseFactoryContext(options);
  const suffix = createShortId('google');
  const email = `${suffix}@hosteler.dcastle.local`;
  const phone = `96${Date.now().toString().slice(-8)}`;

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({ email, password: createShortId('pw'), email_confirm: true });
  if (authError) throw authError;

  const { data: hosteler, error: hostelerError } = await supabase
    .from('hostelers')
    .insert({ name: `${context.marker} Google`, phone, room_number: suffix, status: 'active', auth_user_id: authUser.user.id, activated_at: new Date().toISOString() })
    .select('id')
    .single();
  if (hostelerError) throw hostelerError;

  await registerCleanupRecords([
    createCleanupRecord({ ...context, resource: 'hostelers', recordId: hosteler.id, deleteOrder: 30, cleanupStrategy: 'delete' }),
    createCleanupRecord({ ...context, resource: 'auth.users', recordId: authUser.user.id, deleteOrder: 40, cleanupStrategy: 'delete' }),
  ]);

  return { hostelerId: hosteler.id, email, phone, authUserId: authUser.user.id, cleanupIds: [hosteler.id, authUser.user.id], testRunId: context.testRunId };
}

export async function createFutureFoodPreference(options: FactoryOptions & { meals?: { breakfast: boolean; lunch: boolean; dinner: boolean } }) {
  const activeHosteler = await createActivePinHosteler(options);
  const supabase = createSupabaseTestClient();
  const context = baseFactoryContext(options);
  const date = futureDate();
  const meals = options.meals || { breakfast: true, lunch: false, dinner: true };

  const { data: preference, error } = await supabase
    .from('food_preferences')
    .insert({ hosteler_id: activeHosteler.hostelerId, date, ...meals })
    .select('id')
    .single();
  if (error) throw error;

  await registerCleanupRecords([
    createCleanupRecord({ ...context, resource: 'food_preferences', recordId: preference.id, deleteOrder: 10, cleanupStrategy: 'delete' }),
  ]);

  return { hostelerId: activeHosteler.hostelerId, preferenceId: preference.id, date, meals, cleanupIds: [preference.id], testRunId: context.testRunId };
}

export async function snapshotSettings(options: FactoryOptions) {
  const supabase = createSupabaseTestClient();
  const context = baseFactoryContext(options);
  const { data, error } = await supabase.from('settings').select('key, value');
  if (error) throw error;
  const settingsBefore = Object.fromEntries((data || []).map(row => [row.key, row.value]));
  const snapshotId = createShortId('settings');

  await registerCleanupRecords([
    createCleanupRecord({ ...context, resource: 'settings', recordId: snapshotId, deleteOrder: 1, cleanupStrategy: 'restore', restoreValue: settingsBefore }),
  ]);

  return {
    settingsBefore,
    cleanupIds: [snapshotId],
    testRunId: context.testRunId,
    restore: async () => {
      for (const [key, value] of Object.entries(settingsBefore)) {
        const { error: restoreError } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
        if (restoreError) throw restoreError;
      }
    },
  };
}
