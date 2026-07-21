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
  const [statusError, setStatusError] = useState('');
  const [availingMess, setAvailingMess] = useState(true);
  const [isAutoSubmitted, setIsAutoSubmitted] = useState(false);

  // Pre-fill: fetch existing preference for tomorrow
  async function fetchStatus() {
    setStatusError('');
    setLoading(true);
    try {
      const res = await fetch('/api/food/today-status');
      if (!res.ok) {
        setStatusError('Unable to load your submission status right now. Please retry.');
        return;
      }
      const data = await res.json();

      setDeadlineTime(data.deadline);
      setServerTime(data.server_time_ist);
      setDeadlinePassed(data.deadline_passed);
      setAvailingMess(data.availing_mess ?? true);

      if (data.preferences) {
        setMeals({
          breakfast: data.preferences.breakfast,
          lunch: data.preferences.lunch,
          dinner: data.preferences.dinner,
        });
        setIsAutoSubmitted(data.preferences.is_auto_submitted || false);
        setSubmitted(true);
      } else {
        // If meal submission is enabled, set defaults to true for new meals
        if (data.availing_mess !== false) {
          setMeals({
            breakfast: true,
            lunch: true,
            dinner: true,
          });
        }
        setSubmitted(false);
      }
    } catch {
      setStatusError('Unable to load your submission status right now. Check your connection and retry.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
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
        setError((data.error || 'Failed to submit') + ' You can review your meals and try again.');
        return;
      }

      setSubmitted(true);
      emitUiDiagnostic({ page: '/submit', action: 'food.submit', state: 'navigation-intent', metadata: { redirectTo: '/dashboard' } });
      router.push('/dashboard');
    } catch {
      setError('Unable to save right now. Please check your connection and retry.');
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

  if (statusError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Unable to load submission form</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{statusError}</p>
          <Button onClick={fetchStatus} variant="outline" className="w-full sm:w-auto">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Block access when meal submission is disabled
  if (availingMess === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Meal Submission Disabled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Meal submission is disabled. Please contact owner to enable meal facilities.
          </p>
        </CardContent>
      </Card>
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
          {!submitted && !deadlinePassed && (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              No submission yet for tomorrow. Pick your meals and save.
            </div>
          )}

          <FoodToggle
            meals={meals}
            onChange={setMeals}
            disabled={deadlinePassed || isAutoSubmitted}
            isAutoSubmitted={isAutoSubmitted}
          />

          {deadlinePassed && !isAutoSubmitted && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              Submissions are closed for tomorrow. Deadline was {deadlineTime}.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center">
              {error}
            </p>
          )}

          {!deadlinePassed && !isAutoSubmitted && (
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
