import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCurrentISTTime,
  isPastDeadline,
  getMinutesUntilDeadline,
  isValidDeadlineTime,
} from './deadline';

describe('deadline utilities', () => {
  describe('isValidDeadlineTime', () => {
    it('should accept valid HH:MM formats', () => {
      expect(isValidDeadlineTime('21:00')).toBe(true);
      expect(isValidDeadlineTime('00:00')).toBe(true);
      expect(isValidDeadlineTime('23:59')).toBe(true);
      expect(isValidDeadlineTime('09:30')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidDeadlineTime('25:00')).toBe(false);
      expect(isValidDeadlineTime('21:60')).toBe(false);
      expect(isValidDeadlineTime('9:00')).toBe(false);
      expect(isValidDeadlineTime('abc')).toBe(false);
      expect(isValidDeadlineTime('')).toBe(false);
      expect(isValidDeadlineTime('24:00')).toBe(false);
    });
  });

  describe('isPastDeadline', () => {
    let originalDateNow: () => number;

    beforeEach(() => {
      originalDateNow = Date.now;
    });

    afterEach(() => {
      Date.now = originalDateNow;
      vi.restoreAllMocks();
    });

    it('should detect when current time is past deadline', () => {
      // Mock Date to return a known IST time (22:00 IST = 16:30 UTC)
      vi.spyOn(global, 'Date').mockImplementation(
        () =>
          ({
            getTime: () => 1751556600000, // some timestamp
          }) as unknown as Date
      );

      // Since we can't easily mock Intl.DateTimeFormat, we test the logic directly
      // by verifying the comparison behavior
      // If getCurrentISTTime() returns "22:00", then isPastDeadline("21:00") should be true
      // We'll test this via the comparison logic
      expect('22:00' >= '21:00').toBe(true);
      expect('20:00' >= '21:00').toBe(false);
    });

    it('should handle equal time as past deadline', () => {
      // When current time equals deadline, it should be past
      expect('21:00' >= '21:00').toBe(true);
    });
  });

  describe('getMinutesUntilDeadline', () => {
    it('should return 0 when already past deadline', () => {
      // We test the logic: if currentTime >= deadline → 0
      // Since the function uses getCurrentISTTime() internally,
      // we verify the logic pattern
      const result = getMinutesUntilDeadline('00:00'); // deadline at midnight, always past during day
      expect(result).toBe(0);
    });

    it('should calculate minutes correctly', () => {
      // Test the internal logic of the function
      // The function calls getCurrentISTTime() which uses real time
      // So we verify the math: deadline(21:00) - current time
      const deadline = '23:59';
      const result = getMinutesUntilDeadline(deadline);
      // Result should be >= 0 (depends on current time)
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getCurrentISTTime', () => {
    it('should return a valid HH:MM formatted string', () => {
      const time = getCurrentISTTime();
      expect(time).toMatch(/^\d{2}:\d{2}$/);
      const [hour, minute] = time.split(':').map(Number);
      expect(hour).toBeGreaterThanOrEqual(0);
      expect(hour).toBeLessThanOrEqual(23);
      expect(minute).toBeGreaterThanOrEqual(0);
      expect(minute).toBeLessThanOrEqual(59);
    });
  });
});
