import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Supabase
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

const mockSupabase = {
  from: mockFrom,
  auth: {
    getUser: mockGetUser,
  },
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

vi.mock('@/lib/diagnostics/events', () => ({
  withApiDiagnostic: (_meta: unknown, handler: Function) => handler(),
}));

describe('POST /api/admin/meal-rates/change', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'owner-1' } },
    });
  });

  it('validates meal_type enum', async () => {
    const { POST } = await import('../change/route');
    const request = new NextRequest('http://localhost/api/admin/meal-rates/change', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1' },
      body: JSON.stringify({
        meal_type: 'invalid',
        new_rate: 35,
        effective_date: '2026-08-01',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("meal_type must be 'breakfast', 'lunch', or 'dinner'");
  });

  it('validates new_rate > 0', async () => {
    const { POST } = await import('../change/route');
    const request = new NextRequest('http://localhost/api/admin/meal-rates/change', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1' },
      body: JSON.stringify({
        meal_type: 'breakfast',
        new_rate: 0,
        effective_date: '2026-08-01',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('new_rate must be > 0');
  });

  it('validates effective_date is not in past', async () => {
    const { POST } = await import('../change/route');
    const request = new NextRequest('http://localhost/api/admin/meal-rates/change', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1' },
      body: JSON.stringify({
        meal_type: 'breakfast',
        new_rate: 35,
        effective_date: '2020-01-01', // Past date (way outside 3-month window)
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('3-month window');
  });

  it('creates meal rate change successfully', async () => {
    const mockMealRateHistory = {
      id: 'mrh-1',
      meal_type: 'breakfast',
      old_rate: 30,
      new_rate: 35,
      effective_date: '2026-08-01',
      created_by: 'owner-1',
      created_at: new Date().toISOString(),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'meal_rates') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { rate: 30 },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'meal_rate_rate_history') {
        return {
          insert: mockInsert,
        };
      }
      return { select: mockSelect };
    });

    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockMealRateHistory,
          error: null,
        }),
      }),
    });

    const { POST } = await import('../change/route');
    const request = new NextRequest('http://localhost/api/admin/meal-rates/change', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1' },
      body: JSON.stringify({
        meal_type: 'breakfast',
        new_rate: 35,
        effective_date: '2026-08-01',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.meal_type).toBe('breakfast');
    expect(data.new_rate).toBe(35);
  });
});

describe('GET /api/billing/meal-rate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates meal_type parameter', async () => {
    const { GET } = await import('../../../billing/meal-rate/route');
    const request = new NextRequest('http://localhost/api/billing/meal-rate?meal_type=invalid&date=2026-07-15');

    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("meal_type must be 'breakfast', 'lunch', or 'dinner'");
  });

  it('validates date format', async () => {
    const { GET } = await import('../../../billing/meal-rate/route');
    const request = new NextRequest('http://localhost/api/billing/meal-rate?meal_type=breakfast&date=2026/07/15');

    const response = await GET(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('date must be in YYYY-MM-DD format');
  });

  it('returns current rate when no history exists for date', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'meal_rate_rate_history') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: { code: 'PGRST116' }, // No rows returned
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'meal_rates') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { rate: 30 },
                error: null,
              }),
            }),
          }),
        };
      }
      return { select: mockSelect };
    });

    const { GET } = await import('../../../billing/meal-rate/route');
    const request = new NextRequest('http://localhost/api/billing/meal-rate?meal_type=breakfast&date=2026-07-15');

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.rate).toBe(30);
    expect(data.source).toBe('current_meal_rates');
  });

  it('returns historical rate for date', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'meal_rate_rate_history') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: 'mrh-1',
                        meal_type: 'breakfast',
                        old_rate: 30,
                        new_rate: 35,
                        effective_date: '2026-08-01',
                        created_at: new Date().toISOString(),
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return { select: mockSelect };
    });

    const { GET } = await import('../../../billing/meal-rate/route');
    const request = new NextRequest('http://localhost/api/billing/meal-rate?meal_type=breakfast&date=2026-08-01');

    const response = await GET(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.rate).toBe(35);
    expect(data.source).toBe('meal_rate_rate_history');
  });
});
