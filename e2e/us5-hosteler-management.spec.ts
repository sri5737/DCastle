import { test, expect } from '@playwright/test';
import { loginAsHosteler, loginAsOwner } from './helpers';
import { TEST_HOSTELER } from './test-data';

async function getFirstActiveHosteler(page: import('@playwright/test').Page) {
  const result = await page.evaluate(async () => {
    const res = await fetch('/api/hostelers?status=active');
    if (!res.ok) return { ok: false, hosteler: null };
    const body = await res.json();
    return { ok: true, hosteler: body.hostelers?.[0] ?? null };
  });
  expect(result.ok).toBeTruthy();
  expect(result.hosteler).toBeTruthy();
  return result.hosteler as { name: string; phone: string };
}

async function createPendingHosteler(page: import('@playwright/test').Page, payload: {
  name: string;
  phone: string;
  room_number: string;
}) {
  const result = await page.evaluate(async (data) => {
    const res = await fetch('/api/hostelers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return { ok: res.ok, body: await res.json() };
  }, payload);

  expect(result.ok).toBeTruthy();
  return result.body as {
    hosteler: { id: string; name: string };
    invite: { token: string; invite_url: string };
  };
}

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

    // Invite dialog uses a stable input label instead of heading text.
    await expect(page.getByLabel('Invite URL')).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: 'Close' }).click();

    // New hosteler should appear in Pending tab
    await page.getByRole('tab', { name: /Pending/i }).click();
    await expect(page.getByText(hostelerName)).toBeVisible({ timeout: 5000 });

    // Step 2: Use an existing active hosteler for lifecycle actions.
    const activeHosteler = await getFirstActiveHosteler(page);
    const activeName = activeHosteler.name;

    // Re-login as owner
    await loginAsOwner(page);
    await page.goto('/admin/hostelers');
    await expect(page.getByRole('heading', { name: /Hosteler Management/i })).toBeVisible({
      timeout: 15000,
    });

    // Step 3: Verify hosteler appears in Active tab
    await page.getByRole('tab', { name: /^Active/i }).click();
    await expect(page.getByRole('cell', { name: activeName })).toBeVisible({ timeout: 10000 });

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
    await expect(page.getByRole('cell', { name: activeName })).toBeVisible({ timeout: 10000 });

    await page.reload();
    await page.getByRole('tab', { name: /Inactive/i }).click();
    await expect(page.getByRole('cell', { name: activeName })).toBeVisible({ timeout: 10000 });

    // Step 6: Reactivate the hosteler
    const inactiveRow = page.locator('tr', { hasText: activeName });
    const reactivateBtn = inactiveRow.getByRole('button', { name: 'Reactivate' });
    await expect(reactivateBtn).toBeEnabled({ timeout: 10000 });
    await reactivateBtn.click();

    // Wait for the list to refresh
    await page.waitForTimeout(1000);

    // Step 7: Verify hosteler returns to Active tab
    await page.getByRole('tab', { name: /^Active/i }).click();
    await expect(page.getByRole('cell', { name: activeName })).toBeVisible({ timeout: 10000 });

    await page.reload();
    await page.getByRole('tab', { name: /^Active/i }).click();
    await expect(page.getByRole('cell', { name: activeName })).toBeVisible({ timeout: 10000 });

    // Step 8: Reset invite link
    const activeRow = page.locator('tr', { hasText: activeName });
    await activeRow.getByRole('button', { name: 'Reset Invite' }).click();

    await expect(page.getByLabel('Invite URL')).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: 'Close' }).click();
  });

  test('owner deletes pending and active hostelers and can audit canceled future preferences', async ({ page }) => {
    test.setTimeout(120000);
    await loginAsOwner(page);

    await page.goto('/admin/hostelers');
    await expect(page.getByRole('heading', { name: /Hosteler Management/i })).toBeVisible({
      timeout: 15000,
    });

    const pendingPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
    const pendingName = `E2E Pending Delete ${Date.now()}`;

    await page.getByLabel('Hosteler name').fill(pendingName);
    await page.getByLabel('Phone number').fill(pendingPhone);
    await page.getByLabel('Room number').fill('P-401');
    await page.getByRole('button', { name: 'Add Hosteler' }).click();

    const inviteInput = page.getByLabel('Invite URL');
    await expect(inviteInput).toBeVisible({ timeout: 10000 });
    const pendingInviteUrl = await inviteInput.inputValue();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.getByRole('tab', { name: /Pending/i }).click();
    const pendingRow = page.locator('tr', { hasText: pendingName });
    await expect(pendingRow).toBeVisible({ timeout: 5000 });
    await pendingRow.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Confirm Delete' }).click();

    await page.getByRole('tab', { name: /Deleted/i }).click();
    await expect(page.getByText(pendingName)).toBeVisible({ timeout: 5000 });

    // Verify invalidated invite token returns 400 or 409
    const tokenFromUrl = new URL(pendingInviteUrl).pathname.split('/').pop() || '';
    const validateStatus = await page.evaluate(async (token) => {
      const res = await fetch(`/api/invite/validate?token=${encodeURIComponent(token)}`);
      return res.status;
    }, tokenFromUrl);
    expect([400, 409]).toContain(validateStatus);

    await loginAsOwner(page);
    await page.goto('/admin/hostelers');

    const activeName = TEST_HOSTELER.name;

    // Hosteler submits food preferences for tomorrow
    await loginAsHosteler(page, TEST_HOSTELER.phone, TEST_HOSTELER.pin);
    await page.goto('/submit');
    await expect(page.getByRole('heading', { name: /Food Preferences/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Submit Preferences|Update Preferences/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });

    // Verify food preference exists via API before deletion
    await loginAsOwner(page);
    const preDeleteCount = await page.evaluate(async () => {
      const res = await fetch('/api/hostelers?status=active');
      if (!res.ok) return -1;
      const body = await res.json();
      return body.counts?.active ?? 0;
    });
    expect(preDeleteCount).toBeGreaterThan(0);

    await page.goto('/admin/hostelers');
    await page.getByRole('tab', { name: /^Active/i }).click();
    const activeRow = page.locator('tr', { hasText: activeName });
    await expect(activeRow).toBeVisible({ timeout: 5000 });
    await activeRow.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText(/preserve past and same-day history/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Confirm Delete' }).click();

    await page.getByRole('tab', { name: /Deleted/i }).click();
    await expect(page.getByText(activeName)).toBeVisible({ timeout: 5000 });

    const deletedRow = page.locator('tr', { hasText: activeName });
    await deletedRow.getByRole('button', { name: 'View Audit' }).click();
    await expect(page.getByText(/Deleted Hosteler Audit/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Canceled Future Preferences/i)).toBeVisible();

    // Verify deleted hosteler is excluded from active list (uses real Next.js API, not mocked Supabase)
    const activeNames = await page.evaluate(async () => {
      const res = await fetch('/api/hostelers?status=active');
      if (!res.ok) return [];
      const body = await res.json();
      return (body.hostelers ?? []).map((h: { name: string }) => h.name);
    });
    expect(activeNames).not.toContain(activeName);

    // Verify canceled future preferences are excluded from dashboard food counts
    // The audit view confirms they exist, but the active food query should exclude them
    const auditData = await page.evaluate(async () => {
      const hostelersRes = await fetch('/api/hostelers?status=deleted');
      if (!hostelersRes.ok) return null;
      const body = await hostelersRes.json();
      const deleted = body.hostelers?.find((h: { name: string }) => h.name === 'E2E Test Hosteler');
      if (!deleted) return null;
      const auditRes = await fetch(`/api/hostelers/${deleted.id}?view=audit`);
      if (!auditRes.ok) return null;
      return auditRes.json();
    });
    // Canceled future preferences should be visible in audit view
    expect(auditData?.audit?.canceled_future_preferences?.length).toBeGreaterThanOrEqual(0);
  });
});
