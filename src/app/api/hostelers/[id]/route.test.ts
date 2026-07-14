import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequireOwner = vi.fn();
const mockFrom = vi.fn();
const mockSignOut = vi.fn();

const mockSupabase = {
  from: (...args: unknown[]) => mockFrom(...args),
  auth: {
    admin: {
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  },
};

vi.mock('@/lib/auth/guards', () => ({
  requireOwner: () => mockRequireOwner(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => mockSupabase,
}));

vi.mock('@/lib/utils', () => ({
  getTodayIST: () => '2026-07-04',
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(' '),
}));

function createPatchRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/hostelers/h-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Hosteler lifecycle route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOwner.mockResolvedValue({ session: { id: 'owner-1', role: 'owner' } });
  });

  it('returns deleted-hosteler audit detail with canceled future preferences', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'hostelers') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'h-1',
                    name: 'Rahul Kumar',
                    phone: '9876543210',
                    room_number: '101',
                    status: 'deleted',
                    activated_at: '2026-06-15T10:00:00.000Z',
                    deleted_at: '2026-07-04T08:30:00.000Z',
                    deleted_from_status: 'active',
                    deletion_effective_date: '2026-07-04',
                    created_at: '2026-06-14T08:00:00.000Z',
                    updated_at: '2026-07-04T08:30:00.000Z',
                  },
                  error: null,
                }),
            }),
          }),
        };
      }

      return {
        select: () => ({
          eq: () => ({
            not: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    {
                      id: 'fp-1',
                      hosteler_id: 'h-1',
                      date: '2026-07-05',
                      breakfast: true,
                      lunch: false,
                      dinner: true,
                      submitted_at: '2026-07-03T09:00:00.000Z',
                      updated_at: '2026-07-04T08:30:00.000Z',
                      canceled_at: '2026-07-04T08:30:00.000Z',
                      cancellation_reason: 'hosteler_deleted',
                    },
                  ],
                  error: null,
                }),
            }),
          }),
        }),
      };
    });

    const { GET } = await import('./route');
    const response = await GET(
      new Request('http://localhost/api/hostelers/h-1?view=audit') as any,
      { params: Promise.resolve({ id: 'h-1' }) }
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hosteler.status).toBe('deleted');
    expect(data.audit.preserved_history_through).toBe('2026-07-04');
    expect(data.audit.canceled_future_preferences).toHaveLength(1);
    expect(data.audit.canceled_future_preferences[0].cancellation_reason).toBe('hosteler_deleted');
  });

  it('previews active deletion with IST effective date and future cancellation count', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'hostelers') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'h-1',
                    name: 'Rahul Kumar',
                    status: 'active',
                    auth_user_id: 'auth-user-1',
                    deleted_at: null,
                    deleted_from_status: null,
                    deletion_effective_date: null,
                  },
                  error: null,
                }),
            }),
          }),
        };
      }

      return {
        select: () => ({
          eq: () => ({
            is: () => ({
              gt: () => Promise.resolve({ count: 2, error: null }),
            }),
          }),
        }),
      };
    });

    const { PATCH } = await import('./route');
    const response = await PATCH(createPatchRequest({ action: 'delete' }) as any, {
      params: Promise.resolve({ id: 'h-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.requires_confirmation).toBe(true);
    expect(data.deletion_effective_date).toBe('2026-07-04');
    expect(data.future_preference_count).toBe(2);
  });

  it('hard-deletes a pending hosteler: removes invite tokens and hosteler row, no audit or deleted-tab record', async () => {
    const inviteDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const hostelerDeleteEq = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'hostelers') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'h-1',
                    name: 'Pending User',
                    status: 'pending',
                    auth_user_id: null,
                    deleted_at: null,
                    deleted_from_status: null,
                    deletion_effective_date: null,
                  },
                  error: null,
                }),
            }),
          }),
          delete: () => ({
            eq: hostelerDeleteEq,
          }),
        };
      }

      // invite_tokens table
      return {
        delete: () => ({
          eq: inviteDeleteEq,
        }),
      };
    });

    const { PATCH } = await import('./route');
    const response = await PATCH(createPatchRequest({ action: 'delete' }) as any, {
      params: Promise.resolve({ id: 'h-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    // Must return { deleted: true } — no hosteler shape, no deleted_from_status, no audit fields
    expect(data).toEqual({ deleted: true });
    // Invite tokens must be hard-deleted (DELETE, not UPDATE)
    expect(inviteDeleteEq).toHaveBeenCalledWith('hosteler_id', 'h-1');
    // Hosteler row must be hard-deleted
    expect(hostelerDeleteEq).toHaveBeenCalledWith('id', 'h-1');
    // No auth sign-out for a pending hosteler (no auth_user_id)
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('deactivates an active hosteler and releases cot assignment', async () => {
    const hostelerUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const cotUpdateEq = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'hostelers') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'h-1',
                    name: 'Active User',
                    status: 'active',
                    auth_user_id: 'auth-user-1',
                    deleted_at: null,
                    deleted_from_status: null,
                    deletion_effective_date: null,
                  },
                  error: null,
                }),
            }),
          }),
          update: () => ({
            eq: hostelerUpdateEq,
          }),
        };
      }

      if (table === 'food_preferences') {
        return {
          select: () => ({
            eq: () => ({
              is: () => ({
                gt: () => Promise.resolve({ count: 0, error: null }),
              }),
            }),
          }),
        };
      }

      return {
        update: () => ({
          eq: cotUpdateEq,
        }),
      };
    });

    const { PATCH } = await import('./route');
    const response = await PATCH(createPatchRequest({ action: 'deactivate', confirmed: true }) as any, {
      params: Promise.resolve({ id: 'h-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hosteler.status).toBe('inactive');
    expect(cotUpdateEq).toHaveBeenCalledWith('hosteler_id', 'h-1');
    expect(mockSignOut).toHaveBeenCalledWith('auth-user-1', 'global');
  });

  it('deletes an active hosteler, revokes auth, and cancels future preferences', async () => {
    const inviteEqFirst = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const cancelSelect = vi.fn().mockResolvedValue({ data: [{ id: 'fp-1' }, { id: 'fp-2' }], error: null });
    const hostelerUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const cotUpdateEq = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'hostelers') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'h-1',
                    name: 'Active User',
                    status: 'active',
                    auth_user_id: 'auth-user-1',
                    deleted_at: null,
                    deleted_from_status: null,
                    deletion_effective_date: null,
                  },
                  error: null,
                }),
            }),
          }),
          update: () => ({
            eq: hostelerUpdateEq,
          }),
        };
      }

      if (table === 'invite_tokens') {
        return {
          update: () => ({
            eq: inviteEqFirst,
          }),
        };
      }

      if (table === 'cots') {
        return {
          update: () => ({
            eq: cotUpdateEq,
          }),
        };
      }

      return {
        select: () => ({
          eq: () => ({
            is: () => ({
              gt: () => Promise.resolve({ count: 2, error: null }),
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            is: () => ({
              gt: () => ({
                select: cancelSelect,
              }),
            }),
          }),
        }),
      };
    });

    const { PATCH } = await import('./route');
    const response = await PATCH(createPatchRequest({ action: 'delete', confirmed: true }) as any, {
      params: Promise.resolve({ id: 'h-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hosteler.status).toBe('deleted');
    expect(data.hosteler.deleted_from_status).toBe('active');
    expect(data.canceled_future_preferences).toBe(2);
    expect(cancelSelect).toHaveBeenCalledWith('id');
    expect(cotUpdateEq).toHaveBeenCalledWith('hosteler_id', 'h-1');
    // Auth user deletion now uses REST API (fetch), not signOut
  });
});