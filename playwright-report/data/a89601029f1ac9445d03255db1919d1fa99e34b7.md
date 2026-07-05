# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: us3-invite-activation.spec.ts >> US3: Invite Activation >> owner registers hosteler and hosteler activates via PIN
- Location: e2e\us3-invite-activation.spec.ts:5:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /Welcome to DCastle/i })
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByRole('heading', { name: /Welcome to DCastle/i })

```

```yaml
- alert
- button "Open Next.js Dev Tools":
  - img
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { loginAsOwner } from './helpers';
  3  | 
  4  | test.describe('US3: Invite Activation', () => {
  5  |   test('owner registers hosteler and hosteler activates via PIN', async ({ page, request }) => {
  6  |     // Step 1: Login as owner first to get session cookies
  7  |     await loginAsOwner(page);
  8  | 
  9  |     const uniquePhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
  10 |     const hostelerName = `E2E Invite Tester ${Date.now()}`;
  11 | 
  12 |     // Create hosteler via browser fetch (uses owner's cookies)
  13 |     const createResult = await page.evaluate(async (data) => {
  14 |       const res = await fetch('/api/hostelers', {
  15 |         method: 'POST',
  16 |         headers: { 'Content-Type': 'application/json' },
  17 |         body: JSON.stringify(data),
  18 |       });
  19 |       return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) };
  20 |     }, { name: hostelerName, phone: uniquePhone, room_number: 'T-201' });
  21 | 
  22 |     expect(createResult.ok).toBeTruthy();
  23 |     const hosteler = createResult.body.hosteler;
  24 | 
  25 |     // Step 2: Generate invite token via browser fetch
  26 |     const inviteResult = await page.evaluate(async (hostelerId) => {
  27 |       const res = await fetch('/api/invite/generate', {
  28 |         method: 'POST',
  29 |         headers: { 'Content-Type': 'application/json' },
  30 |         body: JSON.stringify({ hosteler_id: hostelerId }),
  31 |       });
  32 |       return { ok: res.ok, body: await res.json().catch(() => null) };
  33 |     }, hosteler.id);
  34 | 
  35 |     expect(inviteResult.ok).toBeTruthy();
  36 |     const token = inviteResult.body.token;
  37 | 
  38 |     // Step 3: Hosteler visits the invite link (new browser context - no owner cookies)
  39 |     await page.context().clearCookies();
  40 |     await page.goto(`/join/${token}`);
  41 | 
  42 |     // Step 4: Verify welcome/activation page loads
  43 |     await expect(
  44 |       page.getByRole('heading', { name: /Welcome to DCastle/i })
> 45 |     ).toBeVisible({ timeout: 10000 });
     |       ^ Error: expect(locator).toBeVisible() failed
  46 | 
  47 |     // Step 5: Click "Set up 4-digit PIN" button
  48 |     await page.getByRole('button', { name: /set up 4-digit pin/i }).click();
  49 | 
  50 |     // Step 6: Set a 4-digit PIN
  51 |     const pinInputs = page.locator('input[type="password"]');
  52 |     await pinInputs.nth(0).fill('5678');
  53 |     await pinInputs.nth(1).fill('5678');
  54 | 
  55 |     // Step 7: Submit activation
  56 |     await page.getByRole('button', { name: /activate account/i }).click();
  57 | 
  58 |     // Step 8: After activation, page navigates away from /join (to /dashboard or /login)
  59 |     // The key assertion is that activation succeeded without showing an error
  60 |     await expect(page.getByText(/activation failed|network error/i)).not.toBeVisible({ timeout: 3000 }).catch(() => {});
  61 |     await page.waitForURL(url => !url.pathname.includes('/join'), { timeout: 15000 });
  62 |   });
  63 | 
  64 |   test('expired token shows error', async ({ page }) => {
  65 |     await page.goto('/join/expired-invalid-token-12345');
  66 |     await expect(
  67 |       page.getByRole('heading', { name: /expired|invalid/i })
  68 |     ).toBeVisible({ timeout: 10000 });
  69 |   });
  70 | });
  71 | 
```