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

function postCots(body?: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/rooms/r-1/cots', {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function patchCot(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/cots/c-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('admin cots routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwner.mockResolvedValue({ session: { id: 'owner-1', role: 'owner' } });
  });

  it('POST /rooms/[id]/cots generates deterministic L/U labels and cot types per bunk', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'r-1', room_type_id: 'rt-1', building_id: 'b-1' }, error: null }),
            }),
          }),
        };
      }

      if (table === 'buildings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { owner_id: 'owner-1' }, error: null }),
            }),
          }),
        };
      }

      if (table === 'room_types') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { cot_count: 3 }, error: null }),
            }),
          }),
        };
      }

      if (table === 'cots') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
          insert: (payload: Array<{ cot_id_label: string; cot_type: string }>) => ({
            select: () => Promise.resolve({ data: payload, error: null }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { POST } = await import('../../rooms/[id]/cots/route');
    const response = await POST(postCots({ cot_configuration_type: 'bunker' }) as any, {
      params: Promise.resolve({ id: 'r-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.cots.map((c: any) => c.cot_id_label)).toEqual(['L1', 'U1', 'L2', 'U2', 'L3', 'U3']);
    expect(data.cots.map((c: any) => c.cot_type)).toEqual([
      'lower_cot',
      'upper_cot',
      'lower_cot',
      'upper_cot',
      'lower_cot',
      'upper_cot',
    ]);
  });

  it('POST /rooms/[id]/cots in normal mode generates L-only labels mapped to lower_cot', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'r-1', room_type_id: 'rt-1', building_id: 'b-1' }, error: null }),
            }),
          }),
        };
      }

      if (table === 'buildings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { owner_id: 'owner-1' }, error: null }),
            }),
          }),
        };
      }

      if (table === 'room_types') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { cot_count: 3 }, error: null }),
            }),
          }),
        };
      }

      if (table === 'cots') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
          insert: (payload: Array<{ cot_id_label: string; cot_type: string }>) => ({
            select: () => Promise.resolve({ data: payload, error: null }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { POST } = await import('../../rooms/[id]/cots/route');
    const response = await POST(postCots({ cot_configuration_type: 'normal' }) as any, {
      params: Promise.resolve({ id: 'r-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.cots.map((c: any) => c.cot_id_label)).toEqual(['L1', 'L2', 'L3']);
    expect(data.cots.map((c: any) => c.cot_type)).toEqual(['lower_cot', 'lower_cot', 'lower_cot']);
  });

  it('POST /rooms/[id]/cots rejects missing cot configuration type', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'r-1', room_type_id: 'rt-1', building_id: 'b-1' }, error: null }),
            }),
          }),
        };
      }

      if (table === 'buildings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { owner_id: 'owner-1' }, error: null }),
            }),
          }),
        };
      }

      if (table === 'room_types') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { cot_count: 3 }, error: null }),
            }),
          }),
        };
      }

      if (table === 'cots') {
        return {
          select: () => ({
            eq: () => ({
              limit: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { POST } = await import('../../rooms/[id]/cots/route');
    const response = await POST(postCots() as any, { params: Promise.resolve({ id: 'r-1' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('cot_configuration_type is required');
  });

  it('GET /rooms/[id]/cots returns cots sorted as L1,U1,L2,U2 with occupancy status', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'r-1', room_type_id: 'rt-1', building_id: 'b-1' }, error: null }),
            }),
          }),
        };
      }

      if (table === 'buildings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { owner_id: 'owner-1' }, error: null }),
            }),
          }),
        };
      }

      if (table === 'room_types') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { cot_count: 2 }, error: null }),
            }),
          }),
        };
      }

      if (table === 'cots') {
        return {
          select: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    { id: 'c-2', room_id: 'r-1', cot_id_label: 'U1', cot_type: 'upper_cot', hosteler_id: 'h-1' },
                    { id: 'c-3', room_id: 'r-1', cot_id_label: 'L2', cot_type: 'lower_cot', hosteler_id: null },
                    { id: 'c-1', room_id: 'r-1', cot_id_label: 'L1', cot_type: 'lower_cot', hosteler_id: null },
                    { id: 'c-4', room_id: 'r-1', cot_id_label: 'U2', cot_type: 'upper_cot', hosteler_id: null },
                  ],
                  error: null,
                }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { GET } = await import('../../rooms/[id]/cots/route');
    const response = await GET(new Request('http://localhost/api/admin/rooms/r-1/cots') as any, {
      params: Promise.resolve({ id: 'r-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.cots.map((c: any) => c.cot_id_label)).toEqual(['L1', 'U1', 'L2', 'U2']);
    expect(data.cots.map((c: any) => c.cot_type)).toEqual(['lower_cot', 'upper_cot', 'lower_cot', 'upper_cot']);
    expect(data.cots.map((c: any) => c.occupancy_status)).toEqual(['free', 'occupied', 'free', 'free']);
  });

  it('PATCH /cots/[id] rejects assignment to non-active hostelers', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'cots') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'c-1', room_id: 'r-1', hosteler_id: null }, error: null }),
            }),
          }),
        };
      }

      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'r-1', building_id: 'b-1' }, error: null }),
            }),
          }),
        };
      }

      if (table === 'buildings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { owner_id: 'owner-1' }, error: null }),
            }),
          }),
        };
      }

      if (table === 'hostelers') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'h-1', status: 'inactive' }, error: null }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { PATCH } = await import('../[id]/route');
    const response = await PATCH(patchCot({ hosteler_id: 'h-1' }) as any, {
      params: Promise.resolve({ id: 'c-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Only active hostelers');
  });

  it('PATCH /cots/[id] assigns active hosteler and updates hosteler location fields', async () => {
    const hostelerUpdateEq = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'cots') {
        return {
          select: (projection: string) => {
            if (projection === 'id, room_id, hosteler_id') {
              return {
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: { id: 'c-1', room_id: 'r-1', hosteler_id: null }, error: null }),
                }),
              };
            }

            return {
              eq: () => ({
                neq: () => ({
                  limit: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            };
          },
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'c-1', hosteler_id: 'h-1' }, error: null }),
              }),
            }),
          }),
        };
      }

      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'r-1', building_id: 'b-1' }, error: null }),
            }),
          }),
        };
      }

      if (table === 'buildings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { owner_id: 'owner-1' }, error: null }),
            }),
          }),
        };
      }

      if (table === 'hostelers') {
        return {
          select: (projection: string) => {
            if (projection === 'id, status') {
              return {
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: { id: 'h-1', status: 'active' }, error: null }),
                }),
              };
            }

            return {
              eq: () => ({
                neq: () => ({
                  limit: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            };
          },
          update: () => ({
            eq: hostelerUpdateEq,
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { PATCH } = await import('../[id]/route');
    const response = await PATCH(patchCot({ hosteler_id: 'h-1' }) as any, {
      params: Promise.resolve({ id: 'c-1' }),
    });

    expect(response.status).toBe(200);
    expect(hostelerUpdateEq).toHaveBeenCalledWith('id', 'h-1');
  });

  it('GET /cots/availability returns occupancy hierarchy', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'buildings') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [{ id: 'b-1', name: 'North' }], error: null }),
            }),
          }),
        };
      }

      if (table === 'rooms') {
        return {
          select: () => ({
            in: () => ({
              order: () => Promise.resolve({ data: [{ id: 'r-1', building_id: 'b-1', room_number: '101', floor: 'first', current_rent: 6000 }], error: null }),
            }),
          }),
        };
      }

      if (table === 'cots') {
        return {
          select: () => ({
            in: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    { id: 'c-2', room_id: 'r-1', cot_id_label: 'U1', cot_type: 'upper_cot', hosteler_id: 'h-1' },
                    { id: 'c-1', room_id: 'r-1', cot_id_label: 'L1', cot_type: 'lower_cot', hosteler_id: null },
                    { id: 'c-3', room_id: 'r-1', cot_id_label: 'U2', cot_type: 'upper_cot', hosteler_id: null },
                    { id: 'c-4', room_id: 'r-1', cot_id_label: 'L2', cot_type: 'lower_cot', hosteler_id: null },
                  ],
                  error: null,
                }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { GET } = await import('../availability/route');
    const response = await GET(new Request('http://localhost/api/admin/cots/availability') as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.availability[0].rooms[0].free_cots).toBe(3);
    expect(data.availability[0].rooms[0].occupied_cots).toBe(1);
    expect(data.availability[0].rooms[0].cots.map((c: any) => c.cot_id_label)).toEqual(['L1', 'U1', 'L2', 'U2']);
  });

  it('GET /cots/availability preserves normal-mode L-only labels as lower_cot', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'buildings') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [{ id: 'b-1', name: 'North' }], error: null }),
            }),
          }),
        };
      }

      if (table === 'rooms') {
        return {
          select: () => ({
            in: () => ({
              order: () => Promise.resolve({ data: [{ id: 'r-1', building_id: 'b-1', room_number: '101', floor: 'first', current_rent: 6000 }], error: null }),
            }),
          }),
        };
      }

      if (table === 'cots') {
        return {
          select: () => ({
            in: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    { id: 'c-2', room_id: 'r-1', cot_id_label: 'L2', cot_type: 'lower_cot', hosteler_id: null },
                    { id: 'c-1', room_id: 'r-1', cot_id_label: 'L1', cot_type: 'lower_cot', hosteler_id: 'h-1' },
                    { id: 'c-3', room_id: 'r-1', cot_id_label: 'L3', cot_type: 'lower_cot', hosteler_id: null },
                  ],
                  error: null,
                }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { GET } = await import('../availability/route');
    const response = await GET(new Request('http://localhost/api/admin/cots/availability') as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.availability[0].rooms[0].cots.map((c: any) => c.cot_id_label)).toEqual(['L1', 'L2', 'L3']);
    expect(data.availability[0].rooms[0].cots.map((c: any) => c.cot_type)).toEqual(['lower_cot', 'lower_cot', 'lower_cot']);
  });
});
