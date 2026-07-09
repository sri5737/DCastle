import { Page, expect, type TestInfo } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { TEST_OWNER, TEST_HOSTELER_AUTH_PRINCIPAL } from './test-data';
import { createFailureArtifactCollector } from './artifacts';

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

  await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
  const submitButton = page.locator('form button[type="submit"]');
  await expect(submitButton).toBeEnabled({ timeout: 30000 });
  await page.fill('#email', loginEmail);
  await page.fill('#password', loginPassword);

  const loginResponsePromise = page.waitForResponse(
    response => response.url().includes('/api/auth/login') && response.request().method() === 'POST',
    { timeout: 30000 },
  );
  await submitButton.click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBeTruthy();
  
  // Wait for navigation to dashboard after successful login
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 30000 });
  await assertReloadKeepsRoute(page, /\/admin\/dashboard/);
}

/**
 * Backwards-compatible alias for owner login used by existing specs.
 */
export const loginAsOwner = loginAsAdmin;

/**
 * Login as a hosteler via phone + PIN on /login.
 * Uses E2E_TEST_HOSTELER_PHONE and E2E_TEST_HOSTELER_PIN from env.
 * This tests the server-side /api/auth/pin/verify proxy route.
 */
export async function loginAsHosteler(page: Page, phone?: string, pin?: string) {
  const hostelerPhone = phone || TEST_HOSTELER_AUTH_PRINCIPAL.phone;
  const hostelerPin = pin || TEST_HOSTELER_AUTH_PRINCIPAL.pin;

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  const phoneInput = page.locator('#phone');
  const pinInput = page.locator('#pin');
  const submitButton = page.locator('form button[type="submit"]');
  await expect(phoneInput).toBeEditable({ timeout: 30000 });
  
  // Fill in the PIN login form (not Google OAuth)
  await phoneInput.fill(hostelerPhone);
  await pinInput.fill(hostelerPin);
  await expect(submitButton).toBeEnabled({ timeout: 30000 });

  const loginResponsePromise = page.waitForResponse(
    response => response.url().includes('/api/auth/pin/verify') && response.request().method() === 'POST',
    { timeout: 30000 },
  );
  await submitButton.click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBeTruthy();
  
  // Wait for navigation to dashboard after successful login
  try {
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
  } catch {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  }
  await assertReloadKeepsRoute(page, /\/dashboard/);
}

export async function loginAsHostelerViaPinApi(page: Page, phone?: string, pin?: string) {
  const hostelerPhone = phone || TEST_HOSTELER_AUTH_PRINCIPAL.phone;
  const hostelerPin = pin || TEST_HOSTELER_AUTH_PRINCIPAL.pin;

  const response = await page.request.post('/api/auth/pin/verify', {
    data: { phone: hostelerPhone, pin: hostelerPin },
    timeout: 30000,
  });
  expect(response.ok()).toBeTruthy();

  const authCookies = response
    .headersArray()
    .filter(header => header.name.toLowerCase() === 'set-cookie')
    .map(header => header.value.match(/^([^=]+)=([^;]*)/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map(match => ({
      name: match[1],
      value: match[2],
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax' as const,
    }));

  await page.context().addCookies(authCookies);
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

export async function waitForApiResponse(page: Page, urlPart: string, method: string, expectedStatus?: number, timeout = 30000) {
  const response = await page.waitForResponse(
    candidate => candidate.url().includes(urlPart) && candidate.request().method() === method,
    { timeout },
  );

  if (expectedStatus !== undefined) {
    expect(response.status()).toBe(expectedStatus);
  }

  return response;
}

export async function waitForJsonApiResponse<T>(page: Page, urlPart: string, method: string, expectedStatus?: number) {
  const response = await waitForApiResponse(page, urlPart, method, expectedStatus);
  return response.json() as Promise<T>;
}

export async function assertReloadKeepsRoute(page: Page, expectedUrl: RegExp | string) {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(expectedUrl, { timeout: 30000 });
}

export function registerFailureArtifacts(page: Page, testInfo: TestInfo) {
  const collector = createFailureArtifactCollector(page, testInfo);
  return async () => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await collector.flush();
    }
  };
}
