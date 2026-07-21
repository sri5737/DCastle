import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RoomRentConfigDisplay } from '../room-rent-config-display';

// Mock getTodayIST so tests are deterministic
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    getTodayIST: () => '2026-07-15',
  };
});

const MOCK_CHANGES = [
  {
    id: '1',
    owner_id: 'owner-1',
    room_class: 'ac',
    sharing_capacity: 2,
    new_rent: 5000,
    effective_date: '2026-07-01',
    created_at: '2026-07-01T00:00:00Z',
  },
  {
    id: '2',
    owner_id: 'owner-1',
    room_class: 'non_ac',
    sharing_capacity: 3,
    new_rent: 3000,
    effective_date: '2026-06-01',
    created_at: '2026-06-01T00:00:00Z',
  },
];

function mockFetch(response: object, ok = true) {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok,
    json: async () => response,
  } as Response);
}

describe('RoomRentConfigDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    global.fetch = vi.fn().mockReturnValueOnce(new Promise(() => {}));
    render(<RoomRentConfigDisplay />);
    expect(screen.getByText(/Loading room rent configuration/)).toBeInTheDocument();
  });

  it('renders card title', async () => {
    mockFetch({ changes: MOCK_CHANGES });
    render(<RoomRentConfigDisplay />);
    await waitFor(() => {
      expect(screen.getByText('Current Room Rent Configuration')).toBeInTheDocument();
    });
  });

  it('shows view-only badge', async () => {
    mockFetch({ changes: MOCK_CHANGES });
    render(<RoomRentConfigDisplay />);
    await waitFor(() => {
      expect(screen.getByText('View only')).toBeInTheDocument();
    });
  });

  it('displays active configurations after fetching', async () => {
    mockFetch({ changes: MOCK_CHANGES });
    render(<RoomRentConfigDisplay />);
    await waitFor(() => {
      const content = document.body.textContent ?? '';
      expect(content).toContain('AC');
      expect(content).toContain('Non-AC');
    });
  });

  it('shows empty state when no active configs found', async () => {
    mockFetch({ changes: [] });
    render(<RoomRentConfigDisplay />);
    await waitFor(() => {
      expect(screen.getByText(/No active room rent configuration found/)).toBeInTheDocument();
    });
  });

  it('shows error state when fetch fails', async () => {
    mockFetch({}, false);
    render(<RoomRentConfigDisplay />);
    await waitFor(() => {
      expect(screen.getByText(/Could not load room rent configuration/)).toBeInTheDocument();
    });
  });

  it('shows error state on network error', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
    render(<RoomRentConfigDisplay />);
    await waitFor(() => {
      expect(screen.getByText(/Network error loading room rent configuration/)).toBeInTheDocument();
    });
  });

  it('excludes future-dated entries', async () => {
    const futureChanges = [
      {
        id: '3',
        owner_id: 'owner-1',
        room_class: 'ac',
        sharing_capacity: 2,
        new_rent: 9999,
        effective_date: '2027-01-01', // future
        created_at: '2026-07-01T00:00:00Z',
      },
    ];
    mockFetch({ changes: futureChanges });
    render(<RoomRentConfigDisplay />);
    await waitFor(() => {
      expect(screen.getByText(/No active room rent configuration found/)).toBeInTheDocument();
    });
  });

  it('fetches from correct endpoint', async () => {
    mockFetch({ changes: MOCK_CHANGES });
    render(<RoomRentConfigDisplay />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/room-rent-config');
    });
  });

  it('picks most recent active entry when multiple entries exist for same pair', async () => {
    const changes = [
      {
        id: '1',
        owner_id: 'owner-1',
        room_class: 'ac',
        sharing_capacity: 2,
        new_rent: 4000,
        effective_date: '2026-01-01',
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: '2',
        owner_id: 'owner-1',
        room_class: 'ac',
        sharing_capacity: 2,
        new_rent: 5500,
        effective_date: '2026-07-01',
        created_at: '2026-07-01T00:00:00Z',
      },
    ];
    mockFetch({ changes });
    render(<RoomRentConfigDisplay />);
    await waitFor(() => {
      const content = document.body.textContent ?? '';
      expect(content).toContain('5,500'); // 5500 formatted
      expect(content).not.toContain('4,000');
    });
  });
});
