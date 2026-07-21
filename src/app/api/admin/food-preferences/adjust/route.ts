export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { withApiDiagnostic } from '@/lib/diagnostics/events';
import { compareWithTodayIST, isIsoDate } from '@/lib/utils';

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

type MealsPayload = {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
};

type AdjustRequestBody = {
  hosteler_id?: string;
  date?: string;
  meals?: MealsPayload;
  adjustment_reason?: string;
};

function formatMonthLabel(monthStart: string) {
  const d = new Date(`${monthStart}T00:00:00.000Z`);
  return d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

async function requireOwnerFromCookie(request: NextRequest) {
  const token = request.cookies.get('sb-access-token')?.value;
  if (!token) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { user };
}

async function verifyHostelerOwnership(hostelerId: string, ownerId: string) {
  const { data: hosteler } = await supabase
    .from('hostelers')
    .select('id, buildings(owner_id)')
    .eq('id', hostelerId)
    .single();

  if (!hosteler) {
    return { response: NextResponse.json({ error: 'Hosteler not found' }, { status: 404 }) };
  }

  const hostelerOwnerId =
    (hosteler.buildings as unknown as { owner_id: string } | null)?.owner_id ?? null;

  if (hostelerOwnerId !== ownerId) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { hosteler };
}

export async function GET(request: NextRequest) {
  return withApiDiagnostic(
    { route: '/api/admin/food-preferences/adjust', method: 'GET', action: 'admin.food-preferences.adjust.load' },
    async () => {
      const auth = await requireOwnerFromCookie(request);
      if ('response' in auth) return auth.response;

      const { searchParams } = new URL(request.url);
      const hostelerId = searchParams.get('hosteler_id')?.trim();
      const date = searchParams.get('date')?.trim();

      if (!hostelerId || !date) {
        return NextResponse.json({ error: 'hosteler_id and date are required' }, { status: 400 });
      }

      if (!isIsoDate(date)) {
        return NextResponse.json({ error: 'date must be in YYYY-MM-DD format' }, { status: 400 });
      }

      const ownership = await verifyHostelerOwnership(hostelerId, auth.user.id);
      if ('response' in ownership) return ownership.response;

      const { data: preference, error } = await supabase
        .from('food_preferences')
        .select('breakfast, lunch, dinner')
        .eq('hosteler_id', hostelerId)
        .eq('date', date)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: 'Failed to load existing meal entries' }, { status: 500 });
      }

      const monthStart = `${date.slice(0, 7)}-01`;
      const { data: transmittedBill } = await supabase
        .from('monthly_bills')
        .select('id')
        .eq('hosteler_id', hostelerId)
        .eq('month', monthStart)
        .eq('status', 'transmitted')
        .maybeSingle();

      return NextResponse.json({
        meals: {
          breakfast: preference?.breakfast ?? false,
          lunch: preference?.lunch ?? false,
          dinner: preference?.dinner ?? false,
        },
        has_transmitted_bill: !!transmittedBill,
        warning_month_label: transmittedBill ? formatMonthLabel(monthStart) : null,
      });
    },
  );
}

export async function POST(request: NextRequest) {
  return withApiDiagnostic(
    { route: '/api/admin/food-preferences/adjust', method: 'POST', action: 'admin.food-preferences.adjust.save' },
    async () => {
      const auth = await requireOwnerFromCookie(request);
      if ('response' in auth) return auth.response;

      let body: AdjustRequestBody;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }

      const hostelerId = body.hosteler_id?.trim();
      const date = body.date?.trim();
      const reason = body.adjustment_reason?.trim() ?? '';
      const meals = body.meals;

      if (!hostelerId || !date || !meals) {
        return NextResponse.json(
          { error: 'hosteler_id, date, and meals are required' },
          { status: 400 },
        );
      }

      if (!isIsoDate(date)) {
        return NextResponse.json({ error: 'date must be in YYYY-MM-DD format' }, { status: 400 });
      }

      if (compareWithTodayIST(date) === 1) {
        return NextResponse.json(
          { error: 'Only past or current dates can be adjusted' },
          { status: 400 },
        );
      }

      if (typeof meals.breakfast !== 'boolean' || typeof meals.lunch !== 'boolean' || typeof meals.dinner !== 'boolean') {
        return NextResponse.json(
          { error: 'meals must include boolean breakfast, lunch, and dinner' },
          { status: 400 },
        );
      }

      if (!reason) {
        return NextResponse.json({ error: 'adjustment_reason is required' }, { status: 400 });
      }

      const ownership = await verifyHostelerOwnership(hostelerId, auth.user.id);
      if ('response' in ownership) return ownership.response;

      const nowIso = new Date().toISOString();
      const { data: adjustedPreference, error: upsertError } = await supabase
        .from('food_preferences')
        .upsert(
          {
            hosteler_id: hostelerId,
            date,
            breakfast: meals.breakfast,
            lunch: meals.lunch,
            dinner: meals.dinner,
            submitted_at: nowIso,
            updated_at: nowIso,
            adjusted_by_owner_id: auth.user.id,
            adjusted_at: nowIso,
            adjustment_reason: reason,
          },
          { onConflict: 'hosteler_id,date' },
        )
        .select(
          'id, hosteler_id, date, breakfast, lunch, dinner, adjusted_by_owner_id, adjusted_at, adjustment_reason',
        )
        .single();

      if (upsertError || !adjustedPreference) {
        return NextResponse.json({ error: 'Failed to save meal adjustment' }, { status: 500 });
      }

      const monthStart = `${date.slice(0, 7)}-01`;
      const { data: bill } = await supabase
        .from('monthly_bills')
        .select('id, status')
        .eq('hosteler_id', hostelerId)
        .eq('month', monthStart)
        .maybeSingle();

      let billFlaggedForRetransmission = false;
      if (bill?.status === 'transmitted') {
        const { error: updateBillError } = await supabase
          .from('monthly_bills')
          .update({ status: 'needs_retransmission', updated_at: nowIso })
          .eq('id', bill.id);

        if (updateBillError) {
          return NextResponse.json({ error: 'Meal adjustment saved but failed to flag transmitted bill' }, { status: 500 });
        }

        billFlaggedForRetransmission = true;
      }

      return NextResponse.json({
        message: 'Meal adjustment saved',
        adjustment: adjustedPreference,
        bill_flagged_for_retransmission: billFlaggedForRetransmission,
      });
    },
  );
}