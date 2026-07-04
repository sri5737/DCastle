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
 * This tests the server-side /api/auth/login proxy route.
 */
export async function loginAsAdmin(page: Page, email?: string, password?: string) {
  const loginEmail = email || TEST_OWNER.email;
  const loginPassword = password || TEST_OWNER.password;

  await page.goto('/admin/login');
  await page.fill('#email', loginEmail);
  await page.fill('#password', loginPassword);
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard after successful login
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 30000 });
}

/**
 * Login as a hosteler via phone + PIN on /login.
 * Uses E2E_TEST_HOSTELER_PHONE and E2E_TEST_HOSTELER_PIN from env.
 * This tests the server-side /api/auth/pin/verify proxy route.
 */
export async function loginAsHosteler(page: Page, phone?: string, pin?: string) {
  const hostelerPhone = phone || TEST_HOSTELER.phone;
  const hostelerPin = pin || TEST_HOSTELER.pin;

  await page.goto('/login');
  
  // Fill in the PIN login form (not Google OAuth)
  await page.fill('#phone', hostelerPhone);
  await page.fill('#pin', hostelerPin);
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard after successful login
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
}

/**
 * Logs the user out by clearing cookies and local storage.
 */
export async function logout(page: Page) {
	await page.context().clearCookies();
	await page.evaluate(() => {
		// This will clear all local storage, which is fine for tests
		window.localStorage.clear();
	});
}

/**
 * Verifies that the user is on the admin dashboard.
 */
export async function verifyAdminDashboard(page: Page) {
	await expect(page).toHaveURL(/\/admin\/dashboard/);
}

/**
 * Verifies that the user is on the hosteler dashboard.
 */
export async function verifyHostelerDashboard(page: Page) {
	await expect(page).toHaveURL(/\/dashboard/);
}

/**
 * Wait for navigation to complete after a form submission.
 */
export async function waitForNavigation(page: Page, url: string) {
  await page.waitForURL(url, { timeout: 10000 });
  expect(page.url()).toContain(url);
}
