import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { withApiDiagnostic } from '@/lib/diagnostics/events';

export const runtime = 'edge';

async function handleGet() {
	const session = await getSession();

	if (!session) {
		return NextResponse.json({ authenticated: false });
	}

	return NextResponse.json({
		authenticated: true,
		role: session.role,
	});
}

export async function GET() {
	return withApiDiagnostic(
		{ route: '/api/auth/session', method: 'GET', action: 'auth.session.read' },
		() => handleGet(),
	);
}