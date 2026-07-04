import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

export const runtime = 'edge';

export async function GET() {
	const session = await getSession();

	if (!session) {
		return NextResponse.json({ authenticated: false });
	}

	return NextResponse.json({
		authenticated: true,
		role: session.role,
	});
}