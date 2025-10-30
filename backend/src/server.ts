/**
 * Express server for Prague Family Events API
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import eventsRouter from './routes/events';
import adminRouter from './routes/admin';
import { scheduleDailyScrape } from './cron/daily-scrape';

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/events', eventsRouter);
app.use('/api/admin', adminRouter);

// Stats endpoint
app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalEvents,
      upcomingEvents,
      eventsBySource,
      averageScores,
    ] = await Promise.all([
      prisma.event.count(),
      prisma.event.count({
        where: {
          startDateTime: { gte: new Date() },
        },
      }),
      prisma.event.groupBy({
        by: ['source'],
        _count: true,
      }),
      prisma.event.aggregate({
        _avg: {
          scoreToddler: true,
          scoreChild: true,
          scoreFamily: true,
        },
      }),
    ]);

    res.json({
      success: true,
      stats: {
        totalEvents,
        upcomingEvents,
        eventsBySource,
        averageScores: {
          toddler: Math.round(averageScores._avg.scoreToddler || 0),
          child: Math.round(averageScores._avg.scoreChild || 0),
          family: Math.round(averageScores._avg.scoreFamily || 0),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Scrape logs endpoint
app.get('/api/scrape-logs', async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    const logs = await prisma.scrapeLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json({
      success: true,
      logs,
    });
  } catch (error: any) {
    console.error('Error fetching scrape logs:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Manual scrape trigger (protected - only for admin use)
app.post('/api/scrape/trigger', async (req: Request, res: Response) => {
  // TODO: Add authentication middleware
  try {
    // Import and run scrape function
    const { runDailyScrape } = await import('./cron/daily-scrape');

    // Run in background
    runDailyScrape()
      .then(() => console.log('Manual scrape completed'))
      .catch((error) => console.error('Manual scrape failed:', error));

    res.json({
      success: true,
      message: 'Scraping started in background',
    });
  } catch (error: any) {
    console.error('Error triggering scrape:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Favorites endpoints
app.get('/api/favorites/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      favorites,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post('/api/favorites', async (req: Request, res: Response) => {
  try {
    const { eventId, userId } = req.body;

    const favorite = await prisma.favorite.create({
      data: { eventId, userId },
    });

    res.json({
      success: true,
      favorite,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.delete('/api/favorites/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.favorite.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Favorite removed',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Attendance endpoints
app.get('/api/attendance/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const attendances = await prisma.attendance.findMany({
      where: { userId },
      include: {
        event: true,
      },
      orderBy: { attendedDate: 'desc' },
    });

    res.json({
      success: true,
      attendances,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post('/api/attendance', async (req: Request, res: Response) => {
  try {
    const { eventId, userId, attendedDate, rating, notes, photos, actualCost } = req.body;

    const attendance = await prisma.attendance.create({
      data: {
        eventId,
        userId,
        attendedDate: new Date(attendedDate),
        rating,
        notes,
        photos: photos || [],
        actualCost,
      },
    });

    res.json({
      success: true,
      attendance,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✓ Database connected');

    // Schedule daily scrape
    if (process.env.ENABLE_CRON === 'true') {
      scheduleDailyScrape();
      console.log('✓ Daily scrape scheduled');
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`  - Health: http://localhost:${PORT}/health`);
      console.log(`  - API: http://localhost:${PORT}/api`);
      console.log(`  - Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server
startServer();

export default app;
