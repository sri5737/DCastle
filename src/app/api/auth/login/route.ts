import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { withRetry } from '@/lib/auth/retry';
import { createServiceClient } from '@/lib/supabase/server';
import { withApiDiagnostic } from '@/lib/diagnostics/events';
import { AuthError } from '@supabase/supabase-js';

export const runtime = 'edge';

async function handlePost(request: Request) {
	const { email, password } = await request.json();
	const supabase = createServiceClient();

	try {
		const { data, error } = await withRetry(() =>
			supabase.auth.signInWithPassword({
				email,
				password,
			}),
		);

		if (error) {
			// AuthError has a specific structure we can rely on
			return NextResponse.json({ error: error.message }, { status: error.status || 401 });
		}

		if (data.session) {
			const response = NextResponse.json(
				{ success: true, redirectTo: '/admin/dashboard' },
				{ status: 200 },
			);

			response.cookies.set('sb-access-token', data.session.access_token, {
				path: '/',
				maxAge: 60 * 60 * 24 * 7, // 7 days
				sameSite: 'lax',
				secure: process.env.NODE_ENV === 'production',
				httpOnly: true,
			});
			response.cookies.set('sb-refresh-token', data.session.refresh_token, {
				path: '/',
				maxAge: 60 * 60 * 24 * 7, // 7 days
				sameSite: 'lax',
				secure: process.env.NODE_ENV === 'production',
				httpOnly: true,
			});

			return response;
		}

		// Fallback for unexpected cases
		return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
	} catch (error) {
		let status = 500;
		let message = 'An internal server error occurred.';

		if (error instanceof AuthError) {
			status = error.status || 500;
			message = error.message;
		} else if (error instanceof Error) {
			message = error.message;
		}

		console.error('Login endpoint error:', error);
		return NextResponse.json({ error: message }, { status });
	}
}

export async function POST(request: Request) {
	return withApiDiagnostic(
		{ route: '/api/auth/login', method: 'POST', action: 'auth.owner.login' },
		() => handlePost(request),
	);
}
