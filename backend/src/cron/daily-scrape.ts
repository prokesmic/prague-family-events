/**
 * Daily scraping cron job
 * Runs at 3:00 AM Prague time to scrape, process, score, and store events
 */

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { runAllScrapers, getAllEvents } from '../scrapers';
import { deduplicateEvents } from '../services/deduplication';
import { geocodeAndCalculateDistance } from '../services/geocoding';
import { scoreEventForAllGroups } from '../services/scoring';
import { fetchWeatherForecast, getWeatherForDate } from '../services/weather';
import { isWithinPragueRadius } from '../utils/distance';
import { RawEvent, GeocodedEvent, ScoredEvent } from '../types';
import { addDays, isBefore, subDays } from 'date-fns';

const prisma = new PrismaClient();

/**
 * Process raw events: geocode, filter by distance
 */
async function processEvents(rawEvents: RawEvent[]): Promise<GeocodedEvent[]> {
  console.log(`Processing ${rawEvents.length} events...`);
  const geocodedEvents: GeocodedEvent[] = [];

  for (const event of rawEvents) {
    try {
      // Skip events without address
      if (!event.address && !event.locationName) {
        console.log(`Skipping event without location: ${event.title}`);
        continue;
      }

      // Try to geocode
      const address = event.address || event.locationName || '';
      const geoResult = await geocodeAndCalculateDistance(address);

      if (!geoResult) {
        console.log(`Failed to geocode: ${event.title} at ${address}`);
        // Still add event without coordinates
        geocodedEvents.push(event as GeocodedEvent);
        continue;
      }

      // Filter by 130km radius
      if (geoResult.distanceFromPrague > 130) {
        console.log(
          `Event too far (${geoResult.distanceFromPrague}km): ${event.title}`
        );
        continue;
      }

      // Add geocoded data
      const geocodedEvent: GeocodedEvent = {
        ...event,
        latitude: geoResult.latitude,
        longitude: geoResult.longitude,
        distanceFromPrague: geoResult.distanceFromPrague,
      };

      geocodedEvents.push(geocodedEvent);
    } catch (error) {
      console.error(`Error processing event ${event.title}:`, error);
      // Add without geocoding
      geocodedEvents.push(event as GeocodedEvent);
    }
  }

  console.log(`Processed ${geocodedEvents.length} events within Prague radius`);
  return geocodedEvents;
}

/**
 * Score all events for all age groups
 */
async function scoreEvents(geocodedEvents: GeocodedEvent[]): Promise<ScoredEvent[]> {
  console.log('Scoring events...');

  // Fetch weather forecast
  const weatherForecast = await fetchWeatherForecast();

  const scoredEvents: ScoredEvent[] = [];

  for (const event of geocodedEvents) {
    try {
      // Get weather for event date
      const weather = await getWeatherForDate(event.startDateTime);

      // Score event for all groups
      const scoredEvent = scoreEventForAllGroups(event, weather || undefined);
      scoredEvents.push(scoredEvent);
    } catch (error) {
      console.error(`Error scoring event ${event.title}:`, error);
    }
  }

  console.log(`Scored ${scoredEvents.length} events`);
  return scoredEvents;
}

/**
 * Store events in database (upsert)
 */
async function storeEvents(events: ScoredEvent[]): Promise<void> {
  console.log(`Storing ${events.length} events in database...`);

  for (const event of events) {
    try {
      await prisma.event.upsert({
        where: { externalId: event.externalId },
        update: {
          source: event.source,
          title: event.title,
          description: event.description,
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
          locationName: event.locationName,
          address: event.address,
          latitude: event.latitude,
          longitude: event.longitude,
          distanceFromPrague: event.distanceFromPrague,
          category: event.category,
          ageMin: event.ageMin,
          ageMax: event.ageMax,
          adultPrice: event.adultPrice,
          childPrice: event.childPrice,
          familyPrice: event.familyPrice,
          isOutdoor: event.isOutdoor || false,
          durationMinutes: event.durationMinutes,
          imageUrl: event.imageUrl,
          bookingUrl: event.bookingUrl,
          scoreToddler: event.scoreToddler,
          scoreChild: event.scoreChild,
          scoreFamily: event.scoreFamily,
          updatedAt: new Date(),
        },
        create: {
          externalId: event.externalId,
          source: event.source,
          title: event.title,
          description: event.description,
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
          locationName: event.locationName,
          address: event.address,
          latitude: event.latitude,
          longitude: event.longitude,
          distanceFromPrague: event.distanceFromPrague,
          category: event.category,
          ageMin: event.ageMin,
          ageMax: event.ageMax,
          adultPrice: event.adultPrice,
          childPrice: event.childPrice,
          familyPrice: event.familyPrice,
          isOutdoor: event.isOutdoor || false,
          durationMinutes: event.durationMinutes,
          imageUrl: event.imageUrl,
          bookingUrl: event.bookingUrl,
          scoreToddler: event.scoreToddler,
          scoreChild: event.scoreChild,
          scoreFamily: event.scoreFamily,
        },
      });
    } catch (error) {
      console.error(`Error storing event ${event.title}:`, error);
    }
  }

  console.log('Events stored successfully');
}

/**
 * Archive old events (older than 30 days)
 */
async function archiveOldEvents(): Promise<void> {
  console.log('Archiving old events...');

  const thirtyDaysAgo = subDays(new Date(), 30);

  const result = await prisma.event.deleteMany({
    where: {
      startDateTime: {
        lt: thirtyDaysAgo,
      },
    },
  });

  console.log(`Archived ${result.count} old events`);
}

/**
 * Log scraping results
 */
async function logScrapeResults(
  source: string,
  status: string,
  eventsFound: number,
  errorMessage?: string,
  executionTime?: number
): Promise<void> {
  await prisma.scrapeLog.create({
    data: {
      source,
      status,
      eventsFound,
      errorMessage,
      executionTime,
    },
  });
}

/**
 * Main scraping workflow
 */
export async function runDailyScrape(): Promise<void> {
  console.log('\n=== Starting daily scrape workflow ===');
  const workflowStart = Date.now();

  try {
    // Step 1: Scrape all sources
    console.log('\n[Step 1/5] Scraping sources...');
    const scraperResults = await runAllScrapers(2000);

    // Log scraper results
    for (const result of scraperResults) {
      await logScrapeResults(
        result.source,
        result.errors.length > 0 ? 'partial' : 'success',
        result.events.length,
        result.errors.join('; ') || undefined,
        result.executionTime
      );
    }

    // Step 2: Process and deduplicate
    console.log('\n[Step 2/5] Deduplicating events...');
    const allEvents = getAllEvents(scraperResults);
    const deduplicatedEvents = deduplicateEvents(allEvents, 0.8);
    console.log(
      `Deduplicated: ${allEvents.length} -> ${deduplicatedEvents.length} events`
    );

    // Step 3: Geocode and filter
    console.log('\n[Step 3/5] Geocoding and filtering...');
    const geocodedEvents = await processEvents(deduplicatedEvents);

    // Step 4: Score events
    console.log('\n[Step 4/5] Scoring events...');
    const scoredEvents = await scoreEvents(geocodedEvents);

    // Step 5: Store in database
    console.log('\n[Step 5/5] Storing events...');
    await storeEvents(scoredEvents);

    // Archive old events
    await archiveOldEvents();

    const workflowTime = Date.now() - workflowStart;
    console.log(`\n=== Daily scrape complete in ${workflowTime}ms ===`);
    console.log(`Total events in database: ${scoredEvents.length}`);
  } catch (error) {
    console.error('Error in daily scrape workflow:', error);
    await logScrapeResults('workflow', 'error', 0, String(error));
  }
}

/**
 * Schedule daily scrape at 3:00 AM Prague time
 * Cron expression: "0 3 * * *" (minute hour day month weekday)
 */
export function scheduleDailyScrape(): void {
  console.log('Scheduling daily scrape at 3:00 AM Prague time');

  // Run at 3:00 AM every day
  cron.schedule(
    '0 3 * * *',
    async () => {
      console.log('\n🕒 Triggered scheduled scrape at 3:00 AM');
      await runDailyScrape();
    },
    {
      timezone: 'Europe/Prague',
    }
  );

  console.log('Daily scrape scheduled successfully');
}

// If running directly (for testing)
if (require.main === module) {
  runDailyScrape()
    .then(() => {
      console.log('Scrape completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Scrape failed:', error);
      process.exit(1);
    });
}
