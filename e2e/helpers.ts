import { Page, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { TEST_OWNER, TEST_HOSTELER } from './test-data';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function createOwnerAuthClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and anon key are required for E2E owner login');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getSupabaseStorageKey() {
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  return `sb-${projectRef}-auth-token`;
}

/**
 * Login as the PG owner via email/password on /admin/login.
 * Uses E2E_TEST_OWNER_EMAIL and E2E_TEST_OWNER_PASSWORD from env.
 */
export async function loginAsOwner(page: Page) {
  const ownerAuthClient = createOwnerAuthClient();
  const { data, error } = await ownerAuthClient.auth.signInWithPassword({
    email: TEST_OWNER.email,
    password: TEST_OWNER.password,
  });

  if (error || !data.session) {
    throw new Error(`Owner login setup failed: ${error?.message || 'missing session'}`);
  }

  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: data.session.user }),
    });
  });

  await page.route('**/rest/v1/settings**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ key: 'deadline_time', value: '23:59' }]),
    });
  });

  await page.route('**/rest/v1/food_preferences**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });

  await page.route('**/rest/v1/hostelers**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'e2e-hosteler', name: TEST_HOSTELER.name, room_number: TEST_HOSTELER.room_number },
      ]),
    });
  });

  await page.goto('/admin/login');
  const browserOrigin = new URL(page.url()).origin;

  await page.context().addCookies([
    {
      name: 'sb-access-token',
      value: data.session.access_token,
      url: browserOrigin,
    },
    {
      name: 'sb-refresh-token',
      value: data.session.refresh_token,
      url: browserOrigin,
    },
  ]);

  await page.evaluate(
    ({ storageKey, session }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
    },
    { storageKey: getSupabaseStorageKey(), session: data.session }
  );

  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 30000 });
}

/**
 * Login as a hosteler via phone + PIN on /login.
 * Uses E2E_TEST_HOSTELER_PHONE and E2E_TEST_HOSTELER_PIN from env.
 */
export async function loginAsHosteler(page: Page, phone?: string, pin?: string) {
  const hostelerPhone = phone || TEST_HOSTELER.phone;
  const hostelerPin = pin || TEST_HOSTELER.pin;

  const authClient = createOwnerAuthClient();
  const { data, error } = await authClient.auth.signInWithPassword({
    email: `${hostelerPhone}@hosteler.dcastle.local`,
    password: hostelerPin,
  });

  if (error || !data.session) {
    throw new Error(`Hosteler login setup failed: ${error?.message || 'missing session'}`);
  }

  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: data.session.user }),
    });
  });

  await page.goto('/login');
  const browserOrigin = new URL(page.url()).origin;

  await page.context().addCookies([
    {
      name: 'sb-access-token',
      value: data.session.access_token,
      url: browserOrigin,
    },
    {
      name: 'sb-refresh-token',
      value: data.session.refresh_token,
      url: browserOrigin,
    },
  ]);

  await page.evaluate(
    ({ storageKey, session }) => {
      window.localStorage.setItem(storageKey, JSON.stringify(session));
    },
    { storageKey: getSupabaseStorageKey(), session: data.session }
  );

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
}

/**
 * Wait for navigation to complete after a form submission.
 */
export async function waitForNavigation(page: Page, url: string) {
  await page.waitForURL(url, { timeout: 10000 });
  expect(page.url()).toContain(url);
}
