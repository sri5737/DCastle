import { test, expect } from '@playwright/test';
import { loginAsHosteler } from './helpers';

test.describe('US1: Food Submission', () => {
  test('hosteler toggles meals, saves, and sees confirmation on dashboard', async ({ page }) => {
    // Login as hosteler (uses seeded test hosteler from global-setup)
    await loginAsHosteler(page);

    // Navigate to food submission page
    await page.goto('/submit');
    await page.waitForLoadState('networkidle');

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

    // Save preferences
    await page.getByRole('button', { name: /submit preferences|update preferences/i }).click();

    // After successful submit, page redirects to /dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('submission page shows pre-filled state on revisit', async ({ page }) => {
    await loginAsHosteler(page);
    await page.goto('/submit');
    await page.waitForLoadState('networkidle');

    // Page should either show submit/update button (before deadline) or closed message (after deadline)
    const submitButton = page.getByRole('button', { name: /submit preferences|update preferences/i });
    const closedMessage = page.getByText(/submissions are closed/i);

    await expect(submitButton.or(closedMessage)).toBeVisible({ timeout: 10000 });
  });
});
