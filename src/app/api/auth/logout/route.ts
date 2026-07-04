import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST() {
	const response = NextResponse.json({ success: true });

	response.cookies.delete('sb-access-token');
	response.cookies.delete('sb-refresh-token');

	return response;
}