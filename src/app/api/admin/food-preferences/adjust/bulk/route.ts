export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withApiDiagnostic } from '@/lib/diagnostics/events';
import { compareWithTodayIST, getTodayIST, isIsoDate } from '@/lib/utils';
import { getAllowedWindowDescription, isDateWithin3MonthWindow } from '@/lib/rate-change-window';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type MealsPayload = {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
};

type ScopeType = 'all_active' | 'specific_building';
type DateMode = 'single_date' | 'date_range';

type BulkAdjustRequestBody = {
  scope?: ScopeType;
  building_id?: string;
  date_mode?: DateMode;
  start_date?: string;
  end_date?: string;
  meals?: MealsPayload;
  adjustment_reason?: string;
  preview_only?: boolean;
};

type HostelerTarget = {
  id: string;
  name: string;
};

type ExistingPreference = {
  hosteler_id: string;
  date: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
};

type PreviewRow = {
  hosteler_id: string;
  hosteler_name: string;
  date: string;
  current_meals: MealsPayload;
  new_meals: MealsPayload;
};

function normalizeDateMode(value?: string): DateMode | null {
  if (value === 'single_date') return 'single_date';
  if (value === 'date_range') return 'date_range';
  return null;
}

function normalizeScope(value?: string): ScopeType | null {
  if (value === 'all_active') return 'all_active';
  if (value === 'specific_building') return 'specific_building';
  return null;
}

function parseMeals(meals?: MealsPayload): MealsPayload | null {
  if (!meals) return null;
  if (
    typeof meals.breakfast !== 'boolean' ||
    typeof meals.lunch !== 'boolean' ||
    typeof meals.dinner !== 'boolean'
  ) {
    return null;
  }
  return meals;
}

function validateDateWithinSchedulingWindow(date: string): string | null {
  if (!isIsoDate(date)) {
    return 'Date must be in YYYY-MM-DD format';
  }

  if (compareWithTodayIST(date) !== 1) {
    return 'Bulk meal updates only allow future dates';
  }

  if (!isDateWithin3MonthWindow(date)) {
    return `Date must be within the approved scheduling window (${getAllowedWindowDescription()})`;
  }

  return null;
}

function getMonthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function formatMonthLabel(monthStart: string): string {
  const date = new Date(`${monthStart}T00:00:00.000Z`);
  return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

function buildDateList(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
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

async function resolveTargetHostelers(ownerId: string, scope: ScopeType, buildingId?: string) {
  const { data: ownerBuildings } = await supabase
    .from('buildings')
    .select('id')
    .eq('owner_id', ownerId);

  const ownerBuildingIds = (ownerBuildings ?? []).map((row: { id: string }) => row.id);

  if (ownerBuildingIds.length === 0) {
    return { hostelers: [] as HostelerTarget[] };
  }

  if (scope === 'specific_building') {
    if (!buildingId) {
      return { response: NextResponse.json({ error: 'building_id is required for specific_building scope' }, { status: 400 }) };
    }

    if (!ownerBuildingIds.includes(buildingId)) {
      return { response: NextResponse.json({ error: 'Building not found' }, { status: 404 }) };
    }
  }

  let query = supabase
    .from('hostelers')
    .select('id, name')
    .eq('status', 'active')
    .in('building_id', scope === 'specific_building' ? [buildingId!] : ownerBuildingIds)
    .order('created_at', { ascending: false });

  const { data: hostelers, error } = await query;

  if (error) {
    return { response: NextResponse.json({ error: 'Failed to resolve target hostelers' }, { status: 500 }) };
  }

  return {
    hostelers: (hostelers ?? []).map((row: { id: string; name: string }) => ({
      id: row.id,
      name: row.name,
    })),
  };
}

function buildPreviewRows(
  hostelers: HostelerTarget[],
  dates: string[],
  meals: MealsPayload,
  existingRows: ExistingPreference[],
): PreviewRow[] {
  const existingMap = new Map<string, ExistingPreference>();
  for (const row of existingRows) {
    existingMap.set(`${row.hosteler_id}::${row.date}`, row);
  }

  const rows: PreviewRow[] = [];
  for (const hosteler of hostelers) {
    for (const date of dates) {
      const existing = existingMap.get(`${hosteler.id}::${date}`);
      const currentMeals: MealsPayload = {
        breakfast: existing?.breakfast ?? false,
        lunch: existing?.lunch ?? false,
        dinner: existing?.dinner ?? false,
      };

      rows.push({
        hosteler_id: hosteler.id,
        hosteler_name: hosteler.name,
        date,
        current_meals: currentMeals,
        new_meals: meals,
      });
    }
  }

  return rows;
}

function getChangedRows(rows: PreviewRow[]): PreviewRow[] {
  return rows.filter(
    (row) =>
      row.current_meals.breakfast !== row.new_meals.breakfast ||
      row.current_meals.lunch !== row.new_meals.lunch ||
      row.current_meals.dinner !== row.new_meals.dinner,
  );
}

async function getRecentEvents(ownerId: string) {
  const { data } = await supabase
    .from('bulk_meal_update_events')
    .select(
      'id, event_type, scope, date_mode, start_date, end_date, meals, affected_hostelers, affected_date_rows, created_at, created_by',
    )
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(10);

  return data ?? [];
}

export async function GET(request: NextRequest) {
  return withApiDiagnostic(
    { route: '/api/admin/food-preferences/adjust/bulk', method: 'GET', action: 'admin.food-preferences.adjust.bulk.events' },
    async () => {
      const auth = await requireOwnerFromCookie(request);
      if ('response' in auth) return auth.response;

      const events = await getRecentEvents(auth.user.id);
      return NextResponse.json({ events });
    },
  );
}

export async function POST(request: NextRequest) {
  return withApiDiagnostic(
    { route: '/api/admin/food-preferences/adjust/bulk', method: 'POST', action: 'admin.food-preferences.adjust.bulk' },
    async () => {
      const auth = await requireOwnerFromCookie(request);
      if ('response' in auth) return auth.response;

      let body: BulkAdjustRequestBody;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }

      const scope = normalizeScope(body.scope);
      const dateMode = normalizeDateMode(body.date_mode);
      const meals = parseMeals(body.meals);

      if (!scope || !dateMode || !meals || !body.start_date) {
        return NextResponse.json(
          {
            error:
              'scope, date_mode, start_date, and meals are required',
          },
          { status: 400 },
        );
      }

      const startDate = body.start_date.trim();
      const endDate = dateMode === 'date_range' ? (body.end_date?.trim() ?? '') : startDate;

      const startDateError = validateDateWithinSchedulingWindow(startDate);
      if (startDateError) {
        return NextResponse.json({ error: startDateError }, { status: 400 });
      }

      if (dateMode === 'date_range') {
        if (!endDate) {
          return NextResponse.json({ error: 'end_date is required for date_range mode' }, { status: 400 });
        }

        const endDateError = validateDateWithinSchedulingWindow(endDate);
        if (endDateError) {
          return NextResponse.json({ error: endDateError }, { status: 400 });
        }

        if (endDate < startDate) {
          return NextResponse.json({ error: 'end_date must be on or after start_date' }, { status: 400 });
        }
      }

      const dates = buildDateList(startDate, endDate);
      const targetResolution = await resolveTargetHostelers(auth.user.id, scope, body.building_id?.trim());
      if ('response' in targetResolution) return targetResolution.response;

      const hostelers = targetResolution.hostelers;
      const hostelerIds = hostelers.map((row) => row.id);

      if (hostelerIds.length === 0) {
        return NextResponse.json({
          preview: {
            total_hostelers_affected: 0,
            total_date_rows_affected: 0,
            sample_changes: [],
            has_transmitted_bills: false,
            transmitted_month_labels: [],
          },
          result: null,
        });
      }

      const { data: existingRows, error: existingRowsError } = await supabase
        .from('food_preferences')
        .select('hosteler_id, date, breakfast, lunch, dinner')
        .in('hosteler_id', hostelerIds)
        .in('date', dates)
        .is('canceled_at', null);

      if (existingRowsError) {
        return NextResponse.json({ error: 'Failed to load existing preferences for preview' }, { status: 500 });
      }

      const allPreviewRows = buildPreviewRows(hostelers, dates, meals, (existingRows ?? []) as ExistingPreference[]);
      const changedRows = getChangedRows(allPreviewRows);
      const monthStarts = [...new Set(dates.map(getMonthStart))];

      const { data: transmittedBills } = await supabase
        .from('monthly_bills')
        .select('id, month, hosteler_id')
        .in('hosteler_id', hostelerIds)
        .in('month', monthStarts)
        .eq('status', 'transmitted');

      const transmittedMonthLabels = [...new Set((transmittedBills ?? []).map((row: { month: string }) => formatMonthLabel(row.month)))];

      const previewPayload = {
        total_hostelers_affected: hostelers.length,
        total_date_rows_affected: changedRows.length,
        sample_changes: changedRows.slice(0, 8),
        has_transmitted_bills: (transmittedBills ?? []).length > 0,
        transmitted_month_labels: transmittedMonthLabels,
      };

      if (body.preview_only) {
        return NextResponse.json({ preview: previewPayload, result: null });
      }

      const reason = body.adjustment_reason?.trim() ?? '';
      if (!reason) {
        return NextResponse.json({ error: 'adjustment_reason is required' }, { status: 400 });
      }

      const nowIso = new Date().toISOString();
      const partialFailures: Array<{ hosteler_id: string; date: string; error: string }> = [];
      let successfulUpdates = 0;

      for (const row of changedRows) {
        const { error: updateError } = await supabase
          .from('food_preferences')
          .upsert(
            {
              hosteler_id: row.hosteler_id,
              date: row.date,
              breakfast: row.new_meals.breakfast,
              lunch: row.new_meals.lunch,
              dinner: row.new_meals.dinner,
              submitted_at: nowIso,
              updated_at: nowIso,
              adjusted_by_owner_id: auth.user.id,
              adjusted_at: nowIso,
              adjustment_reason: reason,
            },
            { onConflict: 'hosteler_id,date' },
          );

        if (updateError) {
          partialFailures.push({
            hosteler_id: row.hosteler_id,
            date: row.date,
            error: updateError.message || 'Failed to update row',
          });
          continue;
        }

        successfulUpdates += 1;
      }

      let flaggedBills = 0;
      if ((transmittedBills ?? []).length > 0) {
        const billIds = (transmittedBills ?? []).map((bill: { id: string }) => bill.id);
        const { data: updatedBills, error: billFlagError } = await supabase
          .from('monthly_bills')
          .update({ status: 'needs_retransmission', updated_at: nowIso })
          .in('id', billIds)
          .eq('status', 'transmitted')
          .select('id');

        if (billFlagError) {
          return NextResponse.json(
            { error: 'Bulk meal update completed but failed to flag transmitted bills for retransmission' },
            { status: 500 },
          );
        }

        flaggedBills = (updatedBills ?? []).length;
      }

      await supabase.from('bulk_meal_update_events').insert({
        owner_id: auth.user.id,
        created_by: auth.user.id,
        event_type:
          meals.breakfast === false && meals.lunch === false && meals.dinner === false
            ? 'full_closure'
            : 'custom_availability',
        scope,
        building_id: scope === 'specific_building' ? body.building_id?.trim() ?? null : null,
        date_mode: dateMode,
        start_date: startDate,
        end_date: dateMode === 'date_range' ? endDate : null,
        meals,
        affected_hostelers: hostelers.length,
        affected_date_rows: successfulUpdates,
        adjustment_reason: reason,
      });

      const events = await getRecentEvents(auth.user.id);
      const impactedDateCount = dates.length;

      return NextResponse.json({
        preview: previewPayload,
        result: {
          total_hostelers_affected: hostelers.length,
          total_date_rows_affected: successfulUpdates,
          total_dates_affected: impactedDateCount,
          partial_failures: partialFailures,
          flagged_bills_for_retransmission: flaggedBills,
          message: `Bulk meal update applied to ${hostelers.length} hostelers across ${impactedDateCount} date(s)`,
        },
        events,
      });
    },
  );
}
