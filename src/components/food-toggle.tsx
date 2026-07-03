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
}

const MEAL_CONFIG = [
  { key: 'breakfast' as const, label: 'Breakfast', time: '7–9 AM' },
  { key: 'lunch' as const, label: 'Lunch', time: '12:30–2 PM' },
  { key: 'dinner' as const, label: 'Dinner', time: '7:30–9:30 PM' },
];

export function FoodToggle({ meals, onChange, disabled = false }: FoodToggleProps) {
  return (
    <div className="flex flex-col gap-4">
      {MEAL_CONFIG.map(({ key, label, time }) => (
        <div key={key} className="flex items-center justify-between">
          <div>
            <p className="font-medium">{label}</p>
            <p className="text-sm text-muted-foreground">{time}</p>
          </div>
          <Toggle
            pressed={meals[key]}
            onPressedChange={(pressed) =>
              onChange({ ...meals, [key]: pressed })
            }
            disabled={disabled}
            className={cn(
              'w-16 h-10 text-sm font-medium',
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
