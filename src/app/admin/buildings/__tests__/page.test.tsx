import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AdminBuildingsPage from '../page';

vi.mock('@/components/buildings/add-building-form', () => ({
  AddBuildingForm: () => <div data-testid="add-building-form">add building form</div>,
}));

vi.mock('@/components/buildings/building-tree', () => ({
  BuildingTree: ({ buildings }: { buildings: Array<{ name: string }> }) => (
    <div data-testid="building-tree">{buildings.map((b) => b.name).join(', ')}</div>
  ),
}));

describe('AdminBuildingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('loads building hierarchy and room types and renders tree view', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ buildings: [{ id: 'b-1', name: 'North Block', rooms: [] }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ room_types: [{ id: 'rt-1', name: '2 Sharing' }] }),
      });

    render(<AdminBuildingsPage />);

    expect(screen.getByText('Buildings and Rooms')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('building-tree')).toHaveTextContent('North Block');
    });

    expect(screen.getByTestId('add-building-form')).toBeInTheDocument();
    expect(screen.getByText('Room Templates in Add Room')).toBeInTheDocument();
  });
});
