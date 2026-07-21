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

/** PATCH /api/admin/billing/bills/[id] — owner transmits a bill */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiDiagnostic(
    { route: '/api/admin/billing/bills/[id]', method: 'PATCH', action: 'billing.transmit' },
    async () => {
      const token = request.cookies.get('sb-access-token')?.value;
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const { id } = await params;

      let body: { action?: string };
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }

      if (body.action !== 'transmit') {
        return NextResponse.json(
          { error: "action must be 'transmit'" },
          { status: 400 }
        );
      }

      // Verify bill exists and belongs to this owner's hosteler
      const { data: billData } = await supabase
        .from('monthly_bills')
        .select('id, hosteler_id, status, hostelers(building_id, buildings(owner_id))')
        .eq('id', id)
        .single();

      const bill = billData as {
        status: string;
        hostelers?: { buildings?: { owner_id: string } | null } | null;
      } | null;

      if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });

      const ownerIdCheck = bill.hostelers?.buildings?.owner_id;
      if (ownerIdCheck !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (bill.status === 'transmitted') {
        return NextResponse.json(
          { error: 'Bill is already transmitted' },
          { status: 400 }
        );
      }

      // Transmit: update status + transmitted_at
      const { data: updated, error } = await supabase
        .from('monthly_bills')
        .update({
          status: 'transmitted',
          transmitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) return NextResponse.json({ error: 'Failed to transmit bill' }, { status: 500 });

      return NextResponse.json({ bill: updated });
    }
  );
}
