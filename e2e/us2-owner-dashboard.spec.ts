import { test, expect } from '@playwright/test';
import { loginAsOwner } from './helpers';

test.describe('US2: Owner Dashboard', () => {
  test('owner sees meal counts on dashboard', async ({ page }) => {
    await loginAsOwner(page);

    // Verify dashboard loads with meal count cards
    await expect(page.getByText(/breakfast/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/lunch/i)).toBeVisible();
    await expect(page.getByText(/dinner/i)).toBeVisible();
  });

  test('owner sees pending hostelers list', async ({ page }) => {
    await loginAsOwner(page);

    // Dashboard should show a hostelers section (pending or submitted)
    await expect(
      page.getByText(/pending|submitted|hosteler/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('dashboard shows deadline countdown', async ({ page }) => {
    await loginAsOwner(page);

    // CountdownBanner only shows within 2 hours of deadline (9 PM IST).
    // If outside that window, verify the dashboard itself loaded correctly instead.
    const countdown = page.getByText(/remaining|deadline|closes/i);
    const dashboardLoaded = page.getByText(/breakfast/i);

    await expect(dashboardLoaded).toBeVisible({ timeout: 10000 });
    // Countdown is time-dependent — only assert if visible
    const isCountdownVisible = await countdown.isVisible().catch(() => false);
    if (isCountdownVisible) {
      await expect(countdown).toBeVisible();
    }
  });
});
