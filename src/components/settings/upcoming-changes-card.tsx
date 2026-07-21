'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateIST, formatINR, getTodayIST } from '@/lib/utils';

type MealType = 'breakfast' | 'lunch' | 'dinner';
type RoomClass = 'ac' | 'non_ac';

interface UpcomingMealRateChange {
  id: string;
  meal_type: MealType;
  old_rate: number;
  new_rate: number;
  effective_date: string;
  canceled_at: string | null;
}

interface UpcomingRoomRentChange {
  id: string;
  room_class: RoomClass;
  sharing_capacity: number;
  old_rent: number;
  new_rent: number;
  effective_date: string;
  canceled_at: string | null;
}

type UpcomingChange =
  | {
      id: string;
      type: 'meal';
      label: string;
      oldValue: number;
      newValue: number;
      effectiveDate: string;
      cancelPath: string;
    }
  | {
      id: string;
      type: 'room';
      label: string;
      oldValue: number;
      newValue: number;
      effectiveDate: string;
      cancelPath: string;
    };

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Meal - Breakfast',
  lunch: 'Meal - Lunch',
  dinner: 'Meal - Dinner',
};

const ROOM_CLASS_LABELS: Record<RoomClass, string> = {
  ac: 'Room Rent - AC',
  non_ac: 'Room Rent - Non-AC',
};

const WARNING_WINDOW_DAYS = 7;

function getDaysUntil(effectiveDate: string, today: string): number {
  const target = new Date(`${effectiveDate}T00:00:00Z`).getTime();
  const base = new Date(`${today}T00:00:00Z`).getTime();
  return Math.floor((target - base) / (24 * 60 * 60 * 1000));
}

export function UpcomingChangesCard() {
  const [changes, setChanges] = useState<UpcomingChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingCancel, setPendingCancel] = useState<UpcomingChange | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const today = useMemo(() => getTodayIST(), []);

  useEffect(() => {
    let isMounted = true;

    async function fetchUpcomingChanges() {
      setLoading(true);
      setError('');

      try {
        const [mealResponse, roomResponse] = await Promise.all([
          fetch('/api/admin/meal-rates?scope=upcoming'),
          fetch('/api/admin/room-rent-config?scope=upcoming'),
        ]);

        if (!mealResponse.ok || !roomResponse.ok) {
          setError('Could not load upcoming changes.');
          setLoading(false);
          return;
        }

        const mealData: { changes: UpcomingMealRateChange[] } = await mealResponse.json();
        const roomData: { changes: UpcomingRoomRentChange[] } = await roomResponse.json();

        const mealChanges: UpcomingChange[] = (mealData.changes || []).map((change) => ({
          id: change.id,
          type: 'meal',
          label: MEAL_LABELS[change.meal_type],
          oldValue: change.old_rate,
          newValue: change.new_rate,
          effectiveDate: change.effective_date,
          cancelPath: `/api/admin/meal-rates/change/${change.id}`,
        }));

        const roomChanges: UpcomingChange[] = (roomData.changes || []).map((change) => ({
          id: change.id,
          type: 'room',
          label: `${ROOM_CLASS_LABELS[change.room_class]} (${change.sharing_capacity} sharing)`,
          oldValue: change.old_rent,
          newValue: change.new_rent,
          effectiveDate: change.effective_date,
          cancelPath: `/api/admin/room-rent-config/change/${change.id}`,
        }));

        const merged = [...mealChanges, ...roomChanges]
          .filter((change) => change.effectiveDate > today)
          .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));

        if (isMounted) {
          setChanges(merged);
        }
      } catch {
        if (isMounted) {
          setError('Network error loading upcoming changes.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchUpcomingChanges();

    return () => {
      isMounted = false;
    };
  }, [today]);

  useEffect(() => {
    if (!toast) return;

    const timeout = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timeout);
  }, [toast]);

  async function handleConfirmCancel() {
    if (!pendingCancel) return;

    setCanceling(true);

    try {
      const response = await fetch(pendingCancel.cancelPath, { method: 'DELETE' });
      if (!response.ok) {
        setToast({ type: 'error', message: 'Failed to cancel change. Please try again.' });
        return;
      }

      setChanges((previous) => previous.filter((change) => change.id !== pendingCancel.id || change.type !== pendingCancel.type));
      setToast({ type: 'success', message: 'Scheduled change canceled.' });
      setPendingCancel(null);
    } catch {
      setToast({ type: 'error', message: 'Failed to cancel change. Please try again.' });
    } finally {
      setCanceling(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Upcoming Scheduled Changes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && (
          <p className="text-sm text-muted-foreground">Loading upcoming changes...</p>
        )}

        {!loading && error && (
          <p className="text-sm text-muted-foreground">{error}</p>
        )}

        {!loading && !error && changes.length === 0 && (
          <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
            No upcoming changes scheduled
          </p>
        )}

        {!loading && !error && changes.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {changes.map((change) => {
              const daysUntil = getDaysUntil(change.effectiveDate, today);
              const warnSoon = daysUntil >= 0 && daysUntil <= WARNING_WINDOW_DAYS;

              return (
                <div
                  key={`${change.type}-${change.id}`}
                  className={[
                    'rounded-md border p-3 space-y-2',
                    warnSoon ? 'border-amber-300 bg-amber-50/60' : 'border-border bg-background',
                  ].join(' ')}
                >
                  <p className="text-sm font-medium">{change.label}</p>
                  <p className="text-sm">
                    {formatINR(change.oldValue)} to {formatINR(change.newValue)}
                  </p>
                  <p className={warnSoon ? 'text-xs text-amber-700' : 'text-xs text-muted-foreground'}>
                    Effective: {formatDateIST(change.effectiveDate)}
                    {warnSoon ? ' (within 7 days)' : ''}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setPendingCancel(change)}
                  >
                    Cancel
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={pendingCancel !== null} onOpenChange={(open) => (!open ? setPendingCancel(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this change?</DialogTitle>
            <DialogDescription>
              {pendingCancel
                ? `Cancel this scheduled update for ${pendingCancel.label} (${formatINR(pendingCancel.oldValue)} to ${formatINR(pendingCancel.newValue)} on ${pendingCancel.effectiveDate})? This cannot be undone.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingCancel(null)} disabled={canceling}>
              Keep change
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmCancel} disabled={canceling}>
              {canceling ? 'Canceling...' : 'Confirm cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={[
            'fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-md px-4 py-3 text-sm shadow-lg',
            toast.type === 'error' ? 'bg-destructive text-destructive-foreground' : 'bg-green-600 text-white',
          ].join(' ')}
        >
          {toast.message}
        </div>
      )}
    </Card>
  );
}
