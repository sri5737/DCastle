import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase
const mockSingle = vi.fn();
const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
const mockUpsert = vi.fn().mockReturnValue({ select: () => ({ single: mockSingle }) });
const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
const mockEq = vi.fn().mockReturnValue({ eq: mockEq2 });
const mockFromSelect = vi.fn().mockReturnValue({ eq: mockEq });

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === 'food_preferences') {
      return { upsert: mockUpsert, select: mockFromSelect };
    }
    if (table === 'settings') {
      return { select: () => ({ eq: () => ({ single: mockSingle }) }) };
    }
    // hostelers
    return { select: mockSelect };
  }),
};

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => mockSupabase,
  createServerClient: vi.fn(),
}));

// Mock auth guards
const mockRequireHosteler = vi.fn();
vi.mock('@/lib/auth/guards', () => ({
  requireHosteler: () => mockRequireHosteler(),
}));

// Mock deadline functions
const mockIsPastDeadline = vi.fn();
const mockGetCurrentISTTime = vi.fn();
vi.mock('@/lib/deadline', () => ({
  isPastDeadline: (...args: unknown[]) => mockIsPastDeadline(...args),
  getCurrentISTTime: () => mockGetCurrentISTTime(),
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  getTomorrowDate: () => '2026-07-04',
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(' '),
}));

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/food/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/food/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject unauthenticated requests', async () => {
    const { NextResponse } = await import('next/server');
    mockRequireHosteler.mockResolvedValue({
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });

    const { POST } = await import('./route');
    const request = createRequest({ breakfast: true, lunch: false, dinner: true });
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should reject inactive hostelers', async () => {
    mockRequireHosteler.mockResolvedValue({
      session: { id: 'user-1', role: 'hosteler', hosteler_id: 'h-1' },
    });

    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'hostelers') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: 'h-1', status: 'inactive' },
                  error: null,
                }),
            }),
          }),
        };
      }
      return { select: mockFromSelect };
    });

    const { POST } = await import('./route');
    const request = createRequest({ breakfast: true, lunch: false, dinner: true });
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Account is inactive');
  });

  it('should reject submissions after deadline', async () => {
    mockRequireHosteler.mockResolvedValue({
      session: { id: 'user-1', role: 'hosteler', hosteler_id: 'h-1' },
    });

    mockIsPastDeadline.mockReturnValue(true);
    mockGetCurrentISTTime.mockReturnValue('21:05');

    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'hostelers') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: 'h-1', status: 'active' },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'settings') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { value: '21:00' }, error: null }),
            }),
          }),
        };
      }
      return { select: mockFromSelect };
    });

    const { POST } = await import('./route');
    const request = createRequest({ breakfast: true, lunch: false, dinner: true });
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Submissions are closed for tomorrow');
    expect(data.deadline).toBe('21:00');
    expect(data.server_time).toBe('21:05');
  });

  it('should successfully upsert food preferences', async () => {
    mockRequireHosteler.mockResolvedValue({
      session: { id: 'user-1', role: 'hosteler', hosteler_id: 'h-1' },
    });

    mockIsPastDeadline.mockReturnValue(false);

    const mockUpsertResult = {
      data: {
        date: '2026-07-04',
        breakfast: true,
        lunch: false,
        dinner: true,
        submitted_at: '2026-07-03T15:00:00.000Z',
        updated_at: '2026-07-03T15:00:00.000Z',
      },
      error: null,
    };

    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'hostelers') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: 'h-1', status: 'active' },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'settings') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { value: '21:00' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'food_preferences') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
          upsert: () => ({
            select: () => ({
              single: () => Promise.resolve(mockUpsertResult),
            }),
          }),
        };
      }
      return { select: mockFromSelect };
    });

    const { POST } = await import('./route');
    const request = createRequest({ breakfast: true, lunch: false, dinner: true });
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.date).toBe('2026-07-04');
    expect(data.breakfast).toBe(true);
    expect(data.lunch).toBe(false);
    expect(data.dinner).toBe(true);
  });

  it('should reject invalid body (non-boolean values)', async () => {
    mockRequireHosteler.mockResolvedValue({
      session: { id: 'user-1', role: 'hosteler', hosteler_id: 'h-1' },
    });

    mockIsPastDeadline.mockReturnValue(false);

    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'hostelers') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { id: 'h-1', status: 'active' },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'settings') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({ data: { value: '21:00' }, error: null }),
            }),
          }),
        };
      }
      return { select: mockFromSelect };
    });

    const { POST } = await import('./route');
    const request = createRequest({ breakfast: 'yes', lunch: false, dinner: true });
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('breakfast, lunch, and dinner must be booleans');
  });
});
