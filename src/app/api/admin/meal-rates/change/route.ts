import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withApiDiagnostic } from '@/lib/diagnostics/events';
import { isDateWithin3MonthWindow } from '@/lib/rate-change-window';

export const runtime = 'edge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  return withApiDiagnostic(
    { route: '/api/admin/meal-rates/change', method: 'POST', action: 'meal-rates.change' },
    async () => {
    // Authenticate as owner
    const token = request.cookies.get('sb-access-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { meal_type, new_rate, effective_date } = body;

    // Validation
    if (!meal_type || !['breakfast', 'lunch', 'dinner'].includes(meal_type)) {
      return NextResponse.json(
        { error: "meal_type must be 'breakfast', 'lunch', or 'dinner'" },
        { status: 400 }
      );
    }

    if (!new_rate || new_rate <= 0) {
      return NextResponse.json(
        { error: 'new_rate must be > 0' },
        { status: 400 }
      );
    }

    // Validate effective_date is within 3-month window (previous, current, next month)
    if (!effective_date) {
      return NextResponse.json(
        { error: 'effective_date is required' },
        { status: 400 }
      );
    }

    if (!isDateWithin3MonthWindow(effective_date)) {
      return NextResponse.json(
        { error: 'Effective date must be within the 3-month window (previous, current, or next month). You cannot schedule changes for months outside this range.' },
        { status: 400 }
      );
    }

    // Get current meal rate (from meal_rates table or last history entry)
    const { data: currentRate } = await supabase
      .from('meal_rates')
      .select('rate')
      .eq('meal_type', meal_type)
      .single();

    const old_rate = currentRate?.rate || 0;

    // Insert into meal_rate_rate_history
    const { data, error } = await supabase
      .from('meal_rate_rate_history')
      .insert({
        meal_type,
        old_rate,
        new_rate,
        effective_date,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        return NextResponse.json(
          { error: 'A meal rate change for this meal type already exists on that date' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  });
}
