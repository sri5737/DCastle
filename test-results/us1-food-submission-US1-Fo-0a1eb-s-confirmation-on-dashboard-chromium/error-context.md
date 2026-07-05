# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: us1-food-submission.spec.ts >> US1: Food Submission >> hosteler toggles meals, saves, and sees confirmation on dashboard
- Location: e2e\us1-food-submission.spec.ts:5:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForResponse: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "Welcome Back" [level=1] [ref=e5]
      - paragraph [ref=e6]: Sign in to manage your food preferences
    - button "Sign in with Google" [disabled]:
      - img
      - text: Sign in with Google
    - generic [ref=e11]: Or sign in with PIN
    - generic [ref=e12]:
      - generic [ref=e13]:
        - generic [ref=e14]: Phone Number
        - textbox "Phone Number" [disabled] [ref=e15]:
          - /placeholder: "9876543210"
          - text: "9999999999"
      - generic [ref=e16]:
        - generic [ref=e17]: 4-Digit PIN
        - textbox "4-Digit PIN" [disabled] [ref=e18]:
          - /placeholder: ••••
          - text: "1234"
      - button "Signing in..." [disabled]
  - alert [ref=e19]
  - button "Open Next.js Dev Tools" [ref=e25] [cursor=pointer]:
    - img [ref=e26]
```

# Test source

```ts
  1   | import { Page, expect } from '@playwright/test';
  2   | import { createClient } from '@supabase/supabase-js';
  3   | import { TEST_OWNER, TEST_HOSTELER } from './test-data';
  4   | 
  5   | const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  6   | const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  7   | 
  8   | function createOwnerAuthClient() {
  9   |   if (!supabaseUrl || !supabaseAnonKey) {
  10  |     throw new Error('Supabase URL and anon key are required for E2E owner login');
  11  |   }
  12  | 
  13  |   return createClient(supabaseUrl, supabaseAnonKey, {
  14  |     auth: { autoRefreshToken: false, persistSession: false },
  15  |   });
  16  | }
  17  | 
  18  | function getSupabaseStorageKey() {
  19  |   const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  20  |   return `sb-${projectRef}-auth-token`;
  21  | }
  22  | 
  23  | /**
  24  |  * Login as the PG owner via email/password on /admin/login.
  25  |  * Uses E2E_TEST_OWNER_EMAIL and E2E_TEST_OWNER_PASSWORD from env.
  26  |  * This tests the server-side /api/auth/login proxy route.
  27  |  */
  28  | export async function loginAsAdmin(page: Page, email?: string, password?: string) {
  29  |   const loginEmail = email || TEST_OWNER.email;
  30  |   const loginPassword = password || TEST_OWNER.password;
  31  | 
  32  |   await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
  33  |   const submitButton = page.locator('form button[type="submit"]');
  34  |   await expect(submitButton).toBeEnabled();
  35  |   await page.fill('#email', loginEmail);
  36  |   await page.fill('#password', loginPassword);
  37  | 
  38  |   const loginResponsePromise = page.waitForResponse(
  39  |     response => response.url().includes('/api/auth/login') && response.request().method() === 'POST',
  40  |     { timeout: 30000 },
  41  |   );
  42  |   await submitButton.click();
  43  |   const loginResponse = await loginResponsePromise;
  44  |   expect(loginResponse.ok()).toBeTruthy();
  45  |   
  46  |   // Wait for navigation to dashboard after successful login
  47  |   await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 30000 });
  48  | }
  49  | 
  50  | /**
  51  |  * Backwards-compatible alias for owner login used by existing specs.
  52  |  */
  53  | export const loginAsOwner = loginAsAdmin;
  54  | 
  55  | /**
  56  |  * Login as a hosteler via phone + PIN on /login.
  57  |  * Uses E2E_TEST_HOSTELER_PHONE and E2E_TEST_HOSTELER_PIN from env.
  58  |  * This tests the server-side /api/auth/pin/verify proxy route.
  59  |  */
  60  | export async function loginAsHosteler(page: Page, phone?: string, pin?: string) {
  61  |   const hostelerPhone = phone || TEST_HOSTELER.phone;
  62  |   const hostelerPin = pin || TEST_HOSTELER.pin;
  63  | 
  64  |   await page.goto('/login', { waitUntil: 'domcontentloaded' });
  65  |   const submitButton = page.locator('form button[type="submit"]');
  66  |   await expect(submitButton).toBeEnabled();
  67  |   
  68  |   // Fill in the PIN login form (not Google OAuth)
  69  |   await page.fill('#phone', hostelerPhone);
  70  |   await page.fill('#pin', hostelerPin);
  71  | 
> 72  |   const loginResponsePromise = page.waitForResponse(
      |                                     ^ Error: page.waitForResponse: Test timeout of 30000ms exceeded.
  73  |     response => response.url().includes('/api/auth/pin/verify') && response.request().method() === 'POST',
  74  |     { timeout: 30000 },
  75  |   );
  76  |   await submitButton.click();
  77  |   const loginResponse = await loginResponsePromise;
  78  |   expect(loginResponse.ok()).toBeTruthy();
  79  |   
  80  |   // Wait for navigation to dashboard after successful login
  81  |   await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
  82  | }
  83  | 
  84  | /**
  85  |  * Logs the user out by clearing cookies and local storage.
  86  |  */
  87  | export async function logout(page: Page) {
  88  | 	await page.context().clearCookies();
  89  | 	await page.evaluate(() => {
  90  | 		// This will clear all local storage, which is fine for tests
  91  | 		window.localStorage.clear();
  92  | 	});
  93  | }
  94  | 
  95  | /**
  96  |  * Verifies that the user is on the admin dashboard.
  97  |  */
  98  | export async function verifyAdminDashboard(page: Page) {
  99  | 	await expect(page).toHaveURL(/\/admin\/dashboard/);
  100 | }
  101 | 
  102 | /**
  103 |  * Verifies that the user is on the hosteler dashboard.
  104 |  */
  105 | export async function verifyHostelerDashboard(page: Page) {
  106 | 	await expect(page).toHaveURL(/\/dashboard/);
  107 | }
  108 | 
  109 | /**
  110 |  * Wait for navigation to complete after a form submission.
  111 |  */
  112 | export async function waitForNavigation(page: Page, url: string) {
  113 |   await page.waitForURL(url, { timeout: 10000 });
  114 |   expect(page.url()).toContain(url);
  115 | }
  116 | 
```