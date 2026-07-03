import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/admin/dashboard',
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  getTomorrowDate: () => '2026-07-04',
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(' '),
}));

// Track subscription callbacks
let realtimeCallback: ((payload: unknown) => void) | null = null;
let subscribeCallback: ((status: string) => void) | null = null;

const mockChannel = {
  on: vi.fn().mockImplementation((_event, _opts, cb) => {
    realtimeCallback = cb;
    return mockChannel;
  }),
  subscribe: vi.fn().mockImplementation((cb) => {
    subscribeCallback = cb;
    if (cb) cb('SUBSCRIBED');
    return mockChannel;
  }),
};

const mockFrom = vi.fn();
const mockRemoveChannel = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    channel: () => mockChannel,
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner-1' } } }),
    },
  },
}));

// Mock data
const mockSettings = [{ key: 'deadline_time', value: '21:00' }];
const mockPrefs = [
  { hosteler_id: 'h-1', breakfast: true, lunch: true, dinner: false },
  { hosteler_id: 'h-2', breakfast: true, lunch: false, dinner: true },
];
const mockHostelers = [
  { id: 'h-1', name: 'Alice', room_number: '101' },
  { id: 'h-2', name: 'Bob', room_number: '102' },
  { id: 'h-3', name: 'Charlie', room_number: '103' },
];

function setupMockFrom() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'settings') {
      return {
        select: () => ({
          in: () => Promise.resolve({ data: mockSettings, error: null }),
        }),
      };
    }
    if (table === 'food_preferences') {
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: mockPrefs, error: null }),
        }),
      };
    }
    if (table === 'hostelers') {
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: mockHostelers, error: null }),
        }),
      };
    }
    return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
  });
}

describe('Owner Dashboard - Food Counts Aggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    realtimeCallback = null;
    subscribeCallback = null;
    setupMockFrom();
  });

  it('should correctly aggregate meal counts from preferences', async () => {
    const OwnerDashboardPage = (await import('./page')).default;
    render(<OwnerDashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard…')).not.toBeInTheDocument();
    });

    // breakfast: h-1=true, h-2=true → 2
    expect(screen.getByText('2')).toBeInTheDocument();
    // lunch: h-1=true, h-2=false → 1; dinner: h-1=false, h-2=true → 1
    const ones = screen.getAllByText('1');
    expect(ones.length).toBe(2);
  });

  it('should split hostelers into submitted and pending lists', async () => {
    const OwnerDashboardPage = (await import('./page')).default;
    render(<OwnerDashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard…')).not.toBeInTheDocument();
    });

    // h-1 and h-2 submitted, h-3 pending
    expect(screen.getByText('Pending (1)')).toBeInTheDocument();
    expect(screen.getByText('Submitted (2)')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('should show zero counts when no preferences exist', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'settings') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: mockSettings, error: null }),
          }),
        };
      }
      if (table === 'food_preferences') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }
      if (table === 'hostelers') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: mockHostelers, error: null }),
          }),
        };
      }
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    });

    const OwnerDashboardPage = (await import('./page')).default;
    render(<OwnerDashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard…')).not.toBeInTheDocument();
    });

    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBe(3);
    expect(screen.getByText('Pending (3)')).toBeInTheDocument();
  });
});

describe('Owner Dashboard - Realtime Reconnection Banner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    realtimeCallback = null;
    subscribeCallback = null;
    setupMockFrom();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not show disconnection banner when subscribed', async () => {
    const OwnerDashboardPage = (await import('./page')).default;

    await act(async () => {
      render(<OwnerDashboardPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard…')).not.toBeInTheDocument();
    });

    expect(screen.queryByText(/Live updates paused/)).not.toBeInTheDocument();
  });

  it('should show disconnection banner after 10s of channel error', async () => {
    const OwnerDashboardPage = (await import('./page')).default;

    await act(async () => {
      render(<OwnerDashboardPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard…')).not.toBeInTheDocument();
    });

    // Simulate channel error
    act(() => {
      if (subscribeCallback) subscribeCallback('CHANNEL_ERROR');
    });

    // Banner should NOT show before 10s
    expect(screen.queryByText(/Live updates paused/)).not.toBeInTheDocument();

    // Advance 10s
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getByText(/Live updates paused — reconnecting…/)).toBeInTheDocument();
  });

  it('should hide banner when reconnected', async () => {
    const OwnerDashboardPage = (await import('./page')).default;

    await act(async () => {
      render(<OwnerDashboardPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard…')).not.toBeInTheDocument();
    });

    // Simulate disconnect
    act(() => {
      if (subscribeCallback) subscribeCallback('CHANNEL_ERROR');
    });
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getByText(/Live updates paused/)).toBeInTheDocument();

    // Simulate reconnection
    act(() => {
      if (subscribeCallback) subscribeCallback('SUBSCRIBED');
    });

    expect(screen.queryByText(/Live updates paused/)).not.toBeInTheDocument();
  });

  it('should refetch data when realtime event fires', async () => {
    const OwnerDashboardPage = (await import('./page')).default;

    await act(async () => {
      render(<OwnerDashboardPage />);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard…')).not.toBeInTheDocument();
    });

    // Clear to track new calls
    mockFrom.mockClear();
    setupMockFrom();

    // Simulate a realtime event
    await act(async () => {
      if (realtimeCallback) realtimeCallback({ eventType: 'INSERT' });
    });

    // Should have re-fetched data
    expect(mockFrom).toHaveBeenCalled();
  });
});
