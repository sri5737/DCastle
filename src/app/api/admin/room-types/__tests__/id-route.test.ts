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

function patchRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/room-types/rt-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('admin room-types/[id] route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwner.mockResolvedValue({ session: { id: 'owner-1', role: 'owner' } });
  });

  it('PATCH archives a room type', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table !== 'room_types') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: 'rt-1',
                    owner_id: 'owner-1',
                    name: 'AC',
                    sharing_capacity: 2,
                    cot_count: 2,
                    active: true,
                  },
                  error: null,
                }),
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: 'rt-1',
                      owner_id: 'owner-1',
                      name: 'AC',
                      sharing_capacity: 2,
                      cot_count: 2,
                      active: false,
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        }),
      };
    });

    const { PATCH } = await import('../[id]/route');
    const response = await PATCH(patchRequest({ active: false }) as any, {
      params: Promise.resolve({ id: 'rt-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.room_type.active).toBe(false);
  });

  it('PATCH validates active boolean payload', async () => {
    const { PATCH } = await import('../[id]/route');
    const response = await PATCH(patchRequest({ active: 'false' }) as any, {
      params: Promise.resolve({ id: 'rt-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('active must be a boolean');
  });

  it('DELETE blocks removal when room references exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'room_types') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'rt-1',
                      owner_id: 'owner-1',
                      name: 'AC',
                      sharing_capacity: 2,
                      cot_count: 2,
                      active: true,
                    },
                    error: null,
                  }),
              }),
            }),
          }),
        };
      }

      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [{ id: 'r-1' }, { id: 'r-2' }], error: null }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { DELETE } = await import('../[id]/route');
    const response = await DELETE(new Request('http://localhost/api/admin/room-types/rt-1') as any, {
      params: Promise.resolve({ id: 'rt-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('currently used by 2 room(s)');
    expect(data.usage_count).toBe(2);
    expect(data.archive_guidance).toContain('Archive this room type instead');
  });

  it('DELETE succeeds when room type is unreferenced', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'room_types') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: {
                      id: 'rt-1',
                      owner_id: 'owner-1',
                      name: 'AC',
                      sharing_capacity: 2,
                      cot_count: 2,
                      active: false,
                    },
                    error: null,
                  }),
              }),
            }),
          }),
          delete: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
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
    const response = await DELETE(new Request('http://localhost/api/admin/room-types/rt-1') as any, {
      params: Promise.resolve({ id: 'rt-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.deleted).toBe(true);
  });
});