import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { loginAsAdmin, loginAsHosteler } from './helpers';
import { TEST_HOSTELER, TEST_OWNER } from './test-data';

test.describe('US2: Owner Dashboard', () => {
  test.setTimeout(60_000);

  test.afterEach(async () => {
    await deleteE2EFoodPreference();
  });

  test('hosteler submission updates owner counts and submitted list without owner refresh', async ({ browser }) => {
    await deleteE2EFoodPreference();

    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await loginAsAdmin(ownerPage, TEST_OWNER.email, TEST_OWNER.password);

    await expect(ownerPage.getByTestId('breakfast-count')).toBeVisible({ timeout: 10000 });
    await expect(ownerPage.getByTestId('pending-hostelers')).toContainText(TEST_HOSTELER.name, {
      timeout: 10000,
    });

    const baseline = await readMealCounts(ownerPage);

    const hostelerContext = await browser.newContext();
    const hostelerPage = await hostelerContext.newPage();
    await loginAsHosteler(hostelerPage, TEST_HOSTELER.phone, TEST_HOSTELER.pin);
    await hostelerPage.goto('/submit');
    await expect(hostelerPage.locator('button[aria-pressed]').first()).toBeVisible({ timeout: 10000 });

    await setMealToggle(hostelerPage, 0, true);
    await setMealToggle(hostelerPage, 1, false);
    await setMealToggle(hostelerPage, 2, true);

    await hostelerPage.getByRole('button', { name: /submit preferences|update preferences/i }).click();
    await hostelerPage.waitForURL('**/dashboard', { timeout: 15000 });

    await expect(ownerPage.getByTestId('breakfast-count')).toHaveText(String(baseline.breakfast + 1), {
      timeout: 5000,
    });
    await expect(ownerPage.getByTestId('lunch-count')).toHaveText(String(baseline.lunch), {
      timeout: 5000,
    });
    await expect(ownerPage.getByTestId('dinner-count')).toHaveText(String(baseline.dinner + 1), {
      timeout: 5000,
    });

    await expect(ownerPage.getByTestId('pending-hostelers')).not.toContainText(TEST_HOSTELER.name);
    await ownerPage.getByTestId('submitted-hostelers').getByText(/show/i).click();
    await expect(ownerPage.getByTestId('submitted-hostelers')).toContainText(TEST_HOSTELER.name);

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

async function deleteE2EFoodPreference() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase E2E credentials are required for owner dashboard setup');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: hosteler, error: hostelerError } = await supabase
    .from('hostelers')
    .select('id')
    .eq('phone', TEST_HOSTELER.phone)
    .single();

  if (hostelerError || !hosteler) return;

  await supabase
    .from('food_preferences')
    .delete()
    .eq('hosteler_id', hosteler.id)
    .eq('date', getTomorrowDateIST());
}

function getTomorrowDateIST() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tomorrow);
}
