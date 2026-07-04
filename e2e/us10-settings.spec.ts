import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { loginAsHosteler, loginAsOwner } from './helpers';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ijamwcpvboctjeejajzk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

type MealRateRow = {
  id: string;
  meal_type: 'breakfast';
  rate: number;
  effective_from: string;
  created_at: string;
};

function createServiceRoleClient() {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for US10 E2E cleanup');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getTomorrowIST() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tomorrow);
}

function getCurrentISTTime() {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
}

test.describe('US10: Owner Configures Deadline and Meal Rates', () => {
  const tomorrow = getTomorrowIST();
  let preservedBreakfastRates: MealRateRow[] = [];

  test.beforeEach(async () => {
    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from('meal_rates')
      .select('id, meal_type, rate, effective_from, created_at')
      .eq('meal_type', 'breakfast')
      .eq('effective_from', tomorrow);

    preservedBreakfastRates = (data ?? []) as MealRateRow[];

    if (preservedBreakfastRates.length > 0) {
      await supabase
        .from('meal_rates')
        .delete()
        .in('id', preservedBreakfastRates.map((row) => row.id));
    }
  });

  test.afterEach(async () => {
    const supabase = createServiceRoleClient();
    await supabase
      .from('settings')
      .upsert({ key: 'deadline_time', value: '23:59' }, { onConflict: 'key' });

    await supabase
      .from('meal_rates')
      .delete()
      .eq('meal_type', 'breakfast')
      .eq('effective_from', tomorrow);

    if (preservedBreakfastRates.length > 0) {
      await supabase.from('meal_rates').insert(preservedBreakfastRates);
    }
  });

  test('owner changes deadline and meal rate, then hosteler form locks at the new deadline', async ({ page }) => {
    test.setTimeout(90000);
    await loginAsOwner(page);

    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 15000 });

    const lockedDeadline = getCurrentISTTime();
    await page.getByLabel('Deadline time').fill(lockedDeadline);
    await page.getByRole('button', { name: 'Save Settings' }).click();

    await expect(page.getByRole('status')).toContainText('Settings saved', { timeout: 10000 });
    await expect(page.getByText(`Current deadline: ${lockedDeadline} IST`)).toBeVisible();

    const breakfastRate = 37;
    await page.getByLabel('Breakfast rate').fill(String(breakfastRate));
    await page.getByRole('button', { name: 'Save Settings' }).click();

    await expect(page.getByRole('status')).toContainText(`Breakfast ₹${breakfastRate}`, {
      timeout: 10000,
    });
    await expect(page.getByRole('status')).toContainText(`effective from tomorrow (${tomorrow})`);

    await page.context().clearCookies();
    await loginAsHosteler(page);
    await page.goto('/submit');

    await expect(page.getByText(`Deadline was ${lockedDeadline}.`)).toBeVisible({ timeout: 15000 });
    const toggles = page.locator('button[aria-pressed]');
    await expect(toggles.first()).toBeDisabled();
  });
});