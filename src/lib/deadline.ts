/**
 * Deadline validation utility.
 * All comparisons use IST (Asia/Kolkata) timezone via Intl.DateTimeFormat.
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Get the current time in IST as HH:MM string.
 */
export function getCurrentISTTime(): string {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
}

/**
 * Check if the current IST time is past the given deadline.
 * @param deadlineTime - HH:MM format (24-hour)
 * @returns true if current IST time is past the deadline
 */
export function isPastDeadline(deadlineTime: string): boolean {
  const currentTime = getCurrentISTTime();
  return currentTime >= deadlineTime;
}

/**
 * Calculate minutes remaining until the deadline from current IST time.
 * Returns 0 if already past deadline.
 */
export function getMinutesUntilDeadline(deadlineTime: string): number {
  const currentTime = getCurrentISTTime();
  if (currentTime >= deadlineTime) return 0;

  const [currentHour, currentMin] = currentTime.split(':').map(Number);
  const [deadlineHour, deadlineMin] = deadlineTime.split(':').map(Number);

  const currentMinutes = currentHour * 60 + currentMin;
  const deadlineMinutes = deadlineHour * 60 + deadlineMin;

  return deadlineMinutes - currentMinutes;
}

/**
 * Validate deadline_time format (HH:MM, 24-hour).
 */
export function isValidDeadlineTime(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}
