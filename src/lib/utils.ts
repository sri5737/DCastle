import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Tailwind CSS class merge utility (shadcn/ui pattern).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get current date in IST as YYYY-MM-DD string.
 */
export function getTodayIST(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Validate YYYY-MM-DD format.
 */
export function isIsoDate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

/**
 * Compare a date string (YYYY-MM-DD) to today's IST date.
 */
export function compareWithTodayIST(dateStr: string): -1 | 0 | 1 {
  const today = getTodayIST();
  if (dateStr < today) return -1;
  if (dateStr > today) return 1;
  return 0;
}

/**
 * Get tomorrow's date in IST as YYYY-MM-DD string.
 */
export function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(tomorrow);
}

/**
 * Format a date string to a human-readable format in IST.
 */
export function formatDateIST(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return formatter.format(date);
}

/**
 * Get current IST datetime as ISO string.
 */
export function getCurrentISTDateTime(): string {
  return new Date().toISOString();
}

/**
 * Format currency in INR.
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
