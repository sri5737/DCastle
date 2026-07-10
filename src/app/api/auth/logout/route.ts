import { NextResponse } from 'next/server';
import { withApiDiagnostic } from '@/lib/diagnostics/events';

export const runtime = 'edge';

async function handlePost() {
	const response = NextResponse.json({ success: true });

	response.cookies.delete('sb-access-token');
	response.cookies.delete('sb-refresh-token');

	return response;
}

export async function POST() {
	return withApiDiagnostic(
		{ route: '/api/auth/logout', method: 'POST', action: 'auth.logout' },
		() => handlePost(),
	);
}