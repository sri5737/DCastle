'use client';

import { Badge } from '@/components/ui/badge';

export interface HostelerListItem {
  id: string;
  name: string;
  room_number: string;
}

interface HostelerListProps {
  hostelers: HostelerListItem[];
  emptyMessage?: string;
}

export function HostelerList({ hostelers, emptyMessage = 'No hostelers' }: HostelerListProps) {
  if (hostelers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">{emptyMessage}</p>
    );
  }

  return (
    <ul className="space-y-2">
      {hostelers.map((hosteler) => (
        <li
          key={hosteler.id}
          data-testid="hosteler-list-item"
          className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50"
        >
          <span className="text-sm font-medium">{hosteler.name}</span>
          <Badge variant="secondary">Room {hosteler.room_number}</Badge>
        </li>
      ))}
    </ul>
  );
}
