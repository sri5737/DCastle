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

export async function GET(request: NextRequest) {
  return withApiDiagnostic(
    { route: '/api/admin/settings/meal-rates', method: 'GET', action: 'settings.meal-rates' },
    async () => {
    // Authenticate as owner (or any authenticated user)
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

    // Get current meal rates from meal_rates table
    const { data: currentRates, error: currentError } = await supabase
      .from('meal_rates')
      .select('*');

    if (currentError) {
      return NextResponse.json({ error: currentError.message }, { status: 500 });
    }

    // Get pending meal rate changes (effective_date >= today)
    const today = new Date().toISOString().split('T')[0];
    const { data: pendingChanges, error: pendingError } = await supabase
      .from('meal_rate_rate_history')
      .select('*')
      .gte('effective_date', today)
      .order('effective_date', { ascending: false });

    if (pendingError) {
      return NextResponse.json({ error: pendingError.message }, { status: 500 });
    }

    return NextResponse.json({
      current_rates: currentRates || [],
      pending_changes: pendingChanges || [],
    });
  });
}
