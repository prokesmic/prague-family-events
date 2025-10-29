/**
 * Scraper for overenorodici.cz (Verified Parents - family-friendly places and events)
 * Uses Firecrawl for dynamic content
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

const SOURCE_NAME = 'overenorodici.cz';
const BASE_URL = 'https://www.overenorodici.cz/seznam-mist';

export async function scrapeOverenoRodici(): Promise<ScraperResult> {
  const startTime = Date.now();
  const events: RawEvent[] = [];
  const errors: string[] = [];

  console.log(`[${SOURCE_NAME}] Starting scrape...`);

  // Check if Firecrawl is available
  if (!isFirecrawlAvailable()) {
    console.log(`[${SOURCE_NAME}] Firecrawl API key not configured, skipping`);
    return {
      source: SOURCE_NAME,
      events: [],
      errors: ['Firecrawl API key not configured'],
      executionTime: Date.now() - startTime,
    };
  }

  try {
    const $ = await scrapeAndLoadCheerio(BASE_URL, {
      waitFor: 3000,
      timeout: 45000,
    });

    if (!$) {
      return {
        source: SOURCE_NAME,
        events: [],
        errors: ['Failed to scrape with Firecrawl'],
        executionTime: Date.now() - startTime,
      };
    }

    // Try multiple potential selectors for places/events
    const selectors = [
      '.place-card',
      '.event-card',
      '.listing-item',
      'article',
      '[class*="card"]',
      '[class*="item"]'
    ];

    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 3) { // Found potential events
        console.log(`[${SOURCE_NAME}] Found ${elements.length} items with selector: ${selector}`);

        elements.each((index, element) => {
          try {
            const $el = $(element);

            const title = extractTextWithFallback($el, ['h1', 'h2', 'h3', '.title', '.name']);
            if (!title || title.length < 3) return;

            const description = extractTextWithFallback($el, ['.description', '.perex', 'p']);
            const location = extractTextWithFallback($el, ['.location', '.address', '.place']);
            const priceStr = extractTextWithFallback($el, ['.price', '.cena']);

            const imageUrl = extractAttrWithFallback($el, ['img'], 'src');
            const link = extractAttrWithFallback($el, ['a'], 'href');

            // For now, create placeholder events (this site might be places, not events)
            // Skip actual event creation until we verify the site structure
            console.log(`[${SOURCE_NAME}] Found place: ${title}`);
          } catch (error: any) {
            errors.push(`Error parsing item: ${error.message}`);
          }
        });

        break;
      }
    }

    console.log(`[${SOURCE_NAME}] Found ${events.length} events`);
  } catch (error: any) {
    errors.push(`Failed to scrape: ${error.message}`);
    console.error(`[${SOURCE_NAME}] Error:`, error.message);
  }

  return {
    source: SOURCE_NAME,
    events,
    errors,
    executionTime: Date.now() - startTime,
  };
}
