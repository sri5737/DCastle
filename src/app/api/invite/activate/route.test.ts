import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

// Mock Supabase
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
  from: mockFrom,
  auth: {
    admin: {
      createUser: vi.fn(),
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

// Utility to setup chain mocks
function setupQueryChain(returnData: unknown, returnError: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnData, error: returnError }),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: returnData, error: returnError }),
  };
  return chain;
}

describe('Invite Token Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject an expired token', async () => {
    const expiredToken = {
      id: 'token-1',
      hosteler_id: 'hosteler-1',
      used: false,
      expires_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    };

    const tokenChain = setupQueryChain(expiredToken);
    mockFrom.mockReturnValue(tokenChain);

    // Import after mocks
    const { POST } = await import('@/app/api/invite/activate/route');

    const request = new Request('http://localhost/api/invite/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'expired-token', method: 'pin', pin: '1234' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid or expired invite token');
  });

  it('should reject a used token', async () => {
    const usedToken = {
      id: 'token-1',
      hosteler_id: 'hosteler-1',
      used: true,
      expires_at: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
    };

    const tokenChain = setupQueryChain(usedToken);
    mockFrom.mockReturnValue(tokenChain);

    const { POST } = await import('@/app/api/invite/activate/route');

    const request = new Request('http://localhost/api/invite/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'used-token', method: 'pin', pin: '1234' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('Token already used');
  });

  it('should reject a non-existent token', async () => {
    const tokenChain = setupQueryChain(null, { code: 'PGRST116', message: 'not found' });
    mockFrom.mockReturnValue(tokenChain);

    const { POST } = await import('@/app/api/invite/activate/route');

    const request = new Request('http://localhost/api/invite/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'nonexistent', method: 'pin', pin: '1234' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid or expired invite token');
  });
});

describe('PIN Hashing', () => {
  it('should hash a 4-digit PIN with bcryptjs', async () => {
    const pin = '1234';
    const hash = await bcrypt.hash(pin, 10);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(pin);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
  });

  it('should verify correct PIN against hash', async () => {
    const pin = '5678';
    const hash = await bcrypt.hash(pin, 10);

    const isMatch = await bcrypt.compare(pin, hash);
    expect(isMatch).toBe(true);
  });

  it('should reject incorrect PIN against hash', async () => {
    const pin = '5678';
    const wrongPin = '9999';
    const hash = await bcrypt.hash(pin, 10);

    const isMatch = await bcrypt.compare(wrongPin, hash);
    expect(isMatch).toBe(false);
  });

  it('should reject non-4-digit PINs', () => {
    const pinRegex = /^\d{4}$/;
    expect(pinRegex.test('123')).toBe(false);
    expect(pinRegex.test('12345')).toBe(false);
    expect(pinRegex.test('abcd')).toBe(false);
    expect(pinRegex.test('12a4')).toBe(false);
    expect(pinRegex.test('1234')).toBe(true);
    expect(pinRegex.test('0000')).toBe(true);
  });
});

describe('Google OAuth Account Linking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require google_access_token for google method', async () => {
    const validToken = {
      id: 'token-1',
      hosteler_id: 'hosteler-1',
      used: false,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    };

    const tokenChain = setupQueryChain(validToken);
    const hostelerChain = setupQueryChain({ id: 'hosteler-1', name: 'Test', room_number: '101', phone: '9876543210' });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? tokenChain : hostelerChain;
    });

    const { POST } = await import('@/app/api/invite/activate/route');

    const request = new Request('http://localhost/api/invite/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'valid-token', method: 'google' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Google access token is required');
  });

  it('should reject invalid method', async () => {
    const { POST } = await import('@/app/api/invite/activate/route');

    const request = new Request('http://localhost/api/invite/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'valid-token', method: 'invalid' }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Method must be "google" or "pin"');
  });
});
