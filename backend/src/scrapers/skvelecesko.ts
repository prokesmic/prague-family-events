/**
 * Scraper for skvelecesko.cz/akce
 * Czech tourism events - filtering for Prague region and family-friendly
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

const SOURCE_NAME = 'skvelecesko.cz';
const BASE_URL = 'https://www.skvelecesko.cz/akce';

/**
 * Check if event text indicates it's family-friendly
 */
function isFamilyFriendly(text: string): boolean {
  const lowerText = text.toLowerCase();

  const familyKeywords = [
    'děti', 'dětsk', 'children', 'kids',
    'rodina', 'rodinný', 'family',
    'pro všechny', 'all ages',
    'mládeže', 'youth',
    'školák', 'schoolchildren',
    'batolat', 'toddler',
    'workshop', 'tvořivá dílna',
    'pohádka', 'fairy tale',
    'zábava', 'fun',
    'hry', 'games',
    'animace', 'animation'
  ];

  for (const keyword of familyKeywords) {
    if (lowerText.includes(keyword)) {
      return true;
    }
  }

  return false;
}

/**
 * Scrape events from skvelecesko.cz
 * @returns Scraper result with events and errors
 */
export async function scrapeSkvelecesko(): Promise<ScraperResult> {
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

    // Find event elements - they are anchor tags containing images
    const eventElements = $('a').filter((i, el) => {
      const $el = $(el);
      const hasImage = $el.find('img').length > 0;
      const text = $el.text().trim();
      // Must have image and reasonable text length
      return hasImage && text.length > 20;
    });

    console.log(`[${SOURCE_NAME}] Found ${eventElements.length} potential event elements`);

    eventElements.each((index, element) => {
      try {
        const $el = $(element);

        // Extract title - the first line of text in the anchor (excluding image alt)
        const textContent = $el.text().trim();
        const lines = textContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const title = lines[0] || '';

        if (!title || title.length < 5) return;

        // Description might be in subsequent lines or not available
        const description = lines.length > 1 ? lines.slice(1).join(' ').substring(0, 300) : undefined;

        // Check if family-friendly
        const fullText = title + ' ' + (description || '');
        if (!isFamilyFriendly(fullText)) {
          console.log(`[${SOURCE_NAME}] Skipping non-family event: ${title}`);
          return;
        }

        // Extract date
        const dateStr = extractTextWithFallback($el, [
          'time',
          '.date',
          '.datum',
          '[class*="date"]',
          '[class*="datum"]'
        ]);

        const dateTime = extractAttrWithFallback($el, ['time'], 'datetime');
        const timeStr = extractTextWithFallback($el, [
          '.time',
          '.cas',
          '[class*="time"]'
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

        // Filter out events too far in the past
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (startDateTime < now) {
          return;
        }

        // Extract location
        const location = extractTextWithFallback($el, [
          '.location',
          '.venue',
          '.misto',
          '.place',
          '[class*="location"]',
          '[class*="kraj"]',
          '[class*="region"]'
        ]);

        // Filter for Prague region
        if (location) {
          const locationLower = location.toLowerCase();
          const isPragueRegion =
            locationLower.includes('praha') ||
            locationLower.includes('prague') ||
            locationLower.includes('středočeský') ||
            locationLower.includes('central bohemia');

          if (!isPragueRegion) {
            console.log(`[${SOURCE_NAME}] Skipping non-Prague event: ${title} (${location})`);
            return;
          }
        }

        // Extract price
        const priceStr = extractTextWithFallback($el, [
          '.price',
          '.cena',
          '[class*="price"]',
          '[class*="vstupn"]'
        ]);

        // Extract image
        const imageUrl = $el.find('img').first().attr('src');

        // Extract link - $el is already the anchor tag
        const link = $el.attr('href');

        // Parse price and age range
        const price = parseCzechPrice(priceStr);
        const prices = extractPrices($el.text());
        const ageRange = extractAgeRange($el.text());

        // Determine category
        const category = determineCategoryFromText(fullText);

        // Check if outdoor
        const lowerText = cleanText(fullText).toLowerCase();
        const isOutdoor =
          lowerText.includes('venku') ||
          lowerText.includes('outdoor') ||
          lowerText.includes('park') ||
          lowerText.includes('zahrada') ||
          lowerText.includes('příroda') ||
          lowerText.includes('nature') ||
          lowerText.includes('hike') ||
          lowerText.includes('trail') ||
          lowerText.includes('výlet');

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
          imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https://www.skvelecesko.cz${imageUrl}`) : undefined,
          bookingUrl: link ? (link.startsWith('http') ? link : `https://www.skvelecesko.cz${link}`) : undefined,
        };

        events.push(event);
      } catch (error: any) {
        errors.push(`Error parsing event ${index}: ${error.message}`);
      }
    });

    console.log(`[${SOURCE_NAME}] Found ${events.length} family-friendly Prague events`);
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
