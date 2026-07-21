export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireHosteler } from '@/lib/auth/guards';
import { isPastDeadline, getCurrentISTTime } from '@/lib/deadline';
import { getTomorrowDate } from '@/lib/utils';
import { withApiDiagnostic } from '@/lib/diagnostics/events';

async function handleGet() {
  const authResult = await requireHosteler();
  if ('response' in authResult) return authResult.response;

  const { session } = authResult;

  const supabase = createServiceClient();

  // Get hosteler's availing_mess status
  const { data: hosteler, error: hostelerError } = await supabase
    .from('hostelers')
    .select('availing_mess')
    .eq('id', session.hosteler_id)
    .single();

  if (hostelerError || !hosteler) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  // Fetch existing preference for tomorrow (with auto-submitted status)
  const { data: preference } = await supabase
    .from('food_preferences')
    .select('breakfast, lunch, dinner, is_auto_submitted')
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
          is_auto_submitted: preference.is_auto_submitted || false,
        }
      : null,
    availing_mess: hosteler.availing_mess ?? true,
    deadline: deadlineTime,
    deadline_passed: deadlinePassed,
    server_time_ist: serverTime,
  });
}

export async function GET() {
  return withApiDiagnostic(
    { route: '/api/food/today-status', method: 'GET', action: 'food.today-status' },
    () => handleGet(),
  );
}
