'use client';

import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';

export interface MealToggleState {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

interface FoodToggleProps {
  meals: MealToggleState;
  onChange: (meals: MealToggleState) => void;
  disabled?: boolean;
  isAutoSubmitted?: boolean;
}

const MEAL_CONFIG = [
  { key: 'breakfast' as const, label: 'Breakfast', time: '7–9 AM' },
  { key: 'lunch' as const, label: 'Lunch', time: '12:30–2 PM' },
  { key: 'dinner' as const, label: 'Dinner', time: '7:30–9:30 PM' },
];

export function FoodToggle({ 
  meals, 
  onChange, 
  disabled = false,
  isAutoSubmitted = false 
}: FoodToggleProps) {
  // If meal is auto-submitted, show as read-only
  const shouldDisable = disabled || isAutoSubmitted;
  
  return (
    <div className="flex flex-col gap-4">
      {isAutoSubmitted && (
        <div className="rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-sm text-blue-900 dark:text-blue-200">
          <p className="font-medium">Auto-submitted meal</p>
          <p className="text-xs mt-1">This meal was automatically submitted at the deadline. Contact your owner to make changes.</p>
        </div>
      )}
      {MEAL_CONFIG.map(({ key, label, time }) => (
        <div key={key} className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{label}</p>
            <p className="text-sm text-muted-foreground">{time}</p>
          </div>
          <Toggle
            pressed={meals[key]}
            onPressedChange={(pressed) =>
              onChange({ ...meals, [key]: pressed })
            }
            disabled={shouldDisable}
            className={cn(
              'h-11 w-16 shrink-0 text-base font-medium',
              meals[key]
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {meals[key] ? 'Yes' : 'No'}
          </Toggle>
        </div>
      ))}
    </div>
  );
}
