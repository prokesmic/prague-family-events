/**
 * Scraper for kudyznudy.cz (Prague and Central Bohemia)
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

const SOURCE_NAME = 'kudyznudy.cz';
// Use the "Events for children" filtered pages
const PRAGUE_URL = 'https://www.kudyznudy.cz/kalendar-akci/akce-pro-deti/hlavni-mesto-praha';
const CENTRAL_BOHEMIA_URL = 'https://www.kudyznudy.cz/kalendar-akci/akce-pro-deti/stredocesky-kraj';

/**
 * Scrape events from a single kudyznudy.cz URL
 */
async function scrapePage(url: string): Promise<{ events: RawEvent[]; errors: string[] }> {
  const events: RawEvent[] = [];
  const errors: string[] = [];

  try {
    // Use Firecrawl to handle dynamic content - kudyznudy.cz uses AJAX to load events
    const $ = await scrapeAndLoadCheerio(url, {
      waitFor: 10000, // Wait 10 seconds for AJAX-loaded events
      timeout: 60000,
    });

    if (!$) {
      errors.push(`Failed to scrape ${url} with Firecrawl`);
      return { events, errors };
    }

    // Find event detail links (not category links)
    // Events are AJAX-loaded and appear as links to /akce/ pages
    const detailLinks = $('a').filter((i, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      // Look for actual event detail pages, not category pages
      return href.includes('/akce/') && !href.includes('/kalendar-akci/') && text.length > 15;
    });

    console.log(`[${SOURCE_NAME}] Found ${detailLinks.length} event detail links`);

    if (detailLinks.length === 0) {
      errors.push(`No event links found on ${url}`);
      return { events, errors };
    }

    detailLinks.each((index, element) => {
      try {
        const $el = $(element);

        // Title is the link text
        const title = $el.text().trim();
        if (!title) return;

        // URL from href
        const link = $el.attr('href') || '';
        const bookingUrl = link.startsWith('http') ? link : `https://www.kudyznudy.cz${link}`;

        // Find parent container to get date/location info
        const parent = $el.closest('div[class*="event"], div[class*="item"], li, article');

        let dateStr = '';
        let location = '';
        let imageUrl = '';
        let description = '';

        if (parent.length) {
          // Extract date - kudyznudy uses .circle-date with spans for date ranges
          const dateEl = parent.find('[class*="date"], [class*="datum"]').first();
          if (dateEl.length) {
            // If there are span elements inside (date range), take just the first one
            const spanElements = dateEl.find('span');
            if (spanElements.length > 0) {
              dateStr = spanElements.first().text().trim();
            } else {
              dateStr = dateEl.text().trim();
            }
          }

          // Extract location
          const locationEl = parent.find('[class*="place"], [class*="location"], [class*="misto"]').first();
          if (locationEl.length) {
            location = locationEl.text().trim();
          }

          // Extract image
          const img = parent.find('img').first();
          if (img.length) {
            const imgSrc = img.attr('src') || '';
            imageUrl = imgSrc.startsWith('http') ? imgSrc : `https://www.kudyznudy.cz${imgSrc}`;
          }

          // Try to get description
          const descEl = parent.find('.perex, .description, p').first();
          if (descEl.length) {
            description = descEl.text().trim();
          }
        }

        // Parse date - kudyznudy uses format "DD. MM." or "DD. MM.–DD. MM."
        const startDateTime = parseCzechDate(dateStr);
        if (!startDateTime) {
          // Skip events without valid dates
          console.log(`[${SOURCE_NAME}] Skipping event without valid date: ${title} (${dateStr})`);
          return;
        }

        // Extract age range and prices from text
        const fullText = title + ' ' + description;
        const ageRange = extractAgeRange(fullText);
        const prices = extractPrices(fullText);

        // Determine category from text
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
          adultPrice: prices.adultPrice,
          childPrice: prices.childPrice,
          familyPrice: prices.familyPrice,
          isOutdoor,
          imageUrl: imageUrl || undefined,
          bookingUrl,
        };

        events.push(event);
      } catch (error: any) {
        errors.push(`Error parsing event: ${error.message}`);
      }
    });

    console.log(`[${SOURCE_NAME}] Successfully parsed ${events.length} events from ${url}`);
  } catch (error: any) {
    errors.push(`Failed to fetch ${url}: ${error.message}`);
  }

  return { events, errors };
}

/**
 * Scrape events from kudyznudy.cz (both Prague and Central Bohemia)
 */
export async function scrapeKudyZnudy(): Promise<ScraperResult> {
  const startTime = Date.now();
  const allEvents: RawEvent[] = [];
  const allErrors: string[] = [];

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

  // Scrape Prague
  const pragueResult = await scrapePage(PRAGUE_URL);
  allEvents.push(...pragueResult.events);
  allErrors.push(...pragueResult.errors);

  // Wait a bit before next request (rate limiting)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Scrape Central Bohemia
  const centralResult = await scrapePage(CENTRAL_BOHEMIA_URL);
  allEvents.push(...centralResult.events);
  allErrors.push(...centralResult.errors);

  console.log(`[${SOURCE_NAME}] Found ${allEvents.length} events`);

  const executionTime = Date.now() - startTime;

  return {
    source: SOURCE_NAME,
    events: allEvents,
    errors: allErrors,
    executionTime,
  };
}
