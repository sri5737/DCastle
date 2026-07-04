import { test, expect } from '@playwright/test';
import { loginAsOwner } from './helpers';

test.describe('US5: Owner Manages Hosteler Registrations', () => {
  test('owner adds hosteler, deactivates, reactivates, and resets invite', async ({ page }) => {
    test.setTimeout(90000);
    await loginAsOwner(page);

    // Navigate to hosteler management page
    await page.goto('/admin/hostelers');
    await expect(page.getByRole('heading', { name: /Hosteler Management/i })).toBeVisible({
      timeout: 15000,
    });

    const uniquePhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
    const hostelerName = `E2E Manage ${Date.now()}`;

    // Step 1: Add a new hosteler
    await page.getByLabel('Hosteler name').fill(hostelerName);
    await page.getByLabel('Phone number').fill(uniquePhone);
    await page.getByLabel('Room number').fill('M-301');
    await page.getByRole('button', { name: 'Add Hosteler' }).click();

    // Invite link dialog should appear
    await expect(page.getByText('Invite Link Generated')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Close' }).click();

    // New hosteler should appear in Pending tab
    await page.getByRole('tab', { name: /Pending/i }).click();
    await expect(page.getByText(hostelerName)).toBeVisible({ timeout: 5000 });

    // Step 2: To test deactivate/reactivate, we need an active hosteler
    // Create a second hosteler and activate via the invite flow
    const activePhone = `8${Math.floor(100000000 + Math.random() * 900000000)}`;
    const activeName = `E2E Active ${Date.now()}`;

    const createResult = await page.evaluate(async (data) => {
      const res = await fetch('/api/hostelers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return { ok: res.ok, body: await res.json() };
    }, { name: activeName, phone: activePhone, room_number: 'M-302' });

    expect(createResult.ok).toBeTruthy();
    const activeHostelerId = createResult.body.hosteler.id;
    const inviteToken = createResult.body.invite.token;

    // Activate the hosteler via the invite flow (PIN activation)
    await page.context().clearCookies();
    await page.goto(`/join/${inviteToken}`);
    await expect(page.getByRole('heading', { name: /Welcome/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /set up 4-digit pin/i }).click();
    const pinInputs = page.locator('input[type="password"]');
    await pinInputs.nth(0).fill('4321');
    await pinInputs.nth(1).fill('4321');
    await page.getByRole('button', { name: /activate account/i }).click();
    await page.waitForURL((url) => !url.pathname.includes('/join'), { timeout: 15000 });

    // Re-login as owner
    await loginAsOwner(page);
    await page.goto('/admin/hostelers');
    await expect(page.getByRole('heading', { name: /Hosteler Management/i })).toBeVisible({
      timeout: 15000,
    });

    // Step 3: Verify hosteler appears in Active tab
    await page.getByRole('tab', { name: /^Active/i }).click();
    await expect(page.getByText(activeName)).toBeVisible({ timeout: 5000 });

    // Step 4: Deactivate the hosteler
    const hostelerRow = page.locator('tr', { hasText: activeName });
    await hostelerRow.getByRole('button', { name: 'Deactivate' }).click();

    // If confirmation dialog appears, confirm it
    const confirmButton = page.getByRole('button', { name: 'Confirm Deactivate' });
    if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Wait for the list to refresh
    await page.waitForTimeout(1000);

    // Step 5: Verify hosteler appears in Inactive tab
    await page.getByRole('tab', { name: /Inactive/i }).click();
    await expect(page.getByText(activeName)).toBeVisible({ timeout: 5000 });

    await page.reload();
    await page.getByRole('tab', { name: /Inactive/i }).click();
    await expect(page.getByText(activeName)).toBeVisible({ timeout: 5000 });

    // Step 6: Reactivate the hosteler
    const inactiveRow = page.locator('tr', { hasText: activeName });
    const reactivateBtn = inactiveRow.getByRole('button', { name: 'Reactivate' });
    await expect(reactivateBtn).toBeEnabled({ timeout: 10000 });
    await reactivateBtn.click();

    // Wait for the list to refresh
    await page.waitForTimeout(1000);

    // Step 7: Verify hosteler returns to Active tab
    await page.getByRole('tab', { name: /^Active/i }).click();
    await expect(page.getByText(activeName)).toBeVisible({ timeout: 5000 });

    await page.reload();
    await page.getByRole('tab', { name: /^Active/i }).click();
    await expect(page.getByText(activeName)).toBeVisible({ timeout: 5000 });

    // Step 8: Reset invite link
    const activeRow = page.locator('tr', { hasText: activeName });
    await activeRow.getByRole('button', { name: 'Reset Invite' }).click();

    // Invite link dialog should appear
    await expect(page.getByText('Invite Link Generated')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Close' }).click();
  });
});
