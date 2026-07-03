import { Page, expect } from '@playwright/test';
import { TEST_OWNER, TEST_HOSTELER } from './test-data';

/**
 * Login as the PG owner via email/password on /admin/login.
 * Uses E2E_TEST_OWNER_EMAIL and E2E_TEST_OWNER_PASSWORD from env.
 */
export async function loginAsOwner(page: Page) {
  await page.goto('/admin/login');
  await page.locator('#email').fill(TEST_OWNER.email);
  await page.locator('#password').fill(TEST_OWNER.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  // Wait for redirect to owner dashboard (first auth call can be slow)
  await page.waitForURL('**/admin/dashboard', { timeout: 30000 });
}

/**
 * Login as a hosteler via phone + PIN on /login.
 * Uses E2E_TEST_HOSTELER_PHONE and E2E_TEST_HOSTELER_PIN from env.
 */
export async function loginAsHosteler(page: Page, phone?: string, pin?: string) {
  await page.goto('/login');
  await page.locator('#phone').fill(phone || TEST_HOSTELER.phone);
  await page.locator('#pin').fill(pin || TEST_HOSTELER.pin);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();

  // Wait for either redirect to dashboard OR an error message
  const result = await Promise.race([
    page.waitForURL('**/dashboard', { timeout: 30000 }).then(() => 'redirected'),
    page.getByText(/invalid|incorrect|failed|error|network/i).waitFor({ timeout: 30000 }).then(async () => {
      const errorEl = page.getByText(/invalid|incorrect|failed|error|network/i);
      const errorText = await errorEl.textContent();
      return `error: ${errorText}`;
    }),
  ]);

  if (result !== 'redirected') {
    throw new Error(`Login failed - page showed: ${result}`);
  }
}

/**
 * Wait for navigation to complete after a form submission.
 */
export async function waitForNavigation(page: Page, url: string) {
  await page.waitForURL(url, { timeout: 10000 });
  expect(page.url()).toContain(url);
}
