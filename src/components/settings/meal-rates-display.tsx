'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatINR } from '@/lib/utils';

interface MealRates {
  breakfast: { rate: number; effective_from: string };
  lunch: { rate: number; effective_from: string };
  dinner: { rate: number; effective_from: string };
}

interface MealRatesDisplayProps {
  rates: MealRates;
}

const MEAL_ROWS: Array<{ key: keyof MealRates; label: string }> = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
];

export function MealRatesDisplay({ rates }: MealRatesDisplayProps) {
  // All three meals share the same effective_from in practice, use breakfast as representative
  const effectiveFrom = rates.breakfast.effective_from;

  return (
    <Card className="bg-muted/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">Currently Active Meal Rates</CardTitle>
          <Badge variant="secondary" className="text-xs">View only</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Effective from: {effectiveFrom}
        </p>
      </CardHeader>
      <CardContent>
        {/* Mobile: single-column stacked; tablet: three-column table */}
        <div className="hidden sm:grid sm:grid-cols-3 sm:gap-x-4 text-xs font-medium text-muted-foreground mb-2 px-1">
          <span>Meal Type</span>
          <span>Current Rate</span>
          <span>Effective From</span>
        </div>
        <div className="divide-y divide-border rounded-md border">
          {MEAL_ROWS.map(({ key, label }) => {
            const { rate, effective_from } = rates[key];
            return (
              <div key={key} className="px-3 py-2.5">
                {/* Mobile layout */}
                <div className="flex items-center justify-between sm:hidden">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-sm">{formatINR(rate)}</span>
                </div>
                {/* Tablet layout */}
                <div className="hidden sm:grid sm:grid-cols-3 sm:gap-x-4 sm:items-center">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-sm">{formatINR(rate)}</span>
                  <span className="text-xs text-muted-foreground">{effective_from}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
