'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddBuildingForm } from '@/components/buildings/add-building-form';
import { BuildingTree } from '@/components/buildings/building-tree';

interface RoomType {
  id: string;
  name: string;
  sharing_capacity: number;
  cot_count: number;
  active: boolean;
}

interface Building {
  id: string;
  name: string;
  description: string | null;
  rooms: Array<{
    id: string;
    room_number: string;
    floor: 'ground' | 'first' | 'second' | null;
    current_rent: number;
    room_types?: RoomType;
    cots: Array<{
      id: string;
      cot_id_label: string;
      cot_type: 'lower_cot' | 'upper_cot';
      hosteler_id: string | null;
    }>;
    pending_change?: {
      effective_date: string;
    } | null;
  }>;
}

export default function AdminBuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [buildingRes, roomTypeRes] = await Promise.all([
      fetch('/api/admin/buildings', { cache: 'no-store' }),
      fetch('/api/admin/room-types', { cache: 'no-store' }),
    ]);

    if (buildingRes.ok) {
      const data = await buildingRes.json();
      setBuildings(data.buildings ?? []);
    }

    if (roomTypeRes.ok) {
      const data = await roomTypeRes.json();
      setRoomTypes(data.room_types ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Buildings and Rooms</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add Building</CardTitle>
        </CardHeader>
        <CardContent>
          <AddBuildingForm onCreated={fetchData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Room Templates in Add Room</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Add Room now captures room class, sharing capacity, cot count, and cot mode in one flow. Matching
            active templates are reused automatically.
          </p>
        </CardContent>
      </Card>

      {loading && buildings.length === 0 ? (
        <p className="text-muted-foreground">Loading building hierarchy...</p>
      ) : null}

      {loading && buildings.length > 0 ? (
        <p className="text-xs text-muted-foreground">Refreshing building data...</p>
      ) : null}

      <BuildingTree buildings={buildings} roomTypes={roomTypes} onChanged={fetchData} />
    </div>
  );
}
