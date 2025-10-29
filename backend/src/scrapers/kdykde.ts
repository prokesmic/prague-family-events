/**
 * Scraper for kdykde.cz (Prague children's events)
 * Uses Axios + Cheerio (static HTML - no dynamic content)
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
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

const SOURCE_NAME = 'kdykde.cz';
const BASE_URL = 'https://www.kdykde.cz/calendar/zanr/deti';

/**
 * Scrape events from kdykde.cz
 */
export async function scrapeKdykde(): Promise<ScraperResult> {
  const startTime = Date.now();
  const events: RawEvent[] = [];
  const errors: string[] = [];

  try {
    console.log(`[${SOURCE_NAME}] Starting scrape...`);

    const response = await axios.get(BASE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept-Language': 'cs,en;q=0.9',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);

    // Find event items - kdykde uses .event class
    const eventElements = $('.event');
    console.log(`[${SOURCE_NAME}] Found ${eventElements.length} events`);

    eventElements.each((index, element) => {
      try {
        const $el = $(element);

        // Extract title
        const title = extractTextWithFallback($el, ['.heading', 'h2', 'h3', '[class*="heading"]']);
        if (!title) return;

        // Extract link
        const link = extractAttrWithFallback($el, ['a', '.heading a'], 'href');
        const bookingUrl = link
          ? link.startsWith('http')
            ? link
            : `https://www.kdykde.cz${link}`
          : undefined;

        // Extract description
        const description = extractTextWithFallback($el, ['.perex', '.description', 'p', '[class*="text"]']);

        // Extract date - kdykde uses format "1.9.2025 – 31.12.2026, 23:59" or "29.10.2025, 10:30 – 11:30"
        let dateStr = extractTextWithFallback($el, ['[class*="date"]', 'time', '.date']);

        // Clean up date string - extract just the date part using regex
        // Match patterns like "29.10.2025" or "1.9.2025" from the messy text
        const dateMatch = dateStr.match(/(\d{1,2}\.\d{1,2}\.\d{4})/);
        if (dateMatch) {
          dateStr = dateMatch[1];
        }

        // Extract location
        const location = extractTextWithFallback($el, [
          '[class*="location"]',
          '[class*="place"]',
          '[class*="venue"]',
          '.place',
        ]);

        // Extract image
        const imageUrl = extractAttrWithFallback($el, ['img'], 'src');
        const fullImageUrl = imageUrl
          ? imageUrl.startsWith('http')
            ? imageUrl
            : `https://www.kdykde.cz${imageUrl}`
          : undefined;

        // Parse date
        const startDateTime = parseCzechDate(dateStr);
        if (!startDateTime) {
          console.log(`[${SOURCE_NAME}] Skipping event without valid date: ${title} (${dateStr})`);
          return;
        }

        // Extract price info
        const priceStr = extractTextWithFallback($el, ['.price', '[class*="price"]']);
        const price = parseCzechPrice(priceStr);
        const prices = extractPrices($el.text());

        // Extract age range
        const fullText = title + ' ' + description;
        const ageRange = extractAgeRange(fullText);

        // Extract duration
        const duration = extractDuration(fullText);

        // Determine category
        const category = determineCategoryFromText(fullText);

        // Check if outdoor
        const lowerText = cleanText(fullText).toLowerCase();
        const isOutdoor =
          lowerText.includes('venku') ||
          lowerText.includes('outdoor') ||
          lowerText.includes('park') ||
          lowerText.includes('příroda') ||
          lowerText.includes('zahrada');

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
          durationMinutes: duration || undefined,
          imageUrl: fullImageUrl,
          bookingUrl,
        };

        events.push(event);
      } catch (error: any) {
        errors.push(`Error parsing event: ${error.message}`);
      }
    });

    console.log(`[${SOURCE_NAME}] Successfully parsed ${events.length} events`);
  } catch (error: any) {
    errors.push(`Failed to fetch: ${error.message}`);
    console.error(`[${SOURCE_NAME}] Error:`, error.message);
  }

  return {
    source: SOURCE_NAME,
    events,
    errors,
    executionTime: Date.now() - startTime,
  };
}
