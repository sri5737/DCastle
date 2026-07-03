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
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {MEAL_ICONS[mealType]} {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={`text-3xl font-bold transition-transform duration-150 ${
            animating ? 'scale-110 text-green-600' : 'scale-100'
          }`}
        >
          {displayCount}
        </p>
      </CardContent>
    </Card>
  );
}
