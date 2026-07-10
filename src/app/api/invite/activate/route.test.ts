import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';

const mockFrom = vi.fn();
const mockCreateUser = vi.fn();
const mockUpdateUserById = vi.fn();

const mockSupabase = {
  from: mockFrom,
  auth: {
    admin: {
      createUser: mockCreateUser,
      updateUserById: mockUpdateUserById,
      generateLink: vi.fn(),
    },
    exchangeCodeForSession: vi.fn(),
  },
};

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => mockSupabase,
  createServerClient: vi.fn(),
}));

vi.mock('@/lib/auth/guards', () => ({
  requireOwner: vi.fn().mockResolvedValue({ session: { id: 'owner-1', role: 'owner' } }),
}));

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/invite/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function selectChain(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
}

function updateChain(error: unknown = null) {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    error,
  };
}

function queueSupabaseChains(...chains: unknown[]) {
  const queue = [...chains];
  mockFrom.mockImplementation(() => {
    const next = queue.shift();
    if (!next) throw new Error('Unexpected Supabase query');
    return next;
  });
}

function validToken(overrides: Record<string, unknown> = {}) {
  return {
    id: 'token-1',
    hosteler_id: 'hosteler-1',
    used: false,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function hosteler(overrides: Record<string, unknown> = {}) {
  return {
    id: 'hosteler-1',
    name: 'John Doe',
    room_number: '101',
    phone: '9876543210',
    status: 'pending',
    pin_hash: null,
    google_id: null,
    auth_user_id: null,
    ...overrides,
  };
}

describe('POST /api/invite/activate token errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockCreateUser.mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null });
    mockUpdateUserById.mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null });
  });

  it('returns 410/invite_expired for an expired token', async () => {
    queueSupabaseChains(
      selectChain(validToken({ expires_at: new Date(Date.now() - 86400000).toISOString() })),
      selectChain({ id: 'token-1', created_at: new Date().toISOString() }),
    );

    const { POST } = await import('@/app/api/invite/activate/route');
    const response = await POST(createRequest({ token: 'expired-token', method: 'pin', pin: '1234' }) as any);
    const data = await response.json();

    expect(response.status).toBe(410);
    expect(data.error).toMatchObject({
      code: 'invite_expired',
      message: 'This invite link has expired.',
      recovery_action: 'contact_owner',
    });
  });

  it('returns 409/invite_used for an already used token', async () => {
    queueSupabaseChains(
      selectChain(validToken({ used: true })),
      selectChain({ id: 'token-1', created_at: new Date().toISOString() }),
    );

    const { POST } = await import('@/app/api/invite/activate/route');
    const response = await POST(createRequest({ token: 'used-token', method: 'pin', pin: '1234' }) as any);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toMatchObject({
      code: 'invite_used',
      message: 'This invite link has already been used.',
      recovery_action: 'contact_owner',
    });
  });

  it('returns 409/invite_superseded for an older unused token', async () => {
    queueSupabaseChains(
      selectChain(validToken({ id: 'older-token' })),
      selectChain({ id: 'newer-token', created_at: new Date().toISOString() }),
    );

    const { POST } = await import('@/app/api/invite/activate/route');
    const response = await POST(createRequest({ token: 'older-token', method: 'pin', pin: '1234' }) as any);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toMatchObject({
      code: 'invite_superseded',
      message: 'This invite link has been replaced by a newer one.',
      recovery_action: 'open_latest_invite_link',
    });
  });

  it('returns structured invalid_request for invalid method', async () => {
    const { POST } = await import('@/app/api/invite/activate/route');
    const response = await POST(createRequest({ token: 'valid-token', method: 'invalid' }) as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatchObject({
      code: 'invalid_request',
      message: 'Method must be "google" or "pin"',
      recovery_action: 'submit_valid_method',
    });
  });
});

describe('POST /api/invite/activate owner-assisted reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockCreateUser.mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null });
    mockUpdateUserById.mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null });
  });

  it('resets an active PIN-linked hosteler PIN and consumes the token', async () => {
    const oldPinHash = bcrypt.hashSync('1234', 10);
    const tokenUse = updateChain();
    const hostelerUpdate = updateChain();

    queueSupabaseChains(
      selectChain(validToken()),
      selectChain({ id: 'token-1', created_at: new Date().toISOString() }),
      selectChain(hosteler({ status: 'active', pin_hash: oldPinHash, auth_user_id: 'auth-user-1' })),
      tokenUse,
      hostelerUpdate,
    );

    const { POST } = await import('@/app/api/invite/activate/route');
    const response = await POST(createRequest({ token: 'reset-token', method: 'pin', pin: '5678' }) as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.flow).toBe('reset');
    expect(tokenUse.update).toHaveBeenCalledWith({ used: true });
    expect(hostelerUpdate.update).toHaveBeenCalledWith({ pin_hash: expect.any(String) });
    const [{ pin_hash: newPinHash }] = hostelerUpdate.update.mock.calls[0];
    expect(bcrypt.compareSync('5678', newPinHash)).toBe(true);
    expect(bcrypt.compareSync('1234', newPinHash)).toBe(false);
    expect(mockUpdateUserById).toHaveBeenCalledWith('auth-user-1', {
      password: 'pin:9876543210:5678',
    });
  });

  it('returns google_linked for an active Google-linked hosteler without a PIN', async () => {
    queueSupabaseChains(
      selectChain(validToken()),
      selectChain({ id: 'token-1', created_at: new Date().toISOString() }),
      selectChain(hosteler({ status: 'active', pin_hash: null, google_id: 'google-sub-1' })),
    );

    const { POST } = await import('@/app/api/invite/activate/route');
    const response = await POST(createRequest({ token: 'reset-token', method: 'pin', pin: '5678' }) as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      flow: 'google_linked',
      message: 'This account is linked to Google sign-in. Continue with your linked Google account.',
    });
    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });

  it('returns 403/reset_not_allowed_non_active for non-active reset submission', async () => {
    queueSupabaseChains(
      selectChain(validToken()),
      selectChain({ id: 'token-1', created_at: new Date().toISOString() }),
      selectChain(hosteler({ status: 'inactive', pin_hash: bcrypt.hashSync('1234', 10) })),
    );

    const { POST } = await import('@/app/api/invite/activate/route');
    const response = await POST(createRequest({ token: 'reset-token', method: 'pin', pin: '5678' }) as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toMatchObject({
      code: 'reset_not_allowed_non_active',
      recovery_action: 'contact_owner',
    });
  });

  it('rolls back token usage when PIN hash update fails', async () => {
    const oldPinHash = bcrypt.hashSync('1234', 10);
    const tokenUse = updateChain();
    const hostelerUpdateFailure = updateChain({ message: 'database write failed' });
    const tokenRollback = updateChain();

    queueSupabaseChains(
      selectChain(validToken()),
      selectChain({ id: 'token-1', created_at: new Date().toISOString() }),
      selectChain(hosteler({ status: 'active', pin_hash: oldPinHash, auth_user_id: 'auth-user-1' })),
      tokenUse,
      hostelerUpdateFailure,
      tokenRollback,
    );

    const { POST } = await import('@/app/api/invite/activate/route');
    const response = await POST(createRequest({ token: 'reset-token', method: 'pin', pin: '5678' }) as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toMatchObject({ code: 'reset_failed' });
    expect(tokenRollback.update).toHaveBeenCalledWith({ used: false });
    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });

  it('rolls back hosteler PIN and token usage when auth password update fails', async () => {
    const oldPinHash = bcrypt.hashSync('1234', 10);
    const tokenUse = updateChain();
    const hostelerUpdate = updateChain();
    const hostelerRollback = updateChain();
    const tokenRollback = updateChain();
    mockUpdateUserById.mockResolvedValue({ data: null, error: { message: 'auth update failed' } });

    queueSupabaseChains(
      selectChain(validToken()),
      selectChain({ id: 'token-1', created_at: new Date().toISOString() }),
      selectChain(hosteler({ status: 'active', pin_hash: oldPinHash, auth_user_id: 'auth-user-1' })),
      tokenUse,
      hostelerUpdate,
      hostelerRollback,
      tokenRollback,
    );

    const { POST } = await import('@/app/api/invite/activate/route');
    const response = await POST(createRequest({ token: 'reset-token', method: 'pin', pin: '5678' }) as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toMatchObject({
      code: 'reset_failed',
      recovery_action: 'try_again_or_contact_owner',
    });
    expect(hostelerRollback.update).toHaveBeenCalledWith({ pin_hash: oldPinHash });
    expect(tokenRollback.update).toHaveBeenCalledWith({ used: false });
  });
});

describe('PIN hashing', () => {
  it('hashes and verifies 4-digit PINs with bcryptjs', () => {
    const hash = bcrypt.hashSync('1234', 10);

    expect(hash).not.toBe('1234');
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
    expect(bcrypt.compareSync('1234', hash)).toBe(true);
    expect(bcrypt.compareSync('9999', hash)).toBe(false);
  });
});
