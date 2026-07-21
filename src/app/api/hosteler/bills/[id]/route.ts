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

/** GET /api/hosteler/bills/[id] — returns bill detail if transmitted and belongs to hosteler */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiDiagnostic(
    { route: '/api/hosteler/bills/[id]', method: 'GET', action: 'billing.hosteler-detail' },
    async () => {
    const token = request.cookies.get('sb-access-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: hosteler } = await supabase
      .from('hostelers')
      .select('id, status')
      .eq('auth_user_id', user.id)
      .single();

    if (!hosteler || hosteler.status !== 'active') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: bill } = await supabase
      .from('monthly_bills')
      .select('id, hosteler_id, month, status, room_rent_total, meal_charges, grand_total, generated_at, transmitted_at')
      .eq('id', id)
      .single();

    // 404 if not found, not transmitted, or belongs to different hosteler
    if (!bill || bill.status !== 'transmitted' || bill.hosteler_id !== hosteler.id) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    return NextResponse.json({ bill });
  });
}
