/**
 * Helper utilities for web scraping
 * Makes it easier to test and debug scrapers
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Fetch HTML and save to file for inspection
 */
export async function fetchAndSaveHTML(url: string, filename: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 30000,
    });

    const htmlDir = path.join(__dirname, '../../debug-html');
    if (!fs.existsSync(htmlDir)) {
      fs.mkdirSync(htmlDir, { recursive: true });
    }

    const filepath = path.join(htmlDir, filename);
    fs.writeFileSync(filepath, response.data);
    console.log(`✓ Saved HTML to: ${filepath}`);

    return response.data;
  } catch (error: any) {
    console.error(`✗ Failed to fetch ${url}:`, error.message);
    throw error;
  }
}

/**
 * Test multiple selectors and return the first that finds elements
 */
export function findWithSelectors(
  $: cheerio.CheerioAPI,
  selectors: string[],
  context?: cheerio.Cheerio<any>
): cheerio.Cheerio<any> | null {
  for (const selector of selectors) {
    try {
      const elements = context ? context.find(selector) : $(selector);
      if (elements.length > 0) {
        return elements;
      }
    } catch (error) {
      // Invalid selector, continue
    }
  }
  return null;
}

/**
 * Extract text with multiple selector fallbacks
 */
export function extractTextWithFallback(
  $el: cheerio.Cheerio<any>,
  selectors: string[]
): string {
  for (const selector of selectors) {
    try {
      const text = $el.find(selector).first().text().trim();
      if (text) return text;
    } catch (error) {
      // Continue to next selector
    }
  }
  return '';
}

/**
 * Extract attribute with multiple selector fallbacks
 */
export function extractAttrWithFallback(
  $el: cheerio.Cheerio<any>,
  selectors: string[],
  attr: string
): string | undefined {
  for (const selector of selectors) {
    try {
      const value = $el.find(selector).first().attr(attr);
      if (value) return value;
    } catch (error) {
      // Continue to next selector
    }
  }
  return undefined;
}

/**
 * Log scraper diagnostics
 */
export function logScraperDiagnostics(
  source: string,
  $: cheerio.CheerioAPI,
  testSelectors: { [key: string]: string[] }
) {
  console.log(`\n=== ${source} Scraper Diagnostics ===`);

  for (const [name, selectors] of Object.entries(testSelectors)) {
    console.log(`\n${name}:`);
    for (const selector of selectors) {
      try {
        const count = $(selector).length;
        console.log(`  ${selector}: ${count} elements found`);
      } catch (error) {
        console.log(`  ${selector}: ERROR`);
      }
    }
  }

  console.log('\n===================================\n');
}

/**
 * Delay helper for rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create hash from string for external ID
 */
export function createHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Clean and normalize text
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
}

/**
 * Determine category from Czech text
 */
export function determineCategoryFromText(text: string): string {
  const lower = text.toLowerCase();

  if (lower.includes('muzeum') || lower.includes('museum')) return 'museum';
  if (lower.includes('divadlo') || lower.includes('theater') || lower.includes('představení')) return 'theater';
  if (lower.includes('workshop') || lower.includes('dílna')) return 'workshop';
  if (lower.includes('park') || lower.includes('venku') || lower.includes('outdoor')) return 'outdoor';
  if (lower.includes('sport') || lower.includes('běh') || lower.includes('fotbal')) return 'sport';
  if (lower.includes('hřiště') || lower.includes('playground')) return 'playground';
  if (lower.includes('výstava') || lower.includes('exhibition')) return 'exhibition';
  if (lower.includes('koncert') || lower.includes('concert') || lower.includes('hudba')) return 'concert';
  if (lower.includes('festival')) return 'festival';
  if (lower.includes('vzdělávání') || lower.includes('educational') || lower.includes('kurz')) return 'educational';
  if (lower.includes('zoo') || lower.includes('zvířata')) return 'zoo';
  if (lower.includes('aquapark') || lower.includes('bazén') || lower.includes('plavání')) return 'aquapark';

  return 'other';
}
