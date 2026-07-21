'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatINR } from '@/lib/utils';
import { getActiveRoomRentConfigs, type ActiveRoomRentConfig, type RoomRentConfigEntry } from '@/lib/room-rent-config-parser';
import { getTodayIST } from '@/lib/utils';

const ROOM_CLASS_LABELS: Record<string, string> = {
  ac: 'AC',
  non_ac: 'Non-AC',
};

export function RoomRentConfigDisplay() {
  const [configs, setConfigs] = useState<ActiveRoomRentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchConfigs() {
      try {
        const response = await fetch('/api/admin/room-rent-config');
        if (!response.ok) {
          setError('Could not load room rent configuration.');
          setLoading(false);
          return;
        }
        const data: { changes: RoomRentConfigEntry[] } = await response.json();
        const today = getTodayIST();
        setConfigs(getActiveRoomRentConfigs(data.changes, today));
      } catch {
        setError('Network error loading room rent configuration.');
      } finally {
        setLoading(false);
      }
    }

    fetchConfigs();
  }, []);

  return (
    <Card className="bg-muted/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">Current Room Rent Configuration</CardTitle>
          <Badge variant="secondary" className="text-xs">View only</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <p className="text-sm text-muted-foreground">Loading room rent configuration...</p>
        )}

        {!loading && error && (
          <p className="text-sm text-muted-foreground">{error}</p>
        )}

        {!loading && !error && configs.length === 0 && (
          <p className="text-sm text-muted-foreground">No active room rent configuration found.</p>
        )}

        {!loading && !error && configs.length > 0 && (
          <>
            {/* Tablet view: table */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-4 gap-x-4 text-xs font-medium text-muted-foreground mb-2 px-1">
                <span>Room Type</span>
                <span>Sharing Capacity</span>
                <span>Current Rent</span>
                <span>Effective From</span>
              </div>
              <div className="divide-y divide-border rounded-md border">
                {configs.map((config) => (
                  <div
                    key={`${config.room_class}-${config.sharing_capacity}`}
                    className="grid grid-cols-4 gap-x-4 items-center px-3 py-2.5"
                  >
                    <span className="text-sm font-medium">
                      {ROOM_CLASS_LABELS[config.room_class] ?? config.room_class}
                    </span>
                    <span className="text-sm">{config.sharing_capacity}</span>
                    <span className="text-sm">{formatINR(config.rent)}</span>
                    <span className="text-xs text-muted-foreground">{config.effective_date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile view: stacked cards */}
            <div className="sm:hidden space-y-2">
              {configs.map((config) => (
                <div
                  key={`${config.room_class}-${config.sharing_capacity}`}
                  className="rounded-md border px-3 py-2.5 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {ROOM_CLASS_LABELS[config.room_class] ?? config.room_class}
                    </span>
                    <span className="text-sm font-semibold">{formatINR(config.rent)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Sharing: {config.sharing_capacity}</span>
                    <span>{config.effective_date}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
