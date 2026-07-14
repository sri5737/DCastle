import { describe, expect, it } from 'vitest';
import { compareWithTodayIST, getTodayIST, isIsoDate } from './utils';

describe('utils Phase 19 date helpers', () => {
  it('validates ISO date format', () => {
    expect(isIsoDate('2026-07-10')).toBe(true);
    expect(isIsoDate('2026-7-10')).toBe(false);
    expect(isIsoDate('10-07-2026')).toBe(false);
  });

  it('compares dates against today in IST', () => {
    const today = getTodayIST();
    const [year, month, day] = today.split('-').map(Number);

    const yesterdayDate = new Date(Date.UTC(year, month - 1, day - 1));
    const tomorrowDate = new Date(Date.UTC(year, month - 1, day + 1));

    const yesterday = yesterdayDate.toISOString().slice(0, 10);
    const tomorrow = tomorrowDate.toISOString().slice(0, 10);

    expect(compareWithTodayIST(yesterday)).toBe(-1);
    expect(compareWithTodayIST(today)).toBe(0);
    expect(compareWithTodayIST(tomorrow)).toBe(1);
  });
});
