export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withApiDiagnostic } from '@/lib/diagnostics/events';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
      const { data: bill } = await supabase
        .from('monthly_bills')
        .select('id, hosteler_id, status, hostelers(building_id, buildings(owner_id))')
        .eq('id', id)
        .single();

      if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });

      const ownerIdCheck = (
        (bill.hostelers as unknown as { buildings: { owner_id: string } } | null)?.buildings?.owner_id
      );
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
