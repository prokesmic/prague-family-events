/**
 * Scraper orchestrator - coordinates all event scrapers
 */

import { scrapeGoOut } from './goout';
import { scrapeKudyZnudy } from './kudyznudy';
import { scrapeVyletyZabava } from './vylety-zabava';
import { scrapeOverenoRodici } from './overenorodici';
import { scrapeKdykde } from './kdykde';
import { scrapePraguest } from './praguest';
import { scrapeEntentyky } from './ententyky';
import { scrapeSlevomat } from './slevomat';
import { scrapeSkvelecesko } from './skvelecesko';
import { RawEvent, ScraperResult } from '../types';

// Placeholder scrapers for remaining sources
async function scrapePlaceholder(sourceName: string): Promise<ScraperResult> {
  console.log(`[${sourceName}] Placeholder - not yet implemented`);
  return {
    source: sourceName,
    events: [],
    errors: [`${sourceName} scraper not yet implemented`],
    executionTime: 0,
  };
}

/**
 * List of all scrapers with their functions
 */
export const SCRAPERS = [
  { name: 'goout.net', fn: scrapeGoOut },
  { name: 'vylety-zabava.cz', fn: scrapeVyletyZabava },
  { name: 'kdykde.cz', fn: scrapeKdykde }, // Static HTML - no Firecrawl needed
  { name: 'kudyznudy.cz', fn: scrapeKudyZnudy }, // Requires Firecrawl
  { name: 'overenorodici.cz', fn: scrapeOverenoRodici }, // Requires Firecrawl
  { name: 'praguest.com', fn: scrapePraguest }, // Requires Firecrawl
  { name: 'ententyky.cz', fn: scrapeEntentyky }, // Requires Firecrawl
  { name: 'slevomat.cz', fn: scrapeSlevomat }, // Requires Firecrawl - deals for kids
  { name: 'skvelecesko.cz', fn: scrapeSkvelecesko }, // Requires Firecrawl
  { name: 'prahahrave.cz', fn: () => scrapePlaceholder('prahahrave.cz') },
  { name: 'aktivnidite.cz', fn: () => scrapePlaceholder('aktivnidite.cz') },
];

/**
 * Run all scrapers in parallel with rate limiting
 * @param delayBetweenScrapers Delay in ms between starting each scraper (default: 2000)
 * @returns Array of scraper results
 */
export async function runAllScrapers(
  delayBetweenScrapers: number = 2000
): Promise<ScraperResult[]> {
  console.log('=== Starting all scrapers ===');
  const results: ScraperResult[] = [];

  for (const scraper of SCRAPERS) {
    try {
      const result = await scraper.fn();
      results.push(result);

      // Delay before next scraper to respect rate limits
      if (delayBetweenScrapers > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenScrapers));
      }
    } catch (error: any) {
      console.error(`Error running scraper ${scraper.name}:`, error);
      results.push({
        source: scraper.name,
        events: [],
        errors: [error.message],
        executionTime: 0,
      });
    }
  }

  const totalEvents = results.reduce((sum, r) => sum + r.events.length, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const totalTime = results.reduce((sum, r) => sum + r.executionTime, 0);

  console.log('=== Scraping complete ===');
  console.log(`Total events found: ${totalEvents}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`Total execution time: ${totalTime}ms`);

  return results;
}

/**
 * Get all events from scraper results
 * @param results Array of scraper results
 * @returns Flattened array of all events
 */
export function getAllEvents(results: ScraperResult[]): RawEvent[] {
  return results.flatMap((result) => result.events);
}

/**
 * Get all errors from scraper results
 * @param results Array of scraper results
 * @returns Flattened array of all errors with source names
 */
export function getAllErrors(results: ScraperResult[]): Array<{ source: string; error: string }> {
  return results.flatMap((result) =>
    result.errors.map((error) => ({
      source: result.source,
      error,
    }))
  );
}
