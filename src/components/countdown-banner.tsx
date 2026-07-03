'use client';

import { useEffect, useState } from 'react';

interface CountdownBannerProps {
  deadlineTime: string; // HH:MM format
  serverTimeIST: string; // HH:MM:SS format
}

function getMinutesRemaining(deadlineTime: string, currentTime: string): number {
  const [dH, dM] = deadlineTime.split(':').map(Number);
  const [cH, cM] = currentTime.split(':').map(Number);
  const deadlineMinutes = dH * 60 + dM;
  const currentMinutes = cH * 60 + cM;
  return Math.max(0, deadlineMinutes - currentMinutes);
}

function formatTimeRemaining(minutes: number): string {
  if (minutes <= 0) return 'Deadline passed';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m remaining`;
  return `${m}m remaining`;
}

export function CountdownBanner({ deadlineTime, serverTimeIST }: CountdownBannerProps) {
  const [minutesLeft, setMinutesLeft] = useState<number>(() =>
    getMinutesRemaining(deadlineTime, serverTimeIST)
  );

  useEffect(() => {
    setMinutesLeft(getMinutesRemaining(deadlineTime, serverTimeIST));

    const interval = setInterval(() => {
      setMinutesLeft((prev) => Math.max(0, prev - 1));
    }, 60_000);

    return () => clearInterval(interval);
  }, [deadlineTime, serverTimeIST]);

  // Only show when less than 2 hours (120 minutes) remain
  if (minutesLeft > 120 || minutesLeft <= 0) return null;

  const isUrgent = minutesLeft <= 30;

  return (
    <div
      className={`rounded-md px-4 py-2 text-sm font-medium text-center ${
        isUrgent
          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      }`}
    >
      ⏰ {formatTimeRemaining(minutesLeft)} to submit food preferences
    </div>
  );
}
