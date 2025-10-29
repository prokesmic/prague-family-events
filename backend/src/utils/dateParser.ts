/**
 * Czech date format parser utilities
 */

import { parse, isValid } from 'date-fns';

/**
 * Common Czech date formats
 */
const CZECH_DATE_FORMATS = [
  'd.M.yyyy',
  'dd.MM.yyyy',
  'd. M. yyyy',
  'dd. MM. yyyy',
  'd.M.yyyy HH:mm',
  'dd.MM.yyyy HH:mm',
  'd. M. yyyy HH:mm',
  'dd. MM. yyyy HH:mm',
  'd.M.yyyy H:mm',
  'dd.MM.yyyy H:mm',
  'yyyy-MM-dd',
  'yyyy-MM-dd HH:mm:ss',
  'yyyy-MM-dd\'T\'HH:mm:ss',
];

/**
 * Czech month names mapping
 */
const CZECH_MONTHS: { [key: string]: number } = {
  'ledna': 1, 'leden': 1,
  'února': 2, 'únor': 2,
  'března': 3, 'březen': 3,
  'dubna': 4, 'duben': 4,
  'května': 5, 'květen': 5,
  'června': 6, 'červen': 6,
  'července': 7, 'červenec': 7,
  'srpna': 8, 'srpen': 8,
  'září': 9,
  'října': 10, 'říjen': 10,
  'listopadu': 11, 'listopad': 11,
  'prosince': 12, 'prosinec': 12,
};

/**
 * Parse Czech date string to Date object
 * @param dateStr Date string to parse
 * @returns Date object or null if parsing fails
 */
export function parseCzechDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Clean up the string - handle date ranges by taking first date
  let cleaned = dateStr.trim();

  // Handle date ranges like "27. 10.–29. 10." - take first date
  if (cleaned.includes('–') || cleaned.includes('-')) {
    cleaned = cleaned.split(/[–-]/)[0].trim();
  }

  // Try standard formats first
  for (const format of CZECH_DATE_FORMATS) {
    try {
      const date = parse(cleaned, format, new Date());
      if (isValid(date)) {
        return date;
      }
    } catch (error) {
      // Continue to next format
    }
  }

  // Try parsing date without year (e.g., "30. 10." from kudyznudy.cz)
  const shortDateMatch = cleaned.match(/^(\d{1,2})\.\s*(\d{1,2})\.?$/);
  if (shortDateMatch) {
    const day = parseInt(shortDateMatch[1], 10);
    const month = parseInt(shortDateMatch[2], 10);

    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const now = new Date();
      const currentYear = now.getFullYear();

      // Try current year first
      let date = new Date(currentYear, month - 1, day);

      // If date is in the past (more than 1 day ago), use next year
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      if (date < oneDayAgo) {
        date = new Date(currentYear + 1, month - 1, day);
      }

      if (isValid(date)) {
        return date;
      }
    }
  }

  // Try parsing Czech month names (e.g., "15. ledna 2024")
  const czechMonthMatch = cleaned.match(/(\d{1,2})\.\s*([a-záčďéěíňóřšťúůýž]+)\s*(\d{4})/i);
  if (czechMonthMatch) {
    const day = parseInt(czechMonthMatch[1], 10);
    const monthName = czechMonthMatch[2].toLowerCase();
    const year = parseInt(czechMonthMatch[3], 10);
    const month = CZECH_MONTHS[monthName];

    if (month && day >= 1 && day <= 31) {
      const date = new Date(year, month - 1, day);
      if (isValid(date)) {
        return date;
      }
    }
  }

  // Try parsing relative dates
  if (cleaned.toLowerCase().includes('dnes')) {
    return new Date();
  }

  if (cleaned.toLowerCase().includes('zítra')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  return null;
}

/**
 * Parse Czech time string to hours and minutes
 * @param timeStr Time string (e.g., "14:30", "14.30", "14:00 - 16:00")
 * @returns Object with hours and minutes, or null if parsing fails
 */
export function parseCzechTime(timeStr: string): { hours: number; minutes: number } | null {
  if (!timeStr) return null;

  // Extract first time from range (e.g., "14:00 - 16:00" -> "14:00")
  const cleaned = timeStr.split('-')[0].trim();

  // Try common time formats
  const timeMatch = cleaned.match(/(\d{1,2})[:.](\d{2})/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);

    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return { hours, minutes };
    }
  }

  return null;
}

/**
 * Combine date and time strings into a single Date object
 * @param dateStr Date string
 * @param timeStr Time string
 * @returns Date object or null if parsing fails
 */
export function combineDateAndTime(dateStr: string, timeStr?: string): Date | null {
  const date = parseCzechDate(dateStr);
  if (!date) return null;

  if (timeStr) {
    const time = parseCzechTime(timeStr);
    if (time) {
      date.setHours(time.hours, time.minutes, 0, 0);
    }
  }

  return date;
}

/**
 * Extract duration from Czech text
 * @param text Text potentially containing duration info
 * @returns Duration in minutes or null
 */
export function extractDuration(text: string): number | null {
  if (!text) return null;

  // Match patterns like "90 minut", "1,5 hodiny", "2 hodiny"
  const minuteMatch = text.match(/(\d+)\s*(?:minut|min)/i);
  if (minuteMatch) {
    return parseInt(minuteMatch[1], 10);
  }

  const hourMatch = text.match(/(\d+[,.]?\d*)\s*(?:hodin|hod|h)/i);
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1].replace(',', '.'));
    return Math.round(hours * 60);
  }

  return null;
}
