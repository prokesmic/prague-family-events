/**
 * Scraper for praguest.com/en/kid-s-events
 * Uses Firecrawl for dynamic content rendering
 */

import { RawEvent, ScraperResult } from '../types';
import { extractDuration } from '../utils/dateParser';
import { extractPrices, extractAgeRange } from '../utils/priceParser';
import {
  cleanText,
  determineCategoryFromText,
  createHash
} from '../utils/scraperHelper';
import { scrapeAndLoadCheerio, isFirecrawlAvailable } from '../utils/firecrawlHelper';
import { parse } from 'date-fns';

const SOURCE_NAME = 'praguest.com';
const BASE_URL = 'https://www.praguest.com/en/kid-s-events';

/**
 * Parse date from praguest format: "17 July 2025 10:00 - 31 October 2025 20:00"
 */
function parsePraguestDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  try {
    // Extract start date from range (before the dash)
    const startPart = dateStr.split('-')[0].trim();

    // Try formats like "17 July 2025 10:00"
    const formats = [
      'd MMMM yyyy HH:mm',
      'd MMMM yyyy',
      'MMMM d, yyyy',
      'd.M.yyyy HH:mm',
      'd.M.yyyy'
    ];

    for (const format of formats) {
      try {
        const date = parse(startPart, format, new Date());
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch (e) {
        continue;
      }
    }

    // Fallback to new Date()
    const date = new Date(startPart);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (error) {
    console.error(`Error parsing date: ${dateStr}`, error);
  }

  return null;
}

/**
 * Scrape events from praguest.com
 * @returns Scraper result with events and errors
 */
export async function scrapePraguest(): Promise<ScraperResult> {
  const startTime = Date.now();
  const events: RawEvent[] = [];
  const errors: string[] = [];

  try {
    console.log(`[${SOURCE_NAME}] Starting scrape...`);

    // Check if Firecrawl is available
    if (!isFirecrawlAvailable()) {
      console.log(`[${SOURCE_NAME}] Firecrawl API key not configured, skipping dynamic content scraper`);
      return {
        source: SOURCE_NAME,
        events: [],
        errors: ['Firecrawl API key not configured'],
        executionTime: Date.now() - startTime,
      };
    }

    // Use Firecrawl to handle dynamic content
    const $ = await scrapeAndLoadCheerio(BASE_URL, {
      waitFor: 5000,
      timeout: 60000,
    });

    if (!$) {
      errors.push(`Failed to scrape ${BASE_URL} with Firecrawl`);
      return {
        source: SOURCE_NAME,
        events,
        errors,
        executionTime: Date.now() - startTime,
      };
    }

    // Find event items - look for li or article elements containing events
    // Try multiple selectors to find event containers
    const eventElements = $('li, article, .event-item, [class*="event"]').filter((i, el) => {
      const $el = $(el);
      const text = $el.text();
      const hasTitle = $el.find('h3, h2').length > 0;
      const hasLink = $el.find('a').length > 0;
      return hasTitle && hasLink && text.length > 50;
    });

    console.log(`[${SOURCE_NAME}] Found ${eventElements.length} potential event elements`);

    eventElements.each((index, element) => {
      try {
        const $el = $(element);

        // Extract title from h3 or h2
        const $titleEl = $el.find('h3, h2').first();
        const title = $titleEl.text().trim();

        if (!title || title.length < 3) {
          return;
        }

        // Extract link
        const $linkEl = $el.find('a').first();
        const link = $linkEl.attr('href');

        // Get all text content to parse date and location
        const fullText = $el.text();

        // Try to find date pattern (e.g., "17 July 2025 10:00 - 31 October 2025 20:00")
        const dateMatch = fullText.match(/(\d{1,2}\s+\w+\s+\d{4}\s+\d{1,2}:\d{2})\s*-\s*(\d{1,2}\s+\w+\s+\d{4}\s+\d{1,2}:\d{2})/);
        const simpleDateMatch = fullText.match(/(\d{1,2}\s+\w+\s+\d{4})/);

        let dateStr = '';
        if (dateMatch) {
          dateStr = dateMatch[1];
        } else if (simpleDateMatch) {
          dateStr = simpleDateMatch[1];
        }

        const startDateTime = parsePraguestDate(dateStr);

        if (!startDateTime) {
          console.log(`[${SOURCE_NAME}] Skipping event without valid date: ${title}`);
          return;
        }

        // Filter out past events
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (startDateTime < now) {
          return;
        }

        // Try to extract location (usually after the date)
        const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let location = '';

        // Location is typically after the date line
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(dateStr)) {
            // Next non-empty line might be location
            if (i + 1 < lines.length) {
              const nextLine = lines[i + 1];
              // Check if it looks like a location (not a link, not too long)
              if (nextLine.length < 100 && !nextLine.includes('http') && !nextLine.includes('info')) {
                location = nextLine;
                break;
              }
            }
          }
        }

        // Extract description - look for longer text blocks
        const $description = $el.find('p, .description, .excerpt').first();
        const description = $description.text().trim();

        // Extract image - try multiple selectors including inside anchor tags
        let imageUrl: string | undefined;
        const $img = $el.find('img').first();
        imageUrl = $img.attr('src');

        // Fallback: look for images inside anchor tags
        if (!imageUrl) {
          const $anchorImg = $el.find('a img').first();
          imageUrl = $anchorImg.attr('src');
        }

        // Fallback: look for data-src (lazy loading)
        if (!imageUrl) {
          imageUrl = $img.attr('data-src') || $el.find('img').first().attr('data-src');
        }

        // Parse prices and age range from text
        const prices = extractPrices(fullText);
        const ageRange = extractAgeRange(fullText);

        // Determine category
        const category = determineCategoryFromText(title + ' ' + description);

        // Check if outdoor
        const lowerText = cleanText(title + ' ' + description).toLowerCase();
        const isOutdoor =
          lowerText.includes('outdoor') ||
          lowerText.includes('park') ||
          lowerText.includes('garden') ||
          lowerText.includes('nature') ||
          lowerText.includes('playground');

        // Create event object
        const event: RawEvent = {
          externalId: `${SOURCE_NAME}-${createHash(title + dateStr + location)}`,
          source: SOURCE_NAME,
          title: cleanText(title),
          description: description ? cleanText(description) : undefined,
          startDateTime,
          locationName: location || undefined,
          address: location || undefined,
          category,
          ageMin: ageRange.ageMin,
          ageMax: ageRange.ageMax,
          adultPrice: prices.adultPrice || undefined,
          childPrice: prices.childPrice,
          familyPrice: prices.familyPrice,
          isOutdoor,
          durationMinutes: extractDuration(fullText) || undefined,
          imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https://www.praguest.com${imageUrl}`) : undefined,
          bookingUrl: link ? (link.startsWith('http') ? link : `https://www.praguest.com${link}`) : undefined,
        };

        events.push(event);
      } catch (error: any) {
        errors.push(`Error parsing event ${index}: ${error.message}`);
      }
    });

    console.log(`[${SOURCE_NAME}] Found ${events.length} family events`);
  } catch (error: any) {
    errors.push(`Failed to fetch from ${SOURCE_NAME}: ${error.message}`);
    console.error(`[${SOURCE_NAME}] Error:`, error);
  }

  const executionTime = Date.now() - startTime;

  return {
    source: SOURCE_NAME,
    events,
    errors,
    executionTime,
  };
}
