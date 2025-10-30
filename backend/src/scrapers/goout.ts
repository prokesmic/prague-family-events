/**
 * Scraper for goout.net/cs/praha/akce (filter: pro děti)
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

const SOURCE_NAME = 'goout.net';
const BASE_URL = 'https://goout.net/cs/praha/akce';

/**
 * Scrape events from goout.net
 * @returns Scraper result with events and errors
 */
export async function scrapeGoOut(): Promise<ScraperResult> {
  const startTime = Date.now();
  const events: RawEvent[] = [];
  const errors: string[] = [];

  try {
    console.log(`[${SOURCE_NAME}] Starting scrape...`);

    // Fetch the page
    const response = await axios.get(BASE_URL, {
      params: {
        filter: 'pro-deti',
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);

    // Find event cards using debugged selector
    $('.event').each((index, element) => {
      try {
        const $el = $(element);

        // Extract basic information using helper functions
        const title = extractTextWithFallback($el, ['.title', 'h2', 'h3']);
        if (!title) return; // Skip if no title

        const description = extractTextWithFallback($el, ['.description', '.event-description', 'p']);
        const dateStr = extractTextWithFallback($el, ['time', '.date', '.event-date']);
        const dateTime = extractAttrWithFallback($el, ['time'], 'datetime');
        const timeStr = extractTextWithFallback($el, ['.time', '.event-time']);

        // Location is in the second <a> or <span> tag within .info div
        const $info = $el.find('.info');
        const locationLinks = $info.find('a');
        const location = locationLinks.length > 1 ? $(locationLinks[1]).text().trim() : $info.find('span.text-truncate').first().text().trim();

        const priceStr = extractTextWithFallback($el, ['.price', '.event-price']);

        // Try multiple selectors for image - look in anchor tags first
        const imageUrl = extractAttrWithFallback($el, ['a img', 'img', 'a > img'], 'src');
        const link = extractAttrWithFallback($el, ['a'], 'href');

        // Parse date and time (prefer datetime attribute if available)
        let startDateTime: Date | null = null;
        if (dateTime) {
          startDateTime = new Date(dateTime);
        }
        if (!startDateTime || isNaN(startDateTime.getTime())) {
          startDateTime = combineDateAndTime(dateStr, timeStr);
        }

        if (!startDateTime) {
          errors.push(`Failed to parse date for event: ${title}`);
          return;
        }

        // Parse price
        const price = parseCzechPrice(priceStr);
        const prices = extractPrices($el.text());

        // Extract age range
        const ageRange = extractAgeRange($el.text());

        // Extract duration
        const duration = extractDuration($el.text());

        // Determine category from text
        const category = determineCategoryFromText(title + ' ' + description);

        // Determine if outdoor (based on keywords)
        const fullText = cleanText(title + ' ' + description).toLowerCase();
        const isOutdoor =
          fullText.includes('venku') ||
          fullText.includes('outdoor') ||
          fullText.includes('park') ||
          fullText.includes('zahrada');

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
          durationMinutes: duration || undefined,
          imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https://goout.net${imageUrl}`) : undefined,
          bookingUrl: link ? (link.startsWith('http') ? link : `https://goout.net${link}`) : undefined,
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
