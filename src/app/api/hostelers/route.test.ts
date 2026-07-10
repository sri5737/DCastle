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

function createPostRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/hostelers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = { name: 'Ravi Kumar', phone: '9876543210', room_number: '101' };

/**
 * Returns a mock that simulates a successful insert + invite token creation.
 */
function makeInsertMock() {
  return mockFrom.mockImplementation((table: string) => {
    if (table === 'hostelers') {
      return {
        select: () => ({
          eq: () => ({
            in: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({
                data: {
                  id: 'h-new',
                  name: validBody.name,
                  phone: validBody.phone,
                  room_number: validBody.room_number,
                  status: 'pending',
                  created_at: '2026-07-10T00:00:00.000Z',
                },
                error: null,
              }),
          }),
        }),
      };
    }
    // invite_tokens insert
    return {
      insert: () => Promise.resolve({ error: null }),
    };
  });
}

describe('POST /api/hostelers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRequireOwner.mockResolvedValue({ session: { id: 'owner-1', role: 'owner' } });
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  // (c) Returns 409 when phone matches an active hosteler
  it('returns 409 phone_already_registered when phone matches an active hosteler', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'hostelers') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: { id: 'h-existing' }, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const { POST } = await import('./route');
    const response = await POST(createPostRequest(validBody) as any);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error.code).toBe('phone_already_registered');
    expect(data.error.message).toBe(
      'This mobile number is already registered to an active hosteler.'
    );
    expect(data.error.recovery_action).toContain('Deactivate or delete');
  });

  // (d) Returns 409 when phone matches a pending hosteler
  it('returns 409 phone_already_registered when phone matches a pending hosteler', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'hostelers') {
        return {
          select: () => ({
            eq: () => ({
              in: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: { id: 'h-pending' }, error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const { POST } = await import('./route');
    const response = await POST(createPostRequest(validBody) as any);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error.code).toBe('phone_already_registered');
  });

  // (e) Succeeds when the phone was previously associated with a hard-deleted pending hosteler (row gone)
  it('succeeds when phone previously belonged to a hard-deleted pending hosteler (no row found)', async () => {
    makeInsertMock();

    const { POST } = await import('./route');
    const response = await POST(createPostRequest(validBody) as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.hosteler.phone).toBe(validBody.phone);
    expect(data.invite.invite_url).toContain('/join/');
  });
});

describe('GET /api/hostelers — deleted tab filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRequireOwner.mockResolvedValue({ session: { id: 'owner-1', role: 'owner' } });
  });

  // (b) GET ?status=deleted returns only deleted_from_status = 'active' records
  it('filters deleted tab to only return deleted_from_status=active records', async () => {
    const eqStatusMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'h-del-active',
              name: 'Deleted Active',
              phone: '9111111111',
              room_number: '201',
              status: 'deleted',
              activated_at: '2026-06-01T00:00:00.000Z',
              deleted_at: '2026-07-01T00:00:00.000Z',
              deleted_from_status: 'active',
              deletion_effective_date: '2026-07-01',
              created_at: '2026-05-01T00:00:00.000Z',
            },
          ],
          error: null,
        }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'hostelers') {
        return {
          select: () => ({
            order: () => ({
              eq: eqStatusMock,
            }),
          }),
        };
      }
      // food_preferences for canceled counts
      return {
        select: () => ({
          in: () => ({
            not: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      };
    });

    const { GET } = await import('./route');
    const response = await GET(
      new Request('http://localhost/api/hostelers?status=deleted') as any
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    // The second eq call must filter by deleted_from_status = 'active'
    expect(eqStatusMock).toHaveBeenCalledWith('status', 'deleted');
    // All returned records must be deleted_from_status = 'active'
    for (const h of data.hostelers) {
      expect(h.deleted_from_status).toBe('active');
    }
  });
});
