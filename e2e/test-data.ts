/**
 * Test data constants for E2E tests.
 * These are seeded in global-setup.ts before tests run.
 * Values come from E2E_TEST_* env vars (loaded via dotenv in playwright.config.ts).
 */
export const TEST_OWNER = {
  email: process.env.E2E_TEST_OWNER_EMAIL || 'sri5737@gmail.com',
  password: process.env.E2E_TEST_OWNER_PASSWORD || '',
};

export const TEST_HOSTELER = {
  name: 'E2E Test Hosteler',
  phone: process.env.E2E_TEST_HOSTELER_PHONE || '9999999999',
  pin: process.env.E2E_TEST_HOSTELER_PIN || '1234',
  room_number: 'T-101',
  email: `${process.env.E2E_TEST_HOSTELER_PHONE || '9999999999'}@hosteler.dcastle.local`,
  password: process.env.E2E_TEST_HOSTELER_PIN || '1234', // PIN is used as Supabase Auth password
};
