/**
 * Puppeteer helper for scraping dynamic content
 */

import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

/**
 * Scrape a URL with Puppeteer and return a Cheerio instance
 * @param url URL to scrape
 * @param options Options for scraping
 * @returns Cheerio instance or null if scraping fails
 */
export async function scrapeWithPuppeteer(
  url: string,
  options: { waitFor?: number; timeout?: number } = {}
): Promise<cheerio.CheerioAPI | null> {
  let browser;
  try {
    console.log(`  [Puppeteer] Launching browser for ${url}`);
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: options.timeout || 60000 });

    if (options.waitFor) {
      await new Promise(resolve => setTimeout(resolve, options.waitFor));
    }

    const content = await page.content();
    console.log(`  [Puppeteer] Successfully fetched content for ${url}`);
    return cheerio.load(content);
  } catch (error: any) {
    console.error(`  [Puppeteer] Error scraping ${url}: ${error.message}`);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
