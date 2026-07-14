import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddRoomForm } from '../add-room-form';

describe('AddRoomForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows inline room template fields and no standalone rent input', () => {
    render(
      <AddRoomForm
        buildingId="b-1"
        roomTypes={[
          { id: 'rt-1', name: 'AC', sharing_capacity: 2, cot_count: 2, active: true },
          { id: 'rt-2', name: 'non-AC', sharing_capacity: 3, cot_count: 3, active: false },
        ]}
        onCreated={() => {}}
      />,
    );

    expect(screen.getByLabelText('Room class')).toBeInTheDocument();
    expect(screen.getByLabelText('Sharing capacity')).toBeInTheDocument();
    expect(screen.getByLabelText('Cot count')).toBeInTheDocument();
    expect(screen.getByLabelText('Cot configuration type')).toBeInTheDocument();
    expect(screen.queryByLabelText('Rent')).not.toBeInTheDocument();
  });

  it('submits unified add-room payload with cot mode and no rent field', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ room: { id: 'r-1' } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const onCreated = vi.fn();

    render(<AddRoomForm buildingId="b-1" roomTypes={[]} onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText('Room number'), { target: { value: '101' } });
    fireEvent.change(screen.getByLabelText('Room floor'), { target: { value: 'first' } });
    fireEvent.change(screen.getByLabelText('Room class'), { target: { value: 'AC' } });
    fireEvent.change(screen.getByLabelText('Sharing capacity'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Cot count'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Cot configuration type'), { target: { value: 'normal' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add Room' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/buildings/b-1/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_number: '101',
          floor: 'first',
          room_class: 'AC',
          sharing_capacity: 2,
          cot_count: 3,
          cot_configuration_type: 'normal',
        }),
      });
    });

    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it('shows reuse hint when an active template matches class and sharing', () => {
    render(
      <AddRoomForm
        buildingId="b-1"
        roomTypes={[{ id: 'rt-1', name: 'AC', sharing_capacity: 2, cot_count: 2, active: true }]}
        onCreated={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText('Room class'), { target: { value: 'AC' } });
    fireEvent.change(screen.getByLabelText('Sharing capacity'), { target: { value: '2' } });

    expect(
      screen.getByText('Matching active room template found. Room creation will reuse that template.'),
    ).toBeInTheDocument();
  });
});