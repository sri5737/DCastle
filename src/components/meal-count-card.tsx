'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MealCountCardProps {
  mealType: 'breakfast' | 'lunch' | 'dinner';
  count: number;
  label: string;
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🍛',
  dinner: '🍽️',
};

export function MealCountCard({ mealType, count, label }: MealCountCardProps) {
  const [displayCount, setDisplayCount] = useState(count);
  const [animating, setAnimating] = useState(false);
  const prevCount = useRef(count);

  useEffect(() => {
    if (count !== prevCount.current) {
      setAnimating(true);
      const timeout = setTimeout(() => {
        setDisplayCount(count);
        setAnimating(false);
      }, 150);
      prevCount.current = count;
      return () => clearTimeout(timeout);
    }
  }, [count]);

  return (
    <Card>
      <CardHeader className="px-3 pt-3 pb-1 sm:px-6 sm:pt-6 sm:pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
          {MEAL_ICONS[mealType]} {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
        <p
          data-testid={`${mealType}-count`}
          className={`text-2xl font-bold transition-transform duration-150 sm:text-3xl ${
            animating ? 'scale-110 text-green-600' : 'scale-100'
          }`}
        >
          {displayCount}
        </p>
      </CardContent>
    </Card>
  );
}
