/**
 * Firecrawl Helper - Utilities for scraping with Firecrawl API
 * Firecrawl handles JavaScript rendering, dynamic content, and complex sites
 */

import FirecrawlApp from '@mendable/firecrawl-js';
import * as cheerio from 'cheerio';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || '';

let firecrawlClient: FirecrawlApp | null = null;

/**
 * Get or initialize Firecrawl client
 */
export function getFirecrawlClient(): FirecrawlApp | null {
  if (!FIRECRAWL_API_KEY) {
    console.warn('⚠️  FIRECRAWL_API_KEY not configured. Firecrawl scrapers will be skipped.');
    return null;
  }

  if (!firecrawlClient) {
    firecrawlClient = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });
  }

  return firecrawlClient;
}

/**
 * Check if Firecrawl is available
 */
export function isFirecrawlAvailable(): boolean {
  return !!FIRECRAWL_API_KEY;
}

/**
 * Scrape a URL with Firecrawl and return the HTML content
 * @param url - The URL to scrape
 * @param options - Optional scraping options
 * @returns HTML content as a string, or null if failed
 */
export async function scrapeWithFirecrawl(
  url: string,
  options: {
    waitFor?: number; // milliseconds to wait for page load
    timeout?: number; // request timeout in milliseconds
  } = {}
): Promise<string | null> {
  const client = getFirecrawlClient();

  if (!client) {
    console.log(`Firecrawl not available, skipping: ${url}`);
    return null;
  }

  try {
    console.log(`[Firecrawl] Scraping: ${url}`);

    const scrapeOptions: any = {
      formats: ['html'],
      waitFor: options.waitFor || 2000,
      timeout: options.timeout || 30000,
    };

    const result = await client.scrape(url, scrapeOptions);

    // New Firecrawl API returns Document directly
    const html = result.html || (result as any).content || '';

    if (!html || html.length < 100) {
      console.warn(`[Firecrawl] No/minimal HTML content returned for: ${url}`);
      return null;
    }

    console.log(`[Firecrawl] Successfully scraped ${url} (${html.length} chars)`);
    return html;
  } catch (error: any) {
    console.error(`[Firecrawl] Error scraping ${url}:`, error.message);
    return null;
  }
}

/**
 * Scrape a URL with Firecrawl and return a Cheerio instance
 * @param url - The URL to scrape
 * @param options - Optional scraping options
 * @returns Cheerio instance, or null if failed
 */
export async function scrapeAndLoadCheerio(
  url: string,
  options: {
    waitFor?: number;
    timeout?: number;
  } = {}
): Promise<cheerio.CheerioAPI | null> {
  const html = await scrapeWithFirecrawl(url, options);

  if (!html) {
    return null;
  }

  try {
    const $ = cheerio.load(html);
    return $;
  } catch (error: any) {
    console.error(`[Firecrawl] Error loading HTML with Cheerio:`, error.message);
    return null;
  }
}

/**
 * Extract structured data from a URL using Firecrawl's AI extraction
 * Note: This feature requires Firecrawl v1+ API with Extract feature
 * Currently disabled due to API version mismatch
 */
export async function extractWithFirecrawl(
  url: string,
  schema: Record<string, any>
): Promise<any | null> {
  console.warn('[Firecrawl] Extract feature not implemented for current API version');
  return null;
}

/**
 * Crawl multiple pages from a website
 * Note: This feature requires Firecrawl v1+ API with Crawl feature
 * Currently disabled due to API version mismatch
 */
export async function crawlWithFirecrawl(
  baseUrl: string,
  options: {
    maxPages?: number;
    allowedDomains?: string[];
  } = {}
): Promise<any[]> {
  console.warn('[Firecrawl] Crawl feature not implemented for current API version');
  return [];
}
