export type RoomClass = 'ac' | 'non_ac';

export interface RoomRentConfigEntry {
  id: string;
  owner_id: string;
  room_class: RoomClass;
  sharing_capacity: number;
  new_rent: number;
  effective_date: string;
  created_at: string;
}

export interface ActiveRoomRentConfig {
  room_class: RoomClass;
  sharing_capacity: number;
  rent: number;
  effective_date: string;
}

/**
 * Given a list of room rent config entries, return the most recent active entry
 * for each unique (room_class, sharing_capacity) pair.
 *
 * "Active" means effective_date <= today (YYYY-MM-DD).
 * Among candidates, the entry with the highest effective_date wins.
 */
export function getActiveRoomRentConfigs(
  entries: RoomRentConfigEntry[],
  today: string
): ActiveRoomRentConfig[] {
  const map = new Map<string, RoomRentConfigEntry>();

  for (const entry of entries) {
    if (entry.effective_date > today) continue;

    const key = `${entry.room_class}:${entry.sharing_capacity}`;
    const existing = map.get(key);

    if (!existing || entry.effective_date > existing.effective_date) {
      map.set(key, entry);
    }
  }

  const results: ActiveRoomRentConfig[] = [];
  for (const entry of map.values()) {
    results.push({
      room_class: entry.room_class,
      sharing_capacity: entry.sharing_capacity,
      rent: entry.new_rent,
      effective_date: entry.effective_date,
    });
  }

  // Sort: AC before non-AC, then by sharing_capacity ascending
  results.sort((a, b) => {
    if (a.room_class !== b.room_class) {
      return a.room_class === 'ac' ? -1 : 1;
    }
    return a.sharing_capacity - b.sharing_capacity;
  });

  return results;
}
