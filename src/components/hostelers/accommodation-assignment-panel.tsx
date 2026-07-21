'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const UNASSIGNED_ROOM_NUMBER = 'UNASSIGNED';

interface HostelerItem {
  id: string;
  name: string;
  phone: string;
  room_number: string;
  status: 'active' | 'pending' | 'inactive' | 'deleted';
  building_id: string | null;
  room_id: string | null;
  cot_id: string | null;
}

interface CotItem {
  id: string;
  cot_id_label: string;
  hosteler_id: string | null;
}

interface RoomItem {
  id: string;
  room_number: string;
  cots?: CotItem[];
}

interface BuildingItem {
  id: string;
  name: string;
  rooms?: RoomItem[];
}

function getStatusTone(hosteler: HostelerItem) {
  if (!hosteler.building_id || !hosteler.room_id || !hosteler.cot_id) {
    return 'secondary' as const;
  }
  return 'default' as const;
}

export function AccommodationAssignmentPanel() {
  const [hostelers, setHostelers] = useState<HostelerItem[]>([]);
  const [buildings, setBuildings] = useState<BuildingItem[]>([]);
  const [selectedHostelerId, setSelectedHostelerId] = useState<string>('');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedCotId, setSelectedCotId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showReassignDialog, setShowReassignDialog] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    const [hostelersRes, buildingsRes] = await Promise.all([
      fetch('/api/hostelers', { cache: 'no-store' }),
      fetch('/api/admin/buildings', { cache: 'no-store' }),
    ]);

    if (!hostelersRes.ok || !buildingsRes.ok) {
      setLoading(false);
      setError('Failed to load accommodation data.');
      return;
    }

    const hostelerData = await hostelersRes.json();
    const buildingData = await buildingsRes.json();

    const eligibleHostelers = (hostelerData.hostelers as HostelerItem[]).filter(
      (hosteler) => hosteler.status !== 'deleted',
    );

    setHostelers(eligibleHostelers);
    setBuildings(buildingData.buildings ?? []);

    if (eligibleHostelers.length > 0) {
      setSelectedHostelerId((currentId) => {
        const defaultId = currentId && eligibleHostelers.some((h) => h.id === currentId)
          ? currentId
          : eligibleHostelers[0].id;

        const selected = eligibleHostelers.find((h) => h.id === defaultId);
        setSelectedBuildingId(selected?.building_id ?? '');
        setSelectedRoomId(selected?.room_id ?? '');
        setSelectedCotId(selected?.cot_id ?? '');

        return defaultId;
      });
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedHosteler = useMemo(
    () => hostelers.find((hosteler) => hosteler.id === selectedHostelerId) ?? null,
    [hostelers, selectedHostelerId],
  );

  const rooms = useMemo(() => {
    return buildings.find((building) => building.id === selectedBuildingId)?.rooms ?? [];
  }, [buildings, selectedBuildingId]);

  const availableCots = useMemo(() => {
    const room = rooms.find((item) => item.id === selectedRoomId);
    if (!room) return [];

    return (room.cots ?? []).filter(
      (cot) => cot.hosteler_id === null || cot.hosteler_id === selectedHosteler?.id,
    );
  }, [rooms, selectedRoomId, selectedHosteler?.id]);

  function handleHostelerChange(hostelerId: string) {
    const target = hostelers.find((hosteler) => hosteler.id === hostelerId);
    setSelectedHostelerId(hostelerId);
    setSelectedBuildingId(target?.building_id ?? '');
    setSelectedRoomId(target?.room_id ?? '');
    setSelectedCotId(target?.cot_id ?? '');
    setError('');
  }

  function handleBuildingChange(buildingId: string) {
    setSelectedBuildingId(buildingId);
    setSelectedRoomId('');
    setSelectedCotId('');
    setError('');
  }

  function handleRoomChange(roomId: string) {
    setSelectedRoomId(roomId);
    setSelectedCotId('');
    setError('');
  }

  function isReassignment() {
    if (!selectedHosteler) return false;
    return !!selectedHosteler.cot_id && selectedHosteler.cot_id !== selectedCotId;
  }

  async function submitAssignment() {
    if (!selectedHosteler) return;

    if (!selectedBuildingId || !selectedRoomId || !selectedCotId) {
      setError('Select building, room, and cot before assigning.');
      return;
    }

    setSaving(true);
    setError('');

    const response = await fetch(`/api/admin/hostelers/${selectedHosteler.id}/accommodation`, {
      method: 'PATCH',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hosteler_id: selectedHosteler.id,
        building_id: selectedBuildingId,
        room_id: selectedRoomId,
        cot_id: selectedCotId,
      }),
    });

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(data.error || 'Failed to assign accommodation.');
      return;
    }

    setShowReassignDialog(false);
    await loadData();
  }

  async function handleUnassign() {
    if (!selectedHosteler) return;

    setSaving(true);
    setError('');

    const response = await fetch(`/api/admin/hostelers/${selectedHosteler.id}/accommodation`, {
      method: 'DELETE',
      cache: 'no-store',
    });

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(data.error || 'Failed to unassign accommodation.');
      return;
    }

    await loadData();
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">Loading accommodation assignments...</CardContent>
      </Card>
    );
  }

  if (hostelers.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">No hostelers available for assignment.</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Hostelers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {hostelers.map((hosteler) => {
            const assigned = !!hosteler.building_id && !!hosteler.room_id && !!hosteler.cot_id;
            return (
              <button
                key={hosteler.id}
                type="button"
                onClick={() => handleHostelerChange(hosteler.id)}
                className={[
                  'w-full rounded-md border p-3 text-left transition-colors',
                  selectedHostelerId === hosteler.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{hosteler.name}</p>
                  <Badge variant={getStatusTone(hosteler)}>
                    {assigned ? 'Assigned' : 'Unassigned'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{hosteler.phone}</p>
                <p className="text-xs text-muted-foreground">
                  {assigned ? `Room ${hosteler.room_number}` : 'Accommodation not assigned yet'}
                </p>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assign or Reassign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="hosteler-select" className="text-sm font-medium">Hosteler</label>
            <select
              id="hosteler-select"
              aria-label="Hosteler selector"
              value={selectedHostelerId}
              onChange={(event) => handleHostelerChange(event.target.value)}
              className="flex h-11 w-full rounded-md border bg-background px-3 text-sm"
            >
              {hostelers.map((hosteler) => (
                <option key={hosteler.id} value={hosteler.id}>
                  {hosteler.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="building-select" className="text-sm font-medium">Building</label>
            <select
              id="building-select"
              aria-label="Building selector"
              value={selectedBuildingId}
              onChange={(event) => handleBuildingChange(event.target.value)}
              className="flex h-11 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Select building</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="room-select" className="text-sm font-medium">Room</label>
            <select
              id="room-select"
              aria-label="Room selector"
              value={selectedRoomId}
              onChange={(event) => handleRoomChange(event.target.value)}
              disabled={!selectedBuildingId}
              className="flex h-11 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50"
            >
              <option value="">{selectedBuildingId ? 'Select room' : 'Choose building first'}</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.room_number}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="cot-select" className="text-sm font-medium">Cot</label>
            <select
              id="cot-select"
              aria-label="Cot selector"
              value={selectedCotId}
              onChange={(event) => setSelectedCotId(event.target.value)}
              disabled={!selectedRoomId}
              className="flex h-11 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50"
            >
              <option value="">{selectedRoomId ? 'Select cot' : 'Choose room first'}</option>
              {availableCots.map((cot) => (
                <option key={cot.id} value={cot.id}>
                  {cot.cot_id_label}
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              disabled={saving}
              onClick={() => {
                if (isReassignment()) {
                  setShowReassignDialog(true);
                  return;
                }
                void submitAssignment();
              }}
            >
              {saving ? 'Saving...' : selectedHosteler?.cot_id ? 'Reassign Cot' : 'Assign Cot'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving || !selectedHosteler?.cot_id}
              onClick={() => {
                void handleUnassign();
              }}
            >
              Unassign
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Reassignment</DialogTitle>
            <DialogDescription>
              This reassignment will release the current cot and assign the selected new cot for this hosteler.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReassignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submitAssignment()} disabled={saving}>
              {saving ? 'Saving...' : 'Confirm Reassign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
