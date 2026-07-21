'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/lib/utils';
import { isDateWithin3MonthWindow } from '@/lib/rate-change-window';

type MealType = 'breakfast' | 'lunch' | 'dinner';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
};

interface MealRateChangeFormProps {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

interface PendingMealRateChange {
  meal_type: MealType;
  new_rate: number;
  effective_date: string;
}

export function MealRateChangeForm({ onSuccess, onError }: MealRateChangeFormProps) {
  const [meal_type, setMealType] = useState<MealType>('breakfast');
  const [new_rate, setNewRate] = useState('');
  const [effective_date, setEffectiveDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending_changes, setPendingChanges] = useState<PendingMealRateChange[]>([]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    
    // Validation
    if (!new_rate || Number(new_rate) <= 0) {
      onError?.('Rate must be greater than 0');
      return;
    }
    if (!effective_date) {
      onError?.('Effective date is required');
      return;
    }
    if (!isDateWithin3MonthWindow(effective_date)) {
      onError?.('Effective date must be within the 3-month window (previous, current, or next month). You cannot schedule changes for months outside this range.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/meal-rates/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meal_type,
          new_rate: Number(new_rate),
          effective_date,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        onError?.(data.error || 'Failed to save meal rate change');
        return;
      }

      onSuccess?.(`Meal rate change scheduled for ${effective_date}`);
      setPendingChanges([...pending_changes, {
        meal_type,
        new_rate: Number(new_rate),
        effective_date,
      }]);
      
      // Reset form
      setMealType('breakfast');
      setNewRate('');
      setEffectiveDate('');
    } catch (error) {
      onError?.(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Meal Rate Changes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Schedule meal rate changes for breakfast, lunch, or dinner with future effective dates.
        </p>

        {pending_changes.length > 0 && (
          <div className="space-y-2 rounded-md bg-blue-50 p-3">
            <p className="text-xs font-medium text-blue-900">Pending changes:</p>
            {pending_changes.map((change) => (
              <p key={`${change.meal_type}-${change.effective_date}`} className="text-xs text-blue-800">
                • {MEAL_LABELS[change.meal_type]}: {formatINR(change.new_rate)} on {change.effective_date}
              </p>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="meal_type" className="text-sm font-medium">
                Meal type
              </label>
              <select
                id="meal_type"
                value={meal_type}
                onChange={(e) => setMealType(e.target.value as MealType)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {Object.entries(MEAL_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="meal_new_rate" className="text-sm font-medium">
                New rate (₹)
              </label>
              <Input
                id="meal_new_rate"
                type="number"
                min="0.01"
                step="0.01"
                value={new_rate}
                onChange={(e) => setNewRate(e.target.value)}
                placeholder="e.g., 35"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="meal_effective_date" className="text-sm font-medium">
                Effective date
              </label>
              <Input
                id="meal_effective_date"
                type="date"
                value={effective_date}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Saving...' : 'Schedule Meal Rate Change'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
