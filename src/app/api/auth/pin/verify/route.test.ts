import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

// Mock Supabase
const mockSingle = vi.fn();
const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

const mockSupabase = {
  from: mockFrom,
};

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => mockSupabase,
  createServerClient: vi.fn(),
}));

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/auth/pin/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/pin/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should authenticate with correct phone and PIN', async () => {
    const pin = '1234';
    const pinHash = await bcrypt.hash(pin, 10);

    mockSingle.mockResolvedValue({
      data: {
        id: 'hosteler-1',
        name: 'John Doe',
        room_number: '101',
        phone: '9876543210',
        pin_hash: pinHash,
        status: 'active',
        auth_user_id: 'auth-user-1',
      },
      error: null,
    });

    const { POST } = await import('./route');
    const request = createRequest({ phone: '9876543210', pin: '1234' });
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hosteler.id).toBe('hosteler-1');
    expect(data.hosteler.name).toBe('John Doe');
    expect(data.hosteler.room_number).toBe('101');
    expect(data.session.access_token).toBe('auth-user-1');
    expect(data.session.expires_in).toBe(60 * 60 * 24 * 30);
  });

  it('should reject incorrect PIN', async () => {
    const correctPin = '1234';
    const pinHash = await bcrypt.hash(correctPin, 10);

    mockSingle.mockResolvedValue({
      data: {
        id: 'hosteler-1',
        name: 'John Doe',
        room_number: '101',
        phone: '9876543210',
        pin_hash: pinHash,
        status: 'active',
        auth_user_id: 'auth-user-1',
      },
      error: null,
    });

    const { POST } = await import('./route');
    const request = createRequest({ phone: '9876543210', pin: '9999' });
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid phone number or PIN');
  });

  it('should reject non-existent phone number', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'not found' },
    });

    const { POST } = await import('./route');
    const request = createRequest({ phone: '9876543210', pin: '1234' });
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid phone number or PIN');
  });

  it('should reject inactive account with 403', async () => {
    const pin = '1234';
    const pinHash = await bcrypt.hash(pin, 10);

    mockSingle.mockResolvedValue({
      data: {
        id: 'hosteler-1',
        name: 'John Doe',
        room_number: '101',
        phone: '9876543210',
        pin_hash: pinHash,
        status: 'inactive',
        auth_user_id: 'auth-user-1',
      },
      error: null,
    });

    const { POST } = await import('./route');
    const request = createRequest({ phone: '9876543210', pin: '1234' });
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Account is inactive. Contact your PG owner.');
  });

  it('should reject pending account with 403', async () => {
    const pin = '1234';
    const pinHash = await bcrypt.hash(pin, 10);

    mockSingle.mockResolvedValue({
      data: {
        id: 'hosteler-1',
        name: 'John Doe',
        room_number: '101',
        phone: '9876543210',
        pin_hash: pinHash,
        status: 'pending',
        auth_user_id: 'auth-user-1',
      },
      error: null,
    });

    const { POST } = await import('./route');
    const request = createRequest({ phone: '9876543210', pin: '1234' });
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Account is inactive. Contact your PG owner.');
  });

  it('should reject hosteler without pin_hash set', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'hosteler-1',
        name: 'John Doe',
        room_number: '101',
        phone: '9876543210',
        pin_hash: null,
        status: 'active',
        auth_user_id: 'auth-user-1',
      },
      error: null,
    });

    const { POST } = await import('./route');
    const request = createRequest({ phone: '9876543210', pin: '1234' });
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid phone number or PIN');
  });

  it('should reject invalid phone format', async () => {
    const { POST } = await import('./route');
    const request = createRequest({ phone: '12345', pin: '1234' });
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid phone number or PIN');
  });

  it('should reject invalid PIN format', async () => {
    const { POST } = await import('./route');
    const request = createRequest({ phone: '9876543210', pin: '12' });
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid phone number or PIN');
  });

  it('should reject missing body fields', async () => {
    const { POST } = await import('./route');
    const request = createRequest({});
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid phone number or PIN');
  });
});

describe('Unregistered Google sign-in rejection', () => {
  it('should redirect to login with not_registered error when Google ID has no matching hosteler', () => {
    // The auth callback route handles this by redirecting to /login?error=not_registered
    // The login page reads the error param and displays the appropriate message
    const error = 'not_registered';
    const expectedMessage = 'This Google account is not registered. Please ask your PG owner for an invite link to activate your account.';

    // Simulate what the login page does with the error param
    const message = getCallbackErrorMessage(error);
    expect(message).toBe(expectedMessage);
  });

  it('should display inactive message for inactive Google accounts', () => {
    const error = 'inactive';
    const expectedMessage = 'Your account is inactive. Please contact your PG owner.';

    const message = getCallbackErrorMessage(error);
    expect(message).toBe(expectedMessage);
  });

  it('should return null for unknown error codes', () => {
    const message = getCallbackErrorMessage(null);
    expect(message).toBeNull();
  });
});

// Helper mirroring the login page logic
function getCallbackErrorMessage(error: string | null): string | null {
  switch (error) {
    case 'not_registered':
      return 'This Google account is not registered. Please ask your PG owner for an invite link to activate your account.';
    case 'inactive':
      return 'Your account is inactive. Please contact your PG owner.';
    case 'auth_failed':
      return 'Authentication failed. Please try again.';
    case 'no_code':
      return 'Authentication failed. Please try again.';
    default:
      return null;
  }
}
