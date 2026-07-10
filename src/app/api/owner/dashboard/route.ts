export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth/guards';
import { getCurrentISTTime } from '@/lib/deadline';
import { createServiceClient } from '@/lib/supabase/server';
import { getTomorrowDate } from '@/lib/utils';
import { withApiDiagnostic } from '@/lib/diagnostics/events';

interface FoodPreferenceRow {
	hosteler_id: string;
	breakfast: boolean;
	lunch: boolean;
	dinner: boolean;
}

interface HostelerRow {
	id: string;
	name: string;
	room_number: string;
}

async function handleGet() {
	const authResult = await requireOwner();
	if ('response' in authResult) return authResult.response;

	const supabase = createServiceClient();
	const tomorrowDate = getTomorrowDate();

	const [settingsRes, prefsRes, hostelersRes] = await Promise.all([
		supabase.from('settings').select('key, value').in('key', ['deadline_time']),
		supabase
			.from('food_preferences')
			.select('hosteler_id, breakfast, lunch, dinner')
			.eq('date', tomorrowDate)
			.is('canceled_at', null),
		supabase.from('hostelers').select('id, name, room_number').eq('status', 'active'),
	]);

	if (settingsRes.error || prefsRes.error || hostelersRes.error) {
		return NextResponse.json(
			{ error: 'Failed to load dashboard data' },
			{ status: 500 },
		);
	}

	const deadlineSetting = settingsRes.data?.find((setting) => setting.key === 'deadline_time');
	const preferences = (prefsRes.data ?? []) as FoodPreferenceRow[];
	const hostelers = (hostelersRes.data ?? []) as HostelerRow[];
	const submittedIds = new Set<string>();
	const counts = { breakfast: 0, lunch: 0, dinner: 0 };

	for (const preference of preferences) {
		if (preference.breakfast) counts.breakfast++;
		if (preference.lunch) counts.lunch++;
		if (preference.dinner) counts.dinner++;
		submittedIds.add(preference.hosteler_id);
	}

	const submittedHostelers: HostelerRow[] = [];
	const pendingHostelers: HostelerRow[] = [];

	for (const hosteler of hostelers) {
		if (submittedIds.has(hosteler.id)) {
			submittedHostelers.push(hosteler);
		} else {
			pendingHostelers.push(hosteler);
		}
	}

	return NextResponse.json({
		date: tomorrowDate,
		deadlineTime: deadlineSetting?.value ?? '21:00',
		serverTime: getCurrentISTTime(),
		counts,
		submittedHostelers,
		pendingHostelers,
	});
}

export async function GET() {
	return withApiDiagnostic(
		{ route: '/api/owner/dashboard', method: 'GET', action: 'owner.dashboard' },
		() => handleGet(),
	);
}