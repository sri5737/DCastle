import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsHostelerViaPinApi, registerFailureArtifacts, waitForApiResponse } from './helpers';
import { TEST_OWNER } from './test-data';
import { createActivePinHosteler, snapshotSettings } from './factories';
import { createSupabaseTestClient } from './supabase-test-client';

test.describe('US2: Owner Dashboard', () => {
  test.setTimeout(120_000);

  test('hosteler submission updates owner counts and submitted list without owner refresh', async ({ browser }, testInfo) => {
    await openSubmissionDeadline(testInfo.file, testInfo.title);
    const hosteler = await createActivePinHosteler({ specPath: testInfo.file, testTitle: testInfo.title, markerScope: 'us2-dashboard-submit' });

    const hostelerContext = await browser.newContext();
    const hostelerPage = await hostelerContext.newPage();
    const flushHostelerArtifacts = registerFailureArtifacts(hostelerPage, testInfo);
    await loginAsHostelerViaPinApi(hostelerPage, hosteler.phone, hosteler.pin);
    const statusResponsePromise = waitForApiResponse(hostelerPage, '/api/food/today-status', 'GET', 200);
    await hostelerPage.goto('/submit', { waitUntil: 'domcontentloaded' });
    await statusResponsePromise;
    await expect(hostelerPage.locator('button[aria-pressed]').first()).toBeVisible({ timeout: 10000 });

    await setMealToggle(hostelerPage, 0, true);
    await setMealToggle(hostelerPage, 1, false);
    await setMealToggle(hostelerPage, 2, true);

    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    const flushOwnerArtifacts = registerFailureArtifacts(ownerPage, testInfo);
    await loginAsAdmin(ownerPage, TEST_OWNER.email, TEST_OWNER.password);
    await waitForApiResponse(ownerPage, '/api/owner/dashboard', 'GET', 200);

    await expect(ownerPage.getByTestId('breakfast-count')).toBeVisible({ timeout: 30000 });
    await expect(ownerPage.getByTestId('pending-hostelers')).toContainText(hosteler.name, {
      timeout: 10000,
    });

    const baseline = await readMealCounts(ownerPage);

    const submitResponsePromise = waitForApiResponse(hostelerPage, '/api/food/submit', 'POST', 200, 60000);
    await hostelerPage.getByRole('button', { name: /submit preferences|update preferences/i }).click();
    await submitResponsePromise;

    await expect(ownerPage.getByTestId('breakfast-count')).toHaveText(String(baseline.breakfast + 1), {
      timeout: 15000,
    });
    await expect(ownerPage.getByTestId('lunch-count')).toHaveText(String(baseline.lunch), {
      timeout: 15000,
    });
    await expect(ownerPage.getByTestId('dinner-count')).toHaveText(String(baseline.dinner + 1), {
      timeout: 15000,
    });

    await expect(ownerPage.getByTestId('pending-hostelers')).not.toContainText(hosteler.name);
    await ownerPage.getByTestId('submitted-hostelers').getByText(/show/i).click();
    await expect(ownerPage.getByTestId('submitted-hostelers')).toContainText(hosteler.name);

    await flushHostelerArtifacts();
    await flushOwnerArtifacts();
    await hostelerContext.close();
    await ownerContext.close();
  });
});

async function readMealCounts(page: import('@playwright/test').Page) {
  return {
    breakfast: Number(await page.getByTestId('breakfast-count').innerText()),
    lunch: Number(await page.getByTestId('lunch-count').innerText()),
    dinner: Number(await page.getByTestId('dinner-count').innerText()),
  };
}

async function setMealToggle(page: import('@playwright/test').Page, index: number, enabled: boolean) {
  const toggle = page.locator('button[aria-pressed]').nth(index);
  await expect(toggle).toBeVisible({ timeout: 10000 });

  const current = (await toggle.getAttribute('aria-pressed')) === 'true';
  if (current !== enabled) {
    await toggle.click();
  }
}

async function openSubmissionDeadline(specPath: string, testTitle: string) {
  await snapshotSettings({ specPath, testTitle, markerScope: 'us2-settings-open-deadline' });
  const supabase = createSupabaseTestClient();
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'deadline_time', value: '23:59', updated_at: new Date().toISOString() }, { onConflict: 'key' });
  expect(error).toBeNull();
}
