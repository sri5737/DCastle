export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { withApiDiagnostic } from '@/lib/diagnostics/events';

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

/** GET /api/hosteler/bills — returns only transmitted bills for authenticated hosteler */
export async function GET(request: NextRequest) {
  return withApiDiagnostic(
    { route: '/api/hosteler/bills', method: 'GET', action: 'billing.hosteler-list' },
    async () => {
    const token = request.cookies.get('sb-access-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get hosteler record for this auth user
    const { data: hosteler } = await supabase
      .from('hostelers')
      .select('id, status')
      .eq('auth_user_id', user.id)
      .single();

    if (!hosteler || hosteler.status !== 'active') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const monthFilter = url.searchParams.get('month');

    let query = supabase
      .from('monthly_bills')
      .select('id, month, status, room_rent_total, meal_charges, grand_total, generated_at, transmitted_at')
      .eq('hosteler_id', hosteler.id)
      .eq('status', 'transmitted')
      .order('month', { ascending: false });

    if (monthFilter) {
      query = query.eq('month', monthFilter) as typeof query;
    }

    const { data: bills, error } = await query;
    if (error) return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 });

    return NextResponse.json({ bills: bills ?? [] });
  });
}
