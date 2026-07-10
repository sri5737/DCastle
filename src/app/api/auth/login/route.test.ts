import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServiceClient } from '@/lib/supabase/server';
import { POST } from './route';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
	createServiceClient: vi.fn(),
}));
vi.mock('@/lib/auth/retry', () => ({
	withRetry: vi.fn((fn) => fn()),
}));

const mockSignInWithPassword = vi.fn();

describe('POST /api/auth/login', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Mock Supabase client
		vi.mocked(createServiceClient).mockReturnValue({
			auth: {
				signInWithPassword: mockSignInWithPassword,
			},
		} as any);
	});

	it('should return 200 and set cookies on successful login', async () => {
		const mockSession = {
			access_token: 'test-access-token',
			refresh_token: 'test-refresh-token',
		};
		const mockUser = { id: '123', email: 'test@example.com' };
		mockSignInWithPassword.mockResolvedValue({
			data: { session: mockSession, user: mockUser },
			error: null,
		});

		const req = new Request('http://localhost/api/auth/login', {
			method: 'POST',
			body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
		});

		const res = await POST(req);
		const body = await res.json();
		const setCookie = res.headers.get('set-cookie') || '';

		expect(res.status).toBe(200);
		expect(body.success).toBe(true);
		expect(body.redirectTo).toBe('/admin/dashboard');
		expect(setCookie).toContain('sb-access-token=test-access-token');
		expect(setCookie).toContain('sb-refresh-token=test-refresh-token');
	});

	it('should return 401 for invalid credentials', async () => {
		const mockError = { message: 'Invalid login credentials', status: 401 };
		mockSignInWithPassword.mockResolvedValue({
			data: {},
			error: mockError,
		});

		const req = new Request('http://localhost/api/auth/login', {
			method: 'POST',
			body: JSON.stringify({ email: 'test@example.com', password: 'wrong-password' }),
		});

		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(401);
		expect(body.error).toBe('Invalid login credentials');
		expect(res.headers.get('set-cookie')).toBeNull();
	});

	it('should return 500 on unexpected errors', async () => {
		mockSignInWithPassword.mockRejectedValue(new Error('Database connection failed'));

		const req = new Request('http://localhost/api/auth/login', {
			method: 'POST',
			body: JSON.stringify({ email: 'fail@example.com', password: 'password' }),
		});

		const res = await POST(req);
		const body = await res.json();

		expect(res.status).toBe(500);
		expect(body.error).toBe('Database connection failed');
		expect(res.headers.get('set-cookie')).toBeNull();
	});
});
