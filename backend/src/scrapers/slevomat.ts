/**
 * Scraper for slevomat.cz/slevy/pro-deti
 * Deals/discounts for kids activities
 * Note: Focuses on time-sensitive deals that can be treated as events
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

const SOURCE_NAME = 'slevomat.cz';
const BASE_URL = 'https://www.slevomat.cz/slevy/pro-deti';

/**
 * Check if a deal text indicates it's a time-bound event
 */
function isTimeBoundEvent(text: string): boolean {
  const lowerText = text.toLowerCase();

  // Keywords indicating time-bound events
  const eventKeywords = [
    'představení', 'divadlo', 'theater', 'show',
    'koncert', 'concert',
    'workshop', 'kurz', 'course',
    'akce', 'event',
    'výstava', 'exhibition',
    'festival',
    'promítání', 'screening',
    'výlet', 'trip', 'exkurze',
    'den', 'day', // as in "family day"
    'víkend', 'weekend'
  ];

  // Keywords indicating non-event deals (skip these)
  const nonEventKeywords = [
    'permanentka', 'membership',
    'kredit', 'credit',
    'poukaz', 'voucher', 'gift card',
    'balíček služeb', 'package'
  ];

  // Check for non-events first
  for (const keyword of nonEventKeywords) {
    if (lowerText.includes(keyword)) {
      return false;
    }
  }

  // Check for event keywords
  for (const keyword of eventKeywords) {
    if (lowerText.includes(keyword)) {
      return true;
    }
  }

  return false;
}

/**
 * Scrape deals from slevomat.cz
 * @returns Scraper result with events and errors
 */
export async function scrapeSlevomat(): Promise<ScraperResult> {
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

    // Use Firecrawl to handle JavaScript-rendered content
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

    // Find deal elements - slevomat uses specific deal card structures
    const dealElements = $(
      '.deal, .deal-card, .product, [class*="deal"], [class*="product"]'
    ).filter((i, el) => {
      const text = $(el).text().trim();
      return text.length > 30; // Filter for elements with substantial content
    });

    console.log(`[${SOURCE_NAME}] Found ${dealElements.length} potential deal elements`);

    dealElements.each((index, element) => {
      try {
        const $el = $(element);

        // Extract title
        const title = extractTextWithFallback($el, [
          'h2',
          'h3',
          '.title',
          '.deal-title',
          '.product-title',
          'a[class*="title"]'
        ]);

        if (!title || title.length < 5) return;

        // Check if this is a time-bound event
        const fullText = $el.text();
        if (!isTimeBoundEvent(fullText)) {
          console.log(`[${SOURCE_NAME}] Skipping non-event deal: ${title}`);
          return;
        }

        // Extract description
        const description = extractTextWithFallback($el, [
          '.description',
          '.perex',
          '.deal-description',
          'p',
          '.text'
        ]);

        // Extract validity date (when the deal expires)
        const validityStr = extractTextWithFallback($el, [
          '.validity',
          '.expiry',
          '.platnost',
          '[class*="validity"]',
          '[class*="expir"]',
          'time'
        ]);

        const dateTime = extractAttrWithFallback($el, ['time'], 'datetime');

        // For slevomat, we'll set the event date to the deal validity date
        // or use a default future date if not available
        let startDateTime: Date | null = null;
        if (dateTime) {
          startDateTime = new Date(dateTime);
        } else if (validityStr) {
          startDateTime = parseCzechDate(validityStr);
        }

        // If no date found, use 2 weeks from now as default
        if (!startDateTime || isNaN(startDateTime.getTime())) {
          startDateTime = new Date();
          startDateTime.setDate(startDateTime.getDate() + 14);
        }

        // Extract location
        const location = extractTextWithFallback($el, [
          '.location',
          '.venue',
          '.misto',
          '.place',
          '[class*="location"]'
        ]);

        // Filter for Prague only
        if (location) {
          const locationLower = location.toLowerCase();
          const isPrague =
            locationLower.includes('praha') ||
            locationLower.includes('prague') ||
            !locationLower.match(/\b(brno|ostrava|plzeň|liberec|olomouc)\b/);

          if (!isPrague) {
            return;
          }
        }

        // Extract price - slevomat shows discounted price
        const priceStr = extractTextWithFallback($el, [
          '.price',
          '.deal-price',
          '[class*="price"]',
          '.cena'
        ]);

        // Extract image
        const imageUrl = extractAttrWithFallback($el, ['img'], 'src');

        // Extract link
        const link = extractAttrWithFallback($el, ['a'], 'href');

        // Parse price and age range
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
          lowerText.includes('příroda');

        // Slevomat returns prices in halers (100 halers = 1 CZK), so divide by 100
        const adultPriceInCzk = (prices.adultPrice || price) ? Math.round((prices.adultPrice || price || 0) / 100) : undefined;
        const childPriceInCzk = prices.childPrice ? Math.round(prices.childPrice / 100) : undefined;
        const familyPriceInCzk = prices.familyPrice ? Math.round(prices.familyPrice / 100) : undefined;

        // Create event object
        const event: RawEvent = {
          externalId: `${SOURCE_NAME}-${createHash(title + location)}`,
          source: SOURCE_NAME,
          title: cleanText(title),
          description: description ? cleanText(description) : undefined,
          startDateTime,
          locationName: location || undefined,
          address: location || undefined,
          category,
          ageMin: ageRange.ageMin,
          ageMax: ageRange.ageMax,
          adultPrice: adultPriceInCzk,
          childPrice: childPriceInCzk,
          familyPrice: familyPriceInCzk,
          isOutdoor,
          durationMinutes: extractDuration(fullText) || undefined,
          imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https://www.slevomat.cz${imageUrl}`) : undefined,
          bookingUrl: link ? (link.startsWith('http') ? link : `https://www.slevomat.cz${link}`) : undefined,
        };

        events.push(event);
      } catch (error: any) {
        errors.push(`Error parsing deal ${index}: ${error.message}`);
      }
    });

    console.log(`[${SOURCE_NAME}] Found ${events.length} time-bound event deals`);
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
