export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withApiDiagnostic } from '@/lib/diagnostics/events';
import { calculateMonthlyBill } from '@/lib/billing';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  return withApiDiagnostic(
    { route: '/api/admin/billing/generate', method: 'POST', action: 'billing.generate' },
    async () => {
      const token = request.cookies.get('sb-access-token')?.value;
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      let body: { scope?: string; scope_id?: string; month?: string };
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }

      const { scope, scope_id, month } = body;

      // Validate scope
      if (!scope || !['all', 'building', 'hosteler'].includes(scope)) {
        return NextResponse.json(
          { error: "scope must be 'all', 'building', or 'hosteler'" },
          { status: 400 }
        );
      }
      if ((scope === 'building' || scope === 'hosteler') && !scope_id) {
        return NextResponse.json(
          { error: 'scope_id is required for building/hosteler scope' },
          { status: 400 }
        );
      }
      if (!month) {
        return NextResponse.json({ error: 'month is required' }, { status: 400 });
      }
      // month must be first day of month (YYYY-MM-01)
      if (!/^\d{4}-\d{2}-01$/.test(month)) {
        return NextResponse.json(
          { error: 'month must be in YYYY-MM-01 format (first day of month)' },
          { status: 400 }
        );
      }

      // Resolve hosteler IDs based on scope
      let hostelerIds: string[] = [];

      if (scope === 'hosteler') {
        // Verify the hosteler belongs to this owner
        const { data: h } = await supabase
          .from('hostelers')
          .select('id, building_id, buildings(owner_id)')
          .eq('id', scope_id!)
          .eq('status', 'active')
          .single();
        if (!h) {
          return NextResponse.json({ error: 'Hosteler not found or inactive' }, { status: 404 });
        }
        const ownerIdCheck = (h.buildings as unknown as { owner_id: string } | null)?.owner_id;
        if (ownerIdCheck !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        hostelerIds = [scope_id!];
      } else if (scope === 'building') {
        // Verify building belongs to owner
        const { data: bldg } = await supabase
          .from('buildings')
          .select('id')
          .eq('id', scope_id!)
          .eq('owner_id', user.id)
          .single();
        if (!bldg) {
          return NextResponse.json({ error: 'Building not found' }, { status: 404 });
        }
        const { data: hostelers } = await supabase
          .from('hostelers')
          .select('id')
          .eq('building_id', scope_id!)
          .eq('status', 'active');
        hostelerIds = (hostelers ?? []).map((h: { id: string }) => h.id);
      } else {
        // scope = 'all': all active hostelers for this owner
        const { data: buildings } = await supabase
          .from('buildings')
          .select('id')
          .eq('owner_id', user.id);
        const buildingIds = (buildings ?? []).map((b: { id: string }) => b.id);
        if (buildingIds.length > 0) {
          const { data: hostelers } = await supabase
            .from('hostelers')
            .select('id')
            .in('building_id', buildingIds)
            .eq('status', 'active');
          hostelerIds = (hostelers ?? []).map((h: { id: string }) => h.id);
        }
      }

      if (hostelerIds.length === 0) {
        return NextResponse.json({ generated_count: 0, bills: [] });
      }

      // Check existing bills for this month
      const { data: existingBills } = await supabase
        .from('monthly_bills')
        .select('id, hosteler_id, status')
        .in('hosteler_id', hostelerIds)
        .eq('month', month);

      const existingByHosteler: Record<string, { id: string; status: string }> = {};
      for (const bill of existingBills ?? []) {
        existingByHosteler[bill.hosteler_id] = { id: bill.id, status: bill.status };
      }

      // Generate bills
      const generatedBills: Array<{
        hosteler_id: string;
        hosteler_name: string;
        room: string | null;
        total: number;
        status: string;
      }> = [];

      for (const hostelerId of hostelerIds) {
        // Calculate bill amounts
        const billData = await calculateMonthlyBill(hostelerId, month, supabase);

        // Get hosteler display info
        const { data: hostelerInfo } = await supabase
          .from('hostelers')
          .select('name, room_id, rooms(room_number)')
          .eq('id', hostelerId)
          .single();

        const hostelerName = hostelerInfo?.name ?? 'Unknown';
        const roomNumber = (hostelerInfo?.rooms as unknown as { room_number: string } | null)?.room_number ?? null;

        const existing = existingByHosteler[hostelerId];

        if (existing) {
          if (existing.status === 'generated') {
            // Delete and replace (regenerate)
            await supabase.from('monthly_bills').delete().eq('id', existing.id);
          } else {
            // transmitted: update back to generated with new values
            await supabase
              .from('monthly_bills')
              .update({
                status: 'generated',
                room_rent_total: billData.room_rent_total,
                meal_charges: billData.meal_charges,
                grand_total: billData.grand_total,
                generated_at: new Date().toISOString(),
                transmitted_at: null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);
            generatedBills.push({
              hosteler_id: hostelerId,
              hosteler_name: hostelerName,
              room: roomNumber,
              total: billData.grand_total,
              status: 'generated',
            });
            continue;
          }
        }

        // Insert new generated bill
        const { error: insertError } = await supabase.from('monthly_bills').insert({
          hosteler_id: hostelerId,
          month,
          status: 'generated',
          room_rent_total: billData.room_rent_total,
          meal_charges: billData.meal_charges,
          grand_total: billData.grand_total,
          generated_at: new Date().toISOString(),
        });

        if (!insertError) {
          generatedBills.push({
            hosteler_id: hostelerId,
            hosteler_name: hostelerName,
            room: roomNumber,
            total: billData.grand_total,
            status: 'generated',
          });
        }
      }

      return NextResponse.json({
        generated_count: generatedBills.length,
        bills: generatedBills,
      });
    }
  );
}
