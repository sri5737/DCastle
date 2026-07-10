import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin, loginAsHosteler } from './helpers';
import { TEST_OWNER } from './test-data';
import { createActivePinHosteler } from './factories';

/**
 * US13 (Phase 18) — Android mobile app experience validation.
 *
 * Every already-built/current owner, hosteler, and auth screen is exercised at
 * the 375 px Android baseline. Each check asserts:
 *   - no page-level horizontal overflow (SC-014), and
 *   - primary actions/destinations are reachable within the viewport (FR-072/FR-073).
 *
 * Uses Playwright mobile emulation at 375 px as the automated validation path.
 * Real-device confirmation is tracked separately in pwa-android-validation.md.
 */

const MOBILE_VIEWPORT = { width: 375, height: 812 };

test.use({ viewport: MOBILE_VIEWPORT });

/** Fails if the document is wider than the viewport (page-level horizontal scroll). */
async function expectNoHorizontalOverflow(page: Page) {
  // Ensure the DOM is present before measuring (avoids reading a null body mid-navigation).
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => !!document.body);
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const bodyScrollWidth = document.body ? document.body.scrollWidth : 0;
    return {
      scrollWidth: Math.max(doc.scrollWidth, bodyScrollWidth),
      clientWidth: doc.clientWidth,
      innerWidth: window.innerWidth,
    };
  });
  // Allow 1px rounding tolerance only.
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth + 1);
}

/** Fails if the element is not visible or extends beyond the horizontal viewport. */
async function expectReachableWithinViewport(page: Page, locator: ReturnType<Page['locator']>) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width + 1);
  }
}

test.describe('US13: Android mobile experience @375px', () => {
  test.setTimeout(90_000);

  test('hosteler login screen has no horizontal overflow and a reachable submit action', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('form button[type="submit"]')).toBeEnabled();
    await expectNoHorizontalOverflow(page);
    await expectReachableWithinViewport(page, page.locator('form button[type="submit"]'));
    await expectReachableWithinViewport(page, page.locator('#phone'));
    await expectReachableWithinViewport(page, page.locator('#pin'));
  });

  test('owner login screen has no horizontal overflow and a reachable submit action', async ({ page }) => {
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('form button[type="submit"]')).toBeEnabled();
    await expectNoHorizontalOverflow(page);
    await expectReachableWithinViewport(page, page.locator('form button[type="submit"]'));
  });

  test('core hosteler flow (login → dashboard → submit → dashboard) stays mobile-usable', async ({ page }, testInfo) => {
    const hosteler = await createActivePinHosteler({
      specPath: testInfo.file,
      testTitle: testInfo.title,
      markerScope: 'us13-mobile-hosteler-flow',
    });
    await loginAsHosteler(page, hosteler.phone, hosteler.pin);

    // Dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expectNoHorizontalOverflow(page);
    // Bottom-tab primary destinations must be reachable on mobile.
    await expectReachableWithinViewport(page, page.getByRole('link', { name: 'Submit' }));

    // Navigate to submit via the mobile bottom nav.
    await page.getByRole('link', { name: 'Submit' }).click();
    await expect(page).toHaveURL(/\/submit/, { timeout: 15000 });
    await expect(page.locator('button[aria-pressed]').first()).toBeVisible({ timeout: 15000 });
    await expectNoHorizontalOverflow(page);

    // Meal toggles and the primary submit button must be reachable.
    await expectReachableWithinViewport(page, page.locator('button[aria-pressed]').first());
    const submitButton = page.getByRole('button', { name: /submit preferences|update preferences/i });
    await expectReachableWithinViewport(page, submitButton);

    // Complete the core action and return to the dashboard.
    await submitButton.click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expectNoHorizontalOverflow(page);
  });

  test('core owner flow (dashboard → hostelers → settings) stays mobile-usable', async ({ page }) => {
    await loginAsAdmin(page, TEST_OWNER.email, TEST_OWNER.password);

    // Dashboard
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByTestId('breakfast-count')).toBeVisible({ timeout: 15000 });
    await expectNoHorizontalOverflow(page);
    await expectReachableWithinViewport(page, page.getByRole('link', { name: 'Hostelers' }));

    // Hostelers management (table/tabs/add-form are the highest overflow risk)
    await page.getByRole('link', { name: 'Hostelers' }).click();
    await expect(page).toHaveURL(/\/admin\/hostelers/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Hosteler Management' })).toBeVisible({ timeout: 15000 });
    await expectNoHorizontalOverflow(page);
    await expectReachableWithinViewport(page, page.getByRole('button', { name: /add hosteler/i }));
    await expectReachableWithinViewport(page, page.getByRole('tab', { name: /^Active/i }));

    // Settings
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page).toHaveURL(/\/admin\/settings/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible({ timeout: 15000 });
    await expectNoHorizontalOverflow(page);
    await expectReachableWithinViewport(page, page.getByRole('button', { name: /save settings/i }));
  });
});
