'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FoodToggle, type MealToggleState } from '@/components/food-toggle';
import { CountdownBanner } from '@/components/countdown-banner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { emitUiDiagnostic } from '@/lib/diagnostics/events';

export default function SubmitFoodPage() {
  const router = useRouter();
  const [meals, setMeals] = useState<MealToggleState>({
    breakfast: true,
    lunch: true,
    dinner: true,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deadlineTime, setDeadlineTime] = useState('21:00');
  const [serverTime, setServerTime] = useState('');
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill: fetch existing preference for tomorrow
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/food/today-status');
        if (!res.ok) return;
        const data = await res.json();

        setDeadlineTime(data.deadline);
        setServerTime(data.server_time_ist);
        setDeadlinePassed(data.deadline_passed);

        if (data.preferences) {
          setMeals({
            breakfast: data.preferences.breakfast,
            lunch: data.preferences.lunch,
            dinner: data.preferences.dinner,
          });
          setSubmitted(true);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    emitUiDiagnostic({ page: '/submit', action: 'food.submit', state: 'submit-start', metadata: { ...meals } });

    try {
      const res = await fetch('/api/food/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meals),
      });

      if (!res.ok) {
        const data = await res.json();
        emitUiDiagnostic({ page: '/submit', action: 'food.submit', state: 'submit-failure', metadata: { status: res.status } });
        setError(data.error || 'Failed to submit');
        return;
      }

      setSubmitted(true);
      emitUiDiagnostic({ page: '/submit', action: 'food.submit', state: 'navigation-intent', metadata: { redirectTo: '/dashboard' } });
      router.push('/dashboard');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {serverTime && (
        <CountdownBanner deadlineTime={deadlineTime} serverTimeIST={serverTime} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {submitted ? 'Update Food Preferences' : 'Submit Food Preferences'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Select your meals for tomorrow
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <FoodToggle
            meals={meals}
            onChange={setMeals}
            disabled={deadlinePassed}
          />

          {deadlinePassed && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              Submissions are closed for tomorrow. Deadline was {deadlineTime}.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {error}
            </p>
          )}

          {!deadlinePassed && (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full"
            >
              {submitting
                ? 'Saving...'
                : submitted
                ? 'Update Preferences'
                : 'Submit Preferences'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
