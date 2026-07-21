import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isDateWithin3MonthWindow, getTodayIST, getAllowedWindowDescription, getDateWindowValidationError } from '@/lib/rate-change-window';

describe('rate-change-window', () => {
  beforeEach(() => {
    // Mock current date as 2026-07-15 (current: July, previous: June, next: August)
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getTodayIST', () => {
    it('returns today in IST', () => {
      const today = getTodayIST();
      // Should be 2026-07-15 (UTC normalized to start of day)
      expect(today.getUTCFullYear()).toBe(2026);
      expect(today.getUTCMonth()).toBe(6); // July (0-indexed)
      expect(today.getUTCDate()).toBe(15);
    });
  });

  describe('isDateWithin3MonthWindow', () => {
    it('allows dates in current month (July 2026)', () => {
      expect(isDateWithin3MonthWindow('2026-07-01')).toBe(true);
      expect(isDateWithin3MonthWindow('2026-07-15')).toBe(true);
      expect(isDateWithin3MonthWindow('2026-07-31')).toBe(true);
    });

    it('allows dates in next month (August 2026)', () => {
      expect(isDateWithin3MonthWindow('2026-08-01')).toBe(true);
      expect(isDateWithin3MonthWindow('2026-08-15')).toBe(true);
      expect(isDateWithin3MonthWindow('2026-08-31')).toBe(true);
    });

    it('allows dates in previous month (June 2026)', () => {
      expect(isDateWithin3MonthWindow('2026-06-01')).toBe(true);
      expect(isDateWithin3MonthWindow('2026-06-15')).toBe(true);
      expect(isDateWithin3MonthWindow('2026-06-30')).toBe(true);
    });

    it('rejects dates in September 2026 (too far)', () => {
      expect(isDateWithin3MonthWindow('2026-09-01')).toBe(false);
      expect(isDateWithin3MonthWindow('2026-09-30')).toBe(false);
    });

    it('rejects dates in May 2026 (too far back)', () => {
      expect(isDateWithin3MonthWindow('2026-05-01')).toBe(false);
      expect(isDateWithin3MonthWindow('2026-05-31')).toBe(false);
    });

    it('rejects invalid date strings', () => {
      expect(isDateWithin3MonthWindow('invalid')).toBe(false);
      expect(isDateWithin3MonthWindow('2026-13-01')).toBe(false);
      expect(isDateWithin3MonthWindow('')).toBe(false);
    });
  });

  describe('getAllowedWindowDescription', () => {
    it('returns human-readable window description', () => {
      const description = getAllowedWindowDescription();
      // Should include month names and year
      expect(description).toMatch(/2026/);
      expect(description).toMatch(/to/i);
      // Should contain valid month names
      const hasValidMonths = 
        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(description);
      expect(hasValidMonths).toBe(true);
    });
  });

  describe('getDateWindowValidationError', () => {
    it('returns null for valid dates', () => {
      expect(getDateWindowValidationError('2026-07-15')).toBeNull();
      expect(getDateWindowValidationError('2026-08-01')).toBeNull();
      expect(getDateWindowValidationError('2026-06-30')).toBeNull();
    });

    it('returns error message for dates outside window', () => {
      const error = getDateWindowValidationError('2026-09-01');
      expect(error).toBeTruthy();
      expect(error).toContain('3-month window');
    });
  });
});
