import { NextRequest, NextResponse } from 'next/server';
import { withRetry } from '@/lib/auth/retry';
import { createServiceClient } from '@/lib/supabase/server';
import { getHostelerAuthPassword } from '@/lib/auth/pin-password';
import { withApiDiagnostic } from '@/lib/diagnostics/events';
import { AuthError } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export const runtime = 'edge';

const PHONE_REGEX = /^[6-9]\d{9}$/;
const PIN_REGEX = /^\d{4}$/;

async function handlePost(request: NextRequest) {
	const body = await request.json();
	const { phone, pin } = body;

	if (!phone || !PHONE_REGEX.test(phone) || !pin || !PIN_REGEX.test(pin)) {
		return NextResponse.json({ error: 'Invalid phone number or PIN' }, { status: 401 });
	}

	const supabase = createServiceClient();

	try {
		// 1. Look up hosteler to ensure they are active before attempting to sign in
		const { data: hosteler, error: hostelerError } = await supabase
			.from('hostelers')
			.select('id, name, room_number, status, pin_hash')
			.eq('phone', phone)
			.single();

		if (hostelerError || !hosteler) {
			return NextResponse.json({ error: 'Invalid phone number or PIN' }, { status: 401 });
		}

		if (hosteler.status !== 'active') {
			return NextResponse.json(
				{ error: 'Account is inactive. Contact your PG owner.' },
				{ status: 403 },
			);
		}

		if (!hosteler.pin_hash || !bcrypt.compareSync(pin, hosteler.pin_hash)) {
			return NextResponse.json({ error: 'Invalid phone number or PIN' }, { status: 401 });
		}


		// 2. Attempt to sign in using the server-side proxy with retry logic.
		// Existing PIN accounts may still use the legacy raw 4-digit auth password.
		let signInData = null;
		let signInError = null;
		const email = `${phone}@hosteler.dcastle.local`;
		const passwordCandidates = [getHostelerAuthPassword(phone, pin), pin];

		for (const password of passwordCandidates) {
			const result = await withRetry(() =>
				supabase.auth.signInWithPassword({
					email,
					password,
				}),
			);

			signInData = result.data;
			signInError = result.error;

			if (!signInError && signInData?.session) break;
			if (!signInError || !signInError.status || signInError.status >= 500) break;
		}

		const session = signInData?.session;

		if (signInError || !session) {
			const status = signInError?.status || 500;
			// Use a generic error for auth failures to avoid leaking info
			const message =
				status >= 400 && status < 500 ? 'Invalid phone number or PIN' : 'Authentication failed';
			return NextResponse.json({ error: message }, { status });
		}

		// 3. Return success and set auth cookies on the response.
		const response = NextResponse.json({
			success: true,
			redirectTo: '/dashboard',
			hosteler: {
				id: hosteler.id,
				name: hosteler.name,
				room_number: hosteler.room_number,
			},
		});

		response.cookies.set('sb-access-token', session.access_token, {
			path: '/',
			maxAge: 60 * 60 * 24 * 30, // 30 days for hostelers
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			httpOnly: true,
		});
		response.cookies.set('sb-refresh-token', session.refresh_token, {
			path: '/',
			maxAge: 60 * 60 * 24 * 30, // 30 days for hostelers
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			httpOnly: true,
		});

		return response;
	} catch (error) {
		let status = 500;
		let message = 'An internal server error occurred.';

		if (error instanceof AuthError) {
			status = error.status || 500;
			message = error.message;
		} else if (error instanceof Error) {
			message = error.message;
		}

		console.error('PIN Verify endpoint error:', error);
		return NextResponse.json({ error: message }, { status });
	}
}

export async function POST(request: NextRequest) {
	return withApiDiagnostic(
		{ route: '/api/auth/pin/verify', method: 'POST', action: 'auth.pin.verify' },
		() => handlePost(request),
	);
}

