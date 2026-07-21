import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock('@/lib/diagnostics/events', () => ({
  withApiDiagnostic: (_meta: unknown, handler: () => unknown) => handler(),
}));

vi.mock('@/lib/rate-change-window', () => ({
  isDateWithin3MonthWindow: () => true,
  getAllowedWindowDescription: () => 'mock window',
}));

function jsonRequest(body: unknown) {
  return new NextRequest('http://localhost/api/admin/food-preferences/adjust/bulk', {
    method: 'POST',
    headers: {
      Cookie: 'sb-access-token=token-1',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/food-preferences/adjust/bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } });
  });

  it('updates only targeted hostelers and persists audit metadata', async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: null });
    const eventInsertSpy = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'buildings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ id: 'b-1' }, { id: 'b-2' }], error: null }),
        };
      }

      if (table === 'hostelers') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 'h-1', name: 'A' },
              { id: 'h-2', name: 'B' },
            ],
            error: null,
          }),
        };
      }

      if (table === 'food_preferences') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({
            data: [
              { hosteler_id: 'h-1', date: '2999-01-02', breakfast: true, lunch: true, dinner: true },
              { hosteler_id: 'h-2', date: '2999-01-02', breakfast: true, lunch: true, dinner: true },
            ],
            error: null,
          }),
          upsert: upsertSpy,
        };
      }

      if (table === 'monthly_bills') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }

      if (table === 'bulk_meal_update_events') {
        return {
          insert: eventInsertSpy,
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }

      return {};
    });

    const { POST } = await import('../adjust/bulk/route');
    const res = await POST(
      jsonRequest({
        scope: 'specific_building',
        building_id: 'b-1',
        date_mode: 'single_date',
        start_date: '2999-01-02',
        meals: { breakfast: false, lunch: false, dinner: false },
        adjustment_reason: 'Festival closure',
      }),
    );

    if (!res) {
      throw new Error('Expected route handler response');
    }
    expect(res.status).toBe(200);
    expect(upsertSpy).toHaveBeenCalledTimes(2);

    const upsertPayload = upsertSpy.mock.calls[0]?.[0];
    expect(upsertPayload.adjusted_by_owner_id).toBe('owner-1');
    expect(upsertPayload.adjustment_reason).toBe('Festival closure');

    expect(eventInsertSpy).toHaveBeenCalledTimes(1);
  });

  it('returns partial failure details and keeps successful updates committed', async () => {
    let count = 0;
    const upsertSpy = vi.fn().mockImplementation(() => {
      count += 1;
      if (count === 2) {
        return Promise.resolve({ error: { message: 'Simulated failure' } });
      }
      return Promise.resolve({ error: null });
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'buildings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ id: 'b-1' }], error: null }),
        };
      }

      if (table === 'hostelers') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [{ id: 'h-1', name: 'A' }], error: null }),
        };
      }

      if (table === 'food_preferences') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({
            data: [
              { hosteler_id: 'h-1', date: '2999-01-02', breakfast: false, lunch: true, dinner: false },
              { hosteler_id: 'h-1', date: '2999-01-03', breakfast: false, lunch: true, dinner: false },
            ],
            error: null,
          }),
          upsert: upsertSpy,
        };
      }

      if (table === 'monthly_bills') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }

      if (table === 'bulk_meal_update_events') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }

      return {};
    });

    const { POST } = await import('../adjust/bulk/route');
    const res = await POST(
      jsonRequest({
        scope: 'all_active',
        date_mode: 'date_range',
        start_date: '2999-01-02',
        end_date: '2999-01-03',
        meals: { breakfast: true, lunch: false, dinner: true },
        adjustment_reason: 'Holiday partial failure path',
      }),
    );

    if (!res) {
      throw new Error('Expected route handler response');
    }
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.result.total_date_rows_affected).toBe(1);
    expect(payload.result.partial_failures.length).toBe(1);
    expect(payload.result.partial_failures[0].error).toContain('Simulated failure');
  });

  it('flags transmitted bills to needs_retransmission for impacted months', async () => {
    const updateEqSpy = vi.fn().mockReturnThis();
    const updateSelectSpy = vi.fn().mockResolvedValue({ data: [{ id: 'bill-1' }], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'buildings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ id: 'b-1' }], error: null }),
        };
      }

      if (table === 'hostelers') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [{ id: 'h-1', name: 'A' }], error: null }),
        };
      }

      if (table === 'food_preferences') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({
            data: [
              { hosteler_id: 'h-1', date: '2999-01-05', breakfast: true, lunch: true, dinner: true },
            ],
            error: null,
          }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
      }

      if (table === 'monthly_bills') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ id: 'bill-1', month: '2999-01-01', hosteler_id: 'h-1' }],
            error: null,
          }),
          update: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: updateEqSpy,
              select: updateSelectSpy,
            }),
          }),
        };
      }

      if (table === 'bulk_meal_update_events') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }

      return {};
    });

    const { POST } = await import('../adjust/bulk/route');
    const res = await POST(
      jsonRequest({
        scope: 'all_active',
        date_mode: 'single_date',
        start_date: '2999-01-05',
        meals: { breakfast: false, lunch: false, dinner: false },
        adjustment_reason: 'Closure',
      }),
    );

    if (!res) {
      throw new Error('Expected route handler response');
    }
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.preview.has_transmitted_bills).toBe(true);
    expect(payload.result.flagged_bills_for_retransmission).toBe(1);
    expect(updateEqSpy).toHaveBeenCalledWith('status', 'transmitted');
  });

  it('supports preview_only mode for full-closure date-range integration behavior', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'buildings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ id: 'b-1' }], error: null }),
        };
      }

      if (table === 'hostelers') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 'h-1', name: 'A' },
              { id: 'h-2', name: 'B' },
            ],
            error: null,
          }),
        };
      }

      if (table === 'food_preferences') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({
            data: [
              { hosteler_id: 'h-1', date: '2999-02-10', breakfast: true, lunch: true, dinner: true },
              { hosteler_id: 'h-1', date: '2999-02-11', breakfast: true, lunch: true, dinner: true },
              { hosteler_id: 'h-2', date: '2999-02-10', breakfast: true, lunch: true, dinner: true },
              { hosteler_id: 'h-2', date: '2999-02-11', breakfast: true, lunch: true, dinner: true },
            ],
            error: null,
          }),
        };
      }

      if (table === 'monthly_bills') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ id: 'bill-1', month: '2999-02-01', hosteler_id: 'h-1' }],
            error: null,
          }),
        };
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const { POST } = await import('../adjust/bulk/route');
    const res = await POST(
      jsonRequest({
        scope: 'all_active',
        date_mode: 'date_range',
        start_date: '2999-02-10',
        end_date: '2999-02-11',
        meals: { breakfast: false, lunch: false, dinner: false },
        preview_only: true,
      }),
    );

    if (!res) {
      throw new Error('Expected route handler response');
    }
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.preview.total_hostelers_affected).toBe(2);
    expect(payload.preview.total_date_rows_affected).toBe(4);
    expect(payload.preview.has_transmitted_bills).toBe(true);
    expect(payload.result).toBeNull();
  });

  it('applies full closure for a date range and reports retransmission impact', async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'buildings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ id: 'b-1' }], error: null }),
        };
      }

      if (table === 'hostelers') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: [
              { id: 'h-1', name: 'A' },
              { id: 'h-2', name: 'B' },
            ],
            error: null,
          }),
        };
      }

      if (table === 'food_preferences') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          is: vi.fn().mockResolvedValue({
            data: [
              { hosteler_id: 'h-1', date: '2999-03-10', breakfast: true, lunch: true, dinner: true },
              { hosteler_id: 'h-1', date: '2999-03-11', breakfast: true, lunch: true, dinner: true },
              { hosteler_id: 'h-2', date: '2999-03-10', breakfast: true, lunch: true, dinner: true },
              { hosteler_id: 'h-2', date: '2999-03-11', breakfast: true, lunch: true, dinner: true },
            ],
            error: null,
          }),
          upsert: upsertSpy,
        };
      }

      if (table === 'monthly_bills') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [
              { id: 'bill-1', month: '2999-03-01', hosteler_id: 'h-1' },
              { id: 'bill-2', month: '2999-03-01', hosteler_id: 'h-2' },
            ],
            error: null,
          }),
          update: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({ data: [{ id: 'bill-1' }, { id: 'bill-2' }], error: null }),
              }),
            }),
          }),
        };
      }

      if (table === 'bulk_meal_update_events') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }

      return {};
    });

    const { POST } = await import('../adjust/bulk/route');
    const res = await POST(
      jsonRequest({
        scope: 'all_active',
        date_mode: 'date_range',
        start_date: '2999-03-10',
        end_date: '2999-03-11',
        meals: { breakfast: false, lunch: false, dinner: false },
        adjustment_reason: 'March closure',
      }),
    );

    if (!res) {
      throw new Error('Expected route handler response');
    }
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(upsertSpy).toHaveBeenCalledTimes(4);
    expect(payload.result.total_hostelers_affected).toBe(2);
    expect(payload.result.total_date_rows_affected).toBe(4);
    expect(payload.preview.has_transmitted_bills).toBe(true);
    expect(payload.result.flagged_bills_for_retransmission).toBe(2);
  });
});
