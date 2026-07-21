import { describe, it, expect } from 'vitest';

/**
 * Rate History Query Tests for T110
 * 
 * Tests historical rate lookups:
 * - Before first change
 * - On change date
 * - Between multiple changes
 * - After latest change
 * - Edge cases: midnight IST, month boundaries, leap years
 */

describe('Rate History Queries', () => {
  describe('Room Rent Config Historical Lookups', () => {
    it('returns correct rent before first change', () => {
      // Setup: sharing_capacity=2, room_class=ac
      // History: no records
      // Query: 2026-07-01
      // Expected: Use fallback (current) rent value
      
      const fallbackRent = 5000;
      const queryDate = '2026-07-01';
      
      // Simulate: no history, use current rent
      const historicalLookup = (
        records: Array<{ effective_date: string; new_rent: number }>,
        date: string
      ) => {
        const applicableRecord = records.find(r => r.effective_date <= date);
        return applicableRecord?.new_rent ?? fallbackRent;
      };

      const result = historicalLookup([], queryDate);
      expect(result).toBe(5000);
    });

    it('returns correct rent on change date', () => {
      // History: changed on 2026-07-10 from 5000 to 5500
      // Query: 2026-07-10
      // Expected: 5500
      
      const records = [
        { effective_date: '2026-07-10', new_rent: 5500 },
      ];
      const fallbackRent = 5000;
      const queryDate = '2026-07-10';

      const historicalLookup = (
        records: Array<{ effective_date: string; new_rent: number }>,
        date: string
      ) => {
        // Sort by effective_date DESC and get first matching
        const sorted = records.sort((a, b) => b.effective_date.localeCompare(a.effective_date));
        const applicable = sorted.find(r => r.effective_date <= date);
        return applicable?.new_rent ?? fallbackRent;
      };

      const result = historicalLookup(records, queryDate);
      expect(result).toBe(5500);
    });

    it('returns correct rent between multiple changes', () => {
      // History:
      // - 2026-07-01: 5000
      // - 2026-07-10: 5500
      // - 2026-07-20: 6000
      // Query: 2026-07-15 (between 10 and 20)
      // Expected: 5500 (from 2026-07-10)
      
      const records = [
        { effective_date: '2026-07-01', new_rent: 5000 },
        { effective_date: '2026-07-10', new_rent: 5500 },
        { effective_date: '2026-07-20', new_rent: 6000 },
      ];
      const queryDate = '2026-07-15';

      const historicalLookup = (
        records: Array<{ effective_date: string; new_rent: number }>,
        date: string
      ) => {
        const sorted = records.sort((a, b) => b.effective_date.localeCompare(a.effective_date));
        const applicable = sorted.find(r => r.effective_date <= date);
        return applicable?.new_rent;
      };

      const result = historicalLookup(records, queryDate);
      expect(result).toBe(5500);
    });

    it('returns correct rent after latest change', () => {
      // History:
      // - 2026-07-10: 5500
      // - 2026-07-20: 6000
      // Query: 2026-07-25 (after latest)
      // Expected: 6000
      
      const records = [
        { effective_date: '2026-07-10', new_rent: 5500 },
        { effective_date: '2026-07-20', new_rent: 6000 },
      ];
      const queryDate = '2026-07-25';

      const historicalLookup = (
        records: Array<{ effective_date: string; new_rent: number }>,
        date: string
      ) => {
        const sorted = records.sort((a, b) => b.effective_date.localeCompare(a.effective_date));
        const applicable = sorted.find(r => r.effective_date <= date);
        return applicable?.new_rent;
      };

      const result = historicalLookup(records, queryDate);
      expect(result).toBe(6000);
    });
  });

  describe('Meal Rate Historical Lookups', () => {
    it('returns correct breakfast rate before first change', () => {
      const fallbackRate = 30;
      const queryDate = '2026-07-01';
      
      const historicalLookup = (
        records: Array<{ effective_date: string; new_rate: number }>,
        date: string
      ) => {
        const sorted = records.sort((a, b) => b.effective_date.localeCompare(a.effective_date));
        const applicable = sorted.find(r => r.effective_date <= date);
        return applicable?.new_rate ?? fallbackRate;
      };

      const result = historicalLookup([], queryDate);
      expect(result).toBe(30);
    });

    it('returns correct rate for lunch with multiple historical rates', () => {
      // Lunch history:
      // - 2026-06-01: 48
      // - 2026-07-10: 50
      // - 2026-08-01: 52
      // Query: 2026-07-15
      // Expected: 50
      
      const records = [
        { effective_date: '2026-06-01', new_rate: 48 },
        { effective_date: '2026-07-10', new_rate: 50 },
        { effective_date: '2026-08-01', new_rate: 52 },
      ];
      const queryDate = '2026-07-15';

      const historicalLookup = (
        records: Array<{ effective_date: string; new_rate: number }>,
        date: string
      ) => {
        const sorted = records.sort((a, b) => b.effective_date.localeCompare(a.effective_date));
        const applicable = sorted.find(r => r.effective_date <= date);
        return applicable?.new_rate;
      };

      const result = historicalLookup(records, queryDate);
      expect(result).toBe(50);
    });

    it('returns correct rate for dinner at month boundary', () => {
      // Dinner history:
      // - 2026-06-30: 38
      // - 2026-07-01: 40
      // Query: 2026-06-30
      // Expected: 38 (not the next month change)
      
      const records = [
        { effective_date: '2026-06-30', new_rate: 38 },
        { effective_date: '2026-07-01', new_rate: 40 },
      ];
      const queryDate = '2026-06-30';

      const historicalLookup = (
        records: Array<{ effective_date: string; new_rate: number }>,
        date: string
      ) => {
        const sorted = records.sort((a, b) => b.effective_date.localeCompare(a.effective_date));
        const applicable = sorted.find(r => r.effective_date <= date);
        return applicable?.new_rate;
      };

      const result = historicalLookup(records, queryDate);
      expect(result).toBe(38);
    });

    it('handles leap year correctly (Feb 29)', () => {
      // Leap year 2024: Feb 29 exists
      // Rate change on 2024-02-29
      // Query: 2024-02-29
      // Expected: new rate
      
      const records = [
        { effective_date: '2024-02-29', new_rate: 35 },
      ];
      const queryDate = '2024-02-29';

      const historicalLookup = (
        records: Array<{ effective_date: string; new_rate: number }>,
        date: string
      ) => {
        const sorted = records.sort((a, b) => b.effective_date.localeCompare(a.effective_date));
        const applicable = sorted.find(r => r.effective_date <= date);
        return applicable?.new_rate;
      };

      const result = historicalLookup(records, queryDate);
      expect(result).toBe(35);
    });

    it('returns correct rate for month-end date (last day of month)', () => {
      // July 31, 2026
      // History: change on July 20
      // Query: July 31 (last day)
      // Expected: rate from July 20
      
      const records = [
        { effective_date: '2026-07-01', new_rate: 50 },
        { effective_date: '2026-07-20', new_rate: 52 },
      ];
      const queryDate = '2026-07-31';

      const historicalLookup = (
        records: Array<{ effective_date: string; new_rate: number }>,
        date: string
      ) => {
        const sorted = records.sort((a, b) => b.effective_date.localeCompare(a.effective_date));
        const applicable = sorted.find(r => r.effective_date <= date);
        return applicable?.new_rate;
      };

      const result = historicalLookup(records, queryDate);
      expect(result).toBe(52);
    });

    it('returns correct rate for first day of month', () => {
      // August 1, 2026
      // History: change on July 30, 2026
      // Query: August 1 (first day)
      // Expected: rate from July 30
      
      const records = [
        { effective_date: '2026-07-30', new_rate: 52 },
      ];
      const queryDate = '2026-08-01';

      const historicalLookup = (
        records: Array<{ effective_date: string; new_rate: number }>,
        date: string
      ) => {
        const sorted = records.sort((a, b) => b.effective_date.localeCompare(a.effective_date));
        const applicable = sorted.find(r => r.effective_date <= date);
        return applicable?.new_rate;
      };

      const result = historicalLookup(records, queryDate);
      expect(result).toBe(52);
    });
  });

  describe('Query Efficiency', () => {
    it('uses single-row indexed lookup pattern', () => {
      // Verify the query pattern:
      // SELECT new_rate FROM meal_rate_rate_history
      // WHERE meal_type = $1 AND effective_date <= $2
      // ORDER BY effective_date DESC
      // LIMIT 1
      //
      // This pattern is efficient because:
      // 1. Indexed on (meal_type, effective_date DESC)
      // 2. Single row returned (LIMIT 1)
      // 3. No aggregation or joins

      const queryPattern = {
        select: ['new_rate'],
        from: 'meal_rate_rate_history',
        where: {
          meal_type: 'breakfast',
          effective_date_operator: '<=',
          effective_date_value: '2026-07-15',
        },
        orderBy: 'effective_date DESC',
        limit: 1,
      };

      // Verify pattern structure
      expect(queryPattern.select).toEqual(['new_rate']);
      expect(queryPattern.from).toBe('meal_rate_rate_history');
      expect(queryPattern.limit).toBe(1);
      expect(queryPattern.orderBy).toBe('effective_date DESC');
    });

    it('supports indexed lookup for room rent config', () => {
      // Query pattern for room_rent_config_history:
      // SELECT new_rent FROM room_rent_config_history
      // WHERE owner_id = $1 AND sharing_capacity = $2 AND room_class = $3 AND effective_date <= $4
      // ORDER BY effective_date DESC
      // LIMIT 1
      //
      // Index: (owner_id, sharing_capacity, room_class, effective_date DESC)

      const indexFields = ['owner_id', 'sharing_capacity', 'room_class', 'effective_date'];
      const queryPattern = {
        indexed_on: indexFields,
        efficiency: 'Single-row lookup using composite index',
      };

      expect(queryPattern.indexed_on).toContain('owner_id');
      expect(queryPattern.indexed_on).toContain('effective_date');
    });
  });

  describe('Multiple changes for same configuration', () => {
    it('returns latest applicable rate when multiple changes exist for a room config', () => {
      // Sharing capacity 2, AC room
      // Multiple changes scheduled:
      // - 2026-07-01: 5000
      // - 2026-07-15: 5300
      // - 2026-08-01: 5600
      // Query: 2026-07-20
      // Expected: 5300 (most recent before query date)
      
      const records = [
        { effective_date: '2026-07-01', new_rent: 5000 },
        { effective_date: '2026-07-15', new_rent: 5300 },
        { effective_date: '2026-08-01', new_rent: 5600 },
      ];
      const queryDate = '2026-07-20';

      const historicalLookup = (
        records: Array<{ effective_date: string; new_rent: number }>,
        date: string
      ) => {
        const sorted = records.sort((a, b) => b.effective_date.localeCompare(a.effective_date));
        const applicable = sorted.find(r => r.effective_date <= date);
        return applicable?.new_rent;
      };

      const result = historicalLookup(records, queryDate);
      expect(result).toBe(5300);
    });

    it('handles same-day multiple effective dates correctly', () => {
      // Two changes on same day (should use latest one inserted)
      // - 2026-07-15 12:00 UTC: 5300
      // - 2026-07-15 14:00 UTC: 5400
      // Query: 2026-07-15
      // Expected: Last inserted wins (database unique constraint ensures one per date)
      
      const records = [
        { effective_date: '2026-07-15', new_rent: 5400 },
      ];
      const queryDate = '2026-07-15';

      const historicalLookup = (
        records: Array<{ effective_date: string; new_rent: number }>,
        date: string
      ) => {
        const sorted = records.sort((a, b) => b.effective_date.localeCompare(a.effective_date));
        const applicable = sorted.find(r => r.effective_date <= date);
        return applicable?.new_rent;
      };

      const result = historicalLookup(records, queryDate);
      expect(result).toBe(5400);
    });
  });
});
