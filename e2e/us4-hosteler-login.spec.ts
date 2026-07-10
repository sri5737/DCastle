import { test, expect } from '@playwright/test';
import { loginAsHosteler } from './helpers';
import { createActivePinHosteler } from './factories';

test.describe('US4: Hosteler Login', () => {
  test('hosteler logs in with phone + PIN and sees dashboard', async ({ page }, testInfo) => {
  
  
page.context().on('close', () => {
  console.trace('CONTEXT CLOSED');
});

page.on('close', () => {
  console.trace('PAGE CLOSED');
});



    
    const hosteler = await createActivePinHosteler({
      specPath: testInfo.file,
      testTitle: testInfo.title,
      markerScope: 'us4-login-success',
    });

    await loginAsHosteler(page, hosteler.phone, hosteler.pin);
    expect(page.url()).toContain('/dashboard');
    await expect(page.getByText('Loading...')).not.toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('heading', { name: /tomorrow'?s meals/i })).toBeVisible({ timeout: 30000 });
  });

 test('invalid PIN shows error message', async ({ page }, testInfo) => {
    const hosteler = await createActivePinHosteler({
      specPath: testInfo.file,
      testTitle: testInfo.title,
      markerScope: 'us4-login-invalid-pin',
    });

    await page.goto('/login');
    await page.locator('#phone').fill(hosteler.phone);
    await page.locator('#pin').fill('0000');

    const loginResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/auth/pin/verify') && response.request().method() === 'POST',
      { timeout: 30000 },
    );
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    const loginResponse = await loginResponsePromise;

    expect(loginResponse.status()).toBe(401);
    await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('unregistered phone shows error', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#phone').fill('9000000001');
    await page.locator('#pin').fill('1234');

    const loginResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/auth/pin/verify') && response.request().method() === 'POST',
      { timeout: 30000 },
    );
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    const loginResponse = await loginResponsePromise;

    expect(loginResponse.status()).toBe(401);
    await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 5000 });
    expect(page.url()).toContain('/login');
  }); 
});
