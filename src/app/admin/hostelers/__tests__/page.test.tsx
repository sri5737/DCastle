import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import HostelerManagementPage from '../page';

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

describe('HostelerManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/hostelers')) {
        return jsonResponse({
          hostelers: [],
          counts: { active: 0, pending: 0, inactive: 0, deleted: 0 },
        });
      }

      if (url.endsWith('/api/admin/hostelers')) {
        return jsonResponse(
          {
            hosteler: {
              id: 'h-new',
              name: 'Ravi Kumar',
              phone: '9876543210',
              room_number: 'UNASSIGNED',
              status: 'pending',
              created_at: '2026-07-10T00:00:00.000Z',
            },
            invite: { invite_url: 'http://localhost:3000/join/token-1' },
          },
          true,
          201,
        );
      }

      return jsonResponse({ error: 'unexpected route' }, false, 404);
    }) as any);
  });

  it('renders identity-only add-hosteler form without accommodation selectors', async () => {
    render(<HostelerManagementPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Hosteler name')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('Building')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Room')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Cot')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Room number')).not.toBeInTheDocument();
  });

  it('submits identity-only payload when adding a hosteler', async () => {
    render(<HostelerManagementPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Hosteler name')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Hosteler name'), { target: { value: 'Ravi Kumar' } });
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '9876543210' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Hosteler' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/hostelers', expect.objectContaining({ method: 'POST' }));
    });

    const submitCall = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find(
      ([url]) => String(url) === '/api/admin/hostelers',
    );

    expect(submitCall).toBeTruthy();
    const payload = JSON.parse(submitCall?.[1]?.body as string);
    expect(payload).toEqual({
      name: 'Ravi Kumar',
      phone: '9876543210',
    });
  });

  it('shows copied state when invite link is copied from dialog', async () => {
    render(<HostelerManagementPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Hosteler name')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Hosteler name'), { target: { value: 'Ravi Kumar' } });
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '9876543210' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Hosteler' }));

    await waitFor(() => {
      expect(screen.getByText('Invite Link Generated')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Copy invite link' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Copy invite link' })).toHaveTextContent('Copied');
    });
    expect(screen.getByText('Copied to clipboard.')).toBeInTheDocument();
  });

  it('supports quick search filtering with deterministic no-data messaging', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/hostelers')) {
        return jsonResponse({
          hostelers: [
            {
              id: 'h-1',
              name: 'Ravi Kumar',
              phone: '9876543210',
              room_number: '101',
              status: 'active',
              activated_at: null,
              deleted_at: null,
              deleted_from_status: null,
              deletion_effective_date: null,
              created_at: '2026-07-10T00:00:00.000Z',
            },
            {
              id: 'h-2',
              name: 'Anita Roy',
              phone: '9765432109',
              room_number: '102',
              status: 'pending',
              activated_at: null,
              deleted_at: null,
              deleted_from_status: null,
              deletion_effective_date: null,
              created_at: '2026-07-10T00:00:00.000Z',
            },
          ],
          counts: { active: 1, pending: 1, inactive: 0, deleted: 0 },
        });
      }

      return jsonResponse({ error: 'unexpected route' }, false, 404);
    });

    render(<HostelerManagementPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Quick search hostelers')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Quick search hostelers'), { target: { value: 'zzz' } });
    expect(screen.getByText('No active hostelers match "zzz".')).toBeInTheDocument();
  });

  it('renders UNASSIGNED room_number as a clear unassigned state label', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/hostelers')) {
        return jsonResponse({
          hostelers: [
            {
              id: 'h-1',
              name: 'Ravi Kumar',
              phone: '9876543210',
              room_number: 'UNASSIGNED',
              status: 'active',
              activated_at: null,
              deleted_at: null,
              deleted_from_status: null,
              deletion_effective_date: null,
              created_at: '2026-07-10T00:00:00.000Z',
            },
          ],
          counts: { active: 1, pending: 0, inactive: 0, deleted: 0 },
        });
      }

      return jsonResponse({ error: 'unexpected route' }, false, 404);
    });

    render(<HostelerManagementPage />);

    await waitFor(() => {
      expect(screen.getByText('Unassigned')).toBeInTheDocument();
    });
  });
});
