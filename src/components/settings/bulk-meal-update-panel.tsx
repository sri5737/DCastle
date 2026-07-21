'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getTodayIST, isIsoDate } from '@/lib/utils';
import { getAllowedWindowDescription, isDateWithin3MonthWindow } from '@/lib/rate-change-window';
import { BulkUpdatePreviewModal } from '@/components/settings/bulk-update-preview-modal';
import { BulkMealUpdateTriggerCard } from '@/components/settings/bulk-meal-update-trigger-card';

type ActionTemplate = 'full_closure' | 'custom_availability';
type ScopeOption = 'all_active' | 'specific_building';
type DateMode = 'single_date' | 'date_range';

type MealsPayload = {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
};

type BuildingSummary = {
  id: string;
  name: string;
};

type PreviewRow = {
  hosteler_id: string;
  hosteler_name: string;
  date: string;
  current_meals: MealsPayload;
  new_meals: MealsPayload;
};

type PreviewPayload = {
  total_hostelers_affected: number;
  total_date_rows_affected: number;
  sample_changes: PreviewRow[];
  has_transmitted_bills: boolean;
  transmitted_month_labels: string[];
};

type EventItem = {
  id: string;
  event_type: 'full_closure' | 'custom_availability';
  scope: ScopeOption;
  date_mode: DateMode;
  start_date: string;
  end_date: string | null;
  meals: MealsPayload;
  affected_hostelers: number;
  affected_date_rows: number;
  created_at: string;
  created_by: string;
};

type Props = {
  onToast: (payload: { type: 'success' | 'error'; message: string }) => void;
};

const STEP_LABELS = ['Scope', 'Date', 'Meals', 'Preview & Confirm'] as const;

const DEFAULT_MEALS: MealsPayload = {
  breakfast: false,
  lunch: false,
  dinner: false,
};

function formatMeals(meals: MealsPayload) {
  return `B ${meals.breakfast ? 'ON' : 'OFF'} | L ${meals.lunch ? 'ON' : 'OFF'} | D ${meals.dinner ? 'ON' : 'OFF'}`;
}

function formatDateLabel(startDate: string, endDate: string | null, mode: DateMode) {
  if (mode === 'single_date') return startDate;
  return `${startDate} to ${endDate ?? startDate}`;
}

function formatEventType(type: EventItem['event_type']) {
  return type === 'full_closure' ? 'Full Closure' : 'Custom Availability';
}

function validateFutureDateWithinWindow(date: string): string | null {
  if (!isIsoDate(date)) {
    return 'Date must be in YYYY-MM-DD format.';
  }

  const today = getTodayIST();
  if (date <= today) {
    return 'Only future dates are allowed for bulk updates.';
  }

  if (!isDateWithin3MonthWindow(date)) {
    return `Date must be within the approved scheduling window (${getAllowedWindowDescription()}).`;
  }

  return null;
}

export function BulkMealUpdatePanel({ onToast }: Props) {
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [eventsExpanded, setEventsExpanded] = useState(false);
  const [template, setTemplate] = useState<ActionTemplate>('full_closure');
  const [scope, setScope] = useState<ScopeOption>('all_active');
  const [buildingId, setBuildingId] = useState('');
  const [dateMode, setDateMode] = useState<DateMode>('single_date');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [meals, setMeals] = useState<MealsPayload>(DEFAULT_MEALS);

  const [buildings, setBuildings] = useState<BuildingSummary[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [formError, setFormError] = useState('');
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadMeta() {
      setLoadingMeta(true);
      try {
        const [buildingRes, eventRes] = await Promise.all([
          fetch('/api/admin/buildings', { cache: 'no-store' }),
          fetch('/api/admin/food-preferences/adjust/bulk', { cache: 'no-store' }),
        ]);

        if (!active) return;

        if (buildingRes.ok) {
          const payload = await buildingRes.json();
          const nextBuildings: BuildingSummary[] = (payload.buildings ?? []).map((b: { id: string; name: string }) => ({
            id: b.id,
            name: b.name,
          }));
          setBuildings(nextBuildings);
        }

        if (eventRes.ok) {
          const payload = await eventRes.json();
          setEvents(payload.events ?? []);
        }
      } catch {
        if (active) {
          onToast({ type: 'error', message: 'Failed to load bulk update metadata' });
        }
      } finally {
        if (active) setLoadingMeta(false);
      }
    }

    loadMeta();
    return () => {
      active = false;
    };
  }, [onToast]);

  useEffect(() => {
    if (!buildingId && buildings.length > 0) {
      setBuildingId(buildings[0].id);
    }
  }, [buildingId, buildings]);

  useEffect(() => {
    if (template === 'full_closure') {
      setMeals({ breakfast: false, lunch: false, dinner: false });
    }
  }, [template]);

  const scopeLabel = useMemo(() => {
    if (scope === 'all_active') return 'All Active Hostelers';
    const buildingName = buildings.find((b) => b.id === buildingId)?.name ?? 'Specific Building';
    return `Specific Building (${buildingName})`;
  }, [scope, buildings, buildingId]);

  const dateLabel = useMemo(
    () => formatDateLabel(startDate, dateMode === 'date_range' ? endDate : null, dateMode),
    [startDate, endDate, dateMode],
  );

  const summaryText = useMemo(() => {
    if (events.length === 0) {
      return 'No bulk updates have been applied yet.';
    }

    const latest = events[0];
    const dateSpan = formatDateLabel(latest.start_date, latest.end_date, latest.date_mode);
    return `Last run: ${formatEventType(latest.event_type)} (${dateSpan}) with ${latest.affected_hostelers} hostelers and ${latest.affected_date_rows} changed row(s).`;
  }, [events]);

  const hasUnsavedChanges = useMemo(
    () =>
      template !== 'full_closure' ||
      scope !== 'all_active' ||
      dateMode !== 'single_date' ||
      startDate.length > 0 ||
      endDate.length > 0 ||
      meals.breakfast ||
      meals.lunch ||
      meals.dinner ||
      preview !== null,
    [template, scope, dateMode, startDate, endDate, meals, preview],
  );

  function resetWorkflowState() {
    setStepIndex(0);
    setTemplate('full_closure');
    setScope('all_active');
    setDateMode('single_date');
    setStartDate('');
    setEndDate('');
    setMeals(DEFAULT_MEALS);
    setFormError('');
    setPreview(null);
    setPreviewLoading(false);
    setConfirmOpen(false);
    setApplying(false);
    setDiscardOpen(false);
    setEventsExpanded(false);
  }

  function openWorkflow() {
    resetWorkflowState();
    setWorkflowOpen(true);
  }

  function closeWorkflow(force = false) {
    if (!force && hasUnsavedChanges) {
      setDiscardOpen(true);
      return;
    }

    setWorkflowOpen(false);
    resetWorkflowState();
  }

  function toggleMeal(key: keyof MealsPayload) {
    if (template === 'full_closure') return;
    setMeals((previous) => ({ ...previous, [key]: !previous[key] }));
  }

  function validateForm(): string | null {
    const startError = validateFutureDateWithinWindow(startDate);
    if (startError) return startError;

    if (scope === 'specific_building' && !buildingId) {
      return 'Building selection is required for specific building scope.';
    }

    if (dateMode === 'date_range') {
      const endError = validateFutureDateWithinWindow(endDate);
      if (endError) return endError;
      if (endDate < startDate) {
        return 'End date must be on or after start date.';
      }
    }

    return null;
  }

  function validateCurrentStep(): string | null {
    if (stepIndex === 0) {
      if (scope === 'specific_building' && !buildingId) {
        return 'Building selection is required for specific building scope.';
      }
      return null;
    }

    if (stepIndex === 1) {
      const startError = validateFutureDateWithinWindow(startDate);
      if (startError) return startError;

      if (dateMode === 'date_range') {
        const endError = validateFutureDateWithinWindow(endDate);
        if (endError) return endError;
        if (endDate < startDate) {
          return 'End date must be on or after start date.';
        }
      }
    }

    return null;
  }

  function goToNextStep() {
    const validationError = validateCurrentStep();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError('');
    setStepIndex((previous) => Math.min(previous + 1, STEP_LABELS.length - 1));
  }

  async function fetchPreview() {
    setFormError('');
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setPreviewLoading(true);
    try {
      const response = await fetch('/api/admin/food-preferences/adjust/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          building_id: scope === 'specific_building' ? buildingId : undefined,
          date_mode: dateMode,
          start_date: startDate,
          end_date: dateMode === 'date_range' ? endDate : undefined,
          meals,
          preview_only: true,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setFormError(payload.error || 'Failed to preview bulk update');
        return;
      }

      setPreview(payload.preview ?? null);
    } catch {
      setFormError('Network error while loading preview');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function applyBulkUpdate(reason: string) {
    setApplying(true);
    try {
      const response = await fetch('/api/admin/food-preferences/adjust/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          building_id: scope === 'specific_building' ? buildingId : undefined,
          date_mode: dateMode,
          start_date: startDate,
          end_date: dateMode === 'date_range' ? endDate : undefined,
          meals,
          adjustment_reason: reason,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        onToast({ type: 'error', message: payload.error || 'Failed to apply bulk meal update' });
        return;
      }

      setEvents(payload.events ?? []);
      setPreview(payload.preview ?? null);
      setConfirmOpen(false);
      setEventsExpanded(true);

      if (payload.result?.partial_failures?.length > 0) {
        onToast({
          type: 'error',
          message: `Bulk meal update applied with ${payload.result.partial_failures.length} partial failure(s)`,
        });
      } else {
        onToast({
          type: 'success',
          message:
            payload.result?.message ||
            `Bulk meal update applied to ${payload.result?.total_hostelers_affected ?? 0} hostelers across ${payload.result?.total_dates_affected ?? 0} date(s)`,
        });
      }
    } catch {
      onToast({ type: 'error', message: 'Network error while applying bulk meal update' });
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      <BulkMealUpdateTriggerCard loading={loadingMeta} summaryText={summaryText} onOpen={openWorkflow} />

      {workflowOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Close bulk update workflow"
            className="absolute inset-0 bg-black/60"
            onClick={() => closeWorkflow()}
          />

          <section
            data-testid="bulk-workflow-panel"
            className="absolute inset-0 flex h-full w-full flex-col overflow-x-hidden bg-background md:left-auto md:right-0 md:w-[min(860px,92vw)] md:border-l"
            aria-label="Bulk meal update workflow"
          >
            <header className="space-y-3 border-b px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Bulk Meal Update</h3>
                  <p className="text-sm text-muted-foreground">Step {stepIndex + 1} of {STEP_LABELS.length}: {STEP_LABELS[stepIndex]}</p>
                </div>
                <Button type="button" variant="outline" onClick={() => closeWorkflow()} className="min-h-11">
                  Close
                </Button>
              </div>

              <ol className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4" aria-label="Bulk update steps">
                {STEP_LABELS.map((label, index) => {
                  const active = index === stepIndex;
                  const completed = index < stepIndex;
                  return (
                    <li
                      key={label}
                      className={[
                        'rounded-md border px-2 py-1.5 text-center',
                        active ? 'border-primary bg-primary/10 font-semibold text-foreground' : 'text-muted-foreground',
                        completed ? 'border-green-600/40 bg-green-600/10 text-foreground' : '',
                      ].join(' ')}
                    >
                      {index + 1}. {label}
                    </li>
                  );
                })}
              </ol>
            </header>

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-24">
              {formError ? (
                <div role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {formError}
                </div>
              ) : null}

              {stepIndex === 0 ? (
                <section className="space-y-3 rounded-md border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 1 - Scope</p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="scope"
                      checked={scope === 'all_active'}
                      onChange={() => setScope('all_active')}
                    />
                    All Active Hostelers
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="scope"
                      checked={scope === 'specific_building'}
                      onChange={() => setScope('specific_building')}
                    />
                    Specific Building
                  </label>
                  {scope === 'specific_building' ? (
                    <div className="space-y-2">
                      <label htmlFor="bulk-building-selector" className="text-sm font-medium">Building</label>
                      <select
                        id="bulk-building-selector"
                        className="w-full rounded-md border bg-background p-2 text-sm"
                        value={buildingId}
                        onChange={(event) => setBuildingId(event.target.value)}
                        aria-label="Building selector"
                      >
                        {buildings.map((building) => (
                          <option key={building.id} value={building.id}>
                            {building.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {stepIndex === 1 ? (
                <section className="space-y-3 rounded-md border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 2 - Date</p>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="date-mode"
                        checked={dateMode === 'single_date'}
                        onChange={() => setDateMode('single_date')}
                      />
                      Single Date
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="date-mode"
                        checked={dateMode === 'date_range'}
                        onChange={() => setDateMode('date_range')}
                      />
                      Date Range
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="bulk-start-date" className="text-sm font-medium">
                      Start date
                    </label>
                    <input
                      id="bulk-start-date"
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="w-full rounded-md border bg-background p-2 text-sm"
                    />
                  </div>

                  {dateMode === 'date_range' ? (
                    <div className="space-y-2">
                      <label htmlFor="bulk-end-date" className="text-sm font-medium">
                        End date
                      </label>
                      <input
                        id="bulk-end-date"
                        type="date"
                        value={endDate}
                        onChange={(event) => setEndDate(event.target.value)}
                        className="w-full rounded-md border bg-background p-2 text-sm"
                      />
                    </div>
                  ) : null}

                  <p className="text-xs text-muted-foreground">
                    Future dates only. Approved window: {getAllowedWindowDescription()}.
                  </p>
                </section>
              ) : null}

              {stepIndex === 2 ? (
                <section className="space-y-3 rounded-md border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 3 - Meals</p>
                  <label className="text-sm font-medium" htmlFor="action-template">Action template</label>
                  <select
                    id="action-template"
                    className="w-full rounded-md border bg-background p-2 text-sm"
                    value={template}
                    onChange={(event) => setTemplate(event.target.value as ActionTemplate)}
                    aria-label="Action template"
                  >
                    <option value="full_closure">Full Closure (B/L/D OFF)</option>
                    <option value="custom_availability">Custom Meal Availability</option>
                  </select>

                  {template === 'custom_availability' ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Button type="button" variant={meals.breakfast ? 'default' : 'outline'} onClick={() => toggleMeal('breakfast')} className="min-h-11">
                        Breakfast {meals.breakfast ? 'ON' : 'OFF'}
                      </Button>
                      <Button type="button" variant={meals.lunch ? 'default' : 'outline'} onClick={() => toggleMeal('lunch')} className="min-h-11">
                        Lunch {meals.lunch ? 'ON' : 'OFF'}
                      </Button>
                      <Button type="button" variant={meals.dinner ? 'default' : 'outline'} onClick={() => toggleMeal('dinner')} className="min-h-11">
                        Dinner {meals.dinner ? 'ON' : 'OFF'}
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                      Full closure template keeps all meals OFF.
                    </div>
                  )}
                </section>
              ) : null}

              {stepIndex === 3 ? (
                <section className="space-y-3 rounded-md border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 4 - Preview & Confirm</p>
                  {!preview ? (
                    <p className="text-sm text-muted-foreground">
                      Preview impact on demand before applying. This loads hostelers, date rows, and sample meal transitions.
                    </p>
                  ) : (
                    <div data-testid="bulk-preview-grid" className="grid gap-3 md:grid-cols-2 md:items-start">
                      <div className="space-y-3">
                        <div className="rounded-md bg-muted/40 p-3 text-sm">
                          <p><span className="font-medium">Hostelers affected:</span> {preview.total_hostelers_affected}</p>
                          <p><span className="font-medium">Date rows affected:</span> {preview.total_date_rows_affected}</p>
                        </div>

                        {preview.has_transmitted_bills ? (
                          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                            Transmitted bills found. Regenerate and retransmit required to publish updates.
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Sample current to new meals</p>
                        <div className="max-h-72 space-y-2 overflow-y-auto">
                          {preview.sample_changes.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No row changes. Selected meals already match current data.</p>
                          ) : (
                            preview.sample_changes.map((row) => (
                              <div key={`${row.hosteler_id}-${row.date}`} className="rounded border p-2 text-xs">
                                <p className="font-medium">{row.hosteler_name} ({row.date})</p>
                                <p>Current: {formatMeals(row.current_meals)}</p>
                                <p>New: {formatMeals(row.new_meals)}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <details open={eventsExpanded} onToggle={(event) => setEventsExpanded(event.currentTarget.open)}>
                    <summary className="cursor-pointer text-sm font-semibold">Recent bulk events (latest 10)</summary>
                    <div className="mt-2 space-y-2">
                      {loadingMeta ? (
                        <p className="text-sm text-muted-foreground">Loading recent events...</p>
                      ) : events.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No recent bulk events yet.</p>
                      ) : (
                        events.map((event) => (
                          <div key={event.id} className="rounded-md border p-3 text-sm">
                            <p className="font-medium">{formatEventType(event.event_type)}</p>
                            <p>Date span: {formatDateLabel(event.start_date, event.end_date, event.date_mode)}</p>
                            <p>Meals changed: {formatMeals(event.meals)}</p>
                            <p>Affected hostelers: {event.affected_hostelers}</p>
                            <p className="text-xs text-muted-foreground">
                              Created at: {new Date(event.created_at).toLocaleString('en-IN')} | Created by: {event.created_by}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </details>
                </section>
              ) : null}
            </div>

            <footer className="sticky bottom-0 border-t bg-background px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" onClick={() => closeWorkflow()} className="min-h-11">
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormError('');
                      setStepIndex((previous) => Math.max(previous - 1, 0));
                    }}
                    disabled={stepIndex === 0}
                    className="min-h-11"
                  >
                    Back
                  </Button>
                </div>

                {stepIndex < 3 ? (
                  <Button type="button" onClick={goToNextStep} className="min-h-11">
                    Next
                  </Button>
                ) : preview ? (
                  <Button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    disabled={preview.total_date_rows_affected === 0}
                    className="min-h-11"
                  >
                    Apply Bulk Update
                  </Button>
                ) : (
                  <Button type="button" onClick={() => void fetchPreview()} disabled={previewLoading} className="min-h-11">
                    {previewLoading ? 'Loading Preview...' : 'Preview Impact'}
                  </Button>
                )}
              </div>
            </footer>
          </section>
        </div>
      ) : null}

      <Dialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogDescription>
              You have unsaved bulk update changes. Closing now will discard them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDiscardOpen(false)}>
              Keep editing
            </Button>
            <Button
              type="button"
              onClick={() => {
                setDiscardOpen(false);
                closeWorkflow(true);
              }}
            >
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkUpdatePreviewModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        scopeLabel={scopeLabel}
        dateLabel={dateLabel}
        meals={meals}
        preview={preview}
        applying={applying}
        onConfirm={async ({ reason }) => {
          await applyBulkUpdate(reason);
        }}
      />
    </>
  );
}
