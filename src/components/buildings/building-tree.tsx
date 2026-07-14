'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AddRoomForm } from '@/components/buildings/add-room-form';
import { ConfigureCots } from '@/components/buildings/configure-cots';
import { RoomConfigurationChangeForm } from '@/components/buildings/room-configuration-change-form';

interface RoomType {
  id: string;
  name: string;
  sharing_capacity: number;
  cot_count: number;
  active: boolean;
}

interface Cot {
  id: string;
  cot_id_label: string;
  cot_type: 'lower_cot' | 'upper_cot';
  hosteler_id: string | null;
}

function getCotTypeLabel(cotType: Cot['cot_type']) {
  if (cotType === 'lower_cot') return 'Lower';
  if (cotType === 'upper_cot') return 'Upper';
  return 'Unknown';
}

interface Room {
  id: string;
  room_number: string;
  floor: 'ground' | 'first' | 'second' | null;
  current_rent: number;
  room_types?: RoomType;
  cots: Cot[];
  pending_change?: {
    effective_date: string;
  } | null;
}

interface Building {
  id: string;
  name: string;
  description: string | null;
  rooms: Room[];
}

interface BuildingTreeProps {
  buildings: Building[];
  roomTypes: RoomType[];
  onChanged: () => void;
}

const UNRESOLVED_GLOBAL_RENT_PLACEHOLDER = 1;

function detectCurrentCotMode(cots: Cot[]): 'bunker' | 'normal' | null {
  if (!cots.length) return null;
  if (cots.some((cot) => cot.cot_type === 'upper_cot')) return 'bunker';
  return 'normal';
}

export function BuildingTree({ buildings, roomTypes, onChanged }: BuildingTreeProps) {
  const [openBuildingId, setOpenBuildingId] = useState<string | null>(null);
  const [selectedRoomsByBuilding, setSelectedRoomsByBuilding] = useState<Record<string, string>>({});
  const [roomSearchByBuilding, setRoomSearchByBuilding] = useState<Record<string, string>>({});
  const [deleteErrorByBuilding, setDeleteErrorByBuilding] = useState<Record<string, string>>({});
  const [pendingDeleteBuilding, setPendingDeleteBuilding] = useState<Building | null>(null);
  const [deletingBuildingId, setDeletingBuildingId] = useState<string | null>(null);
  const [pendingDeleteRoom, setPendingDeleteRoom] = useState<{ room: Room; buildingId: string } | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [deleteRoomError, setDeleteRoomError] = useState('');
  const [cotCountByRoom, setCotCountByRoom] = useState<Record<string, string>>({});
  const [cotCountSavingRoom, setCotCountSavingRoom] = useState<string | null>(null);
  const [cotCountErrorByRoom, setCotCountErrorByRoom] = useState<Record<string, string>>({});
  function setSelectedRoomIfMissing(building: Building) {
    if (!building.rooms.length) return;
    setSelectedRoomsByBuilding((prev) => {
      if (prev[building.id]) return prev;
      return {
        ...prev,
        [building.id]: building.rooms[0].id,
      };
    });
  }

  async function handleDeleteBuilding(building: Building) {
    setDeleteErrorByBuilding((prev) => ({ ...prev, [building.id]: '' }));
    setDeletingBuildingId(building.id);

    try {
      const response = await fetch(`/api/admin/buildings/${building.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        setDeleteErrorByBuilding((prev) => ({
          ...prev,
          [building.id]: data?.error || 'Failed to delete building',
        }));
        return;
      }

      if (openBuildingId === building.id) {
        setOpenBuildingId(null);
      }
      setSelectedRoomsByBuilding((prev) => {
        const next = { ...prev };
        delete next[building.id];
        return next;
      });
      onChanged();
      setPendingDeleteBuilding((current) => (current?.id === building.id ? null : current));
    } catch {
      setDeleteErrorByBuilding((prev) => ({
        ...prev,
        [building.id]: 'Failed to delete building',
      }));
    } finally {
      setDeletingBuildingId((current) => (current === building.id ? null : current));
    }
  }

  async function handleDeleteRoom(room: Room, buildingId: string) {
    setDeleteRoomError('');
    setDeletingRoomId(room.id);

    try {
      const response = await fetch(`/api/admin/rooms/${room.id}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        setDeleteRoomError(data?.error || 'Failed to delete room');
        setDeletingRoomId(null);
        return;
      }

      // Clear selected room from this building if it was the deleted one.
      setSelectedRoomsByBuilding((prev) => {
        const next = { ...prev };
        if (next[buildingId] === room.id) delete next[buildingId];
        return next;
      });
      setPendingDeleteRoom(null);
      onChanged();
    } catch {
      setDeleteRoomError('Failed to delete room');
    } finally {
      setDeletingRoomId((current) => (current === room.id ? null : current));
    }
  }

  async function handleUpdateCotCount(room: Room, buildingId: string, newCotCount: number) {
    setCotCountErrorByRoom((prev) => ({ ...prev, [room.id]: '' }));
    setCotCountSavingRoom(room.id);

    try {
      // Step 1: Update the template cot count.
      const patchRes = await fetch(`/api/admin/rooms/${room.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cot_count: newCotCount }),
      });
      const patchData = await patchRes.json();

      if (!patchRes.ok) {
        setCotCountErrorByRoom((prev) => ({
          ...prev,
          [room.id]: patchData?.error || 'Failed to update cot count',
        }));
        return;
      }

      // Step 2: If the room already has cots configured, reset them immediately
      // so the new count takes effect in the cot list.
      if (room.cots.length > 0) {
        const currentMode = detectCurrentCotMode(room.cots);
        if (currentMode) {
          const resetRes = await fetch(`/api/admin/rooms/${room.id}/cots`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reset', cot_configuration_type: currentMode }),
          });
          if (!resetRes.ok) {
            const resetData = await resetRes.json();
            setCotCountErrorByRoom((prev) => ({
              ...prev,
              [room.id]: resetData?.error || 'Cot count updated but cot reset failed',
            }));
            onChanged();
            return;
          }
        }
      }

      onChanged();
    } catch {
      setCotCountErrorByRoom((prev) => ({ ...prev, [room.id]: 'Failed to update cot count' }));
    } finally {
      setCotCountSavingRoom((current) => (current === room.id ? null : current));
    }
  }

  return (
    <div className="space-y-4">
      {buildings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No buildings created yet.</p>
      ) : null}

      {buildings.map((building) => {
        const isOpen = openBuildingId === building.id;
        const roomSearch = roomSearchByBuilding[building.id] ?? '';
        const roomSearchTerm = roomSearch.trim().toLowerCase();
        const filteredRooms =
          roomSearchTerm.length === 0
            ? building.rooms
            : building.rooms.filter((room) => room.room_number.toLowerCase().includes(roomSearchTerm));
        const selectedRoomId = selectedRoomsByBuilding[building.id] ?? building.rooms[0]?.id;
        const selectedRoom = filteredRooms.find((room) => room.id === selectedRoomId) ?? filteredRooms[0] ?? null;
        const deleteError = deleteErrorByBuilding[building.id];
        return (
          <Card key={building.id}>
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                  onClick={() => {
                    if (isOpen) {
                      setOpenBuildingId(null);
                      return;
                    }
                    setOpenBuildingId(building.id);
                    setSelectedRoomIfMissing(building);
                  }}
                >
                  <CardTitle className="truncate text-lg">{building.name}</CardTitle>
                  <Badge variant="secondary">{building.rooms.length} rooms</Badge>
                </button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={() => {
                    setPendingDeleteBuilding(building);
                  }}
                  disabled={deletingBuildingId === building.id}
                  aria-label={`Delete ${building.name}`}
                >
                  {deletingBuildingId === building.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
              {building.description ? (
                <p className="text-sm text-muted-foreground">{building.description}</p>
              ) : null}
              {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
            </CardHeader>
            {isOpen ? (
              <CardContent className="space-y-4">
                <AddRoomForm buildingId={building.id} roomTypes={roomTypes} onCreated={onChanged} />

                {building.rooms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rooms added yet.</p>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="space-y-2">
                      <label className="space-y-1 text-sm">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Search rooms
                        </span>
                        <input
                          type="search"
                          value={roomSearch}
                          onChange={(event) => {
                            const value = event.target.value;
                            setRoomSearchByBuilding((prev) => ({
                              ...prev,
                              [building.id]: value,
                            }));
                          }}
                          placeholder="Search room number"
                          className="min-h-[44px] w-full rounded-md border bg-background px-3 text-sm"
                          aria-label={`Search rooms in ${building.name}`}
                        />
                      </label>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rooms</p>
                      <p className="text-xs text-muted-foreground">
                        Showing {filteredRooms.length} of {building.rooms.length} room(s)
                      </p>
                      <div className="grid gap-2">
                        {filteredRooms.map((room) => {
                          const isSelected = selectedRoomId === room.id;
                          return (
                            <button
                              key={room.id}
                              type="button"
                              className={`min-h-[44px] rounded-md border px-3 py-2 text-left text-sm ${
                                isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                              }`}
                              onClick={() => {
                                setSelectedRoomsByBuilding((prev) => ({
                                  ...prev,
                                  [building.id]: room.id,
                                }));
                              }}
                            >
                              Room {room.room_number}
                            </button>
                          );
                        })}
                      </div>
                      {filteredRooms.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No rooms match this search.</p>
                      ) : null}
                    </div>

                    {selectedRoom ? (
                      <div className="min-w-0 space-y-3 rounded-md border p-3">
                        {selectedRoom.current_rent <= UNRESOLVED_GLOBAL_RENT_PLACEHOLDER ? (
                          <Badge variant="secondary">Rent pending global room-rent config</Badge>
                        ) : null}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <strong>Room {selectedRoom.room_number}</strong>
                            <Badge variant="outline">{selectedRoom.floor || 'No floor'}</Badge>
                            <Badge variant="outline">{selectedRoom.room_types?.name || 'Unknown type'}</Badge>
                            {selectedRoom.room_types?.active === false ? (
                              <Badge variant="outline">Archived room type</Badge>
                            ) : null}
                            {selectedRoom.current_rent > UNRESOLVED_GLOBAL_RENT_PLACEHOLDER ? (
                              <Badge variant="outline">Rent {selectedRoom.current_rent}</Badge>
                            ) : null}
                            {selectedRoom.pending_change?.effective_date ? (
                              <Badge variant="destructive">
                                Room configuration will be updated on {selectedRoom.pending_change.effective_date}
                              </Badge>
                            ) : null}
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="min-h-[44px]"
                            onClick={() => setPendingDeleteRoom({ room: selectedRoom, buildingId: building.id })}
                            aria-label={`Delete Room ${selectedRoom.room_number}`}
                          >
                            Delete Room
                          </Button>
                        </div>
                        {deleteRoomError ? (
                          <p className="text-sm text-destructive">{deleteRoomError}</p>
                        ) : null}

                        {/* Immediate cot count update */}
                        <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
                          <div className="space-y-1">
                            <label
                              htmlFor={`cot-count-update-${selectedRoom.id}`}
                              className="text-xs font-medium"
                            >
                              Cot Count
                              {selectedRoom.room_types?.cot_count ? (
                                <span className="ml-1 text-muted-foreground">
                                  (current: {selectedRoom.room_types.cot_count})
                                </span>
                              ) : null}
                            </label>
                            <input
                              id={`cot-count-update-${selectedRoom.id}`}
                              type="number"
                              min={1}
                              max={10}
                              value={cotCountByRoom[selectedRoom.id] ?? ''}
                              onChange={(e) =>
                                setCotCountByRoom((prev) => ({ ...prev, [selectedRoom.id]: e.target.value }))
                              }
                              placeholder="e.g. 2"
                              className="min-h-[44px] w-24 rounded-md border bg-background px-3 text-sm"
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="min-h-[44px]"
                            disabled={
                              cotCountSavingRoom === selectedRoom.id ||
                              !cotCountByRoom[selectedRoom.id] ||
                              Number(cotCountByRoom[selectedRoom.id]) === selectedRoom.room_types?.cot_count
                            }
                            onClick={() => {
                              const val = Number(cotCountByRoom[selectedRoom.id]);
                              if (val >= 1 && val <= 10) {
                                void handleUpdateCotCount(selectedRoom, building.id, val);
                              }
                            }}
                          >
                            {cotCountSavingRoom === selectedRoom.id ? 'Saving...' : 'Update Cot Count'}
                          </Button>
                          {cotCountErrorByRoom[selectedRoom.id] ? (
                            <p className="w-full text-xs text-destructive">{cotCountErrorByRoom[selectedRoom.id]}</p>
                          ) : null}
                          <p className="w-full text-xs text-muted-foreground">
                            Updates the cot count and immediately regenerates cots for this room (preserving current cot mode).
                          </p>
                        </div>

                        <ConfigureCots
                          roomId={selectedRoom.id}
                          hasCots={selectedRoom.cots.length > 0}
                          currentMode={detectCurrentCotMode(selectedRoom.cots)}
                          onConfigured={onChanged}
                        />

                        <RoomConfigurationChangeForm roomId={selectedRoom.id} onScheduled={onChanged} />

                        <div className="overflow-x-auto rounded-md border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/40">
                                <th className="p-2 text-left">Cot</th>
                                <th className="p-2 text-left">Type</th>
                                <th className="p-2 text-left">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedRoom.cots.length === 0 ? (
                                <tr>
                                  <td className="p-2 text-muted-foreground" colSpan={3}>
                                    No cots configured yet.
                                  </td>
                                </tr>
                              ) : (
                                selectedRoom.cots.map((cot) => (
                                  <tr key={cot.id} className="border-b last:border-b-0">
                                    <td className="p-2">{cot.cot_id_label}</td>
                                    <td className="p-2">{getCotTypeLabel(cot.cot_type)}</td>
                                    <td className="p-2">{cot.hosteler_id ? 'Occupied' : 'Free'}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            ) : null}
          </Card>
        );
      })}

      <Dialog
        open={pendingDeleteBuilding !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteBuilding(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Building</DialogTitle>
            <DialogDescription>
              This action is irreversible. Deleting this building permanently removes it from your inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="font-medium">Building to delete</p>
            <p>{pendingDeleteBuilding?.name ?? '-'}</p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPendingDeleteBuilding(null);
              }}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-[44px]"
              disabled={!pendingDeleteBuilding || deletingBuildingId === pendingDeleteBuilding.id}
              onClick={() => {
                if (!pendingDeleteBuilding) return;
                void handleDeleteBuilding(pendingDeleteBuilding);
              }}
            >
              {pendingDeleteBuilding && deletingBuildingId === pendingDeleteBuilding.id
                ? 'Deleting...'
                : 'Delete Building'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={pendingDeleteRoom !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteRoom(null);
            setDeleteRoomError('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Room</DialogTitle>
            <DialogDescription>
              This is irreversible. The room and all its cots will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="font-medium">Room to delete</p>
            <p>Room {pendingDeleteRoom?.room.room_number ?? '-'}</p>
            <p className="text-xs text-muted-foreground">
              Deletion is blocked if any cot in this room is occupied by an active hosteler.
            </p>
          </div>
          {deleteRoomError ? (
            <p className="text-sm text-destructive">{deleteRoomError}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPendingDeleteRoom(null);
                setDeleteRoomError('');
              }}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="min-h-[44px]"
              disabled={!pendingDeleteRoom || deletingRoomId === pendingDeleteRoom.room.id}
              onClick={() => {
                if (!pendingDeleteRoom) return;
                void handleDeleteRoom(pendingDeleteRoom.room, pendingDeleteRoom.buildingId);
              }}
            >
              {pendingDeleteRoom && deletingRoomId === pendingDeleteRoom.room.id
                ? 'Deleting...'
                : 'Delete Room'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
