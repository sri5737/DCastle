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
  return new Request('http://localhost/api/admin/room-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('admin room types route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwner.mockResolvedValue({ session: { id: 'owner-1', role: 'owner' } });
  });

  it('POST rejects non-enum room type names', async () => {
    const { POST } = await import('../route');
    const response = await POST(
      postRequest({ name: 'Deluxe', sharing_capacity: 2, cot_count: 2 }) as any,
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Room type name must be AC or non-AC');
  });

  it('POST rejects invalid sharing capacity', async () => {
    const { POST } = await import('../route');
    const response = await POST(
      postRequest({ name: 'AC', sharing_capacity: 0, cot_count: 2 }) as any,
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Sharing capacity must be between 1 and 10');
  });

  it('POST creates room type with sharing capacity and no base_rent', async () => {
    const insertSpy = vi.fn(() => ({
      select: () => ({
        single: () =>
          Promise.resolve({
            data: {
              id: 'rt-1',
              owner_id: 'owner-1',
              name: 'AC',
              sharing_capacity: 2,
              cot_count: 2,
              description: null,
              created_at: '2026-07-13T00:00:00.000Z',
              updated_at: '2026-07-13T00:00:00.000Z',
            },
            error: null,
          }),
      }),
    }));

    mockFrom.mockImplementation((table: string) => {
      if (table !== 'room_types') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        }),
        insert: insertSpy,
      };
    });

    const { POST } = await import('../route');
    const response = await POST(
      postRequest({ name: 'AC', sharing_capacity: 2, cot_count: 2 }) as any,
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.room_type).toMatchObject({
      name: 'AC',
      sharing_capacity: 2,
      cot_count: 2,
    });
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: 'owner-1',
        name: 'AC',
        sharing_capacity: 2,
        cot_count: 2,
      }),
    );
    expect(insertSpy).toHaveBeenCalledWith(
      expect.not.objectContaining({
        base_rent: expect.anything(),
      }),
    );
  });

  it('POST rejects duplicate name and sharing-capacity combination', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table !== 'room_types') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'rt-existing', active: true }, error: null }),
              }),
            }),
          }),
        }),
      };
    });

    const { POST } = await import('../route');
    const response = await POST(
      postRequest({ name: 'non-AC', sharing_capacity: 3, cot_count: 3 }) as any,
    );
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('Room type with this name and sharing capacity already exists');
  });

  it('POST returns archived guidance when duplicate room type is archived', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table !== 'room_types') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'rt-archived', active: false }, error: null }),
              }),
            }),
          }),
        }),
      };
    });

    const { POST } = await import('../route');
    const response = await POST(
      postRequest({ name: 'non-AC', sharing_capacity: 3, cot_count: 3 }) as any,
    );
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('already exists but is archived');
  });
});
