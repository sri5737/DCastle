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

function patchResetRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/rooms/r-1/cots', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('admin rooms/[id]/cots reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwner.mockResolvedValue({ session: { id: 'owner-1', role: 'owner' } });
  });

  it('blocks reset when an active hosteler assignment exists in room cots', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { id: 'r-1', room_type_id: 'rt-1', building_id: 'b-1' }, error: null }),
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

    const { PATCH } = await import('../[id]/cots/route');
    const response = await PATCH(
      patchResetRequest({ action: 'reset', cot_configuration_type: 'bunker' }) as any,
      { params: Promise.resolve({ id: 'r-1' }) },
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('active hosteler');
  });

  it('regenerates cots when no active hosteler assignment exists', async () => {
    const insertSpy = vi.fn(() => ({
      select: () => Promise.resolve({
        data: [
          { id: 'c-1', room_id: 'r-1', cot_id_label: 'L1', cot_type: 'lower_cot' },
          { id: 'c-2', room_id: 'r-1', cot_id_label: 'U1', cot_type: 'upper_cot' },
        ],
        error: null,
      }),
    }));

    mockFrom.mockImplementation((table: string) => {
      if (table === 'rooms') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: { id: 'r-1', room_type_id: 'rt-1', building_id: 'b-1' }, error: null }),
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
              not: () => Promise.resolve({ data: [{ id: 'c-1', hosteler_id: 'h-2' }], error: null }),
            }),
          }),
          delete: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
          insert: insertSpy,
        };
      }

      if (table === 'hostelers') {
        return {
          select: () => ({
            in: () => ({
              eq: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const { PATCH } = await import('../[id]/cots/route');
    const response = await PATCH(
      patchResetRequest({ action: 'reset', cot_configuration_type: 'bunker' }) as any,
      { params: Promise.resolve({ id: 'r-1' }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reset).toBe(true);
    expect(insertSpy).toHaveBeenCalled();
  });
});