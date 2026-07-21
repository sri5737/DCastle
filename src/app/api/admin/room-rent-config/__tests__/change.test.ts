import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Supabase
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

const mockSupabase = {
  from: mockFrom,
  auth: {
    getUser: mockGetUser,
  },
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}));

vi.mock('@/lib/diagnostics/events', () => ({
  withApiDiagnostic: (_meta: unknown, handler: Function) => handler(),
}));

describe('POST /api/admin/room-rent-config/change', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'owner-1' } },
    });
  });

  it('validates sharing_capacity >= 1', async () => {
    const { POST } = await import('../change/route');
    const request = new NextRequest('http://localhost/api/admin/room-rent-config/change', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1' },
      body: JSON.stringify({
        sharing_capacity: 0,
        room_class: 'ac',
        new_rent: 5000,
        effective_date: '2026-08-01',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('sharing_capacity must be >= 1');
  });

  it('validates room_class enum', async () => {
    const { POST } = await import('../change/route');
    const request = new NextRequest('http://localhost/api/admin/room-rent-config/change', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1' },
      body: JSON.stringify({
        sharing_capacity: 2,
        room_class: 'invalid',
        new_rent: 5000,
        effective_date: '2026-08-01',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("room_class must be 'ac' or 'non_ac'");
  });

  it('validates new_rent > 0', async () => {
    const { POST } = await import('../change/route');
    const request = new NextRequest('http://localhost/api/admin/room-rent-config/change', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1' },
      body: JSON.stringify({
        sharing_capacity: 2,
        room_class: 'ac',
        new_rent: 0,
        effective_date: '2026-08-01',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('new_rent must be > 0');
  });

  it('validates effective_date is not in past', async () => {
    const { POST } = await import('../change/route');
    const request = new NextRequest('http://localhost/api/admin/room-rent-config/change', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1' },
      body: JSON.stringify({
        sharing_capacity: 2,
        room_class: 'ac',
        new_rent: 5000,
        effective_date: '2020-01-01', // Past date (way outside 3-month window)
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('3-month window');
  });

  it('creates rent config change successfully', async () => {
    const mockRoomConfig = {
      id: 'rrc-1',
      owner_id: 'owner-1',
      sharing_capacity: 2,
      room_class: 'ac',
      old_rent: 5000,
      new_rent: 5500,
      effective_date: '2026-08-01',
      created_by: 'owner-1',
      created_at: new Date().toISOString(),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'room_configuration_history') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: { room_rent: 5000 },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'room_rent_config_history') {
        return {
          insert: mockInsert,
        };
      }
      return { select: mockSelect };
    });

    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockRoomConfig,
          error: null,
        }),
      }),
    });

    const { POST } = await import('../change/route');
    const request = new NextRequest('http://localhost/api/admin/room-rent-config/change', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1' },
      body: JSON.stringify({
        sharing_capacity: 2,
        room_class: 'ac',
        new_rent: 5500,
        effective_date: '2026-08-01',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.sharing_capacity).toBe(2);
    expect(data.new_rent).toBe(5500);
  });
});
