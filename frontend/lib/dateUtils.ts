/**
 * Date utility functions for consistent timezone handling
 * All event times should be displayed in Europe/Prague timezone
 */

import { formatInTimeZone } from 'date-fns-tz';
import { cs } from 'date-fns/locale';

const PRAGUE_TIMEZONE = 'Europe/Prague';

/**
 * Parse a date string or Date object
 * Dates from the API come as ISO strings, which JavaScript correctly parses
 */
export function parseEventDate(date: Date | string): Date {
  if (typeof date === 'string') {
    return new Date(date);
  }
  return date;
}

/**
 * Format a date in Prague timezone
 */
export function formatDate(date: Date | string, formatStr: string = 'EEEE, d. MMMM yyyy'): string {
  const dateObj = parseEventDate(date);
  
  // Use formatInTimeZone to explicitly format in Prague timezone
  // This ensures consistent display regardless of browser timezone
  return formatInTimeZone(dateObj, PRAGUE_TIMEZONE, formatStr, { locale: cs });
}

/**
 * Format time in Prague timezone (HH:mm)
 */
export function formatTime(date: Date | string): string {
  return formatDate(date, 'HH:mm');
}

/**
 * Format date and time in Prague timezone
 */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'EEEE, d. MMMM yyyy HH:mm');
}

