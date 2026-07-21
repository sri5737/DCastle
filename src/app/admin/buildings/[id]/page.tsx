'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const runtime = 'edge';

export default function AdminBuildingDetailPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [building, setBuilding] = useState<any>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/admin/buildings/${params.id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load building');
      } else {
        setBuilding(data.building);
      }
      setLoading(false);
    }
    if (params.id) {
      load();
    }
  }, [params.id]);

  if (loading) {
    return <p className="text-muted-foreground">Loading building details...</p>;
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{building.name}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Room hierarchy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(building.rooms ?? []).map((room: any) => (
            <div key={room.id} className="rounded-md border p-3">
              <p className="font-medium">Room {room.room_number}</p>
              <p className="text-sm text-muted-foreground">{(room.cots ?? []).length} cots configured</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
