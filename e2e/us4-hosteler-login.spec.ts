import { test, expect } from '@playwright/test';
import { loginAsHosteler } from './helpers';
import { TEST_HOSTELER } from './test-data';

test.describe('US4: Hosteler Login', () => {
  test('hosteler logs in with phone + PIN and sees dashboard', async ({ page }) => {
    await loginAsHosteler(page);
    expect(page.url()).toContain('/dashboard');
    await expect(page.getByRole('heading', { name: /meal/i })).toBeVisible();
  });

  test('invalid PIN shows error message', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#phone').fill(TEST_HOSTELER.phone);
    await page.locator('#pin').fill('0000');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('unregistered phone shows error', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#phone').fill('9000000001');
    await page.locator('#pin').fill('1234');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 5000 });
    expect(page.url()).toContain('/login');
  });
});
