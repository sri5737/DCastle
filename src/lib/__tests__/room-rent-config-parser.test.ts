import { describe, expect, it } from 'vitest';
import { getActiveRoomRentConfigs, type RoomRentConfigEntry } from '../room-rent-config-parser';

function makeEntry(overrides: Partial<RoomRentConfigEntry> & {
  room_class: 'ac' | 'non_ac';
  sharing_capacity: number;
  new_rent: number;
  effective_date: string;
}): RoomRentConfigEntry {
  return {
    id: 'id-' + Math.random(),
    owner_id: 'owner-1',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('getActiveRoomRentConfigs', () => {
  const TODAY = '2026-07-15';

  it('returns empty array when no entries provided', () => {
    expect(getActiveRoomRentConfigs([], TODAY)).toEqual([]);
  });

  it('excludes entries with future effective_date', () => {
    const entries = [
      makeEntry({ room_class: 'ac', sharing_capacity: 2, new_rent: 5000, effective_date: '2026-08-01' }),
    ];
    expect(getActiveRoomRentConfigs(entries, TODAY)).toEqual([]);
  });

  it('includes entries with effective_date equal to today', () => {
    const entries = [
      makeEntry({ room_class: 'ac', sharing_capacity: 2, new_rent: 5000, effective_date: TODAY }),
    ];
    const result = getActiveRoomRentConfigs(entries, TODAY);
    expect(result).toHaveLength(1);
    expect(result[0].rent).toBe(5000);
  });

  it('picks the most recent active entry per (room_class, sharing_capacity)', () => {
    const entries = [
      makeEntry({ room_class: 'ac', sharing_capacity: 2, new_rent: 4000, effective_date: '2026-01-01' }),
      makeEntry({ room_class: 'ac', sharing_capacity: 2, new_rent: 5000, effective_date: '2026-07-01' }),
      makeEntry({ room_class: 'ac', sharing_capacity: 2, new_rent: 9999, effective_date: '2026-08-01' }), // future — excluded
    ];
    const result = getActiveRoomRentConfigs(entries, TODAY);
    expect(result).toHaveLength(1);
    expect(result[0].rent).toBe(5000);
    expect(result[0].effective_date).toBe('2026-07-01');
  });

  it('handles multiple (room_class, sharing_capacity) pairs independently', () => {
    const entries = [
      makeEntry({ room_class: 'ac', sharing_capacity: 2, new_rent: 5000, effective_date: '2026-07-01' }),
      makeEntry({ room_class: 'ac', sharing_capacity: 3, new_rent: 4500, effective_date: '2026-06-01' }),
      makeEntry({ room_class: 'non_ac', sharing_capacity: 2, new_rent: 3000, effective_date: '2026-05-01' }),
      makeEntry({ room_class: 'non_ac', sharing_capacity: 4, new_rent: 2500, effective_date: '2026-04-01' }),
    ];
    const result = getActiveRoomRentConfigs(entries, TODAY);
    expect(result).toHaveLength(4);
  });

  it('sorts results: AC before non_ac, then by sharing_capacity ascending', () => {
    const entries = [
      makeEntry({ room_class: 'non_ac', sharing_capacity: 2, new_rent: 3000, effective_date: '2026-07-01' }),
      makeEntry({ room_class: 'ac', sharing_capacity: 3, new_rent: 4500, effective_date: '2026-07-01' }),
      makeEntry({ room_class: 'ac', sharing_capacity: 2, new_rent: 5000, effective_date: '2026-07-01' }),
      makeEntry({ room_class: 'non_ac', sharing_capacity: 1, new_rent: 3500, effective_date: '2026-07-01' }),
    ];
    const result = getActiveRoomRentConfigs(entries, TODAY);
    expect(result.map((r) => `${r.room_class}:${r.sharing_capacity}`)).toEqual([
      'ac:2',
      'ac:3',
      'non_ac:1',
      'non_ac:2',
    ]);
  });

  it('returns correct fields on each active config', () => {
    const entries = [
      makeEntry({ room_class: 'ac', sharing_capacity: 2, new_rent: 5000, effective_date: '2026-07-01' }),
    ];
    const result = getActiveRoomRentConfigs(entries, TODAY);
    expect(result[0]).toEqual({
      room_class: 'ac',
      sharing_capacity: 2,
      rent: 5000,
      effective_date: '2026-07-01',
    });
  });

  it('handles single entry that is exactly today as active', () => {
    const entries = [
      makeEntry({ room_class: 'non_ac', sharing_capacity: 3, new_rent: 2800, effective_date: TODAY }),
    ];
    const result = getActiveRoomRentConfigs(entries, TODAY);
    expect(result).toHaveLength(1);
    expect(result[0].rent).toBe(2800);
  });
});
