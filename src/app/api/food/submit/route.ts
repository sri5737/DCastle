export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireHosteler } from '@/lib/auth/guards';
import { isPastDeadline, getCurrentISTTime } from '@/lib/deadline';
import { getTomorrowDate } from '@/lib/utils';
import { withApiDiagnostic } from '@/lib/diagnostics/events';

async function handlePost(request: NextRequest) {
  const authResult = await requireHosteler();
  if ('response' in authResult) return authResult.response;

  const { session } = authResult;

  // Verify hosteler is active and get availing_mess status
  const supabase = createServiceClient();
  const { data: hosteler, error: hostelerError } = await supabase
    .from('hostelers')
    .select('id, status, availing_mess')
    .eq('id', session.hosteler_id)
    .single();

  if (hostelerError || !hosteler) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (hosteler.status !== 'active') {
    return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
  }

  // Check if meal submission is disabled for this hosteler
  if (hosteler.availing_mess === false) {
    return NextResponse.json(
      { error: 'Meal submission is disabled. Please contact owner to enable meal facilities.' },
      { status: 403 }
    );
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

  // Check if there's an existing auto-submitted meal that cannot be edited
  const { data: existingMeal } = await supabase
    .from('food_preferences')
    .select('id, is_auto_submitted')
    .eq('hosteler_id', session.hosteler_id)
    .eq('date', tomorrowDate)
    .single();

  if (existingMeal?.is_auto_submitted) {
    return NextResponse.json(
      { error: 'This meal was auto-submitted and cannot be edited. Please contact owner to make changes.' },
      { status: 403 }
    );
  }

  // Upsert food preference (will not overwrite auto-submitted meals due to check above)
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
        is_auto_submitted: false,
        submitted_by: null,
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
    is_auto_submitted: data.is_auto_submitted,
  });
}

export async function POST(request: NextRequest) {
  return withApiDiagnostic(
    { route: '/api/food/submit', method: 'POST', action: 'food.submit' },
    () => handlePost(request),
  );
}

