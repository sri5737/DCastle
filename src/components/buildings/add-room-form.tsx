'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RoomTypeOption {
  id: string;
  name: string;
  sharing_capacity?: number;
  cot_count?: number;
  active?: boolean;
}

interface AddRoomFormProps {
  buildingId: string;
  roomTypes: RoomTypeOption[];
  onCreated: () => void;
}

export function AddRoomForm({ buildingId, roomTypes, onCreated }: AddRoomFormProps) {
  const [roomNumber, setRoomNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [roomClass, setRoomClass] = useState<'AC' | 'non-AC'>('AC');
  const [sharingCapacity, setSharingCapacity] = useState('');
  const [cotCount, setCotCount] = useState('');
  const [cotConfigurationType, setCotConfigurationType] = useState<'bunker' | 'normal' | ''>('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const matchingActiveTemplate = useMemo(() => {
    const parsedSharing = Number(sharingCapacity);
    if (!Number.isInteger(parsedSharing) || parsedSharing <= 0) return null;

    return (
      roomTypes.find(
        (roomType) =>
          roomType.active !== false &&
          roomType.name === roomClass &&
          Number(roomType.sharing_capacity) === parsedSharing,
      ) ?? null
    );
  }, [roomClass, roomTypes, sharingCapacity]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!cotConfigurationType) {
      setError('Select cot configuration type');
      return;
    }

    const parsedSharingCapacity = Number(sharingCapacity);
    const parsedCotCount = Number(cotCount);

    if (!Number.isInteger(parsedSharingCapacity) || parsedSharingCapacity < 1 || parsedSharingCapacity > 10) {
      setError('Sharing capacity must be between 1 and 10');
      return;
    }

    if (!Number.isInteger(parsedCotCount) || parsedCotCount < 1 || parsedCotCount > 10) {
      setError('Cot count must be between 1 and 10');
      return;
    }

    setSubmitting(true);
    const res = await fetch(`/api/admin/buildings/${buildingId}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_number: roomNumber.trim(),
        floor: floor || null,
        room_class: roomClass,
        sharing_capacity: parsedSharingCapacity,
        cot_count: parsedCotCount,
        cot_configuration_type: cotConfigurationType,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || 'Failed to add room');
      return;
    }

    setRoomNumber('');
    setFloor('');
    setRoomClass('AC');
    setSharingCapacity('');
    setCotCount('');
    setCotConfigurationType('');
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2 rounded-md border p-3 sm:grid-cols-4">
      <label className="space-y-1 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Room Number</span>
        <Input
          value={roomNumber}
          onChange={(e) => setRoomNumber(e.target.value)}
          required
          className="min-h-[44px]"
          aria-label="Room number"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Floor</span>
        <select
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
          className="min-h-[44px] w-full rounded-md border bg-background px-3 text-sm"
          aria-label="Room floor"
        >
          <option value="">No floor</option>
          <option value="ground">Ground</option>
          <option value="first">First</option>
          <option value="second">Second</option>
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Room Class</span>
        <select
          value={roomClass}
          onChange={(e) => setRoomClass(e.target.value as 'AC' | 'non-AC')}
          className="min-h-[44px] w-full rounded-md border bg-background px-3 text-sm"
          aria-label="Room class"
        >
          <option value="AC">AC</option>
          <option value="non-AC">non-AC</option>
        </select>
      </label>
      <label className="space-y-1 text-sm">
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
      <label className="space-y-1 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cot Count</span>
        <Input
          type="number"
          min={1}
          max={10}
          value={cotCount}
          onChange={(e) => setCotCount(e.target.value)}
          required
          className="min-h-[44px]"
          aria-label="Cot count"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Cot Configuration Type
        </span>
        <select
          value={cotConfigurationType}
          onChange={(e) => setCotConfigurationType(e.target.value as 'bunker' | 'normal' | '')}
          className="min-h-[44px] w-full rounded-md border bg-background px-3 text-sm"
          aria-label="Cot configuration type"
          required
        >
          <option value="">Select cot mode</option>
          <option value="bunker">Bunker</option>
          <option value="normal">Normal</option>
        </select>
      </label>
      {matchingActiveTemplate ? (
        <p className="text-xs text-muted-foreground sm:col-span-4">
          Matching active room template found. Room creation will reuse that template.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground sm:col-span-4">
          No active template matches this class and sharing combination. A new room template will be created.
        </p>
      )}
      <p className="text-xs text-muted-foreground sm:col-span-4">
        Rent is managed by global room-rent configuration (Phase 20). New rooms are created in unresolved
        global-rent-managed state until that configuration is active.
      </p>
      <Button type="submit" disabled={submitting} className="min-h-[44px] sm:col-span-4">
        {submitting ? 'Adding...' : 'Add Room'}
      </Button>
      {error ? <p className="text-sm text-destructive sm:col-span-4">{error}</p> : null}
    </form>
  );
}
