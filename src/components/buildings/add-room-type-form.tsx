'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AddRoomTypeFormProps {
  onCreated: () => void;
}

export function AddRoomTypeForm({ onCreated }: AddRoomTypeFormProps) {
  const [name, setName] = useState<'AC' | 'non-AC'>('AC');
  const [sharingCapacity, setSharingCapacity] = useState('');
  const [bunkCount, setBunkCount] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const parsedSharingCapacity = Number(sharingCapacity);
    const parsedBunks = Number(bunkCount);

    const res = await fetch('/api/admin/room-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        sharing_capacity: parsedSharingCapacity,
        cot_count: parsedBunks,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || 'Failed to create room type');
      return;
    }

    setName('AC');
    setSharingCapacity('');
    setBunkCount('');
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-4">
      <label className="space-y-1 text-sm sm:col-span-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Room Type</span>
        <select
          value={name}
          onChange={(e) => setName(e.target.value as 'AC' | 'non-AC')}
          className="min-h-[44px] w-full rounded-md border bg-background px-3 text-sm"
          aria-label="Room type name"
        >
          <option value="AC">AC</option>
          <option value="non-AC">non-AC</option>
        </select>
      </label>
      <label className="space-y-1 text-sm sm:col-span-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sharing Capacity</span>
        <Input
          type="number"
          min={1}
          max={10}
          value={sharingCapacity}
          onChange={(e) => setSharingCapacity(e.target.value)}
          required
          className="min-h-[44px]"
          aria-label="Sharing capacity"
        />
      </label>
      <label className="space-y-1 text-sm sm:col-span-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cot Count</span>
        <Input
          type="number"
          min={1}
          max={10}
          value={bunkCount}
          onChange={(e) => setBunkCount(e.target.value)}
          required
          className="min-h-[44px]"
          aria-label="Cot count"
        />
      </label>
      <div className="sm:col-span-1 sm:self-end">
        <Button type="submit" disabled={submitting} className="min-h-[44px] w-full">
          {submitting ? 'Adding...' : 'Add Room Type'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-4">
        Cot count defines inventory size for this room type. In Configure Cots, choose Normal for L-only labels
        (L1, L2...) or Bunker for L/U pairs.
      </p>
      {error ? <p className="text-sm text-destructive sm:col-span-4">{error}</p> : null}
    </form>
  );
}
