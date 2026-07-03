# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: us3-invite-activation.spec.ts >> US3: Invite Activation >> owner registers hosteler and hosteler activates via PIN
- Location: e2e\us3-invite-activation.spec.ts:5:7

# Error details

```
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { loginAsOwner } from './helpers';
  3   | 
  4   | test.describe('US3: Invite Activation', () => {
  5   |   test('owner registers hosteler and hosteler activates via PIN', async ({ page, request }) => {
  6   |     // Step 1: Owner creates a hosteler via API
  7   |     const uniquePhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
  8   |     const createRes = await request.post('/api/hostelers', {
  9   |       data: {
  10  |         name: `E2E Invite Tester ${Date.now()}`,
  11  |         phone: uniquePhone,
  12  |         room_number: 'T-201',
  13  |       },
  14  |     });
  15  | 
  16  |     // API may require auth - if it fails, try with owner login
  17  |     if (!createRes.ok()) {
  18  |       // Login as owner first to get session cookies
  19  |       await loginAsOwner(page);
  20  | 
  21  |       // Retry the API call with the page's cookies
  22  |       const retryRes = await page.evaluate(async (data) => {
  23  |         const res = await fetch('/api/hostelers', {
  24  |           method: 'POST',
  25  |           headers: { 'Content-Type': 'application/json' },
  26  |           body: JSON.stringify(data),
  27  |         });
  28  |         return { ok: res.ok, body: await res.json() };
  29  |       }, { name: `E2E Invite Tester ${Date.now()}`, phone: uniquePhone, room_number: 'T-201' });
  30  | 
  31  |       expect(retryRes.ok).toBeTruthy();
  32  |       const hosteler = retryRes.body.hosteler;
  33  | 
  34  |       // Generate invite token
  35  |       const inviteResult = await page.evaluate(async (hostelerId) => {
  36  |         const res = await fetch('/api/invite/generate', {
  37  |           method: 'POST',
  38  |           headers: { 'Content-Type': 'application/json' },
  39  |           body: JSON.stringify({ hosteler_id: hostelerId }),
  40  |         });
  41  |         return { ok: res.ok, body: await res.json() };
  42  |       }, hosteler.id);
  43  | 
  44  |       expect(inviteResult.ok).toBeTruthy();
  45  |       const token = inviteResult.body.token;
  46  | 
  47  |       // Visit the invite link
  48  |       await page.goto(`/join/${token}`);
  49  |       await expect(page.getByText(new RegExp(hosteler.name, 'i'))).toBeVisible({ timeout: 10000 });
  50  | 
  51  |       return;
  52  |     }
  53  | 
> 54  |     const { hosteler } = await createRes.json();
      |                          ^ SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
  55  | 
  56  |     // Step 2: Generate invite token
  57  |     const inviteRes = await request.post('/api/invite/generate', {
  58  |       data: { hosteler_id: hosteler.id },
  59  |     });
  60  |     expect(inviteRes.ok()).toBeTruthy();
  61  |     const { token } = await inviteRes.json();
  62  | 
  63  |     // Step 3: Hosteler visits the invite link
  64  |     await page.goto(`/join/${token}`);
  65  | 
  66  |     // Step 4: Verify welcome/activation page loads
  67  |     await expect(
  68  |       page.getByText(/activate|welcome|set.*pin|join/i)
  69  |     ).toBeVisible({ timeout: 10000 });
  70  | 
  71  |     // Step 5: Choose PIN activation method if there's a choice
  72  |     const pinButton = page.getByRole('button', { name: /pin/i });
  73  |     if (await pinButton.isVisible({ timeout: 2000 }).catch(() => false)) {
  74  |       await pinButton.click();
  75  |     }
  76  | 
  77  |     // Step 6: Set a 4-digit PIN
  78  |     const pinInputs = page.locator('input[type="password"], input[inputmode="numeric"]');
  79  |     await pinInputs.first().fill('5678');
  80  |     if (await pinInputs.nth(1).isVisible().catch(() => false)) {
  81  |       await pinInputs.nth(1).fill('5678');
  82  |     }
  83  | 
  84  |     // Step 7: Submit activation
  85  |     await page.getByRole('button', { name: /activate|confirm|submit|set/i }).click();
  86  | 
  87  |     // Step 8: Verify redirect to dashboard or success message
  88  |     await expect(
  89  |       page.getByText(/activated|success|dashboard/i).or(page.locator('text=/dashboard/'))
  90  |     ).toBeVisible({ timeout: 10000 });
  91  |   });
  92  | 
  93  |   test('expired token shows error', async ({ page }) => {
  94  |     await page.goto('/join/expired-invalid-token-12345');
  95  |     await expect(
  96  |       page.getByText(/expired|invalid|not found/i)
  97  |     ).toBeVisible({ timeout: 10000 });
  98  |   });
  99  | });
  100 | 
```