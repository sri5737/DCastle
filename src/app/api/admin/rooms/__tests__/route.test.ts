import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequireOwner = vi.fn();
const mockFrom = vi.fn();

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
  getTodayIST: () => '2026-07-10',
  isIsoDate: (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value),
  compareWithTodayIST: () => 0,
}));

function postRoom(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/buildings/b-1/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function patchRoom(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/rooms/r-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('admin rooms routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwner.mockResolvedValue({ session: { id: 'owner-1', role: 'owner' } });
  });

  it('POST /buildings/[id]/rooms rejects duplicate room number in the building', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'buildings') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'b-1' }, error: null }),
              }),
            }),
          }),
        };
      }

      if (table === 'room_types') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: () =>
                      Promise.resolve({ data: { id: 'rt-1', active: true, cot_count: 2 }, error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'r-existing' }, error: null }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { POST } = await import('../../buildings/[id]/rooms/route');
    const response = await POST(
      postRoom({
        room_number: '101',
        floor: 'first',
        room_class: 'AC',
        sharing_capacity: 2,
        cot_count: 2,
        cot_configuration_type: 'bunker',
      }) as any,
      { params: Promise.resolve({ id: 'b-1' }) }
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('already exists');
  });

  it('POST /buildings/[id]/rooms creates room with resolved template, cot mode, and unresolved rent state', async () => {
    const roomInsert = vi.fn(() => ({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: {
              id: 'r-1',
              building_id: 'b-1',
              room_number: '102',
              floor: 'second',
              room_type_id: 'rt-existing',
              current_rent: 1,
              room_types: { id: 'rt-existing', name: 'AC', sharing_capacity: 2, cot_count: 2 },
            },
            error: null,
          }),
      }),
    }));

    const cotInsert = vi.fn(() => ({
      select: () =>
        Promise.resolve({
          data: [
            { id: 'c-1', room_id: 'r-1', cot_id_label: 'L1', cot_type: 'lower_cot', hosteler_id: null },
            { id: 'c-2', room_id: 'r-1', cot_id_label: 'L2', cot_type: 'lower_cot', hosteler_id: null },
          ],
          error: null,
        }),
    }));

    mockFrom.mockImplementation((table: string) => {
      if (table === 'buildings') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'b-1' }, error: null }),
              }),
            }),
          }),
        };
      }

      if (table === 'room_types') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: () =>
                      Promise.resolve({
                        data: { id: 'rt-existing', active: true, cot_count: 2 },
                        error: null,
                      }),
                  }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
          insert: roomInsert,
        };
      }

      if (table === 'cots') {
        return {
          insert: cotInsert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { POST } = await import('../../buildings/[id]/rooms/route');
    const response = await POST(
      postRoom({
        room_number: '102',
        floor: 'second',
        room_class: 'AC',
        sharing_capacity: 2,
        cot_count: 2,
        cot_configuration_type: 'normal',
      }) as any,
      { params: Promise.resolve({ id: 'b-1' }) }
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.room_type_resolution).toBe('resolved');
    expect(data.rent_state).toBe('global_rent_managed_unresolved');
    expect(roomInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        current_rent: 1,
        room_type_id: 'rt-existing',
      }),
    );
    expect(data.room.cots).toHaveLength(2);
    expect(data.room.cots[0].cot_id_label).toBe('L1');
  });

  it('GET /rooms/[id] includes pending_change when future change exists', async () => {
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
                    room_types: { id: 'rt-1', name: '2 Sharing' },
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
                          new_rent: 7000,
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
      new_rent: 7000,
      effective_date: '2026-07-12',
    });
  });

  it('PATCH /rooms/[id] returns 404 for cross-owner room access', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table !== 'rooms') {
        throw new Error(`Unexpected table: ${table}`);
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () =>
              Promise.resolve({
                data: {
                  id: 'r-1',
                  building_id: 'b-1',
                  buildings: { owner_id: 'owner-2' },
                },
                error: null,
              }),
          }),
        }),
      };
    });

    const { PATCH } = await import('../[id]/route');
    const response = await PATCH(patchRoom({ room_number: '102' }) as any, {
      params: Promise.resolve({ id: 'r-1' }),
    });

    expect(response.status).toBe(404);
  });

  it('POST /buildings/[id]/rooms uses submitted cot_count not template cot_count for cot generation', async () => {
    const cotInsert = vi.fn(() => ({
      select: () =>
        Promise.resolve({
          data: [
            { id: 'c-1', room_id: 'r-1', cot_id_label: 'L1', cot_type: 'lower_cot', hosteler_id: null },
            { id: 'c-2', room_id: 'r-1', cot_id_label: 'U1', cot_type: 'upper_cot', hosteler_id: null },
          ],
          error: null,
        }),
    }));

    mockFrom.mockImplementation((table: string) => {
      if (table === 'buildings') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'b-1' }, error: null }),
              }),
            }),
          }),
        };
      }

      if (table === 'room_types') {
        // Template exists with cot_count: 3 — but user submits cot_count: 1
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: () =>
                      Promise.resolve({
                        data: { id: 'rt-existing', active: true, cot_count: 3 },
                        error: null,
                      }),
                  }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'r-1',
                    building_id: 'b-1',
                    room_number: '103',
                    floor: null,
                    room_type_id: 'rt-existing',
                    current_rent: 1,
                    room_types: { id: 'rt-existing', name: 'AC', sharing_capacity: 2, cot_count: 3 },
                  },
                  error: null,
                }),
            }),
          }),
        };
      }

      if (table === 'cots') {
        return { insert: cotInsert };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { POST } = await import('../../buildings/[id]/rooms/route');
    const response = await POST(
      postRoom({
        room_number: '103',
        room_class: 'AC',
        sharing_capacity: 2,
        cot_count: 1,           // user submits 1 — template has 3
        cot_configuration_type: 'bunker',
      }) as any,
      { params: Promise.resolve({ id: 'b-1' }) },
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    // Cot payload must be built from body.cot_count (1 bunk = L1 + U1), not template (3)
    const insertedPayload = cotInsert.mock.calls[0]?.[0] as { cot_id_label: string }[];
    expect(insertedPayload).toHaveLength(2);
    expect(insertedPayload.map((c) => c.cot_id_label)).toEqual(['L1', 'U1']);
  });

  it('DELETE /rooms/[id] blocks deletion when an active hosteler is assigned to room cots', async () => {
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
              not: () => Promise.resolve({ data: [{ id: 'c-1', hosteler_id: 'h-1' }], error: null }),
            }),
          }),
        };
      }

      if (table === 'hostelers') {
        return {
          select: () => ({
            in: () => ({
              eq: () => ({
                limit: () => Promise.resolve({ data: [{ id: 'h-1' }], error: null }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { DELETE } = await import('../[id]/route');
    const response = await DELETE(new Request('http://localhost/api/admin/rooms/r-1') as any, {
      params: Promise.resolve({ id: 'r-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('active hostelers');
  });
});
