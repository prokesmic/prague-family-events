/**
 * Scraper for vylety-zabava.cz (Family events and trips in Prague)
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

const SOURCE_NAME = 'vylety-zabava.cz';
const BASE_URL = 'https://www.vylety-zabava.cz/akce-pro-deti/praha';

export async function scrapeVyletyZabava(): Promise<ScraperResult> {
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

    // USE DEBUGGER-FOUND SELECTOR: article (10 events found)
    $('article.item').each((index, element) => {
      try {
        const $el = $(element);

        // Extract title from h3 a
        const title = $el.find('h3 a').first().text().trim();
        if (!title) return;

        // Extract link
        const link = $el.find('h3 a').first().attr('href');

        // Extract from ul.uvod list
        const $ulItems = $el.find('ul.uvod li');
        let dateStr = '';
        let location = '';
        let address = '';

        $ulItems.each((i, li) => {
          const text = $(li).text().trim();
          if (text.includes('Datum:')) {
            dateStr = text.replace('Datum:', '').trim();
          } else if (text.includes('Místo:')) {
            location = text.replace('Místo:', '').trim();
          } else if (text.includes('Adresa:')) {
            address = text.replace('Adresa:', '').trim();
          }
        });

        const description = $el.find('.introtext').text().trim();
        const imageUrl = $el.find('img').first().attr('src');
        const priceStr = extractTextWithFallback($el, ['.price', '.cena']);

        // Parse date (format: "od 1.1.2023 do 31.12.2030")
        let startDateTime: Date | null = null;
        if (dateStr) {
          const dateMatch = dateStr.match(/od\s+(\d{1,2}\.\d{1,2}\.\d{4})/);
          if (dateMatch) {
            startDateTime = parseCzechDate(dateMatch[1]);
          }
        }

        if (!startDateTime) {
          // If no valid date found, skip this event
          return;
        }

        // Parse price
        const price = parseCzechPrice(priceStr);
        const prices = extractPrices($el.text());
        const ageRange = extractAgeRange($el.text());

        // Determine category
        const category = determineCategoryFromText(title + ' ' + description);

        // Check if outdoor
        const fullText = cleanText(title + ' ' + description).toLowerCase();
        const isOutdoor = fullText.includes('venku') || fullText.includes('outdoor') || fullText.includes('park');

        // Extract duration
        const duration = extractDuration($el.text());

        // Create event
        const event: RawEvent = {
          externalId: `${SOURCE_NAME}-${createHash(title + dateStr + location)}`,
          source: SOURCE_NAME,
          title: cleanText(title),
          description: description ? cleanText(description) : undefined,
          startDateTime,
          locationName: location || undefined,
          address: address || location || undefined,
          category,
          ageMin: ageRange.ageMin,
          ageMax: ageRange.ageMax,
          adultPrice: prices.adultPrice || price || undefined,
          childPrice: prices.childPrice,
          familyPrice: prices.familyPrice,
          isOutdoor,
          durationMinutes: duration || undefined,
          imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https://www.vylety-zabava.cz${imageUrl}`) : undefined,
          bookingUrl: link ? (link.startsWith('http') ? link : `https://www.vylety-zabava.cz${link}`) : undefined,
        };

        events.push(event);
      } catch (error: any) {
        errors.push(`Error parsing event: ${error.message}`);
      }
    });

    console.log(`[${SOURCE_NAME}] Found ${events.length} events`);
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
