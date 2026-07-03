export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireHosteler } from '@/lib/auth/guards';
import { isPastDeadline, getCurrentISTTime } from '@/lib/deadline';
import { getTomorrowDate } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const authResult = await requireHosteler();
  if ('response' in authResult) return authResult.response;

  const { session } = authResult;

  // Verify hosteler is active
  const supabase = createServiceClient();
  const { data: hosteler, error: hostelerError } = await supabase
    .from('hostelers')
    .select('id, status')
    .eq('id', session.hosteler_id)
    .single();

  if (hostelerError || !hosteler) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (hosteler.status !== 'active') {
    return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
  }

  // Get deadline from settings
  const { data: setting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'deadline_time')
    .single();

  const deadlineTime = setting?.value ?? '21:00';

  // Enforce deadline
  if (isPastDeadline(deadlineTime)) {
    const serverTime = getCurrentISTTime();
    return NextResponse.json(
      {
        error: 'Submissions are closed for tomorrow',
        deadline: deadlineTime,
        server_time: serverTime,
      },
      { status: 403 }
    );
  }

  // Parse request body
  let body: { breakfast?: boolean; lunch?: boolean; dinner?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { breakfast, lunch, dinner } = body;

  if (
    typeof breakfast !== 'boolean' ||
    typeof lunch !== 'boolean' ||
    typeof dinner !== 'boolean'
  ) {
    return NextResponse.json(
      { error: 'breakfast, lunch, and dinner must be booleans' },
      { status: 400 }
    );
  }

  const tomorrowDate = getTomorrowDate();

  // Upsert food preference
  const { data, error } = await supabase
    .from('food_preferences')
    .upsert(
      {
        hosteler_id: session.hosteler_id,
        date: tomorrowDate,
        breakfast,
        lunch,
        dinner,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'hosteler_id,date' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Failed to save food preferences' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    date: data.date,
    breakfast: data.breakfast,
    lunch: data.lunch,
    dinner: data.dinner,
    submitted_at: data.submitted_at,
    updated_at: data.updated_at,
  });
}
