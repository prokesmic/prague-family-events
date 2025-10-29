/**
 * Event deduplication service
 * Identifies and merges duplicate events from different sources
 */

import { RawEvent } from '../types';

/**
 * Calculate Levenshtein distance between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns Distance value
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }

  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity between two strings (0-1, where 1 is identical)
 * @param str1 First string
 * @param str2 Second string
 * @returns Similarity ratio between 0 and 1
 */
function stringSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);

  if (maxLength === 0) return 1.0;

  return 1 - distance / maxLength;
}

/**
 * Normalize title for comparison
 * @param title Title to normalize
 * @returns Normalized title
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\wá-žÁ-Ž\s]/g, '') // Remove special characters but keep Czech chars
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Normalize location for comparison
 * @param location Location string
 * @returns Normalized location
 */
function normalizeLocation(location?: string): string {
  if (!location) return '';

  return location
    .toLowerCase()
    .trim()
    .replace(/[^\wá-žÁ-Ž\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Check if two dates are on the same day
 * @param date1 First date
 * @param date2 Second date
 * @returns True if same day, false otherwise
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if two dates are within specified hours of each other
 * @param date1 First date
 * @param date2 Second date
 * @param hours Hour threshold
 * @returns True if within threshold, false otherwise
 */
function isWithinHours(date1: Date, date2: Date, hours: number = 2): boolean {
  const diffMs = Math.abs(date1.getTime() - date2.getTime());
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours <= hours;
}

/**
 * Calculate duplicate score between two events (0-1, where 1 is definitely duplicate)
 * @param event1 First event
 * @param event2 Second event
 * @returns Duplicate score between 0 and 1
 */
export function calculateDuplicateScore(event1: RawEvent, event2: RawEvent): number {
  let score = 0;
  let factors = 0;

  // Title similarity (most important) - weight: 40%
  const titleSimilarity = stringSimilarity(
    normalizeTitle(event1.title),
    normalizeTitle(event2.title)
  );
  score += titleSimilarity * 0.4;
  factors += 0.4;

  // Date similarity - weight: 30%
  if (isSameDay(event1.startDateTime, event2.startDateTime)) {
    score += 0.3;

    // Bonus if times are also similar
    if (isWithinHours(event1.startDateTime, event2.startDateTime, 2)) {
      score += 0.1;
      factors += 0.1;
    }
  }
  factors += 0.3;

  // Location similarity - weight: 20%
  const location1 = normalizeLocation(event1.locationName || event1.address);
  const location2 = normalizeLocation(event2.locationName || event2.address);

  if (location1 && location2) {
    const locationSimilarity = stringSimilarity(location1, location2);
    score += locationSimilarity * 0.2;
    factors += 0.2;
  }

  // Price similarity - weight: 10%
  if (event1.adultPrice !== undefined && event2.adultPrice !== undefined) {
    const priceDiff = Math.abs(event1.adultPrice - event2.adultPrice);
    const avgPrice = (event1.adultPrice + event2.adultPrice) / 2;

    if (avgPrice > 0) {
      const priceSimilarity = 1 - Math.min(1, priceDiff / avgPrice);
      score += priceSimilarity * 0.1;
    } else {
      // Both free
      score += 0.1;
    }
    factors += 0.1;
  }

  return factors > 0 ? score / factors : 0;
}

/**
 * Check if two events are duplicates based on threshold
 * @param event1 First event
 * @param event2 Second event
 * @param threshold Similarity threshold (default: 0.8)
 * @returns True if duplicates, false otherwise
 */
export function isDuplicate(
  event1: RawEvent,
  event2: RawEvent,
  threshold: number = 0.8
): boolean {
  const score = calculateDuplicateScore(event1, event2);
  return score >= threshold;
}

/**
 * Merge two duplicate events, keeping the most complete information
 * @param event1 First event
 * @param event2 Second event
 * @returns Merged event
 */
export function mergeEvents(event1: RawEvent, event2: RawEvent): RawEvent {
  return {
    // Keep the external ID from the first source
    externalId: event1.externalId,
    // Combine sources
    source: `${event1.source},${event2.source}`,
    // Keep longer title
    title: event1.title.length > event2.title.length ? event1.title : event2.title,
    // Keep longer description
    description:
      !event1.description || (event2.description && event2.description.length > event1.description.length)
        ? event2.description
        : event1.description,
    // Keep more specific date/time
    startDateTime: event1.startDateTime,
    endDateTime: event1.endDateTime || event2.endDateTime,
    // Keep more specific location
    locationName: event1.locationName || event2.locationName,
    address: event1.address || event2.address,
    // Keep available category
    category: event1.category || event2.category,
    // Keep more restrictive age range
    ageMin: event1.ageMin !== undefined && event2.ageMin !== undefined
      ? Math.max(event1.ageMin, event2.ageMin)
      : event1.ageMin ?? event2.ageMin,
    ageMax: event1.ageMax !== undefined && event2.ageMax !== undefined
      ? Math.min(event1.ageMax, event2.ageMax)
      : event1.ageMax ?? event2.ageMax,
    // Keep lower price (better for users)
    adultPrice:
      event1.adultPrice !== undefined && event2.adultPrice !== undefined
        ? Math.min(event1.adultPrice, event2.adultPrice)
        : event1.adultPrice ?? event2.adultPrice,
    childPrice:
      event1.childPrice !== undefined && event2.childPrice !== undefined
        ? Math.min(event1.childPrice, event2.childPrice)
        : event1.childPrice ?? event2.childPrice,
    familyPrice:
      event1.familyPrice !== undefined && event2.familyPrice !== undefined
        ? Math.min(event1.familyPrice, event2.familyPrice)
        : event1.familyPrice ?? event2.familyPrice,
    // Keep available outdoor flag
    isOutdoor: event1.isOutdoor || event2.isOutdoor,
    // Keep available duration
    durationMinutes: event1.durationMinutes || event2.durationMinutes,
    // Keep available image
    imageUrl: event1.imageUrl || event2.imageUrl,
    // Keep first booking URL (prioritize)
    bookingUrl: event1.bookingUrl || event2.bookingUrl,
  };
}

/**
 * Deduplicate an array of events
 * @param events Array of events to deduplicate
 * @param threshold Similarity threshold (default: 0.8)
 * @returns Deduplicated array of events
 */
export function deduplicateEvents(events: RawEvent[], threshold: number = 0.8): RawEvent[] {
  if (events.length === 0) return [];

  const deduplicated: RawEvent[] = [];
  const processed = new Set<number>();

  for (let i = 0; i < events.length; i++) {
    if (processed.has(i)) continue;

    let mergedEvent = events[i];
    processed.add(i);

    // Check for duplicates with remaining events
    for (let j = i + 1; j < events.length; j++) {
      if (processed.has(j)) continue;

      if (isDuplicate(mergedEvent, events[j], threshold)) {
        mergedEvent = mergeEvents(mergedEvent, events[j]);
        processed.add(j);
      }
    }

    deduplicated.push(mergedEvent);
  }

  return deduplicated;
}

/**
 * Find duplicate groups in an array of events
 * @param events Array of events
 * @param threshold Similarity threshold (default: 0.8)
 * @returns Array of duplicate groups
 */
export function findDuplicateGroups(
  events: RawEvent[],
  threshold: number = 0.8
): RawEvent[][] {
  const groups: RawEvent[][] = [];
  const processed = new Set<number>();

  for (let i = 0; i < events.length; i++) {
    if (processed.has(i)) continue;

    const group: RawEvent[] = [events[i]];
    processed.add(i);

    for (let j = i + 1; j < events.length; j++) {
      if (processed.has(j)) continue;

      if (isDuplicate(events[i], events[j], threshold)) {
        group.push(events[j]);
        processed.add(j);
      }
    }

    if (group.length > 1) {
      groups.push(group);
    }
  }

  return groups;
}
