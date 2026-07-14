'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatINR, getTomorrowDate } from '@/lib/utils';
import { emitUiDiagnostic } from '@/lib/diagnostics/events';
import type { MealType, SettingsResponse } from '@/types';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

const DEADLINE_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner'];

type RateDrafts = Record<MealType, string>;

export function OwnerSettingsPage() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [deadlineTime, setDeadlineTime] = useState('21:00');
  const [rateDrafts, setRateDrafts] = useState<RateDrafts>({
    breakfast: '',
    lunch: '',
    dinner: '',
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const tomorrow = getTomorrowDate();

  async function fetchSettings() {
    setLoadError('');
    setLoading(true);
    const response = await fetch('/api/settings');
    if (!response.ok) {
      setLoadError('Could not load settings. Check your connection and retry.');
      setLoading(false);
      return;
    }

    const data = await response.json();
    setSettings(data);
    setDeadlineTime(data.deadline_time);
    setLoading(false);
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  function updateRateDraft(mealType: MealType, value: string) {
    setRateDrafts((current) => ({ ...current, [mealType]: value }));
  }

  function validateForm() {
    if (!DEADLINE_REGEX.test(deadlineTime)) {
      return 'Deadline must be in HH:MM 24-hour format';
    }

    for (const mealType of MEAL_TYPES) {
      const draft = rateDrafts[mealType].trim();
      if (!draft) continue;

      const rate = Number(draft);
      if (!Number.isFinite(rate) || rate <= 0) {
        return `${MEAL_LABELS[mealType]} rate must be a positive number`;
      }
    }

    return '';
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const rates = MEAL_TYPES.reduce<Partial<Record<MealType, number>>>((accumulator, mealType) => {
      const draft = rateDrafts[mealType].trim();
      if (draft) accumulator[mealType] = Number(draft);
      return accumulator;
    }, {});

    const payload: { deadline_time: string; rates?: Partial<Record<MealType, number>> } = {
      deadline_time: deadlineTime,
    };

    if (Object.keys(rates).length > 0) {
      payload.rates = rates;
    }

    setSaving(true);
  emitUiDiagnostic({ page: '/admin/settings', action: 'settings.save', state: 'submit-start', metadata: { hasRates: Object.keys(rates).length > 0 } });
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        emitUiDiagnostic({ page: '/admin/settings', action: 'settings.save', state: 'submit-failure', metadata: { status: response.status } });
        setError((data.error || 'Failed to save settings') + ' Review your pending changes and retry.');
        return;
      }

      const refreshed = await fetch('/api/settings');
      if (refreshed.ok) {
        const nextSettings = await refreshed.json();
        setSettings(nextSettings);
        setDeadlineTime(nextSettings.deadline_time);
      }

      const changedRateLabels = MEAL_TYPES.filter((mealType) => rates[mealType] !== undefined)
        .map((mealType) => `${MEAL_LABELS[mealType]} ${formatINR(rates[mealType] ?? 0)}`);
      setRateDrafts({ breakfast: '', lunch: '', dinner: '' });
      setSuccess(
        changedRateLabels.length > 0
          ? `Settings saved. ${changedRateLabels.join(', ')} effective from tomorrow (${tomorrow}).`
          : 'Settings saved.'
      );
      emitUiDiagnostic({ page: '/admin/settings', action: 'settings.save', state: 'submit-success', metadata: { changedRates: changedRateLabels.length } });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {loadError}
        </div>
        <Button onClick={fetchSettings} variant="outline" className="w-full sm:w-auto">
          Retry loading settings
        </Button>
      </div>
    );
  }

  const pendingChanges: string[] = [];
  if (settings && deadlineTime !== settings.deadline_time) {
    pendingChanges.push(`Deadline: ${settings.deadline_time} -> ${deadlineTime}`);
  }
  for (const mealType of MEAL_TYPES) {
    const draft = rateDrafts[mealType].trim();
    if (!draft) continue;
    pendingChanges.push(`${MEAL_LABELS[mealType]} rate -> ${formatINR(Number(draft))} (effective ${tomorrow})`);
  }

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure the daily submission deadline and future meal rates.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="rounded-md bg-green-100 px-4 py-3 text-sm text-green-800">
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pending Changes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingChanges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending changes. Update deadline or enter new rates to prepare a save.
            </p>
          ) : (
            pendingChanges.map((change) => (
              <p key={change} className="text-sm">- {change}</p>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submission Deadline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label htmlFor="deadline_time" className="text-sm font-medium">
            Deadline time
          </label>
          <Input
            id="deadline_time"
            type="time"
            value={deadlineTime}
            onChange={(event) => setDeadlineTime(event.target.value)}
            aria-describedby="deadline_help"
            required
          />
          <p id="deadline_help" className="text-sm text-muted-foreground">
            Current deadline: {settings?.deadline_time ?? deadlineTime} IST. Changes apply immediately.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Meal Rates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter only the rates you want to change. New rates are effective from tomorrow ({tomorrow}).
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            {MEAL_TYPES.map((mealType) => {
              const currentRate = settings?.rates[mealType];
              return (
                <div key={mealType} className="space-y-2 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor={`${mealType}_rate`} className="text-sm font-medium">
                      {MEAL_LABELS[mealType]} rate
                    </label>
                    <Badge variant="secondary">
                      {currentRate ? formatINR(currentRate.rate) : 'Not set'}
                    </Badge>
                  </div>
                  <Input
                    id={`${mealType}_rate`}
                    inputMode="decimal"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder={currentRate ? String(currentRate.rate) : '0'}
                    value={rateDrafts[mealType]}
                    onChange={(event) => updateRateDraft(mealType, event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Current rate since {currentRate?.effective_from || 'seed'}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </form>
  );
}