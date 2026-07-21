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

vi.mock('@/lib/diagnostics/events', () => ({
  withApiDiagnostic: (_ctx: unknown, fn: () => unknown) => fn(),
}));

function patchRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/admin/hostelers/h-1/accommodation', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function deleteRequest() {
  return new Request('http://localhost/api/admin/hostelers/h-1/accommodation', {
    method: 'DELETE',
  });
}

describe('admin hosteler accommodation route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRequireOwner.mockResolvedValue({ session: { id: 'owner-1', role: 'owner' } });
  });

  it('assigns accommodation for an unassigned hosteler', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'hostelers') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: 'h-1',
                    status: 'pending',
                    building_id: null,
                    room_id: null,
                    cot_id: null,
                  },
                  error: null,
                }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }

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
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: { id: 'r-1', building_id: 'b-1', room_number: '101' }, error: null }),
              }),
            }),
          }),
        };
      }

      if (table === 'cots') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'c-1', room_id: 'r-1', hosteler_id: null }, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              is: () => ({
                select: () => ({
                  maybeSingle: () => Promise.resolve({ data: { id: 'c-1' }, error: null }),
                }),
              }),
            }),
          }),
        };
      }

      return {};
    });

    const { PATCH } = await import('../[id]/accommodation/route');
    const response = await PATCH(
      patchRequest({ hosteler_id: 'h-1', building_id: 'b-1', room_id: 'r-1', cot_id: 'c-1' }) as any,
      { params: Promise.resolve({ id: 'h-1' }) },
    );

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.assigned).toBe(true);
    expect(data.hosteler.room_number).toBe('101');
    expect(data.hosteler.cot_id).toBe('c-1');
  });

  it('reassigns and releases the previous cot', async () => {
    const cotUpdate = vi
      .fn()
      .mockReturnValueOnce({
        eq: () => ({
          is: () => ({
            select: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'c-2' }, error: null }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        eq: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'hostelers') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: 'h-1',
                    status: 'active',
                    building_id: 'b-1',
                    room_id: 'r-1',
                    cot_id: 'c-1',
                  },
                  error: null,
                }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }

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
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: { id: 'r-1', building_id: 'b-1', room_number: '102' }, error: null }),
              }),
            }),
          }),
        };
      }

      if (table === 'cots') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'c-2', room_id: 'r-1', hosteler_id: null }, error: null }),
              }),
            }),
          }),
          update: cotUpdate,
        };
      }

      return {};
    });

    const { PATCH } = await import('../[id]/accommodation/route');
    const response = await PATCH(
      patchRequest({ hosteler_id: 'h-1', building_id: 'b-1', room_id: 'r-1', cot_id: 'c-2' }) as any,
      { params: Promise.resolve({ id: 'h-1' }) },
    );

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.assigned).toBe(true);
    expect(cotUpdate).toHaveBeenCalledTimes(2);
  });

  it('rejects assignment to an occupied cot', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'hostelers') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: 'h-1',
                    status: 'active',
                    building_id: null,
                    room_id: null,
                    cot_id: null,
                  },
                  error: null,
                }),
            }),
          }),
        };
      }

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
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: { id: 'r-1', building_id: 'b-1', room_number: '101' }, error: null }),
              }),
            }),
          }),
        };
      }

      if (table === 'cots') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'c-1', room_id: 'r-1', hosteler_id: 'h-2' }, error: null }),
              }),
            }),
          }),
        };
      }

      return {};
    });

    const { PATCH } = await import('../[id]/accommodation/route');
    const response = await PATCH(
      patchRequest({ hosteler_id: 'h-1', building_id: 'b-1', room_id: 'r-1', cot_id: 'c-1' }) as any,
      { params: Promise.resolve({ id: 'h-1' }) },
    );

    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('Selected cot is already occupied');
  });

  it('unassigns accommodation and returns hosteler to UNASSIGNED state', async () => {
    const cotUpdate = vi.fn().mockReturnValue({
      eq: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'hostelers') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: 'h-1',
                    status: 'active',
                    building_id: 'b-1',
                    room_id: 'r-1',
                    cot_id: 'c-1',
                  },
                  error: null,
                }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }

      if (table === 'cots') {
        return {
          update: cotUpdate,
        };
      }

      return {};
    });

    const { DELETE } = await import('../[id]/accommodation/route');
    const response = await DELETE(
      deleteRequest() as any,
      { params: Promise.resolve({ id: 'h-1' }) },
    );

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.unassigned).toBe(true);
    expect(data.hosteler.room_number).toBe('UNASSIGNED');
    expect(cotUpdate).toHaveBeenCalledTimes(1);
  });
});
