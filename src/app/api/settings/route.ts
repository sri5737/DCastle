export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { createServiceClient } from '@/lib/supabase/server';
import type { SettingsResponse, MealType } from '@/types';

export async function GET() {
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
  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner'];
  const rates: Record<string, { rate: number; effective_from: string }> = {};

  for (const mealType of mealTypes) {
    const { data: rateData } = await supabase
      .from('meal_rates')
      .select('rate, effective_from')
      .eq('meal_type', mealType)
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
