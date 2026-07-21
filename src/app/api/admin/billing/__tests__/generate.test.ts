import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock billing calculation
vi.mock('@/lib/billing', () => ({
  calculateMonthlyBill: vi.fn().mockResolvedValue({
    room_rent_total: 3000,
    meal_charges: { breakfast: 930, lunch: 1240, dinner: 0 },
    grand_total: 5170,
  }),
}));

// Mock Supabase
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockDelete = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock('@/lib/diagnostics/events', () => ({
  withApiDiagnostic: (_meta: unknown, handler: () => unknown) => handler(),
}));

const OWNER_ID = 'owner-1';
const HOSTELER_ID = 'host-1';
const BUILDING_ID = 'bldg-1';
const MONTH = '2026-07-01';

function makeChain(resolveWith: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ['select', 'eq', 'in', 'lte', 'gte', 'is', 'single', 'delete', 'insert', 'update'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnThis();
  }
  // Terminal: make `single`, `delete`, `insert`, `update` also resolve as Promise
  chain['single'] = vi.fn().mockResolvedValue(resolveWith);
  return chain;
}

describe('POST /api/admin/billing/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
  });

  it('returns 401 when no auth header', async () => {
    const { POST } = await import('../generate/route');
    const req = new NextRequest('http://localhost/api/admin/billing/generate', {
      method: 'POST',
      body: JSON.stringify({ scope: 'all', month: MONTH }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when invalid token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { POST } = await import('../generate/route');
    const req = new NextRequest('http://localhost/api/admin/billing/generate', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=bad-token' },
      body: JSON.stringify({ scope: 'all', month: MONTH }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('validates scope enum', async () => {
    const { POST } = await import('../generate/route');
    const req = new NextRequest('http://localhost/api/admin/billing/generate', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1' },
      body: JSON.stringify({ scope: 'invalid', month: MONTH }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('scope must be');
  });

  it('validates scope_id required for hosteler scope', async () => {
    const { POST } = await import('../generate/route');
    const req = new NextRequest('http://localhost/api/admin/billing/generate', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1' },
      body: JSON.stringify({ scope: 'hosteler', month: MONTH }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('scope_id is required');
  });

  it('validates month required', async () => {
    const { POST } = await import('../generate/route');
    const req = new NextRequest('http://localhost/api/admin/billing/generate', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1' },
      body: JSON.stringify({ scope: 'all' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('validates month format (YYYY-MM-01)', async () => {
    const { POST } = await import('../generate/route');
    const req = new NextRequest('http://localhost/api/admin/billing/generate', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1' },
      body: JSON.stringify({ scope: 'all', month: '2026-07-15' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('YYYY-MM-01');
  });

  it('generates bills for all active hostelers', async () => {
    // Use per-table call count tracked outside the mockImplementation closure
    let hostelerCallCount = 0;

    mockFrom.mockImplementation((table: string) => {
      const base = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        delete: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      if (table === 'buildings') {
        return {
          ...base,
          eq: vi.fn().mockResolvedValue({ data: [{ id: BUILDING_ID }], error: null }),
        };
      }
      if (table === 'hostelers') {
        hostelerCallCount++;
        if (hostelerCallCount === 1) {
          // First call: .select('id').in().eq('status','active') → list query
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [{ id: HOSTELER_ID }], error: null }),
          };
        }
        // Subsequent calls: .select('name,...').eq('id',...).single() → info query
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { name: 'John', room_id: 'r-1', rooms: { room_number: '101' } },
            error: null,
          }),
        };
      }
      if (table === 'monthly_bills') {
        return {
          ...base,
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return base;
    });

    const { POST } = await import('../generate/route');
    const req = new NextRequest('http://localhost/api/admin/billing/generate', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1' },
      body: JSON.stringify({ scope: 'all', month: MONTH }),
    });
    const res = await POST(req);
    expect(res.status).not.toBe(500);
    expect(res.status).not.toBe(401);
  });

  it('returns generated_count=0 when no active hostelers in scope', async () => {
    mockFrom.mockImplementation((table: string) => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
      };
      if (table === 'buildings') {
        return { ...chain, eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
      }
      return chain;
    });

    const { POST } = await import('../generate/route');
    const req = new NextRequest('http://localhost/api/admin/billing/generate', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1' },
      body: JSON.stringify({ scope: 'all', month: MONTH }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.generated_count).toBe(0);
    expect(data.bills).toEqual([]);
  });

  it('returns 404 for hosteler scope when hosteler not found', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }));

    const { POST } = await import('../generate/route');
    const req = new NextRequest('http://localhost/api/admin/billing/generate', {
      method: 'POST',
      headers: { Cookie: 'sb-access-token=token-1' },
      body: JSON.stringify({ scope: 'hosteler', scope_id: 'nonexistent', month: MONTH }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
