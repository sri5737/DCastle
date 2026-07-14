'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RoomConfigurationChangeFormProps {
  roomId: string;
  onScheduled: () => void;
}

function getTodayIsoDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function RoomConfigurationChangeForm({ roomId, onScheduled }: RoomConfigurationChangeFormProps) {
  const today = useMemo(() => getTodayIsoDate(), []);
  const [sharing, setSharing] = useState('2');
  const [roomClass, setRoomClass] = useState<'ac' | 'non_ac'>('non_ac');
  const [rent, setRent] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isPastDate = effectiveDate < today;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (isPastDate) {
      setError('Effective date cannot be in the past');
      return;
    }

    setSubmitting(true);

    const res = await fetch(`/api/admin/rooms/${roomId}/configuration-change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        new_sharing_capacity: Number(sharing),
        new_room_class: roomClass,
        new_rent: Number(rent),
        effective_date: effectiveDate,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || 'Failed to schedule room configuration change');
      return;
    }

    setSharing('2');
    setRoomClass('non_ac');
    setRent('');
    setEffectiveDate(today);
    onScheduled();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2 rounded-md border p-3 sm:grid-cols-4">
      <div className="space-y-1">
        <label htmlFor={`room-sharing-${roomId}`} className="text-xs font-medium">
          New sharing capacity
        </label>
        <Input
          id={`room-sharing-${roomId}`}
          type="number"
          min={1}
          value={sharing}
          onChange={(e) => setSharing(e.target.value)}
          className="min-h-[44px]"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor={`room-class-${roomId}`} className="text-xs font-medium">
          Room class
        </label>
        <select
          id={`room-class-${roomId}`}
          value={roomClass}
          onChange={(e) => setRoomClass(e.target.value as 'ac' | 'non_ac')}
          className="min-h-[44px] w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="non_ac">Non AC</option>
          <option value="ac">AC</option>
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor={`room-rent-${roomId}`} className="text-xs font-medium">
          New rent
        </label>
        <Input
          id={`room-rent-${roomId}`}
          type="number"
          min={1}
          step="0.01"
          value={rent}
          onChange={(e) => setRent(e.target.value)}
          required
          className="min-h-[44px]"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor={`room-effective-date-${roomId}`} className="text-xs font-medium">
          Effective date
        </label>
        <Input
          id={`room-effective-date-${roomId}`}
          type="date"
          min={today}
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          className="min-h-[44px]"
        />
        {isPastDate ? (
          <p className="text-xs text-destructive">Effective date cannot be in the past</p>
        ) : null}
      </div>

      <Button type="submit" disabled={submitting || isPastDate} className="min-h-[44px] sm:col-span-4">
        {submitting ? 'Scheduling...' : 'Change Room Configuration'}
      </Button>
      {error ? <p className="text-sm text-destructive sm:col-span-4">{error}</p> : null}
    </form>
  );
}
