import { test, expect } from '@playwright/test';
import { createPendingHosteler } from './factories';
import { createSupabaseTestClient } from './supabase-test-client';

test.describe('US3: Invite Activation', () => {
  test('owner registers hosteler and hosteler activates via PIN', async ({ page }, testInfo) => {
    test.setTimeout(90000);

    const pendingHosteler = await createPendingHosteler({
      specPath: testInfo.file,
      testTitle: testInfo.title,
      markerScope: 'us3-invite-activation',
    });

    await page.context().clearCookies();
    const validateResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/invite/validate') && response.request().method() === 'GET',
      { timeout: 60000 },
    );
    await page.goto(pendingHosteler.inviteUrl, { waitUntil: 'domcontentloaded' });
    const validateResponse = await validateResponsePromise;
    expect(validateResponse.ok()).toBeTruthy();

    await expect(
      page.getByRole('heading', { name: /Welcome to DCastle/i })
    ).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /set up 4-digit pin/i }).click();

    const pinInputs = page.locator('input[type="password"]');
    await pinInputs.nth(0).fill('5678');
    await pinInputs.nth(1).fill('5678');

    const activationResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/invite/activate') && response.request().method() === 'POST',
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: /activate account/i }).click();
    const activationResponse = await activationResponsePromise;
    expect(activationResponse.ok()).toBeTruthy();

    await expect(page.getByText(/activation failed|network error/i)).not.toBeVisible({ timeout: 3000 }).catch(() => {});
    await page.waitForURL(url => !url.pathname.includes('/join'), { timeout: 30000 });

    const supabase = createSupabaseTestClient();
    const { data: activatedHosteler, error: hostelerError } = await supabase
      .from('hostelers')
      .select('status, auth_user_id')
      .eq('id', pendingHosteler.hostelerId)
      .single();
    expect(hostelerError).toBeNull();
    expect(activatedHosteler?.status).toBe('active');
    expect(activatedHosteler?.auth_user_id).toBeTruthy();

    const reusedTokenResponse = await page.request.get(`/api/invite/validate?token=${encodeURIComponent(pendingHosteler.inviteUrl.split('/').pop() || '')}`);
    expect([400, 409]).toContain(reusedTokenResponse.status());
  });

  test('expired token shows error', async ({ page }) => {
    test.setTimeout(60000);

    const validateResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/invite/validate') && response.request().method() === 'GET',
      { timeout: 60000 },
    );
    await page.goto('/join/expired-invalid-token-12345', { waitUntil: 'domcontentloaded' });
    const validateResponse = await validateResponsePromise;
    expect(validateResponse.ok()).toBeFalsy();
    await expect(
      page.getByRole('heading', { name: /expired|invalid/i })
    ).toBeVisible({ timeout: 10000 });
  });
});
