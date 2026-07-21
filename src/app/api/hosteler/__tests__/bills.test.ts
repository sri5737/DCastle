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

const AUTH_USER_ID = 'auth-user-1';
const HOSTELER_ID = 'host-1';
const BILL_ID = 'bill-1';

describe('Hosteler Bill APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGetUser.mockResolvedValue({ data: { user: { id: AUTH_USER_ID } } });
  });

  // ── GET /api/hosteler/bills ────────────────────────────────────────────
  describe('GET /api/hosteler/bills', () => {
    it('returns 401 without auth', async () => {
      const { GET } = await import('../bills/route');
      const req = new NextRequest('http://localhost/api/hosteler/bills');
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns 401 when hosteler not found', async () => {
      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }));

      const { GET } = await import('../bills/route');
      const req = new NextRequest('http://localhost/api/hosteler/bills', {
        headers: { Cookie: 'sb-access-token=token-1' },
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns only transmitted bills for the authenticated hosteler', async () => {
      const transmittedBill = {
        id: BILL_ID,
        month: '2026-07-01',
        status: 'transmitted',
        grand_total: 5000,
        transmitted_at: new Date().toISOString(),
      };
      let fromCallCount = 0;
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hostelers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: HOSTELER_ID, status: 'active' },
              error: null,
            }),
          };
        }
        if (table === 'monthly_bills') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [transmittedBill],
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      });

      const { GET } = await import('../bills/route');
      const req = new NextRequest('http://localhost/api/hosteler/bills', {
        headers: { Cookie: 'sb-access-token=token-1' },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.bills).toHaveLength(1);
      expect(data.bills[0].status).toBe('transmitted');
    });

    it('returns empty array when no transmitted bills', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hostelers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: HOSTELER_ID, status: 'active' },
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      });

      const { GET } = await import('../bills/route');
      const req = new NextRequest('http://localhost/api/hosteler/bills', {
        headers: { Cookie: 'sb-access-token=token-1' },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.bills).toEqual([]);
    });
  });

  // ── GET /api/hosteler/bills/[id] ──────────────────────────────────────
  describe('GET /api/hosteler/bills/[id]', () => {
    it('returns 401 without auth', async () => {
      const { GET } = await import('../bills/[id]/route');
      const req = new NextRequest(`http://localhost/api/hosteler/bills/${BILL_ID}`);
      const res = await GET(req, { params: Promise.resolve({ id: BILL_ID }) });
      expect(res.status).toBe(401);
    });

    it('returns 404 for non-transmitted bill (generated state)', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hostelers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: HOSTELER_ID, status: 'active' },
              error: null,
            }),
          };
        }
        if (table === 'monthly_bills') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: BILL_ID,
                hosteler_id: HOSTELER_ID,
                status: 'generated', // NOT transmitted
                month: '2026-07-01',
                grand_total: 5000,
              },
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const { GET } = await import('../bills/[id]/route');
      const req = new NextRequest(`http://localhost/api/hosteler/bills/${BILL_ID}`, {
        headers: { Cookie: 'sb-access-token=token-1' },
      });
      const res = await GET(req, { params: Promise.resolve({ id: BILL_ID }) });
      expect(res.status).toBe(404);
    });

    it('returns 404 when bill belongs to different hosteler', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hostelers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: HOSTELER_ID, status: 'active' },
              error: null,
            }),
          };
        }
        if (table === 'monthly_bills') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: BILL_ID,
                hosteler_id: 'other-hosteler', // Different hosteler!
                status: 'transmitted',
                month: '2026-07-01',
              },
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const { GET } = await import('../bills/[id]/route');
      const req = new NextRequest(`http://localhost/api/hosteler/bills/${BILL_ID}`, {
        headers: { Cookie: 'sb-access-token=token-1' },
      });
      const res = await GET(req, { params: Promise.resolve({ id: BILL_ID }) });
      expect(res.status).toBe(404);
    });

    it('returns transmitted bill detail for the correct hosteler', async () => {
      const billData = {
        id: BILL_ID,
        hosteler_id: HOSTELER_ID,
        status: 'transmitted',
        month: '2026-07-01',
        room_rent_total: 3000,
        meal_charges: { breakfast: 930, lunch: 1240, dinner: 0 },
        grand_total: 5170,
        transmitted_at: new Date().toISOString(),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'hostelers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: HOSTELER_ID, status: 'active' },
              error: null,
            }),
          };
        }
        if (table === 'monthly_bills') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: billData, error: null }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const { GET } = await import('../bills/[id]/route');
      const req = new NextRequest(`http://localhost/api/hosteler/bills/${BILL_ID}`, {
        headers: { Cookie: 'sb-access-token=token-1' },
      });
      const res = await GET(req, { params: Promise.resolve({ id: BILL_ID }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.bill.id).toBe(BILL_ID);
      expect(data.bill.status).toBe('transmitted');
      expect(data.bill.grand_total).toBe(5170);
    });
  });
});
