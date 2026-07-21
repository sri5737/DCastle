import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AccommodationAssignmentPanel } from '../accommodation-assignment-panel';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

const hostelersPayload = {
  hostelers: [
    {
      id: 'h-1',
      name: 'Ravi Kumar',
      phone: '9876543210',
      room_number: 'UNASSIGNED',
      status: 'pending',
      building_id: null,
      room_id: null,
      cot_id: null,
    },
    {
      id: 'h-2',
      name: 'Anita Roy',
      phone: '9765432109',
      room_number: '101',
      status: 'active',
      building_id: 'b-1',
      room_id: 'r-1',
      cot_id: 'c-1',
    },
  ],
};

const buildingsPayload = {
  buildings: [
    {
      id: 'b-1',
      name: 'Main Block',
      rooms: [
        {
          id: 'r-1',
          room_number: '101',
          cots: [
            { id: 'c-1', cot_id_label: 'L1', hosteler_id: 'h-2' },
            { id: 'c-2', cot_id_label: 'U1', hosteler_id: null },
          ],
        },
        {
          id: 'r-2',
          room_number: '102',
          cots: [{ id: 'c-3', cot_id_label: 'L1', hosteler_id: null }],
        },
      ],
    },
  ],
};

describe('AccommodationAssignmentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url.endsWith('/api/hostelers')) {
          return jsonResponse(hostelersPayload);
        }

        if (url.endsWith('/api/admin/buildings')) {
          return jsonResponse(buildingsPayload);
        }

        if (url.endsWith('/api/admin/hostelers/h-1/accommodation') && init?.method === 'PATCH') {
          return jsonResponse({ assigned: true, hosteler: { id: 'h-1', building_id: 'b-1', room_id: 'r-2', cot_id: 'c-3', room_number: '102' } });
        }

        if (url.endsWith('/api/admin/hostelers/h-2/accommodation') && init?.method === 'PATCH') {
          return jsonResponse({ assigned: true, hosteler: { id: 'h-2', building_id: 'b-1', room_id: 'r-1', cot_id: 'c-2', room_number: '101' } });
        }

        return jsonResponse({ error: 'unexpected route' }, false, 404);
      }) as any,
    );
  });

  it('cascades building -> room -> cot selection and submits assign payload', async () => {
    render(<AccommodationAssignmentPanel />);

    await waitFor(() => {
      expect(screen.getByLabelText('Building selector')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Building selector'), { target: { value: 'b-1' } });
    fireEvent.change(screen.getByLabelText('Room selector'), { target: { value: 'r-2' } });
    fireEvent.change(screen.getByLabelText('Cot selector'), { target: { value: 'c-3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign Cot' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/hostelers/h-1/accommodation',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    const submitCall = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.find(
      ([url, init]) => String(url) === '/api/admin/hostelers/h-1/accommodation' && init?.method === 'PATCH',
    );

    expect(submitCall).toBeTruthy();
    const payload = JSON.parse(submitCall?.[1]?.body as string);
    expect(payload).toEqual({
      hosteler_id: 'h-1',
      building_id: 'b-1',
      room_id: 'r-2',
      cot_id: 'c-3',
    });
  });

  it('shows reassignment confirmation before confirming reassign', async () => {
    render(<AccommodationAssignmentPanel />);

    await waitFor(() => {
      expect(screen.getByLabelText('Hosteler selector')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Hosteler selector'), { target: { value: 'h-2' } });
    fireEvent.change(screen.getByLabelText('Building selector'), { target: { value: 'b-1' } });
    fireEvent.change(screen.getByLabelText('Room selector'), { target: { value: 'r-1' } });
    fireEvent.change(screen.getByLabelText('Cot selector'), { target: { value: 'c-2' } });

    fireEvent.click(screen.getByRole('button', { name: 'Reassign Cot' }));

    expect(screen.getByText('Confirm Reassignment')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This reassignment will release the current cot and assign the selected new cot for this hosteler.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Reassign' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/hostelers/h-2/accommodation',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });

  it('renders occupied-cot errors from API', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url.endsWith('/api/hostelers')) return jsonResponse(hostelersPayload);
        if (url.endsWith('/api/admin/buildings')) return jsonResponse(buildingsPayload);

        if (url.endsWith('/api/admin/hostelers/h-1/accommodation') && init?.method === 'PATCH') {
          return jsonResponse({ error: 'Selected cot is already occupied' }, false, 409);
        }

        return jsonResponse({ error: 'unexpected route' }, false, 404);
      },
    );

    render(<AccommodationAssignmentPanel />);

    await waitFor(() => {
      expect(screen.getByLabelText('Building selector')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Building selector'), { target: { value: 'b-1' } });
    fireEvent.change(screen.getByLabelText('Room selector'), { target: { value: 'r-1' } });
    fireEvent.change(screen.getByLabelText('Cot selector'), { target: { value: 'c-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign Cot' }));

    await waitFor(() => {
      expect(screen.getByText('Selected cot is already occupied')).toBeInTheDocument();
    });
  });
});
