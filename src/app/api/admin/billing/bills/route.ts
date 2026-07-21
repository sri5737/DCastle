export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withApiDiagnostic } from '@/lib/diagnostics/events';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** GET /api/admin/billing/bills — owner sees all bills (any status) for their hostelers */
export async function GET(request: NextRequest) {
  return withApiDiagnostic(
    { route: '/api/admin/billing/bills', method: 'GET', action: 'billing.list' },
    async () => {
      const token = request.cookies.get('sb-access-token')?.value;
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      // Get all buildings for this owner
      const { data: buildings } = await supabase
        .from('buildings')
        .select('id')
        .eq('owner_id', user.id);
      const buildingIds = (buildings ?? []).map((b: { id: string }) => b.id);

      if (buildingIds.length === 0) {
        return NextResponse.json({ bills: [] });
      }

      // Get all hosteler IDs for this owner
      const { data: hostelers } = await supabase
        .from('hostelers')
        .select('id')
        .in('building_id', buildingIds);
      const hostelerIds = (hostelers ?? []).map((h: { id: string }) => h.id);

      if (hostelerIds.length === 0) {
        return NextResponse.json({ bills: [] });
      }

      // Optional month filter
      const url = new URL(request.url);
      const monthFilter = url.searchParams.get('month');

      let query = supabase
        .from('monthly_bills')
        .select(`
          id, hosteler_id, month, status, room_rent_total, meal_charges,
          grand_total, generated_at, transmitted_at,
          hostelers(name, room_id, rooms(room_number))
        `)
        .in('hosteler_id', hostelerIds)
        .order('month', { ascending: false });

      if (monthFilter) {
        query = query.eq('month', monthFilter) as typeof query;
      }

      const { data: bills, error } = await query;
      if (error) return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 });

      return NextResponse.json({ bills: bills ?? [] });
    }
  );
}
