import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequireOwner = vi.fn();
const mockFrom = vi.fn();
const mockCompareWithTodayIST = vi.fn();
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
  compareWithTodayIST: (...args: unknown[]) => mockCompareWithTodayIST(...args),
  isIsoDate: (...args: unknown[]) => mockIsIsoDate(...args),
  getTodayIST: () => '2026-07-10',
}));

function createPostRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/rooms/r-1/configuration-change', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/rooms/[id]/configuration-change', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwner.mockResolvedValue({ session: { id: 'owner-1', role: 'owner' } });
    mockIsIsoDate.mockReturnValue(true);
  });

  it('returns 400 when effective_date is in the past', async () => {
    mockCompareWithTodayIST.mockReturnValue(-1);

    const { POST } = await import('../[id]/configuration-change/route');
    const response = await POST(
      createPostRequest({
        new_sharing_capacity: 2,
        new_room_class: 'ac',
        new_rent: 6500,
        effective_date: '2026-07-09',
      }) as any,
      { params: Promise.resolve({ id: 'r-1' }) }
    );

    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toBe('Effective date cannot be in the past');
  });

  it('creates a configuration history row for a valid future effective_date', async () => {
    mockCompareWithTodayIST.mockImplementation((date: string) => {
      if (date === '2026-07-11') return 1;
      return 0;
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: 'r-1',
                    building_id: 'b-1',
                    room_type_id: 'rt-1',
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
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'rch-1',
                    room_id: 'r-1',
                    new_sharing_capacity: 2,
                    new_room_class: 'ac',
                    new_rent: 6500,
                    effective_date: '2026-07-11',
                    created_by: 'owner-1',
                  },
                  error: null,
                }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { POST } = await import('../[id]/configuration-change/route');
    const response = await POST(
      createPostRequest({
        new_sharing_capacity: 2,
        new_room_class: 'ac',
        new_rent: 6500,
        effective_date: '2026-07-11',
      }) as any,
      { params: Promise.resolve({ id: 'r-1' }) }
    );

    const data = await response.json();
    expect(response.status).toBe(201);
    expect(data.configuration_change.room_id).toBe('r-1');
    expect(data.configuration_change.new_room_class).toBe('ac');
  });

  it('accepts today as effective_date and updates current room rent', async () => {
    mockCompareWithTodayIST.mockReturnValue(0);
    const roomUpdateEq = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: 'r-1',
                    building_id: 'b-1',
                    room_type_id: 'rt-1',
                    current_rent: 6000,
                    building: { owner_id: 'owner-1' },
                    room_type: { cot_count: 2 },
                  },
                  error: null,
                }),
            }),
          }),
          update: () => ({
            eq: roomUpdateEq,
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
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'rch-2',
                    room_id: 'r-1',
                    new_sharing_capacity: 2,
                    new_room_class: 'non_ac',
                    new_rent: 6200,
                    effective_date: '2026-07-10',
                  },
                  error: null,
                }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { POST } = await import('../[id]/configuration-change/route');
    const response = await POST(
      createPostRequest({
        new_sharing_capacity: 2,
        new_room_class: 'non_ac',
        new_rent: 6200,
        effective_date: '2026-07-10',
      }) as any,
      { params: Promise.resolve({ id: 'r-1' }) }
    );

    expect(response.status).toBe(201);
    expect(roomUpdateEq).toHaveBeenCalledWith('id', 'r-1');
  });

  it('returns 400 for duplicate room/effective_date configuration rows', async () => {
    mockCompareWithTodayIST.mockReturnValue(1);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: 'r-1',
                    building_id: 'b-1',
                    room_type_id: 'rt-1',
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
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: null,
                  error: { message: 'duplicate key value violates unique constraint' },
                }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { POST } = await import('../[id]/configuration-change/route');
    const response = await POST(
      createPostRequest({
        new_sharing_capacity: 2,
        new_room_class: 'ac',
        new_rent: 6500,
        effective_date: '2026-07-11',
      }) as any,
      { params: Promise.resolve({ id: 'r-1' }) }
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('already exists');
  });

  it('GET /api/admin/rooms/[id] includes pending_change payload for future effective dates', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: 'r-1',
                    building_id: 'b-1',
                    room_number: '101',
                    current_rent: 6000,
                    buildings: { owner_id: 'owner-1' },
                    room_types: { id: 'rt-1' },
                  },
                  error: null,
                }),
            }),
          }),
        };
      }

      if (table === 'cots') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [{ id: 'c-1', cot_id_label: 'C1' }], error: null }),
            }),
          }),
        };
      }

      if (table === 'room_configuration_history') {
        return {
          select: () => ({
            eq: () => ({
              gt: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: () =>
                      Promise.resolve({
                        data: {
                          new_sharing_capacity: 3,
                          new_room_class: 'ac',
                          new_rent: 6800,
                          effective_date: '2026-07-12',
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

      throw new Error(`Unexpected table: ${table}`);
    });

    const { GET } = await import('../[id]/route');
    const response = await GET(new Request('http://localhost/api/admin/rooms/r-1') as any, {
      params: Promise.resolve({ id: 'r-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.room.pending_change).toEqual({
      new_sharing_capacity: 3,
      new_room_class: 'ac',
      new_rent: 6800,
      effective_date: '2026-07-12',
    });
  });
});
