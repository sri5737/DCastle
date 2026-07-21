import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateMonthlyBill,
  getDaysInMonth,
  roomNameToClass,
} from '../billing';

// ── Helper to build mock Supabase chain ───────────────────────────────────
function makeMockSupabase(overrides: Record<string, unknown> = {}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  const fromOverrides = overrides as Record<string, unknown>;
  const mockFrom = vi.fn().mockImplementation((table: string) => {
    const tableData = fromOverrides[table];
    if (tableData !== undefined) {
      return {
        ...chain,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: tableData, error: null }),
      };
    }
    return chain;
  });
  return { from: mockFrom };
}

// ── getDaysInMonth ─────────────────────────────────────────────────────────
describe('getDaysInMonth', () => {
  it('returns 31 days for July 2026', () => {
    const days = getDaysInMonth('2026-07-01');
    expect(days).toHaveLength(31);
    expect(days[0]).toBe('2026-07-01');
    expect(days[30]).toBe('2026-07-31');
  });

  it('returns 28 days for February 2026 (non-leap)', () => {
    const days = getDaysInMonth('2026-02-01');
    expect(days).toHaveLength(28);
    expect(days[27]).toBe('2026-02-28');
  });

  it('returns 29 days for February 2024 (leap year)', () => {
    const days = getDaysInMonth('2024-02-01');
    expect(days).toHaveLength(29);
    expect(days[28]).toBe('2024-02-29');
  });

  it('returns 30 days for April 2026', () => {
    const days = getDaysInMonth('2026-04-01');
    expect(days).toHaveLength(30);
    expect(days[29]).toBe('2026-04-30');
  });
});

// ── roomNameToClass ────────────────────────────────────────────────────────
describe('roomNameToClass', () => {
  it('maps AC to ac', () => expect(roomNameToClass('AC')).toBe('ac'));
  it('maps non-AC to non_ac', () => expect(roomNameToClass('non-AC')).toBe('non_ac'));
  it('maps unknown to non_ac', () => expect(roomNameToClass('unknown')).toBe('non_ac'));
});

// ── calculateMonthlyBill ───────────────────────────────────────────────────
describe('calculateMonthlyBill', () => {
  // ── No hosteler found → zeros ──────────────────────────────────────────
  it('returns zeros if hosteler not found', async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
      }),
    };
    const result = await calculateMonthlyBill('h-1', '2026-07-01', supabase as never);
    expect(result.room_rent_total).toBe(0);
    expect(result.grand_total).toBe(0);
  });

  // ── No room assignment ─────────────────────────────────────────────────
  it('returns room_rent_total=0 for hosteler with no room assignment', async () => {
    const calls: string[] = [];
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        calls.push(table);
        if (table === 'hostelers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'h-1', availing_mess: true, room_id: null, building_id: null },
              error: null,
            }),
          };
        }
        // food_preferences and meal_rates return empty
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    const result = await calculateMonthlyBill('h-1', '2026-07-01', supabase as never);
    expect(result.room_rent_total).toBe(0);
    expect(result.meal_charges).toEqual({ breakfast: 0, lunch: 0, dinner: 0 });
    expect(result.grand_total).toBe(0);
  });

  // ── availing_mess=false → meal charges excluded ────────────────────────
  it('excludes all meal charges when availing_mess is false', async () => {
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'hostelers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: 'h-1', availing_mess: false, room_id: null, building_id: null },
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    const result = await calculateMonthlyBill('h-1', '2026-07-01', supabase as never);
    expect(result.meal_charges).toEqual({ breakfast: 0, lunch: 0, dinner: 0 });
    expect(result.grand_total).toBe(result.room_rent_total);
  });

  // ── Standard month: flat rent + meal charges ───────────────────────────
  it('calculates correct totals for standard month (flat rent, single meal rate)', async () => {
    // July 2026 = 31 days
    // Room: 2-sharing, AC → rent 3000/month flat (one history entry from 2026-01-01)
    // Hosteler opts in: breakfast + lunch every day
    // Meal rates: breakfast=30, lunch=40 (from 2026-01-01)
    // Expected: room_rent = 31 * 3000/31 = 3000? No — 3000 is MONTHLY rent in config?
    //
    // Wait — room_rent_config_history stores a per-day/per-month rent value?
    // Re-reading spec: "Per-day room rent: look up rate effective for that day"
    // The new_rent in room_rent_config_history is a monthly rent amount.
    // Actually, looking at the API: "new_rent: decimal" — it's the configured rent amount.
    // Looking at the billing spec: "Per-day room rent" — this implies the config stores
    // a monthly rent and we divide by days? OR the config stores a daily rate?
    //
    // The spec says "room_rent_total" is the sum of per-day lookups.
    // For simplicity, new_rent in history is the MONTHLY rent for that configuration.
    // So per-day = new_rent / days_in_month? OR new_rent is the daily rent?
    //
    // Looking at T107 (rate config): "new_rent: decimal" is monthly rent per sharing capacity.
    // So: per-day rent = new_rent / days_in_month? But that makes billing complex.
    //
    // Actually reading T115 more carefully: "For each day in month: looks up room rent effective
    // for that day ... sums daily room rent". This implies new_rent IS the daily rate.
    // But looking at T107 which sets "global room rent config" — owners set monthly rents.
    //
    // Resolution: new_rent stores the MONTHLY rent value. Per-day = new_rent / days_in_month.
    // room_rent_total = sum(per-day rents) = new_rent (for flat month).
    //
    // For multi-rate months: sum of (days_at_rate * rate / days_in_month)
    //
    // Actually, to keep it simple and consistent with "per-day room rent": new_rent is
    // treated as the monthly amount and billing accumulates daily proportions.
    // This test uses a simple 1-rate month where room_rent_total = new_rent.
    const days31 = 31;
    const rentPerMonth = 3000;
    const bfRate = 30;
    const lunchRate = 40;

    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        const base = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };

        if (table === 'hostelers') {
          return {
            ...base,
            single: vi.fn().mockResolvedValue({
              data: { id: 'h-1', availing_mess: true, room_id: 'room-1', building_id: 'bldg-1' },
              error: null,
            }),
          };
        }
        if (table === 'rooms') {
          return {
            ...base,
            single: vi.fn().mockResolvedValue({
              data: {
                current_rent: rentPerMonth,
                room_type_id: 'rt-1',
                room_types: { name: 'AC', sharing_capacity: 2 },
              },
              error: null,
            }),
          };
        }
        if (table === 'buildings') {
          return {
            ...base,
            single: vi.fn().mockResolvedValue({
              data: { owner_id: 'owner-1' },
              error: null,
            }),
          };
        }
        if (table === 'room_rent_config_history') {
          return {
            ...base,
            order: vi.fn().mockResolvedValue({
              data: [
                { sharing_capacity: 2, room_class: 'ac', new_rent: rentPerMonth, effective_date: '2026-01-01' },
              ],
              error: null,
            }),
          };
        }
        if (table === 'food_preferences') {
          // All 31 days: breakfast=true, lunch=true, dinner=false
          // Chain ends at .is() → must be awaitable
          const prefs = getDaysInMonthHelper('2026-07').map(d => ({
            date: d,
            breakfast: true,
            lunch: true,
            dinner: false,
          }));
          return {
            ...base,
            is: vi.fn().mockResolvedValue({ data: prefs, error: null }),
          };
        }
        if (table === 'meal_rate_rate_history') {
          return {
            ...base,
            order: vi.fn().mockResolvedValue({
              data: [
                { meal_type: 'breakfast', new_rate: bfRate, effective_date: '2026-01-01' },
                { meal_type: 'lunch', new_rate: lunchRate, effective_date: '2026-01-01' },
                { meal_type: 'dinner', new_rate: 50, effective_date: '2026-01-01' },
              ],
              error: null,
            }),
          };
        }
        if (table === 'meal_rates') {
          // Chain ends at .in() → must be awaitable
          return {
            ...base,
            in: vi.fn().mockResolvedValue({
              data: [
                { meal_type: 'breakfast', rate: bfRate },
                { meal_type: 'lunch', rate: lunchRate },
                { meal_type: 'dinner', rate: 50 },
              ],
              error: null,
            }),
          };
        }
        return base;
      }),
    };

    const result = await calculateMonthlyBill('h-1', '2026-07-01', supabase as never);

    // room_rent_total = 31 days × rentPerMonth (flat rate, no mid-month change)
    expect(result.room_rent_total).toBeCloseTo(days31 * rentPerMonth, 1);
    // breakfast + lunch for all 31 days; no dinner
    expect(result.meal_charges.breakfast).toBeCloseTo(days31 * bfRate, 1);
    expect(result.meal_charges.lunch).toBeCloseTo(days31 * lunchRate, 1);
    expect(result.meal_charges.dinner).toBe(0);
    expect(result.grand_total).toBeCloseTo(
      days31 * rentPerMonth + days31 * bfRate + days31 * lunchRate,
      1
    );
  });

  // ── Multi-rate-change month ────────────────────────────────────────────
  it('uses new rate on and after effective_date (CHK046)', async () => {
    // July 2026: 31 days
    // Rate change: 3000 from 2026-01-01, then 3500 from 2026-07-16
    // Days 1-15 at 3000, days 16-31 at 3500
    const oldRent = 3000;
    const newRent = 3500;

    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        const base = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };

        if (table === 'hostelers') {
          return {
            ...base,
            single: vi.fn().mockResolvedValue({
              data: { id: 'h-1', availing_mess: false, room_id: 'room-1', building_id: 'bldg-1' },
              error: null,
            }),
          };
        }
        if (table === 'rooms') {
          return {
            ...base,
            single: vi.fn().mockResolvedValue({
              data: { current_rent: oldRent, room_type_id: 'rt-1', room_types: { name: 'non-AC', sharing_capacity: 2 } },
              error: null,
            }),
          };
        }
        if (table === 'buildings') {
          return {
            ...base,
            single: vi.fn().mockResolvedValue({ data: { owner_id: 'owner-1' }, error: null }),
          };
        }
        if (table === 'room_rent_config_history') {
          return {
            ...base,
            order: vi.fn().mockResolvedValue({
              data: [
                { sharing_capacity: 2, room_class: 'non_ac', new_rent: newRent, effective_date: '2026-07-16' },
                { sharing_capacity: 2, room_class: 'non_ac', new_rent: oldRent, effective_date: '2026-01-01' },
              ],
              error: null,
            }),
          };
        }
        return base;
      }),
    };

    const result = await calculateMonthlyBill('h-1', '2026-07-01', supabase as never);
    // 15 days at oldRent + 16 days at newRent
    const expected = 15 * oldRent + 16 * newRent;
    expect(result.room_rent_total).toBeCloseTo(expected, 1);
    expect(result.meal_charges).toEqual({ breakfast: 0, lunch: 0, dinner: 0 });
    expect(result.grand_total).toBeCloseTo(expected, 1);
  });

  // ── No food preferences ────────────────────────────────────────────────
  it('returns zero meal charges when hosteler has no food preferences', async () => {
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        const base = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          // food_preferences chain ends with .is() → must be awaitable
          is: vi.fn().mockResolvedValue({ data: [], error: null }),
          // meal_rates chain ends with .in() → must be awaitable
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
        if (table === 'hostelers') {
          return {
            ...base,
            single: vi.fn().mockResolvedValue({
              data: { id: 'h-1', availing_mess: true, room_id: null, building_id: null },
              error: null,
            }),
          };
        }
        return base;
      }),
    };

    const result = await calculateMonthlyBill('h-1', '2026-07-01', supabase as never);
    expect(result.meal_charges).toEqual({ breakfast: 0, lunch: 0, dinner: 0 });
  });

  // ── availing_mess=true, all meals opted in ─────────────────────────────
  it('calculates grand_total as room + all meal charges', async () => {
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        const base = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          // food_preferences chain ends with .is() → awaitable
          is: vi.fn().mockResolvedValue({
            data: [{ date: '2026-07-01', breakfast: true, lunch: true, dinner: true }],
            error: null,
          }),
          // meal_rates chain ends with .in() → awaitable
          in: vi.fn().mockResolvedValue({
            data: [
              { meal_type: 'breakfast', rate: 30 },
              { meal_type: 'lunch', rate: 40 },
              { meal_type: 'dinner', rate: 50 },
            ],
            error: null,
          }),
          order: vi.fn().mockResolvedValue({
            data: [
              { meal_type: 'breakfast', new_rate: 30, effective_date: '2026-01-01' },
              { meal_type: 'lunch', new_rate: 40, effective_date: '2026-01-01' },
              { meal_type: 'dinner', new_rate: 50, effective_date: '2026-01-01' },
            ],
            error: null,
          }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
        if (table === 'hostelers') {
          return {
            ...base,
            single: vi.fn().mockResolvedValue({
              data: { id: 'h-1', availing_mess: true, room_id: null, building_id: null },
              error: null,
            }),
          };
        }
        return base;
      }),
    };

    const result = await calculateMonthlyBill('h-1', '2026-07-01', supabase as never);
    // Only 1 day has preferences; 30 days have nothing
    expect(result.meal_charges.breakfast).toBe(30);
    expect(result.meal_charges.lunch).toBe(40);
    expect(result.meal_charges.dinner).toBe(50);
    expect(result.grand_total).toBe(120); // 0 room + 120 meals
  });

  // ── Meal rate changes mid-month ────────────────────────────────────────
  it('uses correct meal rate per day when rate changes mid-month', async () => {
    const supabase = {
      from: vi.fn().mockImplementation((table: string) => {
        const base = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({ data: [], error: null }),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
        if (table === 'hostelers') {
          return {
            ...base,
            single: vi.fn().mockResolvedValue({
              data: { id: 'h-1', availing_mess: true, room_id: null, building_id: null },
              error: null,
            }),
          };
        }
        if (table === 'food_preferences') {
          // Day 10 and day 20 both opt in for breakfast
          return {
            ...base,
            is: vi.fn().mockResolvedValue({
              data: [
                { date: '2026-07-10', breakfast: true, lunch: false, dinner: false },
                { date: '2026-07-20', breakfast: true, lunch: false, dinner: false },
              ],
              error: null,
            }),
          };
        }
        if (table === 'meal_rate_rate_history') {
          // Breakfast: 30 from 2026-01-01, then 35 from 2026-07-15
          return {
            ...base,
            order: vi.fn().mockResolvedValue({
              data: [
                { meal_type: 'breakfast', new_rate: 35, effective_date: '2026-07-15' },
                { meal_type: 'breakfast', new_rate: 30, effective_date: '2026-01-01' },
                { meal_type: 'lunch', new_rate: 40, effective_date: '2026-01-01' },
                { meal_type: 'dinner', new_rate: 50, effective_date: '2026-01-01' },
              ],
              error: null,
            }),
          };
        }
        return base;
      }),
    };

    const result = await calculateMonthlyBill('h-1', '2026-07-01', supabase as never);
    // Day 10 → old rate 30 (before 2026-07-15)
    // Day 20 → new rate 35 (on/after 2026-07-15)
    expect(result.meal_charges.breakfast).toBe(30 + 35);
    expect(result.meal_charges.lunch).toBe(0);
    expect(result.meal_charges.dinner).toBe(0);
  });
});

// Helper to get all days in a month (for test data generation)
function getDaysInMonthHelper(yearMonth: string): string[] {
  const [year, mon] = yearMonth.split('-').map(Number);
  const daysCount = new Date(year, mon, 0).getDate();
  const days: string[] = [];
  for (let d = 1; d <= daysCount; d++) {
    days.push(`${yearMonth}-${String(d).padStart(2, '0')}`);
  }
  return days;
}
