import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SubmitFoodPage from '../submit/page';
import HostelerDashboard from '../dashboard/page';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/lib/diagnostics/events', () => ({
  emitUiDiagnostic: () => {},
}));

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

describe('Hosteler submit/dashboard state matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith('/api/food/today-status')) {
        return jsonResponse({
          submitted: false,
          preferences: null,
          deadline: '21:00',
          server_time_ist: '18:00:00',
          deadline_passed: false,
          date: '2026-07-14',
        });
      }

      if (url.endsWith('/api/food/submit') && init?.method === 'POST') {
        return jsonResponse({ error: 'Submission failed' }, false, 500);
      }

      return jsonResponse({}, true, 200);
    }) as any);
  });

  it('shows explicit empty state on submit page when no submission exists yet', async () => {
    render(<SubmitFoodPage />);

    await waitFor(() => {
      expect(screen.getByText('No submission yet for tomorrow. Pick your meals and save.')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Submit Preferences' })).toBeInTheDocument();
  });

  it('shows retry guidance when submission save fails', async () => {
    render(<SubmitFoodPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submit Preferences' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Preferences' }));

    await waitFor(() => {
      expect(screen.getByText('Submission failed You can review your meals and try again.')).toBeInTheDocument();
    });
  });

  it('shows success state in dashboard when preferences are already submitted', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/food/today-status')) {
        return jsonResponse({
          submitted: true,
          preferences: { breakfast: true, lunch: false, dinner: true },
          deadline: '21:00',
          server_time_ist: '18:00:00',
          deadline_passed: false,
          date: '2026-07-14',
        });
      }
      return jsonResponse({}, true, 200);
    });

    render(<HostelerDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Preferences submitted/)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Update Preferences' })).toBeInTheDocument();
  });

  it('shows deterministic error state with retry when dashboard status fetch fails', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({ error: 'failed' }, false, 500)
    );

    render(<HostelerDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard temporarily unavailable')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
