import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MealAdjustmentModal } from '../meal-adjustment-modal';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

describe('MealAdjustmentModal', () => {
  const onOpenChange = vi.fn();
  const onSaved = vi.fn();
  const onToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url.startsWith('/api/admin/food-preferences/adjust?')) {
          return jsonResponse({
            meals: { breakfast: true, lunch: false, dinner: true },
            has_transmitted_bill: true,
            warning_month_label: 'July 2026',
          });
        }

        if (url === '/api/admin/food-preferences/adjust' && init?.method === 'POST') {
          return jsonResponse({ message: 'Meal adjustment saved' });
        }

        return jsonResponse({ error: 'Unexpected route' }, false, 404);
      }) as any,
    );
  });

  function renderModal() {
    render(
      <MealAdjustmentModal
        open
        hosteler={{ id: 'host-1', name: 'Ravi Kumar' }}
        onOpenChange={onOpenChange}
        onSaved={onSaved}
        onToast={onToast}
      />, 
    );
  }

  it('opens and renders title, date picker, and required reason textarea', () => {
    renderModal();
    expect(screen.getByText('Adjust Meals for Ravi Kumar')).toBeInTheDocument();
    expect(screen.getByLabelText('Adjustment date')).toBeInTheDocument();
    expect(screen.getByLabelText('Adjustment reason')).toBeInTheDocument();
  });

  it('loads existing meals when date is selected', async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('Adjustment date'), { target: { value: '2026-07-12' } });

    await waitFor(() => {
      expect(screen.getByText('Breakfast: On')).toBeInTheDocument();
      expect(screen.getByText('Lunch: Off')).toBeInTheDocument();
      expect(screen.getByText('Dinner: On')).toBeInTheDocument();
    });
    expect(screen.getByText(/Bill for July 2026 already transmitted/)).toBeInTheDocument();
  });

  it('requires reason before save and allows meal toggle interaction', async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('Adjustment date'), { target: { value: '2026-07-12' } });

    await waitFor(() => {
      expect(screen.getByText('Lunch: Off')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Lunch: Off'));
    expect(screen.getByText('Lunch: On')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Reason is required')).toBeInTheDocument();
  });

  it('handles successful save by toasting, closing, and notifying parent', async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('Adjustment date'), { target: { value: '2026-07-12' } });

    await waitFor(() => {
      expect(screen.getByText('Breakfast: On')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Adjustment reason'), { target: { value: 'Manual correction' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onToast).toHaveBeenCalledWith({ type: 'success', message: 'Meal adjustment saved' });
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(onSaved).toHaveBeenCalled();
    });
  });

  it('keeps modal open and emits error toast on save failure', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(async () =>
      jsonResponse({ meals: { breakfast: false, lunch: false, dinner: false }, has_transmitted_bill: false }),
    );
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementationOnce(async () =>
      jsonResponse({ error: 'Adjustment failed' }, false, 500),
    );

    renderModal();
    fireEvent.change(screen.getByLabelText('Adjustment date'), { target: { value: '2026-07-12' } });

    await waitFor(() => {
      expect(screen.getByText('Breakfast: Off')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Adjustment reason'), { target: { value: 'Retry path' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(onToast).toHaveBeenCalledWith({ type: 'error', message: 'Adjustment failed' });
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('applies mobile-safe modal width classes for 375px baseline', () => {
    renderModal();
    const content = document.querySelector('div[class*="max-w-md"]');
    expect(content).toBeTruthy();
    expect(content?.className).toContain('w-[calc(100vw-1rem)]');
    expect(content?.className).toContain('max-w-md');
    expect(content?.className).toContain('overflow-x-hidden');
  });
});