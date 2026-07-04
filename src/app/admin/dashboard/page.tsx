'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getTomorrowDate } from '@/lib/utils';
import { MealCountCard } from '@/components/meal-count-card';
import { HostelerList, type HostelerListItem } from '@/components/hosteler-list';
import { CountdownBanner } from '@/components/countdown-banner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MealCounts {
  breakfast: number;
  lunch: number;
  dinner: number;
}

export default function OwnerDashboardPage() {
  const [counts, setCounts] = useState<MealCounts>({ breakfast: 0, lunch: 0, dinner: 0 });
  const [submittedHostelers, setSubmittedHostelers] = useState<HostelerListItem[]>([]);
  const [pendingHostelers, setPendingHostelers] = useState<HostelerListItem[]>([]);
  const [deadlineTime, setDeadlineTime] = useState('21:00');
  const [serverTime, setServerTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [disconnected, setDisconnected] = useState(false);
  const [showSubmitted, setShowSubmitted] = useState(false);
  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const tomorrowDate = getTomorrowDate();

  const fetchDashboardData = useCallback(async () => {
    const [settingsRes, prefsRes, hostelersRes] = await Promise.all([
      supabase.from('settings').select('key, value').in('key', ['deadline_time']),
      supabase
        .from('food_preferences')
        .select('hosteler_id, breakfast, lunch, dinner')
        .eq('date', tomorrowDate)
        .is('canceled_at', null),
      supabase.from('hostelers').select('id, name, room_number').eq('status', 'active'),
    ]);

    // Set deadline
    const deadlineSetting = settingsRes.data?.find((s) => s.key === 'deadline_time');
    if (deadlineSetting) setDeadlineTime(deadlineSetting.value);

    // Compute server time (IST)
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
    const s = parts.find((p) => p.type === 'second')?.value ?? '00';
    setServerTime(`${h}:${m}:${s}`);

    // Compute counts
    const prefs = prefsRes.data ?? [];
    const newCounts: MealCounts = { breakfast: 0, lunch: 0, dinner: 0 };
    const submittedIds = new Set<string>();

    for (const pref of prefs) {
      if (pref.breakfast) newCounts.breakfast++;
      if (pref.lunch) newCounts.lunch++;
      if (pref.dinner) newCounts.dinner++;
      submittedIds.add(pref.hosteler_id);
    }
    setCounts(newCounts);

    // Split hostelers into submitted and pending
    const allHostelers = hostelersRes.data ?? [];
    const submitted: HostelerListItem[] = [];
    const pending: HostelerListItem[] = [];

    for (const h of allHostelers) {
      if (submittedIds.has(h.id)) {
        submitted.push(h);
      } else {
        pending.push(h);
      }
    }

    setSubmittedHostelers(submitted);
    setPendingHostelers(pending);
    setLoading(false);
  }, [tomorrowDate]);

  // Initial data fetch (T044)
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Supabase Realtime subscription (T042) + reconnection handling (T043)
  useEffect(() => {
    const channel = supabase
      .channel('owner-dashboard-food')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_preferences',
          filter: `date=eq.${tomorrowDate}`,
        },
        () => {
          // Refetch full data on any change to keep counts and lists consistent
          fetchDashboardData();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setDisconnected(false);
          if (disconnectTimer.current) {
            clearTimeout(disconnectTimer.current);
            disconnectTimer.current = null;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Start a 10s timer before showing disconnection banner
          if (!disconnectTimer.current) {
            disconnectTimer.current = setTimeout(() => {
              setDisconnected(true);
            }, 10_000);
          }
        }
      });

    channelRef.current = channel;

    return () => {
      if (disconnectTimer.current) {
        clearTimeout(disconnectTimer.current);
      }
      supabase.removeChannel(channel);
    };
  }, [tomorrowDate, fetchDashboardData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-sm text-muted-foreground">
        Food counts for tomorrow ({tomorrowDate})
      </p>

      {/* Reconnection banner (T043) */}
      {disconnected && (
        <div className="rounded-md px-4 py-2 text-sm font-medium text-center bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
          Live updates paused — reconnecting…
        </div>
      )}

      {/* Countdown banner */}
      {serverTime && (
        <CountdownBanner deadlineTime={deadlineTime} serverTimeIST={serverTime} />
      )}

      {/* Meal count cards (T039/T041) */}
      <div className="grid grid-cols-3 gap-4">
        <MealCountCard mealType="breakfast" count={counts.breakfast} label="Breakfast" />
        <MealCountCard mealType="lunch" count={counts.lunch} label="Lunch" />
        <MealCountCard mealType="dinner" count={counts.dinner} label="Dinner" />
      </div>

      {/* Pending hostelers list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Pending ({pendingHostelers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <HostelerList
            hostelers={pendingHostelers}
            emptyMessage="All hostelers have submitted!"
          />
        </CardContent>
      </Card>

      {/* Submitted hostelers (collapsible) */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setShowSubmitted(!showSubmitted)}
        >
          <CardTitle className="text-base flex items-center justify-between">
            <span>Submitted ({submittedHostelers.length})</span>
            <span className="text-muted-foreground text-sm">
              {showSubmitted ? '▲ Hide' : '▼ Show'}
            </span>
          </CardTitle>
        </CardHeader>
        {showSubmitted && (
          <CardContent>
            <HostelerList
              hostelers={submittedHostelers}
              emptyMessage="No submissions yet"
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
