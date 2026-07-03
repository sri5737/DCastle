export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireHosteler } from '@/lib/auth/guards';
import { isPastDeadline, getCurrentISTTime } from '@/lib/deadline';
import { getTomorrowDate } from '@/lib/utils';

export async function GET() {
  const authResult = await requireHosteler();
  if ('response' in authResult) return authResult.response;

  const { session } = authResult;

  const supabase = createServiceClient();

  // Get deadline from settings
  const { data: setting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'deadline_time')
    .single();

  const deadlineTime = setting?.value ?? '21:00';
  const serverTime = getCurrentISTTime();
  const deadlinePassed = isPastDeadline(deadlineTime);
  const tomorrowDate = getTomorrowDate();

  // Fetch existing preference for tomorrow
  const { data: preference } = await supabase
    .from('food_preferences')
    .select('breakfast, lunch, dinner')
    .eq('hosteler_id', session.hosteler_id)
    .eq('date', tomorrowDate)
    .single();

  return NextResponse.json({
    submitted: !!preference,
    date: tomorrowDate,
    preferences: preference
      ? {
          breakfast: preference.breakfast,
          lunch: preference.lunch,
          dinner: preference.dinner,
        }
      : null,
    deadline: deadlineTime,
    deadline_passed: deadlinePassed,
    server_time_ist: serverTime,
  });
}
