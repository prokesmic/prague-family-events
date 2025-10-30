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

    // Find event elements - ententyky uses anchor tags with img and h3 inside
    // Look for links that contain both an image and h3 title
    const eventElements = $('a').filter((i, el) => {
      const $el = $(el);
      const hasImage = $el.find('img').length > 0;
      const hasH3 = $el.find('h3').length > 0;
      const text = $el.text().trim();
      // Must have image, h3, and reasonable text length
      return hasImage && hasH3 && text.length > 20;
    });

    console.log(`[${SOURCE_NAME}] Found ${eventElements.length} potential event elements`);

    eventElements.each((index, element) => {
      try {
        const $el = $(element);

        // Extract title from h3
        const title = $el.find('h3').first().text().trim();
        if (!title || title.length < 5) return;

        // Extract category from h4 (if present in parent or nearby elements)
        const fullText = $el.text();

        // Extract description - may be in text after title
        // For now, use full text as description source
        const description = fullText.substring(0, 300).trim();

        // Extract date - look for Czech date pattern in text (e.g., "so 1.11. 14:00")
        const dateMatch = fullText.match(/([a-z]{2})\s+(\d{1,2}\.\d{1,2}\.?)(\s+\d{1,2}:\d{2})?/i);
        const dateStr = dateMatch ? dateMatch[0] : '';

        // Note: extractAttrWithFallback might not be needed here
        const dateTime = null; // Will parse from dateStr
        const timeStr = dateMatch && dateMatch[3] ? dateMatch[3].trim() : '';

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

        // Extract image (img is inside the anchor)
        const imageUrl = $el.find('img').first().attr('src');

        // Extract link ($el is the anchor itself)
        const link = $el.attr('href');

        // Parse price and age range (fullText already defined above)
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
