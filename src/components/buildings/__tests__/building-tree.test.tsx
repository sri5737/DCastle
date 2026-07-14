import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BuildingTree } from '../building-tree';

vi.mock('../add-room-form', () => ({
  AddRoomForm: () => <div data-testid="add-room-form">add room form</div>,
}));

vi.mock('../configure-cots', () => ({
  ConfigureCots: ({ roomId }: { roomId: string }) => (
    <div data-testid="configure-cots">configure cots for {roomId}</div>
  ),
}));

vi.mock('../room-configuration-change-form', () => ({
  RoomConfigurationChangeForm: ({ roomId }: { roomId: string }) => (
    <div data-testid="room-change-form">change room config for {roomId}</div>
  ),
}));

describe('BuildingTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('shows empty state when there are no buildings', () => {
    render(<BuildingTree buildings={[]} roomTypes={[]} onChanged={() => {}} />);
    expect(screen.getByText('No buildings created yet.')).toBeInTheDocument();
  });

  it('shows room list first and renders detail panel only for selected room', () => {
    render(
      <BuildingTree
        buildings={[
          {
            id: 'b-1',
            name: 'North Block',
            description: 'Owner building',
            rooms: [
              {
                id: 'r-1',
                room_number: '101',
                floor: 'first',
                current_rent: 1,
                room_types: { id: 'rt-1', name: 'AC', sharing_capacity: 2, cot_count: 2, active: true },
                pending_change: { effective_date: '2026-07-12' },
                cots: [
                  { id: 'c-1', cot_id_label: 'L1', cot_type: 'lower_cot', hosteler_id: null },
                ],
              },
              {
                id: 'r-2',
                room_number: '102',
                floor: 'second',
                current_rent: 7600,
                room_types: { id: 'rt-1', name: 'AC', sharing_capacity: 2, cot_count: 2, active: false },
                cots: [
                  { id: 'c-2', cot_id_label: 'U1', cot_type: 'upper_cot', hosteler_id: 'h-1' },
                ],
              },
            ],
          },
        ]}
        roomTypes={[{ id: 'rt-1', name: 'AC', sharing_capacity: 2, cot_count: 2, active: true }]}
        onChanged={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /North Block\s+2\s+rooms/i }));

    expect(screen.getByRole('button', { name: 'Room 101' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Room 102' })).toBeInTheDocument();
    expect(screen.getByText('configure cots for r-1')).toBeInTheDocument();
    expect(screen.queryByText('configure cots for r-2')).not.toBeInTheDocument();
    expect(screen.getByText(/Room configuration will be updated on 2026-07-12/i)).toBeInTheDocument();
    expect(screen.getByText('Rent pending global room-rent config')).toBeInTheDocument();
    const cotLabel = screen.getByText('L1');
    const tableWrapper = cotLabel.closest('table')?.parentElement as HTMLElement;
    expect(tableWrapper.className).toContain('overflow-x-auto');
    expect(screen.getByTestId('add-room-form')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Room 102' }));

    expect(screen.getByText('configure cots for r-2')).toBeInTheDocument();
    expect(screen.queryByText('configure cots for r-1')).not.toBeInTheDocument();
    expect(screen.getByText('U1')).toBeInTheDocument();
    expect(screen.getByText('Archived room type')).toBeInTheDocument();
  });

  it('shows delete action and renders blocked-delete error from API', async () => {
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Cannot delete building with active room assignments' }),
    });

    render(
      <BuildingTree
        buildings={[
          {
            id: 'b-1',
            name: 'North Block',
            description: null,
            rooms: [],
          },
        ]}
        roomTypes={[]}
        onChanged={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete North Block' }));
    expect(screen.getByRole('heading', { name: 'Delete Building' })).toBeInTheDocument();
    expect(screen.getByText('Building to delete')).toBeInTheDocument();
    expect(screen.getByText('Building to delete').closest('div')).toHaveTextContent('North Block');

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete Building' })[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/buildings/b-1', { method: 'DELETE' });
    });
    expect(screen.getByText('Cannot delete building with active room assignments')).toBeInTheDocument();
  });

  it('does not render room type lifecycle panel on primary buildings surface', () => {
    render(
      <BuildingTree
        buildings={[]}
        roomTypes={[
          { id: 'rt-1', name: 'AC', sharing_capacity: 2, cot_count: 2, active: true },
          { id: 'rt-2', name: 'non-AC', sharing_capacity: 3, cot_count: 3, active: false },
        ]}
        onChanged={() => {}}
      />,
    );

    expect(screen.queryByText('Room Type Lifecycle')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Search room types')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Filter room types by status')).not.toBeInTheDocument();
  });

  it('supports searching room numbers inside an opened building', () => {
    render(
      <BuildingTree
        buildings={[
          {
            id: 'b-1',
            name: 'North Block',
            description: null,
            rooms: [
              {
                id: 'r-1',
                room_number: '101',
                floor: 'first',
                current_rent: 6200,
                room_types: { id: 'rt-1', name: 'AC', sharing_capacity: 2, cot_count: 2, active: true },
                cots: [],
              },
              {
                id: 'r-2',
                room_number: '205',
                floor: 'second',
                current_rent: 7200,
                room_types: { id: 'rt-1', name: 'AC', sharing_capacity: 2, cot_count: 2, active: true },
                cots: [],
              },
            ],
          },
        ]}
        roomTypes={[{ id: 'rt-1', name: 'AC', sharing_capacity: 2, cot_count: 2, active: true }]}
        onChanged={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /North Block\s+2\s+rooms/i }));

    fireEvent.change(screen.getByLabelText('Search rooms in North Block'), {
      target: { value: '205' },
    });

    expect(screen.getByRole('button', { name: 'Room 205' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Room 101' })).not.toBeInTheDocument();
  });
});
