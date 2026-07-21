export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withApiDiagnostic } from '@/lib/diagnostics/events';
import { getTodayIST } from '@/lib/utils';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** GET /api/admin/room-rent-config — list room rent config history for this owner */
export async function GET(request: NextRequest) {
  return withApiDiagnostic(
    { route: '/api/admin/room-rent-config', method: 'GET', action: 'room-rent-config.list' },
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

    const scope = request.nextUrl.searchParams.get('scope');
    const today = getTodayIST();

    let query = supabase
      .from('room_rent_config_history')
      .select('*')
      .eq('owner_id', user.id)
      .order('effective_date', { ascending: false });

    if (scope === 'upcoming') {
      query = query
        .gt('effective_date', today)
        .is('canceled_at', null)
        .order('effective_date', { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      changes: data || [],
      count: (data || []).length,
    });
  });
}
