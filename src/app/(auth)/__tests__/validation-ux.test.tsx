import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginPage from '../login/page';
import JoinPage from '../join/[token]/page';

const mockPush = vi.fn();
const mockSearchError = {
  value: null as string | null,
  activated: null as string | null,
  reset: null as string | null,
};

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === 'error') return mockSearchError.value;
      if (key === 'activated') return mockSearchError.activated;
      if (key === 'reset') return mockSearchError.reset;
      return null;
    },
  }),
  useParams: () => ({ token: 'invite-token-123' }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/lib/diagnostics/events', () => ({
  emitUiDiagnostic: () => {},
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

describe('Auth UX refinements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchError.value = null;
    mockSearchError.activated = null;
    mockSearchError.reset = null;

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes('/api/invite/validate')) {
        return jsonResponse({
          flow: 'reset',
          hosteler: { name: 'Ravi Kumar', room_number: '101' },
        });
      }

      if (url.endsWith('/api/invite/activate')) {
        return jsonResponse({ error: 'Activation failed' }, false, 400);
      }

      if (url.endsWith('/api/auth/pin/verify') && init?.method === 'POST') {
        return jsonResponse({ error: 'Invalid phone number or PIN' }, false, 401);
      }

      return jsonResponse({}, true, 200);
    }) as any);
  });

  it('focuses the first invalid field on login submit', async () => {
    render(<LoginPage />);

    const signInButton = await screen.findByRole('button', { name: 'Sign In' });
    fireEvent.click(signInButton);

    const phoneInput = screen.getByLabelText('Phone Number');
    expect(phoneInput).toHaveFocus();
    expect(screen.getByText('Please enter a valid 10-digit phone number')).toBeInTheDocument();
  });

  it('retains valid phone input when PIN validation fails on login', async () => {
    render(<LoginPage />);

    const phoneInput = await screen.findByLabelText('Phone Number');
    const pinInput = screen.getByLabelText('4-Digit PIN');

    fireEvent.change(phoneInput, { target: { value: '9876543210' } });
    fireEvent.change(pinInput, { target: { value: '12' } });

    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(pinInput).toHaveFocus();
    expect(phoneInput).toHaveValue('9876543210');
    expect(screen.getByText('PIN must be exactly 4 digits')).toBeInTheDocument();
  });

  it('keeps entered login values after server-side auth failure', async () => {
    render(<LoginPage />);

    const phoneInput = await screen.findByLabelText('Phone Number');
    const pinInput = screen.getByLabelText('4-Digit PIN');

    fireEvent.change(phoneInput, { target: { value: '9876543210' } });
    fireEvent.change(pinInput, { target: { value: '1234' } });

    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid phone number or PIN')).toBeInTheDocument();
    });

    expect(phoneInput).toHaveValue('9876543210');
    expect(pinInput).toHaveValue('1234');
  });

  it('focuses confirm PIN on mismatch while preserving entered PIN on join reset', async () => {
    render(<JoinPage />);

    await screen.findByRole('button', { name: 'Set New PIN' });

    const pinInput = screen.getByPlaceholderText('Enter 4-digit PIN');
    const confirmPinInput = screen.getByPlaceholderText('Re-enter PIN');

    fireEvent.change(pinInput, { target: { value: '1234' } });
    fireEvent.change(confirmPinInput, { target: { value: '9999' } });

    fireEvent.click(screen.getByRole('button', { name: 'Set New PIN' }));

    expect(confirmPinInput).toHaveFocus();
    expect(pinInput).toHaveValue('1234');
    expect(screen.getByText('PINs do not match')).toBeInTheDocument();
  });

  it('shows activation success message on login when redirected after invite activation', async () => {
    mockSearchError.activated = 'success';
    render(<LoginPage />);

    expect(await screen.findByText('Account activated successfully. Sign in with your phone number and PIN.')).toBeInTheDocument();
  });

  it('redirects successful PIN activation to login success state', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/api/invite/validate')) {
        return jsonResponse({
          flow: 'activation',
          hosteler: { name: 'Ravi Kumar', room_number: 'UNASSIGNED' },
        });
      }

      if (url.endsWith('/api/invite/activate')) {
        return jsonResponse({
          flow: 'activation',
          hosteler: { id: 'h-1', name: 'Ravi Kumar', room_number: 'UNASSIGNED' },
        });
      }

      return jsonResponse({}, true, 200);
    });

    render(<JoinPage />);

    await screen.findByRole('button', { name: 'Set up 4-digit PIN' });
    fireEvent.click(screen.getByRole('button', { name: 'Set up 4-digit PIN' }));

    fireEvent.change(screen.getByPlaceholderText('Enter 4-digit PIN'), { target: { value: '1234' } });
    fireEvent.change(screen.getByPlaceholderText('Re-enter PIN'), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Activate Account' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login?activated=success');
    });
  });
});
