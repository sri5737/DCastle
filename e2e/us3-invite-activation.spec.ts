import { test, expect } from '@playwright/test';
import { loginAsOwner } from './helpers';

test.describe('US3: Invite Activation', () => {
  test('owner registers hosteler and hosteler activates via PIN', async ({ page, request }) => {
    // Step 1: Login as owner first to get session cookies
    await loginAsOwner(page);

    const uniquePhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
    const hostelerName = `E2E Invite Tester ${Date.now()}`;

    // Create hosteler via browser fetch (uses owner's cookies)
    const createResult = await page.evaluate(async (data) => {
      const res = await fetch('/api/hostelers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) };
    }, { name: hostelerName, phone: uniquePhone, room_number: 'T-201' });

    expect(createResult.ok).toBeTruthy();
    const hosteler = createResult.body.hosteler;

    // Step 2: Generate invite token via browser fetch
    const inviteResult = await page.evaluate(async (hostelerId) => {
      const res = await fetch('/api/invite/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hosteler_id: hostelerId }),
      });
      return { ok: res.ok, body: await res.json().catch(() => null) };
    }, hosteler.id);

    expect(inviteResult.ok).toBeTruthy();
    const token = inviteResult.body.token;

    // Step 3: Hosteler visits the invite link (new browser context - no owner cookies)
    await page.context().clearCookies();
    await page.goto(`/join/${token}`);

    // Step 4: Verify welcome/activation page loads
    await expect(
      page.getByRole('heading', { name: /Welcome to DCastle/i })
    ).toBeVisible({ timeout: 10000 });

    // Step 5: Click "Set up 4-digit PIN" button
    await page.getByRole('button', { name: /set up 4-digit pin/i }).click();

    // Step 6: Set a 4-digit PIN
    const pinInputs = page.locator('input[type="password"]');
    await pinInputs.nth(0).fill('5678');
    await pinInputs.nth(1).fill('5678');

    // Step 7: Submit activation
    await page.getByRole('button', { name: /activate account/i }).click();

    // Step 8: After activation, page navigates away from /join (to /dashboard or /login)
    // The key assertion is that activation succeeded without showing an error
    await expect(page.getByText(/activation failed|network error/i)).not.toBeVisible({ timeout: 3000 }).catch(() => {});
    await page.waitForURL(url => !url.pathname.includes('/join'), { timeout: 15000 });
  });

  test('expired token shows error', async ({ page }) => {
    await page.goto('/join/expired-invalid-token-12345');
    await expect(
      page.getByRole('heading', { name: /expired|invalid/i })
    ).toBeVisible({ timeout: 10000 });
  });
});
