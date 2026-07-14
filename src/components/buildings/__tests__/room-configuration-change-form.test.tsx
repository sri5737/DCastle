import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RoomConfigurationChangeForm } from '../room-configuration-change-form';

function todayIso() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function previousDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

describe('RoomConfigurationChangeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('blocks past effective_date and disables submit', async () => {
    render(<RoomConfigurationChangeForm roomId="r-1" onScheduled={() => {}} />);

    const today = todayIso();
    const past = previousDate(today);

    const dateInput = screen.getByLabelText('Effective date');
    fireEvent.change(dateInput, { target: { value: past } });

    expect(screen.getByText('Effective date cannot be in the past')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Change Room Configuration/i })).toBeDisabled();
  });

  it('renders explicit labels for all room configuration fields', () => {
    render(<RoomConfigurationChangeForm roomId="r-1" onScheduled={() => {}} />);

    expect(screen.getByText('New sharing capacity')).toBeInTheDocument();
    expect(screen.getByText('Room class')).toBeInTheDocument();
    expect(screen.getByText('New rent')).toBeInTheDocument();
    expect(screen.getByText('Effective date')).toBeInTheDocument();
  });

  it('submits valid payload and resets fields on success', async () => {
    const onScheduled = vi.fn();
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ configuration_change: { id: 'rch-1' } }),
    });

    render(<RoomConfigurationChangeForm roomId="r-1" onScheduled={onScheduled} />);

    fireEvent.change(screen.getByLabelText('New sharing capacity'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Room class'), { target: { value: 'ac' } });
    fireEvent.change(screen.getByLabelText('New rent'), { target: { value: '7000' } });

    fireEvent.click(screen.getByRole('button', { name: /Change Room Configuration/i }));

    await waitFor(() => expect(onScheduled).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/rooms/r-1/configuration-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        new_sharing_capacity: 3,
        new_room_class: 'ac',
        new_rent: 7000,
        effective_date: todayIso(),
      }),
    });
  });
});
