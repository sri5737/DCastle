import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddRoomTypeForm } from '../add-room-type-form';

describe('AddRoomTypeForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders AC/non-AC dropdown and sharing-capacity input without base-rent input', () => {
    render(<AddRoomTypeForm onCreated={() => {}} />);

    expect(screen.getByRole('combobox', { name: 'Room type name' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'AC' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'non-AC' })).toBeInTheDocument();
    expect(screen.getByLabelText('Sharing capacity')).toBeInTheDocument();
    expect(screen.getByLabelText('Cot count')).toBeInTheDocument();
    expect(screen.getByText(/Cot count defines inventory size for this room type/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Base rent')).not.toBeInTheDocument();
  });

  it('submits enum room type payload with sharing_capacity and no base_rent', async () => {
    const onCreated = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ room_type: { id: 'rt-1' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<AddRoomTypeForm onCreated={onCreated} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Room type name' }), {
      target: { value: 'non-AC' },
    });
    fireEvent.change(screen.getByLabelText('Sharing capacity'), {
      target: { value: '4' },
    });
    fireEvent.change(screen.getByLabelText('Cot count'), {
      target: { value: '4' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add Room Type' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(String(requestInit.body));

    expect(payload).toEqual({
      name: 'non-AC',
      sharing_capacity: 4,
      cot_count: 4,
    });
    expect(payload.base_rent).toBeUndefined();
    expect(onCreated).toHaveBeenCalledTimes(1);
  });
});
