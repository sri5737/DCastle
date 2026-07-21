import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

vi.mock('@/lib/diagnostics/events', () => ({
  withApiDiagnostic: (_meta: unknown, handler: () => unknown) => handler(),
}));

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    getTodayIST: () => '2026-07-15',
  };
});

describe('GET /api/admin/meal-rates?scope=upcoming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } });
  });

  it('returns only future non-canceled changes for upcoming scope', async () => {
    const gt = vi.fn().mockReturnValue({
      is: vi.fn().mockReturnValue({
        then: undefined,
      }),
    });

    const queryResult = Promise.resolve({
      data: [
        {
          id: 'meal-1',
          meal_type: 'breakfast',
          old_rate: 30,
          new_rate: 35,
          effective_date: '2026-07-20',
          canceled_at: null,
        },
      ],
      error: null,
    });

    const chain = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnValue(queryResult),
    };

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
    });

    const { GET } = await import('../route');
    const request = new NextRequest('http://localhost/api/admin/meal-rates?scope=upcoming', {
      headers: { Cookie: 'sb-access-token=token-1' },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.count).toBe(1);
    expect(payload.changes[0].canceled_at).toBeNull();
    expect(chain.gt).toHaveBeenCalledWith('effective_date', '2026-07-15');
    expect(chain.is).toHaveBeenCalledWith('canceled_at', null);
    expect(gt).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/admin/meal-rates/change/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } });
  });

  it('soft-deletes a future change by setting canceled_at', async () => {
    const singleFetch = vi.fn().mockResolvedValue({
      data: {
        id: 'meal-1',
        effective_date: '2026-07-20',
        canceled_at: null,
        created_by: 'owner-1',
      },
      error: null,
    });

    const singleUpdate = vi.fn().mockResolvedValue({
      data: {
        id: 'meal-1',
        canceled_at: '2026-07-16T10:00:00.000Z',
      },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'meal_rate_rate_history') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: singleFetch,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: singleUpdate,
                  }),
                }),
              }),
            }),
          }),
        };
      }

      return { select: vi.fn() };
    });

    const { DELETE } = await import('../change/[id]/route');
    const request = new NextRequest('http://localhost/api/admin/meal-rates/change/meal-1', {
      method: 'DELETE',
      headers: { Cookie: 'sb-access-token=token-1' },
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'meal-1' }) });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.canceled).toBe(true);
    expect(payload.id).toBe('meal-1');
  });
});
