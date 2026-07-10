import { test, expect } from '@playwright/test';
import { TEST_OWNER } from './test-data';
import {
	loginAsAdmin,
	loginAsHosteler,
	logout,
	verifyAdminDashboard,
	verifyHostelerDashboard,
	assertReloadKeepsRoute,
} from './helpers';
import { createActivePinHosteler } from './factories';

test.describe('US12: Server-Side Auth Proxy', () => {
	test.setTimeout(60_000);

	test('Owner can log in via server-side proxy', async ({ page }) => {
		await loginAsAdmin(page, TEST_OWNER.email, TEST_OWNER.password);
		await verifyAdminDashboard(page);
		await assertReloadKeepsRoute(page, /\/admin\/dashboard/);
	});

	test('Hosteler can log in with PIN via server-side proxy', async ({ page }, testInfo) => {
		const hosteler = await createActivePinHosteler({
			specPath: testInfo.file,
			testTitle: testInfo.title,
			markerScope: 'us12-hosteler-proxy-login',
		});
		await loginAsHosteler(page, hosteler.phone, hosteler.pin);
		await verifyHostelerDashboard(page);
		await assertReloadKeepsRoute(page, /\/dashboard/);
	});

	test('Sessions persist correctly after proxy login', async ({ page }, testInfo) => {
		const hosteler = await createActivePinHosteler({
			specPath: testInfo.file,
			testTitle: testInfo.title,
			markerScope: 'us12-session-persistence',
		});

		// Login as admin
		await loginAsAdmin(page, TEST_OWNER.email, TEST_OWNER.password);
		await verifyAdminDashboard(page);
		
		// Logout
		await logout(page);

		// Login as hosteler  
		await loginAsHosteler(page, hosteler.phone, hosteler.pin);
		await verifyHostelerDashboard(page);
		
		// Logout
		await logout(page);
		
		// Verify we can login again as admin
		await loginAsAdmin(page, TEST_OWNER.email, TEST_OWNER.password);
		await verifyAdminDashboard(page);
	});
});
