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
import { Input } from '@/components/ui/input';
import { compareWithTodayIST, getTodayIST } from '@/lib/utils';

type Meals = {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
};

type ToastPayload = {
  type: 'success' | 'error';
  message: string;
};

type HostelerSummary = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  hosteler: HostelerSummary | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onToast: (payload: ToastPayload) => void;
};

const INITIAL_MEALS: Meals = {
  breakfast: false,
  lunch: false,
  dinner: false,
};

function formatWarningMonth(label: string | null) {
  return label ?? 'selected month';
}

export function MealAdjustmentModal({ open, hosteler, onOpenChange, onSaved, onToast }: Props) {
  const today = useMemo(() => getTodayIST(), []);
  const [selectedDate, setSelectedDate] = useState('');
  const [meals, setMeals] = useState<Meals>(INITIAL_MEALS);
  const [reason, setReason] = useState('');
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reasonError, setReasonError] = useState('');
  const [transmittedWarningMonth, setTransmittedWarningMonth] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedDate('');
      setMeals(INITIAL_MEALS);
      setReason('');
      setReasonError('');
      setTransmittedWarningMonth(null);
    }
  }, [open]);

  async function loadMealsForDate(date: string) {
    if (!hosteler) return;
    setLoadingMeals(true);

    const params = new URLSearchParams({ hosteler_id: hosteler.id, date });
    const res = await fetch(`/api/admin/food-preferences/adjust?${params.toString()}`, {
      cache: 'no-store',
    });

    const payload = await res.json();
    setLoadingMeals(false);

    if (!res.ok) {
      onToast({ type: 'error', message: payload.error || 'Failed to load meals for selected date' });
      return;
    }

    setMeals({
      breakfast: !!payload.meals?.breakfast,
      lunch: !!payload.meals?.lunch,
      dinner: !!payload.meals?.dinner,
    });
    setTransmittedWarningMonth(payload.has_transmitted_bill ? payload.warning_month_label : null);
  }

  async function handleDateChange(date: string) {
    setSelectedDate(date);
    setReasonError('');
    if (!date) {
      setMeals(INITIAL_MEALS);
      setTransmittedWarningMonth(null);
      return;
    }
    if (compareWithTodayIST(date) === 1) {
      onToast({ type: 'error', message: 'Only past or current dates can be adjusted' });
      setSelectedDate('');
      return;
    }
    await loadMealsForDate(date);
  }

  function toggleMeal(key: keyof Meals) {
    setMeals((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    if (!hosteler || !selectedDate) return;
    if (!reason.trim()) {
      setReasonError('Reason is required');
      return;
    }

    setSaving(true);
    const res = await fetch('/api/admin/food-preferences/adjust', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hosteler_id: hosteler.id,
        date: selectedDate,
        meals,
        adjustment_reason: reason.trim(),
      }),
    });

    const payload = await res.json();
    setSaving(false);

    if (!res.ok) {
      onToast({ type: 'error', message: payload.error || 'Failed to save meal adjustment' });
      return;
    }

    onToast({ type: 'success', message: 'Meal adjustment saved' });
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-md overflow-x-hidden p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{hosteler ? `Adjust Meals for ${hosteler.name}` : 'Adjust Meals'}</DialogTitle>
          <DialogDescription>
            Select a date, update meals, and provide a required reason for the adjustment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="adjust-date" className="text-sm font-medium">
              Date
            </label>
            <Input
              id="adjust-date"
              type="date"
              value={selectedDate}
              max={today}
              onChange={(event) => void handleDateChange(event.target.value)}
              aria-label="Adjustment date"
            />
          </div>

          {transmittedWarningMonth ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              Warning: Bill for {formatWarningMonth(transmittedWarningMonth)} already transmitted. Changes will only be visible after regenerating and retransmitting the bill.
            </p>
          ) : null}

          <div className="space-y-2">
            <p className="text-sm font-medium">Meals</p>
            {loadingMeals ? (
              <p className="text-sm text-muted-foreground">Loading existing meal entry...</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button type="button" variant={meals.breakfast ? 'default' : 'outline'} onClick={() => toggleMeal('breakfast')} className="min-h-11">
                  Breakfast: {meals.breakfast ? 'On' : 'Off'}
                </Button>
                <Button type="button" variant={meals.lunch ? 'default' : 'outline'} onClick={() => toggleMeal('lunch')} className="min-h-11">
                  Lunch: {meals.lunch ? 'On' : 'Off'}
                </Button>
                <Button type="button" variant={meals.dinner ? 'default' : 'outline'} onClick={() => toggleMeal('dinner')} className="min-h-11">
                  Dinner: {meals.dinner ? 'On' : 'Off'}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="adjust-reason" className="text-sm font-medium">
              Reason
            </label>
            <textarea
              id="adjust-reason"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                if (reasonError) setReasonError('');
              }}
              rows={4}
              className="w-full rounded-md border bg-background p-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Why is this adjustment needed?"
              aria-label="Adjustment reason"
            />
            {reasonError ? <p className="text-sm text-destructive">{reasonError}</p> : null}
          </div>
        </div>

        <DialogFooter className="mt-2 gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving || loadingMeals || !selectedDate}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}