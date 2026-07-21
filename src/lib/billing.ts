/**
 * Billing calculation library (T115)
 *
 * Implements calculateMonthlyBill() for two-phase billing (generate → transmit).
 * Per-day room rent and meal charges use historical rate lookups so mid-month
 * rate changes are reflected accurately.
 *
 * Spec refs: FR-091, CHK046 (change-date uses new rate), CHK102 (full history traversal)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface MealCharges {
  breakfast: number;
  lunch: number;
  dinner: number;
}

export interface MonthlyBillResult {
  room_rent_total: number;
  meal_charges: MealCharges;
  grand_total: number;
}

interface RentHistoryRow {
  sharing_capacity: number;
  room_class: string;
  new_rent: number;
  effective_date: string;
}

interface MealRateHistoryRow {
  meal_type: string;
  new_rate: number;
  effective_date: string;
}

interface FoodPrefRow {
  date: string;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

/**
 * Returns all calendar dates (YYYY-MM-DD) in the given month.
 * @param month First day of the month as 'YYYY-MM-DD'
 */
export function getDaysInMonth(month: string): string[] {
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr, 10);
  const mon = parseInt(monthStr, 10);
  const daysCount = new Date(year, mon, 0).getDate();
  const dates: string[] = [];
  for (let d = 1; d <= daysCount; d++) {
    dates.push(`${yearStr}-${monthStr}-${String(d).padStart(2, '0')}`);
  }
  return dates;
}

/**
 * Given a sorted-desc list of history rows, returns the row with the highest
 * effective_date that is still <= targetDate (IST-calendar string comparison).
 * CHK102: Full history traversal per date.
 */
function lookupByDate<T extends { effective_date: string }>(
  rows: T[],
  targetDate: string
): T | undefined {
  // rows expected to be sorted effective_date DESC (or unsorted — we'll find max applicable)
  let best: T | undefined;
  for (const row of rows) {
    if (row.effective_date <= targetDate) {
      if (!best || row.effective_date > best.effective_date) {
        best = row;
      }
    }
  }
  return best;
}

/**
 * Normalises room_types.name ('AC'/'non-AC') to room_rent_config_history.room_class ('ac'/'non_ac').
 */
export function roomNameToClass(name: string): 'ac' | 'non_ac' {
  return name === 'AC' ? 'ac' : 'non_ac';
}

/**
 * Calculates the monthly bill for a single hosteler.
 *
 * @param hostelerId  UUID of the hosteler
 * @param month       First day of the billing month, 'YYYY-MM-DD' (e.g. '2026-07-01')
 * @param supabase    Service-role Supabase client (no RLS)
 */
export async function calculateMonthlyBill(
  hostelerId: string,
  month: string,
  supabase: SupabaseClient
): Promise<MonthlyBillResult> {
  // ── 1. Load hosteler basics ───────────────────────────────────────────────
  const { data: hosteler, error: hErr } = await supabase
    .from('hostelers')
    .select('id, availing_mess, room_id, building_id')
    .eq('id', hostelerId)
    .single();

  if (hErr || !hosteler) {
    return {
      room_rent_total: 0,
      meal_charges: { breakfast: 0, lunch: 0, dinner: 0 },
      grand_total: 0,
    };
  }

  const days = getDaysInMonth(month);
  const lastDay = days[days.length - 1];

  // ── 2. Room rent calculation ──────────────────────────────────────────────
  let room_rent_total = 0;

  if (hosteler.room_id && hosteler.building_id) {
    // Get room + room_type (sharing_capacity, name/room_class) and current_rent fallback
    const { data: room } = await supabase
      .from('rooms')
      .select('current_rent, room_type_id, room_types(name, sharing_capacity)')
      .eq('id', hosteler.room_id)
      .single();

    if (room) {
      // Get owner_id from building
      const { data: building } = await supabase
        .from('buildings')
        .select('owner_id')
        .eq('id', hosteler.building_id)
        .single();

      const ownerIdForRent = building?.owner_id;
      const sharingCapacity: number = (room.room_types as unknown as { sharing_capacity: number } | null)?.sharing_capacity ?? 1;
      const roomTypeName: string = (room.room_types as unknown as { name: string } | null)?.name ?? 'non-AC';
      const roomClass = roomNameToClass(roomTypeName);
      const fallbackRent: number = Number(room.current_rent) || 0;

      // Fetch all rent config history for this owner+sharing_capacity+room_class up to last day of month
      let rentHistory: RentHistoryRow[] = [];
      if (ownerIdForRent) {
        const { data: rentData } = await supabase
          .from('room_rent_config_history')
          .select('sharing_capacity, room_class, new_rent, effective_date')
          .eq('owner_id', ownerIdForRent)
          .eq('sharing_capacity', sharingCapacity)
          .eq('room_class', roomClass)
          .lte('effective_date', lastDay)
          .order('effective_date', { ascending: false });

        rentHistory = rentData ?? [];
      }

      // For each day: look up applicable rent (CHK046: change-date uses new rate)
      for (const day of days) {
        const applicable = lookupByDate(rentHistory, day);
        room_rent_total += applicable ? Number(applicable.new_rent) : fallbackRent;
      }
    }
  }
  // No room assignment → room_rent_total stays 0

  // ── 3. Meal charges calculation ───────────────────────────────────────────
  let meal_charges: MealCharges = { breakfast: 0, lunch: 0, dinner: 0 };

  // availing_mess=false → exclude ALL meal charges
  if (hosteler.availing_mess === false) {
    return {
      room_rent_total,
      meal_charges,
      grand_total: room_rent_total,
    };
  }

  // Get food preferences for the month (non-canceled only)
  const monthStart = month; // 'YYYY-MM-01'
  const monthEnd = lastDay;

  const { data: foodPrefs } = await supabase
    .from('food_preferences')
    .select('date, breakfast, lunch, dinner')
    .eq('hosteler_id', hostelerId)
    .gte('date', monthStart)
    .lte('date', monthEnd)
    .is('canceled_at', null);

  const prefsByDate: Record<string, FoodPrefRow> = {};
  for (const pref of foodPrefs ?? []) {
    prefsByDate[pref.date] = pref;
  }

  // Fetch meal rate history for all meals up to last day of month
  const { data: mealRateData } = await supabase
    .from('meal_rate_rate_history')
    .select('meal_type, new_rate, effective_date')
    .lte('effective_date', lastDay)
    .order('effective_date', { ascending: false });

  const allMealHistory: MealRateHistoryRow[] = mealRateData ?? [];

  // Separate by meal type for efficient lookup
  const mealHistoryByType: Record<string, MealRateHistoryRow[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
  };
  for (const row of allMealHistory) {
    if (mealHistoryByType[row.meal_type]) {
      mealHistoryByType[row.meal_type].push(row);
    }
  }

  // Get fallback meal rates from meal_rates table
  const { data: currentRates } = await supabase
    .from('meal_rates')
    .select('meal_type, rate')
    .in('meal_type', ['breakfast', 'lunch', 'dinner']);

  const fallbackMealRates: Record<string, number> = {};
  for (const r of currentRates ?? []) {
    fallbackMealRates[r.meal_type] = Number(r.rate);
  }

  // For each day: if hosteler opted in for a meal, add that day's meal rate
  for (const day of days) {
    const pref = prefsByDate[day];
    if (!pref) continue;

    for (const mealType of ['breakfast', 'lunch', 'dinner'] as const) {
      if (pref[mealType]) {
        const applicable = lookupByDate(mealHistoryByType[mealType], day);
        const rate = applicable ? Number(applicable.new_rate) : (fallbackMealRates[mealType] ?? 0);
        meal_charges[mealType] = (meal_charges[mealType] ?? 0) + rate;
      }
    }
  }

  const grand_total =
    room_rent_total +
    meal_charges.breakfast +
    meal_charges.lunch +
    meal_charges.dinner;

  return { room_rent_total, meal_charges, grand_total };
}
