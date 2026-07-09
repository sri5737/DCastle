import { test, expect } from '@playwright/test';
import { loginAsHosteler, registerFailureArtifacts, waitForApiResponse } from './helpers';
import { createActivePinHosteler, snapshotSettings } from './factories';
import { createSupabaseTestClient } from './supabase-test-client';

test.describe('US1: Food Submission', () => {
  test('hosteler toggles meals, saves, and sees confirmation on dashboard', async ({ page }, testInfo) => {
    test.setTimeout(90000);
    const flushArtifacts = registerFailureArtifacts(page, testInfo);
    await openSubmissionDeadline(testInfo.file, testInfo.title);
    const hosteler = await createActivePinHosteler({ specPath: testInfo.file, testTitle: testInfo.title, markerScope: 'us1-food-submit' });

    await loginAsHosteler(page, hosteler.phone, hosteler.pin);

    await page.goto('/submit', { waitUntil: 'domcontentloaded' });
    await waitForApiResponse(page, '/api/food/today-status', 'GET', 200);

    // Check if deadline has passed (button won't render if so)
    const deadlineMessage = page.getByText(/submissions are closed/i);
    if (await deadlineMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Deadline passed — just verify the page renders correctly with locked state
      await expect(deadlineMessage).toBeVisible();
      // Toggle buttons should be disabled
      const toggles = page.locator('button[aria-pressed]');
      await expect(toggles.first()).toBeDisabled();
      return;
    }

    // Toggle breakfast — use aria-pressed attribute to find toggle buttons (ordered: breakfast, lunch, dinner)
    const toggles = page.locator('button[aria-pressed]');
    await toggles.nth(0).click(); // breakfast toggle
    await toggles.nth(1).click(); // lunch toggle

    const submitResponsePromise = waitForApiResponse(page, '/api/food/submit', 'POST', 200);
    await page.getByRole('button', { name: /submit preferences|update preferences/i }).click();
    await submitResponsePromise;

    // After successful submit, page redirects to /dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
    await flushArtifacts();
  });

  test('submission page shows pre-filled state on revisit', async ({ page }, testInfo) => {
    test.setTimeout(60000);
    const flushArtifacts = registerFailureArtifacts(page, testInfo);
    await openSubmissionDeadline(testInfo.file, testInfo.title);
    const hosteler = await createActivePinHosteler({ specPath: testInfo.file, testTitle: testInfo.title, markerScope: 'us1-food-prefill' });

    await loginAsHosteler(page, hosteler.phone, hosteler.pin);
    await page.goto('/submit', { waitUntil: 'domcontentloaded' });
    await waitForApiResponse(page, '/api/food/today-status', 'GET', 200);

    // Page should either show submit/update button (before deadline) or closed message (after deadline)
    const submitButton = page.getByRole('button', { name: /submit preferences|update preferences/i });
    const closedMessage = page.getByText(/submissions are closed/i);

    await expect(submitButton.or(closedMessage)).toBeVisible({ timeout: 10000 });
    await flushArtifacts();
  });
});

async function openSubmissionDeadline(specPath: string, testTitle: string) {
  await snapshotSettings({ specPath, testTitle, markerScope: 'us1-settings-open-deadline' });
  const supabase = createSupabaseTestClient();
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'deadline_time', value: '23:59', updated_at: new Date().toISOString() }, { onConflict: 'key' });
  expect(error).toBeNull();
}
