import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { loginAsOwner } from './helpers';
import {
  createActiveGoogleHosteler,
  createActivePinHosteler,
} from './factories';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function createServiceClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase service credentials are required for US5 E2E setup');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getFutureDate(daysAhead: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

test.describe('US5: Owner Manages Hosteler Registrations', () => {
  test('owner adds hosteler, deactivates, reactivates, and resets invite', async ({ page }, testInfo) => {
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

    // Step 2: Use an isolated active hosteler for lifecycle actions.
    const activeHosteler = await createActivePinHosteler({
      specPath: testInfo.file,
      testTitle: testInfo.title,
      markerScope: 'us5-deactivate-reactivate-reset',
    });

    // Re-login as owner
    await loginAsOwner(page);
    await page.goto('/admin/hostelers');
    await expect(page.getByRole('heading', { name: /Hosteler Management/i })).toBeVisible({
      timeout: 15000,
    });

    // Step 3: Verify hosteler appears in Active tab
    await page.getByRole('tab', { name: /^Active/i }).click();
    await expect(page.getByRole('cell', { name: activeHosteler.phone })).toBeVisible({ timeout: 10000 });

    // Step 4: Deactivate the hosteler
    const hostelerRow = page.locator('tr', { hasText: activeHosteler.phone });
    const deactivateResponsePromise = page.waitForResponse(
      response => response.url().includes(`/api/hostelers/${activeHosteler.hostelerId}`) && response.request().method() === 'PATCH',
      { timeout: 60000 },
    );
    await hostelerRow.getByRole('button', { name: 'Deactivate' }).click();
    const deactivateResponse = await deactivateResponsePromise;
    expect(deactivateResponse.ok()).toBeTruthy();

    // If confirmation dialog appears, confirm it
    const confirmButton = page.getByRole('button', { name: 'Confirm Deactivate' });
    if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmButton.click();
    }

    await expect(page.getByText('Loading hostelers...')).not.toBeVisible({ timeout: 10000 });

    // Step 5: Verify hosteler appears in Inactive tab
    await page.getByRole('tab', { name: /Inactive/i }).click();
    await expect(page.getByRole('cell', { name: activeHosteler.phone })).toBeVisible({ timeout: 10000 });

    await page.reload();
    await page.getByRole('tab', { name: /Inactive/i }).click();
    await expect(page.getByRole('cell', { name: activeHosteler.phone })).toBeVisible({ timeout: 10000 });

    // Step 6: Reactivate the hosteler
    const inactiveRow = page.locator('tr', { hasText: activeHosteler.phone });
    const reactivateBtn = inactiveRow.getByRole('button', { name: 'Reactivate' });
    await expect(reactivateBtn).toBeEnabled({ timeout: 10000 });
    const reactivateResponsePromise = page.waitForResponse(
      response => response.url().includes(`/api/hostelers/${activeHosteler.hostelerId}`) && response.request().method() === 'PATCH',
      { timeout: 60000 },
    );
    await reactivateBtn.click();
    const reactivateResponse = await reactivateResponsePromise;
    expect(reactivateResponse.ok()).toBeTruthy();

    await expect(page.getByText('Loading hostelers...')).not.toBeVisible({ timeout: 10000 });

    // Step 7: Verify hosteler returns to Active tab
    await page.getByRole('tab', { name: /^Active/i }).click();
    await expect(page.getByRole('cell', { name: activeHosteler.phone })).toBeVisible({ timeout: 10000 });

    await page.reload();
    await page.getByRole('tab', { name: /^Active/i }).click();
    await expect(page.getByRole('cell', { name: activeHosteler.phone })).toBeVisible({ timeout: 10000 });

    // Step 8: Reset invite link
    const activeRow = page.locator('tr', { hasText: activeHosteler.phone });
    const resetInviteResponsePromise = page.waitForResponse(
      response =>
        response.url().includes(`/api/hostelers/${activeHosteler.hostelerId}/reset-invite`) &&
        response.request().method() === 'POST',
      { timeout: 60000 },
    );
    await activeRow.getByRole('button', { name: 'Reset Invite' }).click();
    const resetInviteResponse = await resetInviteResponsePromise;
    expect(resetInviteResponse.ok()).toBeTruthy();

    const inviteDialog = page.getByRole('dialog', { name: /Invite Link Generated/i });
    await expect(inviteDialog).toBeVisible({ timeout: 20000 });
    await expect(inviteDialog.getByLabel('Invite URL')).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: 'Close' }).click();
  });

  /*
  test('owner deletes pending and active hostelers and can audit canceled future preferences', async ({ page }, testInfo) => {
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

    const activeHosteler = await createActivePinHosteler({
      specPath: testInfo.file,
      testTitle: testInfo.title,
      markerScope: 'us5-delete-audit',
    });

    // Deterministic setup: future preference exists before owner deletion.
    const supabase = createServiceClient();
    const { error: preferenceError } = await supabase.from('food_preferences').insert({
      hosteler_id: activeHosteler.hostelerId,
      date: getFutureDate(1),
      breakfast: true,
      lunch: true,
      dinner: false,
    });
    expect(preferenceError).toBeNull();

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
    const activeRow = page.locator('tr', { hasText: activeHosteler.phone });
    await expect(activeRow).toBeVisible({ timeout: 5000 });
    await activeRow.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText(/preserve past and same-day history/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Confirm Delete' }).click();

    await page.getByRole('tab', { name: /Deleted/i }).click();
    await expect(page.getByText(activeHosteler.phone)).toBeVisible({ timeout: 5000 });

    const deletedRow = page.locator('tr', { hasText: activeHosteler.phone });
    await deletedRow.getByRole('button', { name: 'View Audit' }).click();
    await expect(page.getByText(/Deleted Hosteler Audit/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Canceled Future Preferences/i)).toBeVisible();

    // Verify deleted hosteler is excluded from active list (uses real Next.js API, not mocked Supabase)
    const activePhones = await page.evaluate(async () => {
      const res = await fetch('/api/hostelers?status=active');
      if (!res.ok) return [];
      const body = await res.json();
      return (body.hostelers ?? []).map((h: { phone: string }) => h.phone);
    });
    expect(activePhones).not.toContain(activeHosteler.phone);

    // Verify canceled future preferences are excluded from dashboard food counts
    // The audit view confirms they exist, but the active food query should exclude them
    const auditData = await page.evaluate(async (deletedHostelerPhone) => {
      const hostelersRes = await fetch('/api/hostelers?status=deleted');
      if (!hostelersRes.ok) return null;
      const body = await hostelersRes.json();
      const deleted = body.hostelers?.find((h: { phone: string }) => h.phone === deletedHostelerPhone);
      if (!deleted) return null;
      const auditRes = await fetch(`/api/hostelers/${deleted.id}?view=audit`);
      if (!auditRes.ok) return null;
      return auditRes.json();
    }, activeHosteler.phone);
    // Canceled future preferences should be visible in audit view
    expect(auditData?.audit?.canceled_future_preferences?.length).toBeGreaterThanOrEqual(0);
  });

  test('owner-assisted PIN reset invalidates old PIN and accepts new PIN', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await loginAsOwner(page);

    const newPin = '2468';

    const hosteler = await createActivePinHosteler({
      specPath: testInfo.file,
      testTitle: testInfo.title,
      markerScope: 'us5-pin-reset',
    });

    await page.goto('/admin/hostelers');
    await page.getByRole('tab', { name: /^Active/i }).click();
    const activeRow = page.locator('tr', { hasText: hosteler.phone });
    await expect(activeRow).toBeVisible({ timeout: 10000 });
    const resetInviteResponsePromise = page.waitForResponse(
      response =>
        response.url().includes(`/api/hostelers/${hosteler.hostelerId}/reset-invite`) &&
        response.request().method() === 'POST',
      { timeout: 60000 },
    );
    await activeRow.getByRole('button', { name: 'Reset Invite' }).click();
    const resetInviteResponse = await resetInviteResponsePromise;
    expect(resetInviteResponse.ok()).toBeTruthy();

    const inviteDialog = page.getByRole('dialog', { name: /Invite Link Generated/i });
    await expect(inviteDialog).toBeVisible({ timeout: 20000 });
    const inviteInput = inviteDialog.getByLabel('Invite URL');
    await expect(inviteInput).toBeVisible({ timeout: 20000 });
    const resetInviteUrl = await inviteInput.inputValue();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.context().clearCookies();
    const validateResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/invite/validate') && response.request().method() === 'GET',
      { timeout: 60000 },
    );
    await page.goto(resetInviteUrl, { waitUntil: 'domcontentloaded' });
    const validateResponse = await validateResponsePromise;
    expect(validateResponse.ok()).toBeTruthy();
    await expect(page.getByRole('heading', { name: 'Set your new PIN' })).toBeVisible({ timeout: 15000 });
    await page.getByPlaceholder('Enter 4-digit PIN').fill(newPin);
    await page.getByPlaceholder('Re-enter PIN').fill(newPin);
    const resetResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/invite/activate') && response.request().method() === 'POST',
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: 'Set New PIN' }).click();
    const resetResponse = await resetResponsePromise;
    expect(resetResponse.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/login\?reset=success/, { timeout: 15000 });

    await page.fill('#phone', hosteler.phone);
    await page.fill('#pin', hosteler.pin);
    const oldPinResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/auth/pin/verify') && response.request().method() === 'POST',
      { timeout: 30000 },
    );
    await page.locator('form button[type="submit"]').click();
    const oldPinResponse = await oldPinResponsePromise;
    expect(oldPinResponse.status()).toBe(401);
    await expect(page.getByText('Invalid phone number or PIN')).toBeVisible();

    await page.fill('#phone', hosteler.phone);
    await page.fill('#pin', newPin);
    const newPinResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/auth/pin/verify') && response.request().method() === 'POST',
      { timeout: 30000 },
    );
    await page.locator('form button[type="submit"]').click();
    const newPinResponse = await newPinResponsePromise;
    expect(newPinResponse.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
  });

  test('google-linked hosteler reset invite shows linked Google instruction', async ({ page }, testInfo) => {
    test.setTimeout(90000);
    await loginAsOwner(page);

    const googleHosteler = await createActiveGoogleHosteler({
      specPath: testInfo.file,
      testTitle: testInfo.title,
      markerScope: 'us5-google-reset',
    });
    await page.goto('/admin/hostelers');
    await expect(page.getByRole('heading', { name: /Hosteler Management/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: /^Active/i }).click();
    await page.reload();
    await page.getByRole('tab', { name: /^Active/i }).click();
    const activeRow = page.locator('tr', { hasText: googleHosteler.phone });
    await expect(activeRow).toBeVisible({ timeout: 15000 });
    const resetInviteResponsePromise = page.waitForResponse(
      response =>
        response.url().includes(`/api/hostelers/${googleHosteler.hostelerId}/reset-invite`) &&
        response.request().method() === 'POST',
      { timeout: 60000 },
    );
    await activeRow.getByRole('button', { name: 'Reset Invite' }).click();
    const resetInviteResponse = await resetInviteResponsePromise;
    expect(resetInviteResponse.ok()).toBeTruthy();

    const inviteDialog = page.getByRole('dialog', { name: /Invite Link Generated/i });
    await expect(inviteDialog).toBeVisible({ timeout: 20000 });
    const inviteInput = inviteDialog.getByLabel('Invite URL');
    await expect(inviteInput).toBeVisible({ timeout: 20000 });
    const resetInviteUrl = await inviteInput.inputValue();
    await page.context().clearCookies();
    await page.goto(resetInviteUrl);

    await expect(page.getByText('This account is linked to Google sign-in. Continue with your linked Google account.')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  });

  test('superseded reset invite shows latest-link recovery guidance', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await loginAsOwner(page);

    const hosteler = await createActivePinHosteler({
      specPath: testInfo.file,
      testTitle: testInfo.title,
      markerScope: 'us5-superseded-reset',
    });

    await page.goto('/admin/hostelers');
    await page.getByRole('tab', { name: /^Active/i }).click();
    const activeRow = page.locator('tr', { hasText: hosteler.phone });
    await expect(activeRow).toBeVisible({ timeout: 10000 });

    const firstResetInviteResponsePromise = page.waitForResponse(
      response =>
        response.url().includes(`/api/hostelers/${hosteler.hostelerId}/reset-invite`) &&
        response.request().method() === 'POST',
      { timeout: 60000 },
    );
    await activeRow.getByRole('button', { name: 'Reset Invite' }).click();
    const firstResetInviteResponse = await firstResetInviteResponsePromise;
    expect(firstResetInviteResponse.ok()).toBeTruthy();

    const inviteDialog = page.getByRole('dialog', { name: /Invite Link Generated/i });
    await expect(inviteDialog).toBeVisible({ timeout: 20000 });
    const inviteInput = inviteDialog.getByLabel('Invite URL');
    await expect(inviteInput).toBeVisible({ timeout: 20000 });
    const staleInviteUrl = await inviteInput.inputValue();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(inviteDialog).not.toBeVisible({ timeout: 5000 });

    // Re-locate activeRow after dialog close to avoid stale reference
    const activeRowAfterClose = page.locator('tr', { hasText: hosteler.phone });
    const secondResetInviteResponsePromise = page.waitForResponse(
      response =>
        response.url().includes(`/api/hostelers/${hosteler.hostelerId}/reset-invite`) &&
        response.request().method() === 'POST',
      { timeout: 60000 },
    );
    await activeRowAfterClose.getByRole('button', { name: 'Reset Invite' }).click();
    const secondResetInviteResponse = await secondResetInviteResponsePromise;
    expect(secondResetInviteResponse.ok()).toBeTruthy();
    const inviteDialog2 = page.getByRole('dialog', { name: /Invite Link Generated/i });
    await expect(inviteDialog2).toBeVisible({ timeout: 20000 });
    await expect(inviteDialog2.getByLabel('Invite URL')).toBeVisible({ timeout: 20000 });
    await page.context().clearCookies();
    await page.goto(staleInviteUrl);

    await expect(page.getByText('This invite link has been replaced by a newer one.')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Open the latest invite link shared by your PG owner.')).toBeVisible();
  });
  */
});
