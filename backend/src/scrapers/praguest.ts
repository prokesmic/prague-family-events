/**
 * Scraper for praguest.com/akce
 * Uses Firecrawl for dynamic content rendering
 */

import { RawEvent, ScraperResult } from '../types';
import { parseCzechDate, combineDateAndTime, extractDuration } from '../utils/dateParser';
import { parseCzechPrice, extractPrices, extractAgeRange } from '../utils/priceParser';
import {
  extractTextWithFallback,
  extractAttrWithFallback,
  cleanText,
  determineCategoryFromText,
  createHash
} from '../utils/scraperHelper';
import { scrapeAndLoadCheerio, isFirecrawlAvailable } from '../utils/firecrawlHelper';

const SOURCE_NAME = 'praguest.com';
const BASE_URL = 'https://www.praguest.com/akce';

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

    // Find event items - praguest.com typically uses article or div elements for events
    const eventElements = $('.event, .event-item, article[class*="event"], div[class*="event-card"]');

    console.log(`[${SOURCE_NAME}] Found ${eventElements.length} potential event elements`);

    eventElements.each((index, element) => {
      try {
        const $el = $(element);

        // Extract title
        const title = extractTextWithFallback($el, [
          'h2',
          'h3',
          '.event-title',
          '.title',
          'a[class*="title"]',
          '.event-name'
        ]);

        if (!title || title.length < 5) return;

        // Filter for family/kids events
        const fullText = $el.text().toLowerCase();
        const isFamilyEvent =
          fullText.includes('děti') ||
          fullText.includes('rodina') ||
          fullText.includes('family') ||
          fullText.includes('kids') ||
          fullText.includes('children') ||
          fullText.includes('dětsk');

        // Skip non-family events
        if (!isFamilyEvent) {
          return;
        }

        // Extract description
        const description = extractTextWithFallback($el, [
          '.description',
          '.event-description',
          '.perex',
          'p',
          '.excerpt'
        ]);

        // Extract date
        const dateStr = extractTextWithFallback($el, [
          'time',
          '.date',
          '.event-date',
          '[class*="date"]',
          '.when'
        ]);

        const dateTime = extractAttrWithFallback($el, ['time'], 'datetime');
        const timeStr = extractTextWithFallback($el, ['.time', '.event-time', '[class*="time"]']);

        // Parse date
        let startDateTime: Date | null = null;
        if (dateTime) {
          startDateTime = new Date(dateTime);
        }
        if (!startDateTime || isNaN(startDateTime.getTime())) {
          startDateTime = combineDateAndTime(dateStr, timeStr);
        }

        if (!startDateTime) {
          console.log(`[${SOURCE_NAME}] Skipping event without valid date: ${title}`);
          return;
        }

        // Extract location
        const location = extractTextWithFallback($el, [
          '.location',
          '.venue',
          '.place',
          '[class*="location"]',
          '.where'
        ]);

        // Extract price
        const priceStr = extractTextWithFallback($el, [
          '.price',
          '.event-price',
          '[class*="price"]'
        ]);

        // Extract image
        const imageUrl = extractAttrWithFallback($el, ['img'], 'src');

        // Extract link
        const link = extractAttrWithFallback($el, ['a'], 'href');

        // Parse price and age range
        const price = parseCzechPrice(priceStr);
        const prices = extractPrices($el.text());
        const ageRange = extractAgeRange($el.text());

        // Determine category
        const category = determineCategoryFromText(title + ' ' + (description || ''));

        // Check if outdoor
        const lowerText = cleanText(title + ' ' + (description || '')).toLowerCase();
        const isOutdoor =
          lowerText.includes('venku') ||
          lowerText.includes('outdoor') ||
          lowerText.includes('park') ||
          lowerText.includes('zahrada') ||
          lowerText.includes('příroda');

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
          adultPrice: prices.adultPrice || price || undefined,
          childPrice: prices.childPrice,
          familyPrice: prices.familyPrice,
          isOutdoor,
          durationMinutes: extractDuration($el.text()) || undefined,
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
