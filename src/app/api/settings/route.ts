export const runtime = 'edge';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAuth, requireOwner } from '@/lib/auth/guards';
import { createServiceClient } from '@/lib/supabase/server';
import { withApiDiagnostic } from '@/lib/diagnostics/events';
import type { SettingsResponse, MealType } from '@/types';
import { getTodayIST, getTomorrowDate } from '@/lib/utils';

const DEADLINE_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];

type SettingsPatchBody = {
  deadline_time?: unknown;
  rates?: Partial<Record<MealType, unknown>>;
};

async function handleGet() {
  const authResult = await requireAuth();
  if ('response' in authResult) return authResult.response;

  const supabase = createServiceClient();

  // Get deadline_time from settings
  const { data: deadlineSetting, error: settingsError } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'deadline_time')
    .single();

  if (settingsError) {
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }

  // Get current rates (most recent by effective_from for each meal type)
  const rates: Record<string, { rate: number; effective_from: string }> = {};
  const today = getTodayIST();

  for (const mealType of MEAL_TYPES) {
    const { data: rateData } = await supabase
      .from('meal_rates')
      .select('rate, effective_from')
      .eq('meal_type', mealType)
      .lte('effective_from', today)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single();

    if (rateData) {
      rates[mealType] = {
        rate: Number(rateData.rate),
        effective_from: rateData.effective_from,
      };
    }
  }

  const response: SettingsResponse = {
    deadline_time: deadlineSetting.value,
    rates: {
      breakfast: rates.breakfast ?? { rate: 30, effective_from: '' },
      lunch: rates.lunch ?? { rate: 50, effective_from: '' },
      dinner: rates.dinner ?? { rate: 40, effective_from: '' },
    },
  };

  return NextResponse.json(response);
}

async function handlePatch(request: NextRequest) {
  const authResult = await requireOwner();
  if ('response' in authResult) return authResult.response;

  let body: SettingsPatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const deadlineTime = body.deadline_time;
  const rates = body.rates;

  if (deadlineTime !== undefined && (typeof deadlineTime !== 'string' || !DEADLINE_REGEX.test(deadlineTime))) {
    return NextResponse.json(
      { error: 'Invalid deadline_time format. Expected HH:MM' },
      { status: 400 }
    );
  }

  const rateRows: Array<{ meal_type: MealType; rate: number; effective_from: string }> = [];
  if (rates !== undefined) {
    if (!rates || typeof rates !== 'object' || Array.isArray(rates)) {
      return NextResponse.json({ error: 'Rate must be a positive number' }, { status: 400 });
    }

    const effectiveFrom = getTomorrowDate();
    for (const mealType of MEAL_TYPES) {
      const rawRate = rates[mealType];
      if (rawRate === undefined) continue;

      const rate = typeof rawRate === 'number' ? rawRate : Number(rawRate);
      if (!Number.isFinite(rate) || rate <= 0) {
        return NextResponse.json({ error: 'Rate must be a positive number' }, { status: 400 });
      }

      rateRows.push({ meal_type: mealType, rate, effective_from: effectiveFrom });
    }
  }

  if (deadlineTime === undefined && rateRows.length === 0) {
    return NextResponse.json(
      { error: 'Provide deadline_time or at least one meal rate' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const updatedAt = new Date().toISOString();

  if (deadlineTime !== undefined) {
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'deadline_time', value: deadlineTime, updated_at: updatedAt });

    if (error) {
      return NextResponse.json({ error: 'Failed to update deadline' }, { status: 500 });
    }
  }

  if (rateRows.length > 0) {
    const { error } = await supabase.from('meal_rates').insert(rateRows);

    if (error) {
      return NextResponse.json({ error: 'Failed to update meal rates' }, { status: 500 });
    }
  }

  const response: Partial<SettingsResponse> & { updated_at: string } = { updated_at: updatedAt };
  if (deadlineTime !== undefined) response.deadline_time = deadlineTime;
  if (rateRows.length > 0) {
    response.rates = rateRows.reduce<SettingsResponse['rates']>((accumulator, row) => {
      accumulator[row.meal_type] = {
        rate: row.rate,
        effective_from: row.effective_from,
      };
      return accumulator;
    }, {} as SettingsResponse['rates']);
  }

  return NextResponse.json(response);
}

export async function GET() {
  return withApiDiagnostic(
    { route: '/api/settings', method: 'GET', action: 'settings.read' },
    () => handleGet(),
  );
}

export async function PATCH(request: NextRequest) {
  return withApiDiagnostic(
    { route: '/api/settings', method: 'PATCH', action: 'settings.save' },
    () => handlePatch(request),
  );
}
