'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatINR } from '@/lib/utils';
import { isDateWithin3MonthWindow } from '@/lib/rate-change-window';

type RoomClass = 'ac' | 'non_ac';

interface RoomRentConfigFormProps {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function RoomRentConfigForm({ onSuccess, onError }: RoomRentConfigFormProps) {
  const [sharing_capacity, setSharingCapacity] = useState('');
  const [room_class, setRoomClass] = useState<RoomClass>('ac');
  const [new_rent, setNewRent] = useState('');
  const [effective_date, setEffectiveDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [pending_changes, setPendingChanges] = useState<Array<{
    sharing_capacity: number;
    room_class: RoomClass;
    new_rent: number;
    effective_date: string;
  }>>([]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    
    // Validation
    if (!sharing_capacity || Number(sharing_capacity) < 1) {
      onError?.('Sharing capacity must be at least 1');
      return;
    }
    if (!new_rent || Number(new_rent) <= 0) {
      onError?.('Rent must be greater than 0');
      return;
    }
    if (!effective_date) {
      onError?.('Effective date is required');
      return;
    }
    if (!isDateWithin3MonthWindow(effective_date)) {
      onError?.('Effective date must be within the 3-month window (previous, current, or next month). You cannot schedule changes for months outside this range.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/room-rent-config/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sharing_capacity: Number(sharing_capacity),
          room_class,
          new_rent: Number(new_rent),
          effective_date,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        onError?.(data.error || 'Failed to save rent config change');
        return;
      }

      onSuccess?.(`Room rent config change scheduled for ${effective_date}`);
      setPendingChanges([...pending_changes, {
        sharing_capacity: Number(sharing_capacity),
        room_class,
        new_rent: Number(new_rent),
        effective_date,
      }]);
      
      // Reset form
      setSharingCapacity('');
      setRoomClass('ac');
      setNewRent('');
      setEffectiveDate('');
    } catch (error) {
      onError?.(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Global Room Rent Config</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Schedule room rent changes by sharing capacity and room type.
        </p>

        {pending_changes.length > 0 && (
          <div className="space-y-2 rounded-md bg-blue-50 p-3">
            <p className="text-xs font-medium text-blue-900">Pending changes:</p>
            {pending_changes.map((change) => (
              <p key={`${change.sharing_capacity}-${change.room_class}-${change.effective_date}`} className="text-xs text-blue-800">
                • {change.room_class.replace('_', ' ').toUpperCase()} {change.sharing_capacity} sharing: {formatINR(change.new_rent)} on {change.effective_date}
              </p>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="sharing_capacity" className="text-sm font-medium">
                Sharing capacity
              </label>
              <Input
                id="sharing_capacity"
                type="number"
                min="1"
                value={sharing_capacity}
                onChange={(e) => setSharingCapacity(e.target.value)}
                placeholder="e.g., 2"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="room_class" className="text-sm font-medium">
                Room type
              </label>
              <select
                id="room_class"
                value={room_class}
                onChange={(e) => setRoomClass(e.target.value as RoomClass)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="ac">AC</option>
                <option value="non_ac">Non-AC</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="new_rent" className="text-sm font-medium">
                New rent (₹)
              </label>
              <Input
                id="new_rent"
                type="number"
                min="0.01"
                step="0.01"
                value={new_rent}
                onChange={(e) => setNewRent(e.target.value)}
                placeholder="e.g., 5000"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="effective_date" className="text-sm font-medium">
                Effective date
              </label>
              <Input
                id="effective_date"
                type="date"
                value={effective_date}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Saving...' : 'Schedule Rent Change'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
