import { test, expect } from '@playwright/test';
import { TEST_OWNER, TEST_HOSTELER } from './test-data';
import {
	loginAsAdmin,
	loginAsHosteler,
	logout,
	verifyAdminDashboard,
	verifyHostelerDashboard,
} from './helpers';

test.describe('US12: Server-Side Auth Proxy', () => {
	test('Owner can log in via server-side proxy', async ({ page }) => {
		await loginAsAdmin(page, TEST_OWNER.email, TEST_OWNER.password);
		await verifyAdminDashboard(page);
		
		// Wait a bit longer to catch any redirect loops
		await page.waitForTimeout(2000);
		
		// Verify we're still on the dashboard (no redirect loop)
		await expect(page).toHaveURL(/\/admin\/dashboard/);
	});

	test('Hosteler can log in with PIN via server-side proxy', async ({ page }) => {
		await loginAsHosteler(page, TEST_HOSTELER.phone, TEST_HOSTELER.pin);
		await verifyHostelerDashboard(page);
		
		// Wait a bit longer to catch any redirect loops
		await page.waitForTimeout(2000);
		
		// Verify we're still on the dashboard (no redirect loop)
		await expect(page).toHaveURL(/\/dashboard/);
	});

	test('Sessions persist correctly after proxy login', async ({ page }) => {
		// Login as admin
		await loginAsAdmin(page, TEST_OWNER.email, TEST_OWNER.password);
		await verifyAdminDashboard(page);
		
		// Logout
		await logout(page);

		// Login as hosteler  
		await loginAsHosteler(page, TEST_HOSTELER.phone, TEST_HOSTELER.pin);
		await verifyHostelerDashboard(page);
		
		// Logout
		await logout(page);
		
		// Verify we can login again as admin
		await loginAsAdmin(page, TEST_OWNER.email, TEST_OWNER.password);
		await verifyAdminDashboard(page);
	});
});
