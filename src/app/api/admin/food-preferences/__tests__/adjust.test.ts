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

describe('POST /api/admin/food-preferences/adjust', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } });
  });

  it('saves meal adjustment successfully', async () => {
    const upsertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'pref-1',
            hosteler_id: 'host-1',
            date: '2026-07-10',
            breakfast: true,
            lunch: false,
            dinner: true,
            adjusted_by_owner_id: 'owner-1',
            adjusted_at: '2026-07-10T10:00:00.000Z',
            adjustment_reason: 'Owner correction',
          },
          error: null,
        }),
      }),
    });

    const billSelectBuilder = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'hostelers') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'host-1', buildings: { owner_id: 'owner-1' } }, error: null }),
        };
      }
      if (table === 'food_preferences') {
        return { upsert: upsertSpy };
      }
      if (table === 'monthly_bills') {
        return {
          select: vi.fn().mockReturnValue(billSelectBuilder),
        };
      }
      return {};
    });

    const { POST } = await import('../adjust/route');
    const req = new NextRequest('http://localhost/api/admin/food-preferences/adjust', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hosteler_id: 'host-1',
        date: '2026-07-10',
        meals: { breakfast: true, lunch: false, dinner: true },
        adjustment_reason: 'Owner correction',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.message).toBe('Meal adjustment saved');
    expect(payload.bill_flagged_for_retransmission).toBe(false);
    expect(upsertSpy).toHaveBeenCalled();
  });

  it('rejects future dates', async () => {
    const { POST } = await import('../adjust/route');
    const req = new NextRequest('http://localhost/api/admin/food-preferences/adjust', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hosteler_id: 'host-1',
        date: '2999-12-31',
        meals: { breakfast: true, lunch: false, dinner: true },
        adjustment_reason: 'Owner correction',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const payload = await res.json();
    expect(payload.error).toContain('past or current dates');
  });

  it('requires non-empty reason', async () => {
    const { POST } = await import('../adjust/route');
    const req = new NextRequest('http://localhost/api/admin/food-preferences/adjust', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hosteler_id: 'host-1',
        date: '2026-07-10',
        meals: { breakfast: true, lunch: false, dinner: true },
        adjustment_reason: '   ',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const payload = await res.json();
    expect(payload.error).toContain('adjustment_reason is required');
  });

  it('persists audit fields on adjustment', async () => {
    const upsertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'pref-1',
            adjusted_by_owner_id: 'owner-1',
            adjusted_at: '2026-07-10T10:00:00.000Z',
            adjustment_reason: 'Audit test',
          },
          error: null,
        }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'hostelers') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'host-1', buildings: { owner_id: 'owner-1' } }, error: null }),
        };
      }
      if (table === 'food_preferences') {
        return { upsert: upsertSpy };
      }
      if (table === 'monthly_bills') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        };
      }
      return {};
    });

    const { POST } = await import('../adjust/route');
    const req = new NextRequest('http://localhost/api/admin/food-preferences/adjust', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hosteler_id: 'host-1',
        date: '2026-07-10',
        meals: { breakfast: false, lunch: true, dinner: false },
        adjustment_reason: 'Audit test',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const upsertPayload = upsertSpy.mock.calls[0]?.[0];
    expect(upsertPayload.adjusted_by_owner_id).toBe('owner-1');
    expect(upsertPayload.adjusted_at).toBeTruthy();
    expect(upsertPayload.adjustment_reason).toBe('Audit test');
  });

  it('transitions transmitted bill to needs_retransmission after adjustment', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'hostelers') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'host-1', buildings: { owner_id: 'owner-1' } }, error: null }),
        };
      }

      if (table === 'food_preferences') {
        return {
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'pref-1' }, error: null }),
            }),
          }),
        };
      }

      if (table === 'monthly_bills') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'bill-1', status: 'transmitted' }, error: null }),
          }),
          update: vi.fn().mockReturnValue({
            eq: updateEq,
          }),
        };
      }

      return {};
    });

    const { POST } = await import('../adjust/route');
    const req = new NextRequest('http://localhost/api/admin/food-preferences/adjust', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hosteler_id: 'host-1',
        date: '2026-07-10',
        meals: { breakfast: true, lunch: true, dinner: true },
        adjustment_reason: 'Bill update test',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.bill_flagged_for_retransmission).toBe(true);
    expect(updateEq).toHaveBeenCalledWith('id', 'bill-1');
  });
});