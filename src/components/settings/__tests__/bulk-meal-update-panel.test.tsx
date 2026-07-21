import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BulkMealUpdatePanel } from '../bulk-meal-update-panel';
import { getTodayIST } from '@/lib/utils';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

describe('BulkMealUpdatePanel', () => {
  const onToast = vi.fn();

  function addDays(dateStr: string, days: number): string {
    const date = new Date(`${dateStr}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  const startDateValue = addDays(getTodayIST(), 1);
  const endDateValue = addDays(getTodayIST(), 2);

  function mockFetch(options?: { hasTransmittedBills?: boolean }) {
    const hasTransmittedBills = options?.hasTransmittedBills ?? true;

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);

        if (url === '/api/admin/buildings') {
          return jsonResponse({ buildings: [{ id: 'b-1', name: 'Main Block' }] });
        }

        if (url === '/api/admin/food-preferences/adjust/bulk' && (!init || init.method === 'GET')) {
          return jsonResponse({
            events: [
              {
                id: 'evt-last',
                event_type: 'full_closure',
                scope: 'all_active',
                date_mode: 'single_date',
                start_date: startDateValue,
                end_date: null,
                meals: { breakfast: false, lunch: false, dinner: false },
                affected_hostelers: 2,
                affected_date_rows: 2,
                created_at: '2999-01-01T00:00:00.000Z',
                created_by: 'owner-1',
              },
            ],
          });
        }

        if (url === '/api/admin/food-preferences/adjust/bulk' && init?.method === 'POST') {
          const body = JSON.parse(String(init.body ?? '{}'));

          if (body.preview_only) {
            return jsonResponse({
              preview: {
                total_hostelers_affected: 3,
                total_date_rows_affected: 6,
                sample_changes: [
                  {
                    hosteler_id: 'h-1',
                    hosteler_name: 'Ravi',
                    date: startDateValue,
                    current_meals: { breakfast: true, lunch: true, dinner: true },
                    new_meals: body.meals,
                  },
                ],
                has_transmitted_bills: hasTransmittedBills,
                transmitted_month_labels: hasTransmittedBills ? ['January 2999'] : [],
              },
              result: null,
            });
          }

          return jsonResponse({
            preview: {
              total_hostelers_affected: 3,
              total_date_rows_affected: 6,
              sample_changes: [],
              has_transmitted_bills: hasTransmittedBills,
              transmitted_month_labels: hasTransmittedBills ? ['January 2999'] : [],
            },
            result: {
              total_hostelers_affected: 3,
              total_date_rows_affected: 6,
              total_dates_affected: 2,
              partial_failures: [],
              message: 'Bulk meal update applied to 3 hostelers across 2 date(s)',
            },
            events: [
              {
                id: 'evt-1',
                event_type: 'full_closure',
                scope: 'all_active',
                date_mode: 'date_range',
                start_date: '2999-01-02',
                end_date: endDateValue,
                meals: { breakfast: false, lunch: false, dinner: false },
                affected_hostelers: 3,
                affected_date_rows: 6,
                created_at: '2999-01-01T00:00:00.000Z',
                created_by: 'owner-1',
              },
            ],
          });
        }

        return jsonResponse({ error: 'Unexpected route' }, false, 404);
      }) as any,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch();
  });

  function renderPanel() {
    render(<BulkMealUpdatePanel onToast={onToast} />);
  }

  async function openToStep(step: 0 | 1 | 2 | 3) {
    fireEvent.click(screen.getByRole('button', { name: 'Open Bulk Update' }));
    for (let index = 0; index < step; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    }
  }

  it('renders summary card only by default and opens workflow on demand', async () => {
    renderPanel();
    expect(screen.getByText('Bulk Meal Update')).toBeInTheDocument();
    expect(screen.queryByLabelText('Bulk meal update workflow')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText(/Last run:|No bulk updates have been applied yet\./),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open Bulk Update' }));
    expect(screen.getByLabelText('Bulk meal update workflow')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 4: Scope')).toBeInTheDocument();
  });

  it('supports stepper navigation and progressive disclosure rules', async () => {
    renderPanel();
    await openToStep(0);

    expect(screen.queryByLabelText('Building selector')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Specific Building'));
    expect(screen.getByLabelText('Building selector')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('All Active Hostelers'));

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(screen.getByText(/Step\s*2\s*of\s*4:\s*Date/)).toBeInTheDocument();
    });
    expect(screen.queryByLabelText('End date')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Date Range'));
    expect(screen.getByLabelText('End date')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: endDateValue } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: startDateValue } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => {
      expect(screen.getByText('End date must be on or after start date.')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: startDateValue } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: endDateValue } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Step 3 of 4: Meals')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Breakfast OFF/i })).not.toBeInTheDocument();

    const templateSelect = screen.getByLabelText('Action template') as HTMLSelectElement;
    fireEvent.change(templateSelect, { target: { value: 'custom_availability' } });
    expect(templateSelect.value).toBe('custom_availability');
    expect(screen.getByRole('button', { name: /Breakfast OFF/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Breakfast OFF/ }));
    expect(screen.getByRole('button', { name: /Breakfast ON/ })).toBeInTheDocument();
  });

  it('shows unsaved-close confirmation before closing workflow', async () => {
    renderPanel();
    await openToStep(1);

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: startDateValue } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.getByText('Discard changes?')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));
    await waitFor(() => {
      expect(screen.queryByLabelText('Bulk meal update workflow')).not.toBeInTheDocument();
    });
  });

  it('loads preview on demand and shows transmitted warning when impacted months include transmitted bills', async () => {
    renderPanel();
    await openToStep(1);

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: startDateValue } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview Impact' }));

    await waitFor(() => {
      expect(screen.getByText(/Hostelers affected:/)).toBeInTheDocument();
      expect(screen.getByText(/Date rows affected:/)).toBeInTheDocument();
      expect(screen.getByText(/Ravi/)).toBeInTheDocument();
      expect(screen.getByText(/Transmitted bills found/)).toBeInTheDocument();
    });
  });

  it('hides transmitted warning when impacted months do not include transmitted bills', async () => {
    mockFetch({ hasTransmittedBills: false });
    renderPanel();
    await openToStep(1);

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: startDateValue } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview Impact' }));

    await waitFor(() => {
      expect(screen.getByText(/Hostelers affected:/)).toBeInTheDocument();
      expect(screen.queryByText(/Transmitted bills found/)).not.toBeInTheDocument();
    });
  });

  it('requires reason in confirm modal before final apply', async () => {
    renderPanel();

    await openToStep(1);
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: startDateValue } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview Impact' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Apply Bulk Update' })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply Bulk Update' }));
    await waitFor(() => {
      expect(screen.getByText('Confirm Bulk Meal Update')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: 'Confirm and Apply' });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Reason (required)'), { target: { value: 'Festival closure' } });
    expect(confirmButton).toBeEnabled();

    fireEvent.click(confirmButton);
    await waitFor(() => {
      expect(onToast).toHaveBeenCalledWith({ type: 'success', message: 'Bulk meal update applied to 3 hostelers across 2 date(s)' });
    });
  });

  it('has mobile full-screen and tablet drawer/two-pane preview baseline classes', async () => {
    const { container } = render(<BulkMealUpdatePanel onToast={onToast} />);

    fireEvent.click(screen.getByRole('button', { name: 'Open Bulk Update' }));
    const panel = screen.getByTestId('bulk-workflow-panel');
    expect(panel.className).toContain('inset-0');
    expect(panel.className).toContain('md:right-0');

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: startDateValue } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview Impact' }));

    await waitFor(() => {
      const previewGrid = screen.getByTestId('bulk-preview-grid');
      expect(previewGrid.className).toContain('md:grid-cols-2');
    });

    expect(container.innerHTML).not.toContain('overflow-x-auto');
  });
});
