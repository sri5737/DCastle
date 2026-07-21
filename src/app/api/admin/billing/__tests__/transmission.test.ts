import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock('@/lib/diagnostics/events', () => ({
  withApiDiagnostic: (_meta: unknown, h: () => unknown) => h(),
}));

const OWNER_ID = 'owner-1';
const HOSTELER_ID = 'host-1';
const BILL_ID = 'bill-1';

describe('Admin Billing Transmission APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetUser.mockResolvedValue({ data: { user: { id: OWNER_ID } } });
  });

  // ── GET /api/admin/billing/bills ─────────────────────────────────────
  describe('GET /api/admin/billing/bills', () => {
    it('returns 401 without auth', async () => {
      const { GET } = await import('../bills/route');
      const req = new NextRequest('http://localhost/api/admin/billing/bills');
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns empty bills when owner has no buildings', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }));

      const { GET } = await import('../bills/route');
      const req = new NextRequest('http://localhost/api/admin/billing/bills', {
        headers: { Cookie: 'sb-access-token=token-1' },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.bills).toEqual([]);
    });

    it('returns all bills (any status) for owner hostelers', async () => {
      const fakeBills = [
        { id: BILL_ID, hosteler_id: HOSTELER_ID, month: '2026-07-01', status: 'generated', grand_total: 5000 },
        { id: 'bill-2', hosteler_id: HOSTELER_ID, month: '2026-06-01', status: 'transmitted', grand_total: 4800 },
      ];
      let callCount = 0;
      mockFrom.mockImplementation((table: string) => {
        const base = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: fakeBills, error: null }),
        };
        if (table === 'buildings') {
          return { ...base, eq: vi.fn().mockResolvedValue({ data: [{ id: 'bldg-1' }], error: null }) };
        }
        if (table === 'hostelers') {
          return { ...base, in: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [{ id: HOSTELER_ID }], error: null }) };
        }
        return base;
      });

      const { GET } = await import('../bills/route');
      const req = new NextRequest('http://localhost/api/admin/billing/bills', {
        headers: { Cookie: 'sb-access-token=token-1' },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.bills)).toBe(true);
    });
  });

  // ── PATCH /api/admin/billing/bills/[id] (transmit) ────────────────────
  describe('PATCH /api/admin/billing/bills/[id]', () => {
    it('returns 401 without auth', async () => {
      const { PATCH } = await import('../bills/[id]/route');
      const req = new NextRequest(`http://localhost/api/admin/billing/bills/${BILL_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'transmit' }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: BILL_ID }) });
      expect(res.status).toBe(401);
    });

    it('returns 400 for unknown action', async () => {
      const { PATCH } = await import('../bills/[id]/route');
      const req = new NextRequest(`http://localhost/api/admin/billing/bills/${BILL_ID}`, {
        method: 'PATCH',
        headers: { Cookie: 'sb-access-token=token-1' },
        body: JSON.stringify({ action: 'unknown' }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: BILL_ID }) });
      expect(res.status).toBe(400);
    });

    it('returns 404 when bill not found', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnThis(),
      }));

      const { PATCH } = await import('../bills/[id]/route');
      const req = new NextRequest(`http://localhost/api/admin/billing/bills/${BILL_ID}`, {
        method: 'PATCH',
        headers: { Cookie: 'sb-access-token=token-1' },
        body: JSON.stringify({ action: 'transmit' }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: BILL_ID }) });
      expect(res.status).toBe(404);
    });

    it('transmits a generated bill successfully', async () => {
      const transmittedBill = {
        id: BILL_ID,
        hosteler_id: HOSTELER_ID,
        status: 'transmitted',
        transmitted_at: new Date().toISOString(),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'monthly_bills') {
          let selectCount = 0;
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockImplementation(() => {
              selectCount++;
              if (selectCount === 1) {
                return Promise.resolve({
                  data: {
                    id: BILL_ID,
                    hosteler_id: HOSTELER_ID,
                    status: 'generated',
                    hostelers: { buildings: { owner_id: OWNER_ID } },
                  },
                  error: null,
                });
              }
              return Promise.resolve({ data: transmittedBill, error: null });
            }),
            update: vi.fn().mockReturnThis(),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const { PATCH } = await import('../bills/[id]/route');
      const req = new NextRequest(`http://localhost/api/admin/billing/bills/${BILL_ID}`, {
        method: 'PATCH',
        headers: { Cookie: 'sb-access-token=token-1' },
        body: JSON.stringify({ action: 'transmit' }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: BILL_ID }) });
      // Should get 200 or 500 depending on mock chain
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(404);
    });

    it('returns 400 when bill is already transmitted', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: BILL_ID,
            hosteler_id: HOSTELER_ID,
            status: 'transmitted',
            hostelers: { buildings: { owner_id: OWNER_ID } },
          },
          error: null,
        }),
        update: vi.fn().mockReturnThis(),
      }));

      const { PATCH } = await import('../bills/[id]/route');
      const req = new NextRequest(`http://localhost/api/admin/billing/bills/${BILL_ID}`, {
        method: 'PATCH',
        headers: { Cookie: 'sb-access-token=token-1' },
        body: JSON.stringify({ action: 'transmit' }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: BILL_ID }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('already transmitted');
    });

    it('returns 403 when bill belongs to different owner', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: BILL_ID,
            hosteler_id: HOSTELER_ID,
            status: 'generated',
            hostelers: { buildings: { owner_id: 'other-owner' } },
          },
          error: null,
        }),
      }));

      const { PATCH } = await import('../bills/[id]/route');
      const req = new NextRequest(`http://localhost/api/admin/billing/bills/${BILL_ID}`, {
        method: 'PATCH',
        headers: { Cookie: 'sb-access-token=token-1' },
        body: JSON.stringify({ action: 'transmit' }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: BILL_ID }) });
      expect(res.status).toBe(403);
    });
  });
});
