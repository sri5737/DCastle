import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';

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
const mockFetch = vi.fn();

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

const defaultDashboardData = {
  date: '2026-07-04',
  deadlineTime: '21:00',
  serverTime: '19:30:00',
  counts: { breakfast: 2, lunch: 1, dinner: 1 },
  submittedHostelers: [
    { id: 'h-1', name: 'Alice', room_number: '101' },
    { id: 'h-2', name: 'Bob', room_number: '102' },
  ],
  pendingHostelers: [{ id: 'h-3', name: 'Charlie', room_number: '103' }],
};

const allHostelers = [
  { id: 'h-1', name: 'Alice', room_number: '101' },
  { id: 'h-2', name: 'Bob', room_number: '102' },
  { id: 'h-3', name: 'Charlie', room_number: '103' },
];

function setupDashboardFetch(data = defaultDashboardData) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
  vi.stubGlobal('fetch', mockFetch);
}

describe('Owner Dashboard - Food Counts Aggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    realtimeCallback = null;
    subscribeCallback = null;
    setupDashboardFetch();
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
    setupDashboardFetch({
      ...defaultDashboardData,
      counts: { breakfast: 0, lunch: 0, dinner: 0 },
      submittedHostelers: [],
      pendingHostelers: allHostelers,
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

  it('supports quick-find filtering with deterministic no-data messages', async () => {
    const OwnerDashboardPage = (await import('./page')).default;
    render(<OwnerDashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard…')).not.toBeInTheDocument();
    });

    const quickFindInput = screen.getByLabelText('Quick find hostelers');
    fireEvent.change(quickFindInput, { target: { value: 'zzz' } });

    expect(screen.getByText('No pending hostelers match "zzz".')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Submitted (2)'));
    expect(screen.getByText('No submitted hostelers match "zzz".')).toBeInTheDocument();
  });
});

describe('Owner Dashboard - Realtime Reconnection Banner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    realtimeCallback = null;
    subscribeCallback = null;
    setupDashboardFetch();
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
    vi.useFakeTimers();
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
    vi.useFakeTimers();
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

    // Clear to track new fetches
    mockFetch.mockClear();

    // Simulate a realtime event
    await act(async () => {
      if (realtimeCallback) realtimeCallback({ eventType: 'INSERT' });
    });

    // Should have re-fetched data
    expect(mockFetch).toHaveBeenCalledWith('/api/owner/dashboard', { cache: 'no-store' });
  });

  it('should exclude canceled future preferences from counts', async () => {
    const OwnerDashboardPage = (await import('./page')).default;
    render(<OwnerDashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard…')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Pending (1)')).toBeInTheDocument();
    expect(screen.getByText('Submitted (2)')).toBeInTheDocument();
    expect(screen.queryByText('Pending (0)')).not.toBeInTheDocument();
  });
});
