/**
 * Rate change window validation utility.
 * Enforces that rate changes can only be scheduled for previous, current, or next month.
 * All dates use IST (Asia/Kolkata) timezone.
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Get today's date in IST as a Date object (with UTC time set to start of IST day).
 */
export function getTodayIST(): Date {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parseInt(parts.find((p) => p.type === 'year')?.value ?? '2026', 10);
  const month = parseInt(parts.find((p) => p.type === 'month')?.value ?? '01', 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')?.value ?? '01', 10);

  const istDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  return istDate;
}

/**
 * Get the first day of a month in UTC.
 * @param year - Full year (e.g., 2026)
 * @param month - 0-indexed month (0 = January)
 */
function getFirstDayOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
}

/**
 * Get the last day of a month in UTC.
 * @param year - Full year (e.g., 2026)
 * @param month - 0-indexed month (0 = January)
 */
function getLastDayOfMonth(year: number, month: number): Date {
  return new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
}

/**
 * Check if a date is within the 3-month window (previous, current, next month).
 * @param dateString - ISO date string (e.g., "2026-07-15" or "2026-07-15T00:00:00Z")
 * @returns true if date is within the allowed window
 */
export function isDateWithin3MonthWindow(dateString: string): boolean {
  try {
    const inputDate = new Date(dateString);
    // Normalize to UTC start of day
    inputDate.setUTCHours(0, 0, 0, 0);

    const today = getTodayIST();
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth(); // 0-indexed

    // Previous month window: 1st of previous month to last day of previous month
    const prevMonthStart = getFirstDayOfMonth(year, month - 1);
    const prevMonthEnd = getLastDayOfMonth(year, month - 1);

    // Current month window: 1st to last day of current month
    const currentMonthStart = getFirstDayOfMonth(year, month);
    const currentMonthEnd = getLastDayOfMonth(year, month);

    // Next month window: 1st to last day of next month
    const nextMonthStart = getFirstDayOfMonth(year, month + 1);
    const nextMonthEnd = getLastDayOfMonth(year, month + 1);

    // Check if date falls within any of the three windows
    const inPrevMonth = inputDate >= prevMonthStart && inputDate <= prevMonthEnd;
    const inCurrentMonth = inputDate >= currentMonthStart && inputDate <= currentMonthEnd;
    const inNextMonth = inputDate >= nextMonthStart && inputDate <= nextMonthEnd;

    return inPrevMonth || inCurrentMonth || inNextMonth;
  } catch {
    return false;
  }
}

/**
 * Get a human-readable description of the allowed window.
 * E.g., "June 1 - August 31, 2026"
 */
export function getAllowedWindowDescription(): string {
  const today = getTodayIST();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth(); // 0-indexed

  const prevMonthStart = getFirstDayOfMonth(year, month - 1);
  const currentMonthEnd = getLastDayOfMonth(year, month);
  const nextMonthEnd = getLastDayOfMonth(year, month + 1);

  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const startStr = formatter.format(prevMonthStart);
  const endStr = formatter.format(nextMonthEnd);

  return `${startStr} to ${endStr}`;
}

/**
 * Get detailed validation error message if date is outside the window.
 */
export function getDateWindowValidationError(dateString: string): string | null {
  if (!isDateWithin3MonthWindow(dateString)) {
    return `Effective date must be within the 3-month window: ${getAllowedWindowDescription()}. You can only schedule changes for the previous, current, or next month.`;
  }
  return null;
}
