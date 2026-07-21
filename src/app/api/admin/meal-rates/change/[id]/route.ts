import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withApiDiagnostic } from '@/lib/diagnostics/events';
import { getTodayIST } from '@/lib/utils';

export const runtime = 'edge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withApiDiagnostic(
    { route: '/api/admin/meal-rates/change/[id]', method: 'DELETE', action: 'meal-rates.cancel' },
    async () => {
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

      const resolvedParams = await params;
      const changeId = resolvedParams.id;
      const today = getTodayIST();

      const { data: existing, error: fetchError } = await supabase
        .from('meal_rate_rate_history')
        .select('id,effective_date,canceled_at,created_by')
        .eq('id', changeId)
        .eq('created_by', user.id)
        .single();

      if (fetchError || !existing) {
        return NextResponse.json({ error: 'Change not found' }, { status: 404 });
      }

      if (existing.canceled_at) {
        return NextResponse.json({ error: 'Change already canceled' }, { status: 400 });
      }

      if (existing.effective_date <= today) {
        return NextResponse.json({ error: 'Only future changes can be canceled' }, { status: 400 });
      }

      const canceledAt = new Date().toISOString();
      const { data: updated, error: updateError } = await supabase
        .from('meal_rate_rate_history')
        .update({ canceled_at: canceledAt })
        .eq('id', changeId)
        .eq('created_by', user.id)
        .is('canceled_at', null)
        .select('id,canceled_at')
        .single();

      if (updateError || !updated) {
        return NextResponse.json({ error: 'Failed to cancel change' }, { status: 500 });
      }

      return NextResponse.json({
        canceled: true,
        id: updated.id,
        canceled_at: updated.canceled_at,
      });
    }
  );
}
