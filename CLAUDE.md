# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Prague Family Events is an automated event discovery calendar application for finding family-friendly events in Prague and surrounding areas (130km radius). The system scrapes 11 Czech websites daily, scores events using a 0-100 point algorithm based on age-appropriateness, distance, price, timing, and weather, then presents them in three customized calendar views: Toddler (1.5 years), Child (9 years), and Family.

**Architecture**: Monorepo with separate frontend (Next.js) and backend (Express/Node.js) sharing a PostgreSQL database via Prisma ORM.

## Development Commands

### Backend (Node.js + Express + Prisma)

```bash
cd backend

# Development
npm run dev                    # Start dev server with hot reload (port 3001)
npm run build                  # Compile TypeScript to dist/
npm start                      # Run compiled production server

# Database
npx prisma generate            # Generate Prisma Client after schema changes
npx prisma migrate dev         # Create and apply migration
npx prisma studio              # Open database GUI (localhost:5555)
npx prisma db push             # Push schema changes without migration

# Scraping
npm run scrape                 # Manually trigger all scrapers (stores in DB)
ts-node src/cron/daily-scrape.ts  # Same as npm run scrape

# Test single scraper
ts-node -e "import('./src/scrapers/goout').then(m => m.scrapeGoOut().then(console.log))"
```

### Frontend (Next.js 16 + App Router)

```bash
cd frontend

# Development
npm run dev                    # Start dev server (port 3000)
npm run build                  # Production build
npm start                      # Run production build
npm run lint                   # Run ESLint
```

### Environment Setup

**Backend `.env`** (required):
```env
DATABASE_URL="postgresql://user:pass@host:port/db?schema=public"
PORT=3001
FRONTEND_URL="http://localhost:3000"
ENABLE_CRON="false"                    # Set "true" in production for daily 3am scrapes
FIRECRAWL_API_KEY=""                   # Optional: Required for some scrapers (kudyznudy, praguest, etc.)
OPENWEATHER_API_KEY=""                 # Optional: For weather-based scoring
```

**Frontend `.env`** (required):
```env
DATABASE_URL="postgresql://..."        # Same as backend
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

## System Architecture

### Data Flow Pipeline

1. **Scraping** (`backend/src/scrapers/`) - 11 scrapers extract events from Czech websites
2. **Deduplication** (`backend/src/services/deduplication.ts`) - Merges similar events using string similarity (0.8 threshold)
3. **Geocoding** (`backend/src/services/geocoding.ts`) - Uses OpenStreetMap Nominatim to get coordinates and calculate distance from Prague (50.0755°N, 14.4378°E)
4. **Filtering** - Removes events >130km from Prague
5. **Scoring** (`backend/src/services/scoring.ts`) - Assigns 0-100 scores for toddler/child/family age groups
6. **Storage** (`backend/prisma/schema.prisma`) - Upserts events to PostgreSQL
7. **API** (`backend/src/routes/`) - Express endpoints serve filtered/scored events
8. **Frontend** (`frontend/app/`) - Next.js displays events in calendar/map/list views

### Database Schema (Prisma)

**Event Model** (main table):
- Core fields: `title`, `description`, `startDateTime`, `endDateTime`
- Location: `locationName`, `address`, `latitude`, `longitude`, `distanceFromPrague`
- Pricing: `adultPrice`, `childPrice`, `familyPrice`
- Metadata: `ageMin`, `ageMax`, `category`, `isOutdoor`, `durationMinutes`
- Scores: `scoreToddler`, `scoreChild`, `scoreFamily` (0-100)
- Source tracking: `source`, `externalId` (unique)

**Supporting Models**:
- `User` - For attendance tracking (auth not yet implemented)
- `Attendance` - Track attended events with ratings, notes, photos, actualCost
- `Favorite` - Bookmark events
- `Preference` - User preferences for scoring weights
- `ScrapeLog` - Scraping history and error tracking

### Scraper Architecture

**Pattern** (follow `backend/src/scrapers/goout.ts`):
```typescript
export async function scrapeSiteName(): Promise<ScraperResult> {
  const events: RawEvent[] = [];
  const errors: string[] = [];
  const startTime = Date.now();

  try {
    // Fetch HTML (Cheerio for static, Firecrawl for dynamic)
    const response = await axios.get(URL);
    const $ = cheerio.load(response.data);

    // Extract events
    $('.event-selector').each((index, element) => {
      events.push({
        externalId: `source-${uniqueId}`,  // Must be globally unique
        source: 'source-name',
        title: $(element).find('.title').text().trim(),
        startDateTime: parseCzechDate(dateString),  // utils/dateParser.ts
        // ... extract all available fields
      });
    });
  } catch (error) {
    errors.push(`Failed to scrape: ${error.message}`);
  }

  return {
    source: 'source-name',
    events,
    errors,
    executionTime: Date.now() - startTime,
  };
}
```

**Key Utilities**:
- `utils/dateParser.ts` - Parses Czech date formats ("20. ledna 2024", "pá 15.3.")
- `utils/priceParser.ts` - Extracts prices from Czech text ("200 Kč", "zdarma")
- `utils/firecrawlHelper.ts` - Uses Firecrawl API for JavaScript-rendered sites
- `utils/distance.ts` - Haversine formula for distance calculations

**Scrapers Registry** (`backend/src/scrapers/index.ts`):
- All scrapers run sequentially with 2-second delays (rate limiting)
- Some scrapers require `FIRECRAWL_API_KEY` (kudyznudy, praguest, ententyky, slevomat, skvelecesko, overenorodici)
- Static HTML scrapers work without Firecrawl (goout, kdykde, vylety-zabava)

### Event Scoring System

**Algorithm** (`backend/src/services/scoring.ts`):
- Base score: 50 points
- Age appropriateness: +0-20 pts (perfect match vs. out of range)
- Distance from Prague: +0-15 pts (<10km: +15, <30km: +10, <70km: +5, <130km: +2)
- Price: +0-15 pts (free: +15, <200Kč: +12, <500Kč: +8, <1000Kč: +4)
- Event type: +0-15 pts (outdoor + good weather: +8, educational: +7, interactive: +5)
- Timing: +0-10 pts (weekend: +5, optimal time for age: +5)
- Duration: +0-10 pts (age-specific optimal ranges)
- Seasonality: +0-5 pts (limited-time/holiday events)

**Score Bands**:
- 90-100: Must See! (dark red)
- 75-89: Highly Recommended (orange)
- 60-74: Good Option (yellow)
- 45-59: Consider (green)
- 0-44: Low Priority (gray)

**Age Group Profiles**:
- **Toddler (1.5 years)**: Prefers morning events, short duration (30-60 min), free/cheap, close to Prague, interactive, indoor when weather bad
- **Child (9 years)**: Prefers afternoon events, medium duration (90-180 min), educational, moderate distance OK, outdoor activities
- **Family**: Balanced scoring for mixed ages, longer duration OK (90-240 min), weekend-focused

### Automated Scraping

**Daily Cron** (`backend/src/cron/daily-scrape.ts`):
- Scheduled: 3:00 AM Prague time (only when `ENABLE_CRON=true`)
- Workflow:
  1. Scrape all 11 sources (~5-10 min)
  2. Deduplicate events
  3. Geocode addresses and filter by 130km radius
  4. Fetch weather forecast
  5. Score events for all age groups
  6. Upsert to database
  7. Archive events >30 days old
  8. Log results to `ScrapeLog` table

**Manual Trigger**:
```bash
cd backend && npm run scrape
# OR
curl -X POST http://localhost:3001/api/admin/scrape/trigger
```

## Frontend Architecture

**Next.js App Router Structure**:
- `/app/dashboard/[view]` - Main calendar views (toddler/child/family)
- `/app/events/[id]` - Event detail page
- `/app/map` - Leaflet map view with event markers
- `/app/calendar` - Alternative calendar layouts
- `/app/settings` - User preferences

**Key Components**:
- `components/calendar/` - FullCalendar integration
- `components/ui/` - shadcn/ui components (Dialog, Select, Button, etc.)
- `lib/api.ts` - Axios client for backend API calls

**Styling**: TailwindCSS 4 with shadcn/ui components

## API Endpoints

**Events**:
- `GET /api/events?view=toddler&dateFrom=2024-01-01&limit=50` - List events
- `GET /api/events/:id` - Event details
- `GET /api/events/calendar/:view` - Events grouped by date (max 4/day)
- `GET /api/events/map/:view` - Events for map view

**Admin**:
- `POST /api/admin/scrape/trigger` - Manually trigger scraping (TODO: add auth)

**Stats**:
- `GET /api/stats` - Database statistics
- `GET /api/scrape-logs` - Scraping history

## Development Workflow

### Adding a New Scraper

1. Create `backend/src/scrapers/yoursite.ts` following the pattern
2. Test standalone: `ts-node -e "import('./src/scrapers/yoursite').then(m => m.scrapeYourSite().then(console.log))"`
3. Add to `SCRAPERS` array in `backend/src/scrapers/index.ts`
4. Test full workflow: `npm run scrape`
5. Verify in Prisma Studio: `npx prisma studio`

### Modifying Event Scoring

1. Edit `backend/src/services/scoring.ts`
2. Adjust weights in `scoreEventForAllGroups()` function
3. Delete existing events to rescore: `npx prisma studio` → delete events
4. Re-run scraper: `npm run scrape`
5. Verify scores in frontend

### Database Migrations

```bash
cd backend

# After changing prisma/schema.prisma:
npx prisma migrate dev --name description_of_change

# This will:
# 1. Generate SQL migration file
# 2. Apply migration to database
# 3. Regenerate Prisma Client
```

### Debugging Scrapers

- Save HTML for inspection: See `backend/debug-html/` directory pattern
- Check scrape logs: `GET /api/scrape-logs` or query `ScrapeLog` table
- Common issues:
  - Rate limiting: Increase delay in `runAllScrapers()`
  - Selectors changed: Update CSS selectors in scraper
  - Dynamic content: Switch to Firecrawl helper

## Deployment Notes

**Production Environment Variables**:
- Backend: Set `ENABLE_CRON=true` to enable daily 3am scrapes
- Frontend: Update `NEXT_PUBLIC_API_URL` to production backend URL

**Railway Backend**:
- Build: `npm run build`
- Start: `npm start`
- Auto-runs Prisma migrations via `postinstall` hook

**Vercel Frontend**:
- Auto-detected Next.js configuration
- Set environment variables in Vercel dashboard

## Important Constraints

1. **Geocoding Rate Limits**: OpenStreetMap Nominatim has strict rate limits (1 req/sec). Add delays in `geocoding.ts` if hitting limits.
2. **Firecrawl Costs**: API calls cost money. Some scrapers require it, test locally before enabling in production.
3. **Event Deduplication**: 0.8 similarity threshold may need tuning based on source data quality.
4. **130km Radius**: Hard-coded in multiple places. Search for "130" to change.
5. **Authentication**: Not implemented. User/Attendance/Favorite models exist but no auth middleware.
6. **Admin Endpoints**: No authentication! Add middleware before production deployment.

## Database Management

**Local Development**:
```bash
# Fresh start
dropdb prague_family_events
createdb prague_family_events
cd backend && npx prisma migrate dev
```

**Production (Railway)**:
```bash
# Connect to production DB
PGPASSWORD="xxx" psql -h host -p port -U user -d db

# Clear all events (careful!)
DELETE FROM "Event";

# Check event counts by source
SELECT source, COUNT(*) FROM "Event" GROUP BY source;
```

## Code Style Conventions

- TypeScript strict mode enabled
- Use `async/await` over promises
- Error handling: Try/catch with detailed logging
- Date handling: Use `date-fns` library
- API responses: Return `{ success: boolean, data?: any, error?: string }`
- Prisma queries: Use `findMany`/`findUnique` over raw SQL
- Frontend: Use React Server Components where possible (Next.js App Router)
