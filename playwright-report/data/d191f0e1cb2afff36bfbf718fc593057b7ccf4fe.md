# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: us4-hosteler-login.spec.ts >> US4: Hosteler Login >> unregistered phone shows error
- Location: e2e\us4-hosteler-login.spec.ts:22:7

# Error details

```
Error: locator.click: Error: strict mode violation: getByRole('button', { name: /sign in/i }) resolved to 2 elements:
    1) <button class="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2 w-full h-12 text-base mb-4">…</button> aka getByRole('button', { name: 'Sign in with Google' })
    2) <button type="submit" class="inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 w-full h-12 text-base">Sign In</button> aka getByRole('button', { name: 'Sign In', exact: true })

Call log:
  - waiting for getByRole('button', { name: /sign in/i })

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "Welcome Back" [level=1] [ref=e5]
      - paragraph [ref=e6]: Sign in to manage your food preferences
    - button "Sign in with Google" [ref=e7] [cursor=pointer]:
      - img [ref=e8]
      - text: Sign in with Google
    - generic [ref=e17]: Or sign in with PIN
    - generic [ref=e18]:
      - generic [ref=e19]:
        - generic [ref=e20]: Phone Number
        - textbox "Phone Number" [ref=e21]:
          - /placeholder: "9876543210"
          - text: "9000000001"
      - generic [ref=e22]:
        - generic [ref=e23]: 4-Digit PIN
        - textbox "4-Digit PIN" [active] [ref=e24]:
          - /placeholder: ••••
          - text: "1234"
      - button "Sign In" [ref=e25] [cursor=pointer]
  - alert [ref=e26]
  - button "Open Next.js Dev Tools" [ref=e32] [cursor=pointer]:
    - img [ref=e33]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { loginAsHosteler } from './helpers';
  3  | import { TEST_HOSTELER } from './test-data';
  4  | 
  5  | test.describe('US4: Hosteler Login', () => {
  6  |   test('hosteler logs in with phone + PIN and sees dashboard', async ({ page }) => {
  7  |     await loginAsHosteler(page);
  8  |     expect(page.url()).toContain('/dashboard');
  9  |     await expect(page.getByText(/dashboard|food|meal/i)).toBeVisible();
  10 |   });
  11 | 
  12 |   test('invalid PIN shows error message', async ({ page }) => {
  13 |     await page.goto('/login');
  14 |     await page.locator('#phone').fill(TEST_HOSTELER.phone);
  15 |     await page.locator('#pin').fill('0000');
  16 |     await page.getByRole('button', { name: /sign in/i }).click();
  17 | 
  18 |     await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 5000 });
  19 |     expect(page.url()).toContain('/login');
  20 |   });
  21 | 
  22 |   test('unregistered phone shows error', async ({ page }) => {
  23 |     await page.goto('/login');
  24 |     await page.locator('#phone').fill('9000000001');
  25 |     await page.locator('#pin').fill('1234');
> 26 |     await page.getByRole('button', { name: /sign in/i }).click();
     |                                                          ^ Error: locator.click: Error: strict mode violation: getByRole('button', { name: /sign in/i }) resolved to 2 elements:
  27 | 
  28 |     await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 5000 });
  29 |     expect(page.url()).toContain('/login');
  30 |   });
  31 | });
  32 | 
```