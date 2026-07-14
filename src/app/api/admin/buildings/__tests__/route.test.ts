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

function postRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/buildings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function patchRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/buildings/b-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('admin buildings routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwner.mockResolvedValue({ session: { id: 'owner-1', role: 'owner' } });
  });

  it('POST rejects duplicate building names per owner', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table !== 'buildings') throw new Error(`Unexpected table: ${table}`);
      return {
        select: () => ({
          eq: (_field: string, _value: string) => ({
            eq: (_field2: string, _value2: string) => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'b-existing' }, error: null }),
            }),
          }),
        }),
      };
    });

    const { POST } = await import('../route');
    const response = await POST(postRequest({ name: 'North Block' }) as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Building with this name already exists');
  });

  it('POST creates a building when name is unique', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table !== 'buildings') throw new Error(`Unexpected table: ${table}`);
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
                  id: 'b-1',
                  owner_id: 'owner-1',
                  name: 'North Block',
                  description: null,
                  created_at: '2026-07-10T00:00:00.000Z',
                },
                error: null,
              }),
          }),
        }),
      };
    });

    const { POST } = await import('../route');
    const response = await POST(postRequest({ name: 'North Block' }) as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.building.name).toBe('North Block');
  });

  it('GET returns building hierarchy with rooms and cots', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'buildings') {
        return {
          select: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: [{ id: 'b-1', name: 'North Block', description: null }],
                  error: null,
                }),
            }),
          }),
        };
      }

      if (table === 'rooms') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [
                  {
                    id: 'r-1',
                    building_id: 'b-1',
                    room_number: '101',
                    room_types: { id: 'rt-1', name: '2 Sharing' },
                  },
                ],
                error: null,
              }),
          }),
        };
      }

      if (table === 'cots') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [{ id: 'c-1', room_id: 'r-1', cot_id_label: 'C1', hosteler_id: null }],
                error: null,
              }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { GET } = await import('../route');
    const response = await GET(new Request('http://localhost/api/admin/buildings') as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.buildings).toHaveLength(1);
    expect(data.buildings[0].rooms).toHaveLength(1);
    expect(data.buildings[0].rooms[0].cots).toHaveLength(1);
  });

  it('GET /[id] returns 404 for unknown or cross-owner building', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table !== 'buildings') throw new Error(`Unexpected table: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
      };
    });

    const { GET } = await import('../[id]/route');
    const response = await GET(new Request('http://localhost/api/admin/buildings/b-x') as any, {
      params: Promise.resolve({ id: 'b-x' }),
    });

    expect(response.status).toBe(404);
  });

  it('PATCH enforces duplicate-name validation', async () => {
    let selectCall = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'buildings') {
        return {
          select: () => {
            selectCall += 1;
            if (selectCall === 1) {
              return {
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: { id: 'b-1', owner_id: 'owner-1', name: 'Old' }, error: null }),
                }),
              };
            }

            return {
              eq: () => ({
                eq: () => ({
                  neq: () => ({
                    maybeSingle: () => Promise.resolve({ data: { id: 'b-2' }, error: null }),
                  }),
                }),
              }),
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { PATCH } = await import('../[id]/route');
    const response = await PATCH(patchRequest({ name: 'North Block' }) as any, {
      params: Promise.resolve({ id: 'b-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Building with this name already exists');
  });

  it('DELETE blocks occupied buildings and returns 400', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'buildings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'b-1', owner_id: 'owner-1' }, error: null }),
            }),
          }),
        };
      }

      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [{ id: 'r-1' }], error: null }),
          }),
        };
      }

      if (table === 'cots') {
        return {
          select: () => ({
            in: () => ({
              not: () => ({
                limit: () => Promise.resolve({ data: [{ id: 'c-1' }], error: null }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { DELETE } = await import('../[id]/route');
    const response = await DELETE(new Request('http://localhost/api/admin/buildings/b-1') as any, {
      params: Promise.resolve({ id: 'b-1' }),
    });

    expect(response.status).toBe(400);
  });

  it('DELETE removes an unoccupied building', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'buildings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'b-1', owner_id: 'owner-1' }, error: null }),
            }),
          }),
          delete: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }

      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { DELETE } = await import('../[id]/route');
    const response = await DELETE(new Request('http://localhost/api/admin/buildings/b-1') as any, {
      params: Promise.resolve({ id: 'b-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ deleted: true });
  });
});
