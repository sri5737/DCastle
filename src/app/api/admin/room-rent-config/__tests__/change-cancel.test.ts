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

describe('GET /api/admin/room-rent-config?scope=upcoming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } });
  });

  it('returns only future non-canceled room rent changes for upcoming scope', async () => {
    const queryResult = Promise.resolve({
      data: [
        {
          id: 'room-1',
          room_class: 'ac',
          sharing_capacity: 2,
          old_rent: 5000,
          new_rent: 5500,
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
      is: vi.fn().mockReturnThis(),
      then: queryResult.then.bind(queryResult),
      catch: queryResult.catch.bind(queryResult),
      finally: queryResult.finally.bind(queryResult),
      [Symbol.toStringTag]: 'Promise',
    };

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue(chain),
    });

    const { GET } = await import('../route');
    const request = new NextRequest('http://localhost/api/admin/room-rent-config?scope=upcoming', {
      headers: { Cookie: 'sb-access-token=token-1' },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.count).toBe(1);
    expect(chain.gt).toHaveBeenCalledWith('effective_date', '2026-07-15');
    expect(chain.is).toHaveBeenCalledWith('canceled_at', null);
  });
});

describe('DELETE /api/admin/room-rent-config/change/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } });
  });

  it('soft-deletes a future room rent change by setting canceled_at', async () => {
    const singleFetch = vi.fn().mockResolvedValue({
      data: {
        id: 'room-1',
        effective_date: '2026-07-20',
        canceled_at: null,
        owner_id: 'owner-1',
      },
      error: null,
    });

    const singleUpdate = vi.fn().mockResolvedValue({
      data: {
        id: 'room-1',
        canceled_at: '2026-07-16T10:00:00.000Z',
      },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'room_rent_config_history') {
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
    const request = new NextRequest('http://localhost/api/admin/room-rent-config/change/room-1', {
      method: 'DELETE',
      headers: { Cookie: 'sb-access-token=token-1' },
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: 'room-1' }) });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.canceled).toBe(true);
    expect(payload.id).toBe('room-1');
  });
});
