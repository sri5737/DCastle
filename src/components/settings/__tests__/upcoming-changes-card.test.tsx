import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UpcomingChangesCard } from '../upcoming-changes-card';

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    getTodayIST: () => '2026-07-15',
    formatDateIST: (date: string) => date,
  };
});

function setupFetch(
  mealChanges: unknown[],
  roomChanges: unknown[],
  deleteOk = true
) {
  global.fetch = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ changes: mealChanges }),
    } as Response)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ changes: roomChanges }),
    } as Response)
    .mockResolvedValue({
      ok: deleteOk,
      json: async () => ({ canceled: true }),
    } as Response);
}

describe('UpcomingChangesCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upcoming section title and empty state', async () => {
    setupFetch([], []);
    render(<UpcomingChangesCard />);

    await waitFor(() => {
      expect(screen.getByText('Upcoming Scheduled Changes')).toBeInTheDocument();
      expect(screen.getByText('No upcoming changes scheduled')).toBeInTheDocument();
    });
  });

  it('renders meal and room changes sorted by effective date', async () => {
    setupFetch(
      [
        {
          id: 'meal-late',
          meal_type: 'breakfast',
          old_rate: 30,
          new_rate: 36,
          effective_date: '2026-07-25',
          canceled_at: null,
        },
      ],
      [
        {
          id: 'room-early',
          room_class: 'ac',
          sharing_capacity: 2,
          old_rent: 5000,
          new_rent: 5500,
          effective_date: '2026-07-20',
          canceled_at: null,
        },
      ]
    );

    const { container } = render(<UpcomingChangesCard />);

    await waitFor(() => {
      expect(screen.getByText(/Meal - Breakfast/)).toBeInTheDocument();
      expect(screen.getByText(/Room Rent - AC/)).toBeInTheDocument();
    });

    const headers = Array.from(container.querySelectorAll('p.text-sm.font-medium')).map((el) => el.textContent || '');
    expect(headers[0]).toContain('Room Rent - AC');
    expect(headers[1]).toContain('Meal - Breakfast');
  });

  it('applies warning styling for changes within 7 days', async () => {
    setupFetch(
      [
        {
          id: 'meal-warning',
          meal_type: 'dinner',
          old_rate: 40,
          new_rate: 45,
          effective_date: '2026-07-20',
          canceled_at: null,
        },
      ],
      []
    );

    render(<UpcomingChangesCard />);

    await waitFor(() => {
      expect(screen.getByText('Effective: 2026-07-20 (within 7 days)')).toBeInTheDocument();
    });
  });

  it('shows confirmation dialog and removes item immediately after successful cancel', async () => {
    setupFetch(
      [
        {
          id: 'meal-cancel',
          meal_type: 'lunch',
          old_rate: 50,
          new_rate: 55,
          effective_date: '2026-07-22',
          canceled_at: null,
        },
      ],
      []
    );

    render(<UpcomingChangesCard />);

    await waitFor(() => {
      expect(screen.getByText('Meal - Lunch')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Cancel this change?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancel' }));

    await waitFor(() => {
      expect(screen.queryByText('Meal - Lunch')).not.toBeInTheDocument();
      expect(screen.getByText('No upcoming changes scheduled')).toBeInTheDocument();
    });
  });

  it('shows error toast when cancel fails', async () => {
    setupFetch(
      [
        {
          id: 'meal-fail',
          meal_type: 'breakfast',
          old_rate: 30,
          new_rate: 32,
          effective_date: '2026-07-23',
          canceled_at: null,
        },
      ],
      [],
      false
    );

    render(<UpcomingChangesCard />);

    await waitFor(() => {
      expect(screen.getByText('Meal - Breakfast')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancel' }));

    await waitFor(() => {
      expect(screen.getByText('Failed to cancel change. Please try again.')).toBeInTheDocument();
      expect(screen.getByText('Meal - Breakfast')).toBeInTheDocument();
    });
  });

  it('uses mobile and tablet responsive layout classes', async () => {
    setupFetch(
      [
        {
          id: 'meal-layout',
          meal_type: 'dinner',
          old_rate: 40,
          new_rate: 45,
          effective_date: '2026-07-25',
          canceled_at: null,
        },
      ],
      []
    );
    const { container } = render(<UpcomingChangesCard />);

    await waitFor(() => {
      expect(screen.getByText('Meal - Dinner')).toBeInTheDocument();
    });

    const grid = container.querySelector('.grid.grid-cols-1.gap-3');
    expect(grid).toBeInTheDocument();
    expect(grid?.className).toContain('md:grid-cols-2');
  });
});
