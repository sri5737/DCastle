'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { emitUiDiagnostic } from '@/lib/diagnostics/events';
import { RoomRentConfigForm } from '@/components/settings/room-rent-config-form';
import { MealRateChangeForm } from '@/components/settings/meal-rate-change-form';
import { MealRatesDisplay } from '@/components/settings/meal-rates-display';
import { RoomRentConfigDisplay } from '@/components/settings/room-rent-config-display';
import { UpcomingChangesCard } from '@/components/settings/upcoming-changes-card';
import { BulkMealUpdatePanel } from '@/components/settings/bulk-meal-update-panel';
import type { SettingsResponse } from '@/types';

const DEADLINE_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function OwnerSettingsPage() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [deadlineTime, setDeadlineTime] = useState('21:00');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [bulkToast, setBulkToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function fetchSettings() {
    setLoadError('');
    setLoading(true);
    try {
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
    } catch {
      setLoadError('Network error. Please try again.');
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!bulkToast) return;
    const timeout = window.setTimeout(() => setBulkToast(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [bulkToast]);

  function validateForm() {
    if (!DEADLINE_REGEX.test(deadlineTime)) {
      return 'Deadline must be in HH:MM 24-hour format';
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

    setSaving(true);
    emitUiDiagnostic({ page: '/admin/settings', action: 'settings.save', state: 'submit-start', metadata: { changeType: 'deadline' } });
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline_time: deadlineTime }),
      });

      const data = await response.json();
      if (!response.ok) {
        emitUiDiagnostic({ page: '/admin/settings', action: 'settings.save', state: 'submit-failure', metadata: { status: response.status } });
        setError((data.error || 'Failed to save settings') + ' Please try again.');
        return;
      }

      const refreshed = await fetch('/api/settings');
      if (refreshed.ok) {
        const nextSettings = await refreshed.json();
        setSettings(nextSettings);
        setDeadlineTime(nextSettings.deadline_time);
      }

      setSuccess(`Deadline saved. Changes apply immediately.`);
      emitUiDiagnostic({ page: '/admin/settings', action: 'settings.save', state: 'submit-success', metadata: { changeType: 'deadline' } });
    } catch {
      setError('Network error. Please try again.');
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure meal submission deadline and schedule future rate changes.
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

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Meals Submission Deadline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
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
            </div>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Saving...' : 'Save Deadline'}
            </Button>
          </CardContent>
        </Card>
      </form>

      {settings && (
        <div className="space-y-4 border-t pt-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Current Active Rates</h2>
            <p className="text-sm text-muted-foreground">
              Currently active meal rates and room rent configuration.
            </p>
          </div>
          <MealRatesDisplay rates={settings.rates} />
          <RoomRentConfigDisplay />
          <UpcomingChangesCard />
          <BulkMealUpdatePanel onToast={setBulkToast} />
        </div>
      )}

      <div className="space-y-6 border-t pt-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Rate History Management</h2>
          <p className="text-sm text-muted-foreground">
            Schedule global room rent and meal rate changes with future effective dates.
          </p>
        </div>

        {settingsError && (
          <div role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {settingsError}
          </div>
        )}

        {settingsSuccess && (
          <div role="status" className="rounded-md bg-green-100 px-4 py-3 text-sm text-green-800">
            {settingsSuccess}
          </div>
        )}

        <RoomRentConfigForm
          onSuccess={(msg) => {
            setSettingsSuccess(msg);
            setSettingsError('');
          }}
          onError={(msg) => {
            setSettingsError(msg);
            setSettingsSuccess('');
          }}
        />

        <MealRateChangeForm
          onSuccess={(msg) => {
            setSettingsSuccess(msg);
            setSettingsError('');
          }}
          onError={(msg) => {
            setSettingsError(msg);
            setSettingsSuccess('');
          }}
        />
      </div>

      {bulkToast ? (
        <div
          role="status"
          aria-live="polite"
          className={[
            'fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-md px-4 py-3 text-sm shadow-lg',
            bulkToast.type === 'error' ? 'bg-destructive text-destructive-foreground' : 'bg-green-600 text-white',
          ].join(' ')}
        >
          {bulkToast.message}
        </div>
      ) : null}
    </div>
  );
}