/**
 * Admin API routes
 * Endpoints for manual scraper triggers and system monitoring
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SCRAPERS, runAllScrapers, getAllEvents } from '../scrapers';
import { deduplicateEvents } from '../services/deduplication';
import { scoreEventForAllGroups } from '../services/scoring';
import { RawEvent, ScoredEvent } from '../types';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/admin/scrape/test
 * Test scraper imports and basic functionality
 */
router.get('/scrape/test', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      message: 'Scraper endpoint is accessible',
      scrapers: SCRAPERS.map(s => s.name),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        hasFirecrawlKey: !!process.env.FIRECRAWL_API_KEY,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * POST /api/admin/scrape/trigger
 * Manually trigger scraper run for all sources or specific source
 * Query params:
 * - source: optional - specific source to scrape (e.g., 'goout.net')
 */
router.post('/scrape/trigger', async (req: Request, res: Response) => {
  try {
    const { source } = req.query;

    console.log(`[Admin] Manual scrape triggered${source ? ` for ${source}` : ' for all sources'}`);
    console.log(`[Admin] Environment: NODE_ENV=${process.env.NODE_ENV}, hasFirecrawl=${!!process.env.FIRECRAWL_API_KEY}`);

    // Run scraping in background to avoid timeout
    const scrapePromise = (async () => {
      try {
        let scraperResults;

        if (source) {
          // Run specific scraper
          const scraper = SCRAPERS.find(s => s.name === source);
          if (!scraper) {
            console.error(`[Admin] Unknown source: ${source}`);
            return;
          }

          console.log(`[Admin] Running scraper: ${scraper.name}`);
          const result = await scraper.fn();
          scraperResults = [result];
        } else {
          // Run all scrapers
          console.log(`[Admin] Running all ${SCRAPERS.length} scrapers`);
          scraperResults = await runAllScrapers(1000); // 1 second delay between scrapers
        }

        // Process and store events
        const allEvents = getAllEvents(scraperResults);

        // Deduplicate
        const deduplicatedEvents = deduplicateEvents(allEvents, 0.8);

        // Score events (without geocoding for quick admin trigger)
        const scoredEvents: ScoredEvent[] = deduplicatedEvents.map((event: RawEvent) =>
          scoreEventForAllGroups(event, undefined)
        );

        // Store in database
        let storedCount = 0;
        for (const event of scoredEvents) {
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
            storedCount++;
          } catch (error) {
            console.error(`[Admin] Error storing event: ${error}`);
          }
        }

        // Calculate summary
        const totalEvents = scraperResults.reduce((sum, r) => sum + r.events.length, 0);
        const totalErrors = scraperResults.reduce((sum, r) => sum + r.errors.length, 0);

        console.log(`[Admin] Scrape completed: ${totalEvents} events found, ${storedCount} stored`);
      } catch (error) {
        console.error('[Admin] Background scrape error:', error);
      }
    })();

    // Don't await - return immediately
    scrapePromise.catch(err => console.error('[Admin] Scrape promise error:', err));

    // Return success immediately
    res.json({
      success: true,
      message: source
        ? `Scraping ${source} started in background`
        : 'Scraping all sources started in background',
      note: 'Check scraper health endpoint for progress'
    });

  } catch (error: any) {
    console.error('[Admin] Scrape trigger error:', error);
    console.error('[Admin] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/admin/scrape/health
 * Get scraper health metrics
 */
router.get('/scrape/health', async (req: Request, res: Response) => {
  try {
    // Get last scrape log
    const lastScrapeLog = await prisma.scrapeLog.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    // Get events count per source
    const eventsBySource = await prisma.event.groupBy({
      by: ['source'],
      _count: true,
      orderBy: {
        _count: {
          source: 'desc'
        }
      }
    });

    // Get recent events (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentEventsBySource = await prisma.event.groupBy({
      by: ['source'],
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      _count: true
    });

    // Calculate scraper health status
    const scraperHealth = SCRAPERS.map(scraper => {
      const totalEvents = eventsBySource.find(e => e.source === scraper.name)?._count || 0;
      const recentEvents = recentEventsBySource.find(e => e.source === scraper.name)?._count || 0;

      let status: 'healthy' | 'warning' | 'error' = 'healthy';
      if (totalEvents === 0) {
        status = 'error';
      } else if (recentEvents === 0) {
        status = 'warning';
      }

      return {
        source: scraper.name,
        status,
        totalEvents,
        recentEvents,
        lastActive: lastScrapeLog?.createdAt || null
      };
    });

    res.json({
      success: true,
      lastScrape: lastScrapeLog?.createdAt || null,
      totalScrapers: SCRAPERS.length,
      healthyScraper: scraperHealth.filter(s => s.status === 'healthy').length,
      warningScraper: scraperHealth.filter(s => s.status === 'warning').length,
      errorScraper: scraperHealth.filter(s => s.status === 'error').length,
      scrapers: scraperHealth
    });

  } catch (error: any) {
    console.error('[Admin] Health check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/admin/stats/quality
 * Get event source quality metrics
 */
router.get('/stats/quality', async (req: Request, res: Response) => {
  try {
    // Get events with scores grouped by source
    const eventsBySource = await prisma.event.groupBy({
      by: ['source'],
      _count: true,
      _avg: {
        scoreToddler: true,
        scoreChild: true,
        scoreFamily: true
      }
    });

    // Get events with complete data percentage
    const sources = await Promise.all(
      SCRAPERS.map(async (scraper) => {
        const totalEvents = await prisma.event.count({
          where: { source: scraper.name }
        });

        if (totalEvents === 0) {
          return {
            source: scraper.name,
            totalEvents: 0,
            avgScores: { toddler: 0, child: 0, family: 0 },
            dataCompleteness: 0,
            hasImage: 0,
            hasLocation: 0,
            hasPrice: 0
          };
        }

        const withImage = await prisma.event.count({
          where: { source: scraper.name, imageUrl: { not: null } }
        });

        const withLocation = await prisma.event.count({
          where: { source: scraper.name, locationName: { not: null } }
        });

        const withPrice = await prisma.event.count({
          where: {
            source: scraper.name,
            OR: [
              { adultPrice: { not: null } },
              { childPrice: { not: null } },
              { familyPrice: { not: null } }
            ]
          }
        });

        const sourceStats = eventsBySource.find(e => e.source === scraper.name);

        return {
          source: scraper.name,
          totalEvents,
          avgScores: {
            toddler: Math.round(sourceStats?._avg.scoreToddler || 0),
            child: Math.round(sourceStats?._avg.scoreChild || 0),
            family: Math.round(sourceStats?._avg.scoreFamily || 0)
          },
          dataCompleteness: Math.round(((withImage + withLocation + withPrice) / (totalEvents * 3)) * 100),
          hasImage: Math.round((withImage / totalEvents) * 100),
          hasLocation: Math.round((withLocation / totalEvents) * 100),
          hasPrice: Math.round((withPrice / totalEvents) * 100)
        };
      })
    );

    res.json({
      success: true,
      sources: sources.sort((a, b) => b.totalEvents - a.totalEvents)
    });

  } catch (error: any) {
    console.error('[Admin] Quality stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
