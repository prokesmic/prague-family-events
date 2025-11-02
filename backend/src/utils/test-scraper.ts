/**
 * Test script to run the scraper and log the first few events
 */

import { runAllScrapers, getAllEvents } from '../scrapers';

async function testScraper() {
  console.log('Starting scraper test...');
  const results = await runAllScrapers(100);
  const events = getAllEvents(results);
  console.log('Scraper finished.');

  if (events.length > 0) {
    console.log(`\n--- Scraped ${events.length} total events ---`);
    console.log('Logging first 5 events:');
    for (let i = 0; i < 5 && i < events.length; i++) {
      console.log({
        title: events[i].title,
        startDateTime: events[i].startDateTime,
        location: events[i].locationName,
        source: events[i].source,
      });
    }
  } else {
    console.log('No events were scraped.');
  }

  process.exit(0);
}

testScraper();
