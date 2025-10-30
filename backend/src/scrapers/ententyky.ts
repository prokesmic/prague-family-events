/**
 * Scraper for ententyky.cz/akce
 * Kids activities and events - uses Firecrawl for JavaScript-rendered content
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

const SOURCE_NAME = 'ententyky.cz';
const BASE_URL = 'https://www.ententyky.cz/akce-1/';

/**
 * Scrape events from ententyky.cz
 * @returns Scraper result with events and errors
 */
export async function scrapeEntentyky(): Promise<ScraperResult> {
  const startTime = Date.now();
  const events: RawEvent[] = [];
  const errors: string[] = [];

  try {
    console.log(`[${SOURCE_NAME}] Starting scrape...`);

    // Check if Firecrawl is available - ententyky.cz likely uses JavaScript for content
    if (!isFirecrawlAvailable()) {
      console.log(`[${SOURCE_NAME}] Firecrawl API key not configured, skipping dynamic content scraper`);
      return {
        source: SOURCE_NAME,
        events: [],
        errors: ['Firecrawl API key not configured'],
        executionTime: Date.now() - startTime,
      };
    }

    // Use Firecrawl to handle JavaScript-rendered content
    const $ = await scrapeAndLoadCheerio(BASE_URL, {
      waitFor: 8000, // Wait for JavaScript to load events
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

    // Find event elements - ententyky typically lists events in cards or items
    const eventElements = $(
      '.event, .akce, .event-item, article, .card, [class*="event"], [class*="akce"]'
    ).filter((i, el) => {
      const text = $(el).text().trim();
      // Filter for elements that likely contain event info (have date/title)
      return text.length > 30;
    });

    console.log(`[${SOURCE_NAME}] Found ${eventElements.length} potential event elements`);

    eventElements.each((index, element) => {
      try {
        const $el = $(element);

        // Extract title
        const title = extractTextWithFallback($el, [
          'h1',
          'h2',
          'h3',
          '.title',
          '.event-title',
          '.nazev',
          '.name',
          'a[class*="title"]'
        ]);

        if (!title || title.length < 5) return;

        // Extract description
        const description = extractTextWithFallback($el, [
          '.description',
          '.perex',
          '.popis',
          'p',
          '.excerpt',
          '.text'
        ]);

        // Extract date
        const dateStr = extractTextWithFallback($el, [
          'time',
          '.date',
          '.datum',
          '[class*="date"]',
          '[class*="datum"]',
          '.when'
        ]);

        const dateTime = extractAttrWithFallback($el, ['time'], 'datetime');
        const timeStr = extractTextWithFallback($el, [
          '.time',
          '.cas',
          '[class*="time"]',
          '[class*="cas"]'
        ]);

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

        // Filter out events too far in the past or too far in the future
        const now = new Date();
        const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        if (startDateTime < now || startDateTime > oneYearFromNow) {
          return;
        }

        // Extract location
        const location = extractTextWithFallback($el, [
          '.location',
          '.venue',
          '.misto',
          '.place',
          '[class*="location"]',
          '[class*="misto"]',
          '.where'
        ]);

        // Filter for Prague events only
        if (location) {
          const locationLower = location.toLowerCase();
          const isPrague =
            locationLower.includes('praha') ||
            locationLower.includes('prague') ||
            !locationLower.match(/\b(brno|ostrava|plzeň|liberec|olomouc)\b/);

          if (!isPrague) {
            return; // Skip non-Prague events
          }
        }

        // Extract price
        const priceStr = extractTextWithFallback($el, [
          '.price',
          '.cena',
          '[class*="price"]',
          '[class*="cena"]'
        ]);

        // Extract image
        const imageUrl = extractAttrWithFallback($el, ['img'], 'src');

        // Extract link
        const link = extractAttrWithFallback($el, ['a'], 'href');

        // Parse price and age range
        const fullText = $el.text();
        const price = parseCzechPrice(priceStr);
        const prices = extractPrices(fullText);
        const ageRange = extractAgeRange(fullText);

        // Determine category
        const category = determineCategoryFromText(title + ' ' + (description || ''));

        // Check if outdoor
        const lowerText = cleanText(title + ' ' + (description || '')).toLowerCase();
        const isOutdoor =
          lowerText.includes('venku') ||
          lowerText.includes('outdoor') ||
          lowerText.includes('park') ||
          lowerText.includes('zahrada') ||
          lowerText.includes('příroda') ||
          lowerText.includes('nature');

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
          durationMinutes: extractDuration(fullText) || undefined,
          imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https://www.ententyky.cz${imageUrl}`) : undefined,
          bookingUrl: link ? (link.startsWith('http') ? link : `https://www.ententyky.cz${link}`) : undefined,
        };

        events.push(event);
      } catch (error: any) {
        errors.push(`Error parsing event ${index}: ${error.message}`);
      }
    });

    console.log(`[${SOURCE_NAME}] Found ${events.length} events`);
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
