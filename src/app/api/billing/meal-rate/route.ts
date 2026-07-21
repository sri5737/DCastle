import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { withApiDiagnostic } from '@/lib/diagnostics/events';

export const runtime = 'edge';

let supabaseClient: SupabaseClient<any, 'public', any> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase server environment is not configured.');
    }

    supabaseClient = createClient(supabaseUrl, serviceRoleKey);
  }

  return supabaseClient;
}

const supabase = new Proxy({} as SupabaseClient<any, 'public', any>, {
  get(_target, property, receiver) {
    return Reflect.get(getSupabaseClient() as object, property, receiver);
  },
});

/**
 * GET /api/billing/meal-rate?meal_type=breakfast&date=2026-07-15
 * 
 * Returns the meal rate effective for a specific meal type on a specific date.
 * Uses historical rate lookup from meal_rate_rate_history table.
 */
export async function GET(request: NextRequest) {
  return withApiDiagnostic(
    { route: '/api/billing/meal-rate', method: 'GET', action: 'billing.meal-rate' },
    async () => {
    const { searchParams } = new URL(request.url);
    const meal_type = searchParams.get('meal_type');
    const date = searchParams.get('date');

    // Validation
    if (!meal_type || !['breakfast', 'lunch', 'dinner'].includes(meal_type)) {
      return NextResponse.json(
        { error: "meal_type must be 'breakfast', 'lunch', or 'dinner'" },
        { status: 400 }
      );
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'date must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    // Query: find the rate effective on or before the given date
    // Use meal_rate_rate_history with indexed query for efficiency
    const { data: history, error: historyError } = await supabase
      .from('meal_rate_rate_history')
      .select('*')
      .eq('meal_type', meal_type)
      .lte('effective_date', date)
      .order('effective_date', { ascending: false })
      .limit(1)
      .single();

    // If no history exists, fallback to meal_rates table
    if (historyError?.code === 'PGRST116') {
      // No rows returned, use current rate
      const { data: currentRate, error: currentError } = await supabase
        .from('meal_rates')
        .select('rate')
        .eq('meal_type', meal_type)
        .single();

      if (currentError) {
        return NextResponse.json(
          { error: 'Meal rate not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        meal_type,
        rate: currentRate.rate,
        effective_date: null, // Indicates this is the current default rate
        source: 'current_meal_rates',
      });
    }

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    if (history) {
      return NextResponse.json({
        meal_type,
        rate: history.new_rate,
        effective_date: history.effective_date,
        source: 'meal_rate_rate_history',
      });
    }

    // Fallback to current rate if no history found
    const { data: currentRate, error: currentError } = await supabase
      .from('meal_rates')
      .select('rate')
      .eq('meal_type', meal_type)
      .single();

    if (currentError) {
      return NextResponse.json(
        { error: 'Meal rate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      meal_type,
      rate: currentRate.rate,
      effective_date: null,
      source: 'current_meal_rates',
    });
  });
}
