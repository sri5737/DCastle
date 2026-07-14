import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConfigureCots } from '../configure-cots';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

describe('ConfigureCots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('shows required cot configuration type selector with bunker and normal options', () => {
    render(<ConfigureCots roomId="r-1" hasCots={false} onConfigured={() => {}} />);

    expect(screen.getByLabelText('Cot configuration type')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Bunker' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Normal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Configure Cots' })).toBeDisabled();
  });

  it('does not show destructive warning until a target type is selected', () => {
    render(<ConfigureCots roomId="r-1" hasCots currentMode="bunker" onConfigured={() => {}} />);

    // Warning panel must be hidden before the user selects a target type.
    expect(screen.queryByText(/Destructive action: reset existing cots/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset Cots' })).toBeDisabled();
  });

  it('shows reset warning panel with correct target mode after type is selected', () => {
    render(<ConfigureCots roomId="r-1" hasCots currentMode="bunker" onConfigured={() => {}} />);

    fireEvent.change(screen.getByLabelText('Cot configuration type'), {
      target: { value: 'normal' },
    });

    expect(screen.getByText(/Destructive action: reset existing cots/i)).toBeInTheDocument();
    expect(screen.getByText(/Current mode:/i).closest('p')).toHaveTextContent('Current mode: Bunker');
    expect(screen.getByText(/Target mode:/i).closest('p')).toHaveTextContent('Target mode: Normal');
    expect(
      screen.getByText(/Guardrail: reset is blocked if any cot in this room is assigned to an active hosteler/i),
    ).toBeInTheDocument();
  });

  it('submits selected bunker mode to cot configuration API', async () => {
    const onConfigured = vi.fn();
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ cots: [{ id: 'c-1', cot_id_label: 'L1', cot_type: 'lower_cot' }] }, true, 201),
    );

    render(<ConfigureCots roomId="r-1" hasCots={false} onConfigured={onConfigured} />);

    fireEvent.change(screen.getByLabelText('Cot configuration type'), {
      target: { value: 'bunker' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Configure Cots' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/rooms/r-1/cots',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    const request = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1];
    expect(JSON.parse(request.body as string)).toEqual({ cot_configuration_type: 'bunker' });
    expect(onConfigured).toHaveBeenCalledTimes(1);
  });

  it('submits selected normal mode to cot configuration API', async () => {
    const onConfigured = vi.fn();
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ cots: [{ id: 'c-1', cot_id_label: 'L1', cot_type: 'lower_cot' }] }, true, 201),
    );

    render(<ConfigureCots roomId="r-1" hasCots={false} onConfigured={onConfigured} />);

    fireEvent.change(screen.getByLabelText('Cot configuration type'), {
      target: { value: 'normal' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Configure Cots' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const request = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1];
    expect(JSON.parse(request.body as string)).toEqual({ cot_configuration_type: 'normal' });
    expect(onConfigured).toHaveBeenCalledTimes(1);
  });

  it('shows API error when configuration fails', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ error: 'Cots already configured for this room' }, false, 400),
    );

    render(<ConfigureCots roomId="r-1" hasCots={false} onConfigured={() => {}} />);

    fireEvent.change(screen.getByLabelText('Cot configuration type'), {
      target: { value: 'normal' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Configure Cots' }));

    await waitFor(() => {
      expect(screen.getByText('Cots already configured for this room')).toBeInTheDocument();
    });
  });

  it('sends reset payload using PATCH when cots are already configured', async () => {
    const onConfigured = vi.fn();
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ reset: true, cots: [{ id: 'c-1', cot_id_label: 'L1', cot_type: 'lower_cot' }] }, true, 200),
    );

    render(<ConfigureCots roomId="r-1" hasCots currentMode="normal" onConfigured={onConfigured} />);

    fireEvent.change(screen.getByLabelText('Cot configuration type'), {
      target: { value: 'normal' },
    });
    expect(screen.getByText(/Target mode:/i).closest('p')).toHaveTextContent('Target mode: Normal');
    fireEvent.click(screen.getByRole('checkbox', { name: /I understand this will regenerate cot inventory for this room/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset Cots' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/rooms/r-1/cots',
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    const request = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1];
    expect(JSON.parse(request.body as string)).toEqual({
      action: 'reset',
      cot_configuration_type: 'normal',
    });
    expect(onConfigured).toHaveBeenCalledTimes(1);
  });

  it('requires destructive-action acknowledgement before reset', async () => {
    render(<ConfigureCots roomId="r-1" hasCots currentMode="bunker" onConfigured={() => {}} />);

    fireEvent.change(screen.getByLabelText('Cot configuration type'), {
      target: { value: 'bunker' },
    });

    expect(screen.getByRole('button', { name: 'Reset Cots' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /I understand this will regenerate cot inventory for this room/i }));
    expect(screen.getByRole('button', { name: 'Reset Cots' })).toBeEnabled();
  });

  it('clears stale error when room context changes', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ error: 'Cannot reset cots while an active hosteler is assigned to this room' }, false, 400),
    );

    const { rerender } = render(
      <ConfigureCots roomId="r-1" hasCots={false} onConfigured={() => {}} />,
    );

    fireEvent.change(screen.getByLabelText('Cot configuration type'), {
      target: { value: 'normal' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Configure Cots' }));

    await waitFor(() => {
      expect(screen.getByText('Cannot reset cots while an active hosteler is assigned to this room')).toBeInTheDocument();
    });

    rerender(<ConfigureCots roomId="r-2" hasCots={false} onConfigured={() => {}} />);

    expect(
      screen.queryByText('Cannot reset cots while an active hosteler is assigned to this room'),
    ).not.toBeInTheDocument();
  });
});
