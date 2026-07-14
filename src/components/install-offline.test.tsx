import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InstallPrompt } from './install-prompt';
import { OfflineIndicator } from './offline-indicator';

describe('Install and offline indicators', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('shows install cue only when browser reports install availability', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const userChoice = Promise.resolve({ outcome: 'dismissed' as const, platform: 'web' });

    render(<InstallPrompt />);
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument();

    const installEvent = new Event('beforeinstallprompt') as Event & {
      prompt: typeof prompt;
      userChoice: typeof userChoice;
    };
    installEvent.preventDefault = vi.fn();
    installEvent.prompt = prompt;
    installEvent.userChoice = userChoice;

    await act(async () => {
      window.dispatchEvent(installEvent);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument();
    });
  });

  it('keeps shell non-blocking while install cue is visible', () => {
    let clicks = 0;
    const prompt = vi.fn().mockResolvedValue(undefined);
    const userChoice = Promise.resolve({ outcome: 'dismissed' as const, platform: 'web' });

    render(
      <div>
        <button onClick={() => { clicks += 1; }}>Primary Action</button>
        <InstallPrompt />
      </div>
    );

    const installEvent = new Event('beforeinstallprompt') as Event & {
      prompt: typeof prompt;
      userChoice: typeof userChoice;
    };
    installEvent.preventDefault = vi.fn();
    installEvent.prompt = prompt;
    installEvent.userChoice = userChoice;
    act(() => {
      window.dispatchEvent(installEvent);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Primary Action' }));
    expect(clicks).toBe(1);
  });

  it('shows offline banner and recovers with non-blocking back-online cue', () => {
    vi.useFakeTimers();
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });

    let clicks = 0;
    render(
      <div>
        <button onClick={() => { clicks += 1; }}>Submit</button>
        <OfflineIndicator />
      </div>
    );

    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(clicks).toBe(1);

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      get: () => true,
    });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.getByText(/Back online/)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(screen.queryByText(/Back online/)).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
