/**
 * Test script to run each scraper individually and log the results
 */

import { SCRAPERS } from '../scrapers';

async function testScrapersIndividually() {
  console.log('--- Starting Individual Scraper Test ---');

  for (const scraper of SCRAPERS) {
    console.log(`\n[TESTING] Running scraper: ${scraper.name}...`);
    try {
      const result = await scraper.fn();
      console.log(`  [SUCCESS] Scraper ${scraper.name} finished.`);
      console.log(`    - Events found: ${result.events.length}`);
      console.log(`    - Errors: ${result.errors.length}`);
      if (result.errors.length > 0) {
        console.log(`    - Error messages: ${result.errors.join('; ')}`);
      }
    } catch (error: any) {
      console.error(`  [FAILURE] Scraper ${scraper.name} failed with an unhandled exception:`);
      console.error(`    - ${error.message}`);
    }
  }

  console.log('\n--- Individual Scraper Test Complete ---');
  process.exit(0);
}

testScrapersIndividually();
