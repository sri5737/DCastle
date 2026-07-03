'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CountdownBanner } from '@/components/countdown-banner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MealPreferences {
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
}

export default function HostelerDashboard() {
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [preferences, setPreferences] = useState<MealPreferences | null>(null);
  const [deadlineTime, setDeadlineTime] = useState('21:00');
  const [serverTime, setServerTime] = useState('');
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [date, setDate] = useState('');

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/food/today-status');
        if (!res.ok) return;
        const data = await res.json();

        setSubmitted(data.submitted);
        setPreferences(data.preferences);
        setDeadlineTime(data.deadline);
        setServerTime(data.server_time_ist);
        setDeadlinePassed(data.deadline_passed);
        setDate(data.date);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      {serverTime && (
        <CountdownBanner deadlineTime={deadlineTime} serverTimeIST={serverTime} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Tomorrow&apos;s Meals</CardTitle>
          {date && (
            <p className="text-sm text-muted-foreground">{date}</p>
          )}
        </CardHeader>
        <CardContent>
          {submitted && preferences ? (
            <div className="space-y-4">
              <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                <p className="text-green-800 dark:text-green-300 font-medium text-sm mb-2">
                  ✓ Preferences submitted
                </p>
                <ul className="space-y-1 text-sm">
                  <li className={preferences.breakfast ? 'text-foreground' : 'text-muted-foreground line-through'}>
                    Breakfast {preferences.breakfast ? '✓' : '✗'}
                  </li>
                  <li className={preferences.lunch ? 'text-foreground' : 'text-muted-foreground line-through'}>
                    Lunch {preferences.lunch ? '✓' : '✗'}
                  </li>
                  <li className={preferences.dinner ? 'text-foreground' : 'text-muted-foreground line-through'}>
                    Dinner {preferences.dinner ? '✓' : '✗'}
                  </li>
                </ul>
              </div>

              {!deadlinePassed && (
                <Link href="/submit">
                  <Button variant="outline" className="w-full">
                    Update Preferences
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                {deadlinePassed
                  ? 'You did not submit preferences before the deadline.'
                  : 'You haven\'t submitted your food preferences for tomorrow yet.'}
              </p>
              {!deadlinePassed && (
                <Link href="/submit">
                  <Button className="w-full">Submit Preferences</Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
