/**
 * API routes for events
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { FilterOptions, AgeGroup } from '../types';
import { startOfDay, endOfDay, addDays } from 'date-fns';
import { getPlaceholderImage } from '../utils/placeholderImages';

const router = Router();
const prisma = new PrismaClient();

/**
 * Add placeholder images to events that don't have images
 */
function addPlaceholderImages<T extends { imageUrl?: string | null; category?: string | null; title: string }>(
  events: T | T[]
): T | T[] {
  const processEvent = (event: T): T => {
    if (!event.imageUrl) {
      return {
        ...event,
        imageUrl: getPlaceholderImage(event.category || undefined, event.title),
      };
    }
    return event;
  };

  if (Array.isArray(events)) {
    return events.map(processEvent);
  }
  return processEvent(events);
}

/**
 * GET /api/events
 * Get events with optional filters
 * Query params:
 * - view: 'toddler' | 'child' | 'family'
 * - dateFrom: ISO date string
 * - dateTo: ISO date string
 * - category: category name
 * - priceMax: maximum price
 * - distanceMax: maximum distance in km
 * - indoorOnly: boolean
 * - limit: number of events to return
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      view = 'family',
      dateFrom,
      dateTo,
      category,
      priceMax,
      distanceMax,
      indoorOnly,
      limit = 100,
    } = req.query;

    // Build where clause
    const where: any = {};

    // Date filter
    if (dateFrom || dateTo) {
      where.startDateTime = {};
      if (dateFrom) {
        where.startDateTime.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.startDateTime.lte = new Date(dateTo as string);
      }
    } else {
      // Default: only future events
      where.startDateTime = {
        gte: new Date(),
      };
    }

    // Category filter
    if (category) {
      where.category = category;
    }

    // Price filter (use adult price as reference)
    if (priceMax) {
      where.adultPrice = {
        lte: parseFloat(priceMax as string),
      };
    }

    // Distance filter
    if (distanceMax) {
      where.distanceFromPrague = {
        lte: parseFloat(distanceMax as string),
      };
    }

    // Indoor filter
    if (indoorOnly === 'true') {
      where.isOutdoor = false;
    }

    // Determine which score field to use for ordering
    const scoreField =
      view === 'toddler'
        ? 'scoreToddler'
        : view === 'child'
        ? 'scoreChild'
        : 'scoreFamily';

    // Fetch events
    const events = await prisma.event.findMany({
      where,
      orderBy: [
        { [scoreField]: 'desc' },
        { startDateTime: 'asc' },
      ],
      take: parseInt(limit as string),
    });

    // Add placeholder images for events without images
    const eventsWithImages = addPlaceholderImages(events) as typeof events;

    res.json({
      success: true,
      count: events.length,
      events: eventsWithImages,
    });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/events/:id
 * Get single event by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        attendances: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    // Add placeholder image if missing
    const eventWithImage = addPlaceholderImages(event) as typeof event;

    res.json({
      success: true,
      event: eventWithImage,
    });
  } catch (error: any) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/events/calendar/:view
 * Get events grouped by date for calendar view
 * Max 4 events per day (highest scored)
 */
router.get('/calendar/:view', async (req: Request, res: Response) => {
  try {
    const { view } = req.params;
    const { dateFrom, dateTo } = req.query;

    if (!['toddler', 'child', 'family'].includes(view)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid view. Must be toddler, child, or family',
      });
    }

    // Default to next 30 days
    const startDate = dateFrom ? new Date(dateFrom as string) : new Date();
    const endDate = dateTo ? new Date(dateTo as string) : addDays(new Date(), 30);

    const scoreField =
      view === 'toddler'
        ? 'scoreToddler'
        : view === 'child'
        ? 'scoreChild'
        : 'scoreFamily';

    // Fetch all events in date range
    const allEvents = await prisma.event.findMany({
      where: {
        startDateTime: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate),
        },
      },
      orderBy: [
        { startDateTime: 'asc' },
        { [scoreField]: 'desc' },
      ],
    });

    // Group by date and take top 4 per day
    const eventsByDate: { [key: string]: any[] } = {};

    for (const event of allEvents) {
      const dateKey = event.startDateTime.toISOString().split('T')[0];

      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }

      // Only keep top 4 events per day
      if (eventsByDate[dateKey].length < 4) {
        eventsByDate[dateKey].push(event);
      }
    }

    res.json({
      success: true,
      view,
      dateRange: { from: startDate, to: endDate },
      eventsByDate,
    });
  } catch (error: any) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/events/map
 * Get events with coordinates for map view
 */
router.get('/map/view', async (req: Request, res: Response) => {
  try {
    const { view = 'family', dateFrom, dateTo } = req.query;

    const scoreField =
      view === 'toddler'
        ? 'scoreToddler'
        : view === 'child'
        ? 'scoreChild'
        : 'scoreFamily';

    const where: any = {
      latitude: { not: null },
      longitude: { not: null },
    };

    // Date filter
    if (dateFrom || dateTo) {
      where.startDateTime = {};
      if (dateFrom) {
        where.startDateTime.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.startDateTime.lte = new Date(dateTo as string);
      }
    } else {
      where.startDateTime = { gte: new Date() };
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { [scoreField]: 'desc' },
      take: 200, // Limit for performance
    });

    res.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error: any) {
    console.error('Error fetching map events:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/events/search
 * Search events by keyword
 */
router.get('/search/query', async (req: Request, res: Response) => {
  try {
    const { q, view = 'family', limit = 50 } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Search query required',
      });
    }

    const scoreField =
      view === 'toddler'
        ? 'scoreToddler'
        : view === 'child'
        ? 'scoreChild'
        : 'scoreFamily';

    const events = await prisma.event.findMany({
      where: {
        AND: [
          {
            startDateTime: { gte: new Date() },
          },
          {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { locationName: { contains: q, mode: 'insensitive' } },
              { category: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      orderBy: { [scoreField]: 'desc' },
      take: parseInt(limit as string),
    });

    res.json({
      success: true,
      query: q,
      count: events.length,
      events,
    });
  } catch (error: any) {
    console.error('Error searching events:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
