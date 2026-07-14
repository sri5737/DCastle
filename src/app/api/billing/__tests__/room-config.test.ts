import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequireOwner = vi.fn();
const mockFrom = vi.fn();
const mockIsIsoDate = vi.fn();

const mockSupabase = {
  from: (...args: unknown[]) => mockFrom(...args),
};

vi.mock('@/lib/auth/guards', () => ({
  requireOwner: () => mockRequireOwner(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => mockSupabase,
}));

vi.mock('@/lib/utils', () => ({
  isIsoDate: (...args: unknown[]) => mockIsIsoDate(...args),
}));

describe('GET /api/billing/room-config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwner.mockResolvedValue({ session: { id: 'owner-1', role: 'owner' } });
    mockIsIsoDate.mockReturnValue(true);
  });

  it('returns 400 when room_id is missing', async () => {
    const { GET } = await import('../room-config/route');
    const response = await GET(
      new Request('http://localhost/api/billing/room-config?date=2026-07-10') as any
    );

    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toBe('room_id is required');
  });

  it('returns 400 for invalid date format', async () => {
    mockIsIsoDate.mockReturnValue(false);

    const { GET } = await import('../room-config/route');
    const response = await GET(
      new Request('http://localhost/api/billing/room-config?room_id=r-1&date=10-07-2026') as any
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('date must be in YYYY-MM-DD format');
  });

  it('returns fallback room configuration when no history exists', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: 'r-1',
                    current_rent: 6000,
                    building: { owner_id: 'owner-1' },
                    room_type: { cot_count: 4 },
                  },
                  error: null,
                }),
            }),
          }),
        };
      }

      if (table === 'room_configuration_history') {
        return {
          select: () => ({
            eq: () => ({
              lte: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: () => Promise.resolve({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { GET } = await import('../room-config/route');
    const response = await GET(
      new Request('http://localhost/api/billing/room-config?room_id=r-1&date=2026-07-10') as any
    );

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.sharing_capacity).toBe(4);
    expect(data.room_class).toBe('non_ac');
    expect(data.rent).toBe(6000);
    expect(data.effective_date).toBeNull();
  });

  it('returns historical config for pre-change, on-change, and post-change dates', async () => {
    const historyByDate: Record<string, any> = {
      '2026-07-09': null,
      '2026-07-10': {
        new_sharing_capacity: 3,
        new_room_class: 'ac',
        new_rent: 6800,
        effective_date: '2026-07-10',
      },
      '2026-07-11': {
        new_sharing_capacity: 3,
        new_room_class: 'ac',
        new_rent: 6800,
        effective_date: '2026-07-10',
      },
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: 'r-1',
                    current_rent: 6000,
                    building: { owner_id: 'owner-1' },
                    room_type: { cot_count: 2 },
                  },
                  error: null,
                }),
            }),
          }),
        };
      }

      if (table === 'room_configuration_history') {
        return {
          select: () => ({
            eq: () => ({
              lte: (_field: string, date: string) => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: () => Promise.resolve({ data: historyByDate[date], error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { GET } = await import('../room-config/route');

    const preChangeResponse = await GET(
      new Request('http://localhost/api/billing/room-config?room_id=r-1&date=2026-07-09') as any
    );
    const preChange = await preChangeResponse.json();
    expect(preChangeResponse.status).toBe(200);
    expect(preChange).toEqual({
      sharing_capacity: 2,
      room_class: 'non_ac',
      rent: 6000,
      effective_date: null,
    });

    const onChangeResponse = await GET(
      new Request('http://localhost/api/billing/room-config?room_id=r-1&date=2026-07-10') as any
    );
    const onChange = await onChangeResponse.json();
    expect(onChangeResponse.status).toBe(200);
    expect(onChange).toEqual({
      sharing_capacity: 3,
      room_class: 'ac',
      rent: 6800,
      effective_date: '2026-07-10',
    });

    const postChangeResponse = await GET(
      new Request('http://localhost/api/billing/room-config?room_id=r-1&date=2026-07-11') as any
    );
    const postChange = await postChangeResponse.json();
    expect(postChangeResponse.status).toBe(200);
    expect(postChange).toEqual({
      sharing_capacity: 3,
      room_class: 'ac',
      rent: 6800,
      effective_date: '2026-07-10',
    });
  });
});
