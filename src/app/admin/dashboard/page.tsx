'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getTomorrowDate } from '@/lib/utils';
import { MealCountCard } from '@/components/meal-count-card';
import { HostelerList, type HostelerListItem } from '@/components/hosteler-list';
import { CountdownBanner } from '@/components/countdown-banner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface MealCounts {
  breakfast: number;
  lunch: number;
  dinner: number;
}

interface DashboardResponse {
  date: string;
  deadlineTime: string;
  serverTime: string;
  counts: MealCounts;
  submittedHostelers: HostelerListItem[];
  pendingHostelers: HostelerListItem[];
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
  const [quickFind, setQuickFind] = useState('');
  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const tomorrowDate = getTomorrowDate();

  const fetchDashboardData = useCallback(async () => {
    const response = await fetch('/api/owner/dashboard', { cache: 'no-store' });
    if (!response.ok) {
      setLoading(false);
      return;
    }

    const data = (await response.json()) as DashboardResponse;
    setDeadlineTime(data.deadlineTime);
    setServerTime(data.serverTime);
    setCounts(data.counts);
    setSubmittedHostelers(data.submittedHostelers);
    setPendingHostelers(data.pendingHostelers);
    setLoading(false);
  }, []);

  // Initial data fetch (T044)
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Fallback refresh keeps dashboard data honest if Realtime is unavailable.
  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 2_000);
    return () => clearInterval(interval);
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

  const normalizedQuery = quickFind.trim().toLowerCase();
  const matchesQuery = (hosteler: HostelerListItem) => {
    if (!normalizedQuery) return true;
    return (
      hosteler.name.toLowerCase().includes(normalizedQuery) ||
      hosteler.room_number.toLowerCase().includes(normalizedQuery)
    );
  };

  const filteredPendingHostelers = pendingHostelers.filter(matchesQuery);
  const filteredSubmittedHostelers = submittedHostelers.filter(matchesQuery);

  const pendingEmptyMessage = normalizedQuery
    ? `No pending hostelers match "${quickFind}".`
    : 'All active hostelers are currently submitted.';

  const submittedEmptyMessage = normalizedQuery
    ? `No submitted hostelers match "${quickFind}".`
    : 'No submissions yet.';

  return (
    <div className="space-y-6">
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
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <MealCountCard mealType="breakfast" count={counts.breakfast} label="Breakfast" />
        <MealCountCard mealType="lunch" count={counts.lunch} label="Lunch" />
        <MealCountCard mealType="dinner" count={counts.dinner} label="Dinner" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Find</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            value={quickFind}
            onChange={(event) => setQuickFind(event.target.value)}
            placeholder="Search by hosteler name or room"
            aria-label="Quick find hostelers"
          />
        </CardContent>
      </Card>

      {/* Pending hostelers list */}
      <Card data-testid="pending-hostelers">
        <CardHeader>
          <CardTitle className="text-base">
            Pending ({pendingHostelers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <HostelerList
            hostelers={filteredPendingHostelers}
            emptyMessage={pendingEmptyMessage}
          />
        </CardContent>
      </Card>

      {/* Submitted hostelers (collapsible) */}
      <Card data-testid="submitted-hostelers">
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
              hostelers={filteredSubmittedHostelers}
              emptyMessage={submittedEmptyMessage}
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
