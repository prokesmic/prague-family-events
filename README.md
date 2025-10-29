# Prague Family Events Calendar

A private, automated event discovery calendar web application for finding family-friendly events in Prague and surrounding areas (130km radius). The app scrapes multiple Czech websites daily, scores events based on age-appropriateness, and presents them in three customized calendar views: Toddler (1.5 years), Child (9 years), and Family.

## Features

### Core Functionality
- ✅ **Automated Daily Scraping**: Discovers 50-100 family events daily from 11 Czech sources
- ✅ **Smart Event Scoring**: 0-100 point algorithm based on age, distance, price, timing, and weather
- ✅ **Three Calendar Views**: Separate calendars optimized for toddler, child, and family activities
- ✅ **Intelligent Filtering**: Max 4 highest-scored events per day per view
- ✅ **Cost Tracking**: Family pricing calculator (2 adults + 2 children) with budget monitoring
- ✅ **Map Integration**: Interactive Leaflet map showing all events with distance markers
- ✅ **Weather-Aware**: Adjusts outdoor event scores based on 7-day forecast
- ✅ **Event Deduplication**: Merges similar events from different sources
- ✅ **Attendance Tracking**: Mark events as attended with notes, photos, and actual costs
- ✅ **Favorites & Bookmarks**: Save events for later review
- ✅ **iCal Export**: Export calendar to external calendar apps
- ✅ **Mobile-Responsive**: Optimized for desktop, tablet, and mobile devices

### Event Sources (11 Total)
1. **goout.net** - Events filtered for children in Prague
2. **kudyznudy.cz** - Prague and Central Bohemia events
3. praguest.com - Child-friendly activities (placeholder)
4. ententyky.cz - Family events (placeholder)
5. vylety-zabava.cz - Prague children's events (placeholder)
6. overenorodici.cz - Parent-verified venues (placeholder)
7. slevomat.cz - Discounted family experiences (placeholder)
8. skvelecesko.cz - Family activities in Prague (placeholder)
9. prahahrave.cz - Interactive Prague events (placeholder)
10. aktivnidite.cz - Active children's events (placeholder)

*Note: 2 scrapers fully implemented, 9 ready for implementation using the same pattern*

## Tech Stack

### Frontend
- **Next.js 15** with App Router
- **TypeScript** for type safety
- **TailwindCSS** for styling
- **shadcn/ui** components
- **FullCalendar** for calendar views
- **Leaflet.js** for interactive maps
- **NextAuth.js** for authentication
- **Axios** for API calls
- **date-fns** for date handling

### Backend
- **Node.js** with Express
- **TypeScript**
- **PostgreSQL** database
- **Prisma ORM** for database access
- **Cheerio** for HTML scraping
- **Puppeteer** for dynamic content (if needed)
- **node-cron** for scheduled jobs
- **OpenStreetMap Nominatim API** for geocoding (free)
- **OpenWeatherMap API** for weather data (optional)

### Deployment
- **Vercel** - Frontend hosting (free hobby plan available)
- **Railway** - Backend + PostgreSQL + Cron jobs (~$5-20/month)
- **Total Cost**: $0-40/month depending on usage

## Project Structure

```
prague-family-events/
├── frontend/                # Next.js frontend
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/       # Login page
│   │   ├── dashboard/       # Main dashboard
│   │   │   ├── toddler/     # Toddler calendar view
│   │   │   ├── child/       # Child calendar view
│   │   │   └── family/      # Family calendar view
│   │   ├── events/[id]/     # Event detail page
│   │   ├── map/             # Map view
│   │   └── settings/        # User settings
│   ├── components/
│   │   ├── calendar/        # Calendar components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── event-card.tsx   # Event card component
│   │   ├── filters.tsx      # Filter sidebar
│   │   └── score-badge.tsx  # Score badge component
│   ├── lib/
│   │   ├── api.ts           # API client
│   │   └── auth.ts          # NextAuth configuration
│   └── prisma/
│       └── schema.prisma    # Database schema
│
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── scrapers/
│   │   │   ├── goout.ts     # GoOut.net scraper
│   │   │   ├── kudyznudy.ts # KudyZnudy.cz scraper
│   │   │   └── index.ts     # Scraper orchestrator
│   │   ├── services/
│   │   │   ├── scoring.ts   # Event scoring algorithm
│   │   │   ├── geocoding.ts # Geocoding service
│   │   │   ├── deduplication.ts # Event deduplication
│   │   │   └── weather.ts   # Weather service
│   │   ├── routes/
│   │   │   └── events.ts    # Event API routes
│   │   ├── cron/
│   │   │   └── daily-scrape.ts # Daily scraping job
│   │   ├── types/
│   │   │   └── index.ts     # TypeScript types
│   │   ├── utils/
│   │   │   ├── distance.ts  # Distance calculations
│   │   │   ├── dateParser.ts # Czech date parser
│   │   │   └── priceParser.ts # Czech price parser
│   │   └── server.ts        # Express server
│   └── prisma/
│       └── schema.prisma    # Database schema
│
└── README.md                # This file
```

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (local or Railway)
- Git

### 1. Clone and Install Dependencies

```bash
# Clone the repository (or initialize your own)
cd prague-family-events

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Set Up Database

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL (macOS)
brew install postgresql@14
brew services start postgresql@14

# Create database
createdb prague_family_events
```

**Option B: Railway (Recommended for Production)**
1. Go to [railway.app](https://railway.app) and create an account
2. Create a new project
3. Add a PostgreSQL database
4. Copy the `DATABASE_URL` connection string

### 3. Configure Environment Variables

**Frontend (.env)**
```bash
cd frontend
cp .env.example .env

# Edit .env and set:
DATABASE_URL="postgresql://..."  # Your database URL
NEXTAUTH_SECRET="$(openssl rand -base64 32)"  # Generate secure secret
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

**Backend (.env)**
```bash
cd backend
cp .env.example .env

# Edit .env and set:
DATABASE_URL="postgresql://..."  # Same database URL as frontend
PORT=3001
FRONTEND_URL="http://localhost:3000"
ENABLE_CRON="false"  # Set to "true" in production
OPENWEATHER_API_KEY=""  # Optional: Get from openweathermap.org
```

### 4. Initialize Database

```bash
# From backend directory
npx prisma generate
npx prisma migrate dev --name init

# Optional: Seed with initial users (create seed script)
# npx prisma db seed
```

### 5. Run Development Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Health: http://localhost:3001/health

## Usage

### Manual Testing

**Trigger a Manual Scrape** (populate database with events):
```bash
cd backend
npm run scrape
```

**Check Database**:
```bash
cd backend
npx prisma studio  # Opens database browser at localhost:5555
```

### Creating Users

Since this is a private app for 2 users, you can create users directly in the database:

```bash
cd backend
npx prisma studio

# Or via SQL:
psql prague_family_events

INSERT INTO "User" (id, email, "passwordHash", name)
VALUES (
  'user1',
  'husband@example.com',
  '$2b$10$hashedPasswordHere',  -- Use bcrypt to hash
  'Husband'
);
```

### API Endpoints

**Events**
- `GET /api/events?view=toddler&dateFrom=2024-01-01&limit=50`
- `GET /api/events/:id`
- `GET /api/events/calendar/:view` - Get events grouped by date (max 4/day)
- `GET /api/events/map/view?view=family` - Get events for map view
- `GET /api/events/search/query?q=museum&view=child`

**Favorites**
- `GET /api/favorites/:userId`
- `POST /api/favorites` - Body: `{ eventId, userId }`
- `DELETE /api/favorites/:id`

**Attendance**
- `GET /api/attendance/:userId`
- `POST /api/attendance` - Body: `{ eventId, userId, attendedDate, rating, notes, photos, actualCost }`

**Stats**
- `GET /api/stats` - Get database statistics
- `GET /api/scrape-logs` - Get scraping history

**Admin**
- `POST /api/scrape/trigger` - Manually trigger scraping (add auth!)

## Event Scoring Algorithm

Events are scored 0-100 points for each age group:

**Base Score**: 50 points

**Age Appropriateness** (20 pts max):
- Perfect match: +20
- Within range: +10-15
- Close to range: +10

**Distance** (15 pts max):
- <10km: +15
- <30km: +10
- <70km: +5
- <130km: +2

**Price** (15 pts max):
- Free: +15
- <200Kč: +12
- <500Kč: +8
- <1000Kč: +4

**Event Type** (15 pts max):
- Outdoor + good weather: +8
- Educational: +7
- Interactive: +5
- Age-specific bonuses

**Timing** (10 pts max):
- Weekend: +5
- Optimal time for age: +5 (morning for toddler, afternoon for child)

**Duration** (10 pts max):
- Toddler: 30-60 min optimal
- Child: 90-180 min optimal
- Family: 90-240 min optimal

**Seasonality** (5 pts max):
- Limited-time events: +5
- Holiday events: +3-5

**Score Bands**:
- 90-100: 🔥 Dark Red "Must See!"
- 75-89: ⭐ Orange "Highly Recommended"
- 60-74: ✓ Yellow "Good Option"
- 45-59: Green "Consider"
- 0-44: Gray "Low Priority"

## Deployment

### Frontend (Vercel)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Configure environment variables:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (your Vercel URL)
   - `NEXT_PUBLIC_API_URL` (your Railway backend URL)
5. Deploy

### Backend + Database (Railway)

1. Go to [railway.app](https://railway.app)
2. Create new project
3. Add PostgreSQL database
4. Add Node.js service (connect to your repo)
5. Configure environment variables:
   - `DATABASE_URL` (auto-filled from PostgreSQL service)
   - `PORT`
   - `FRONTEND_URL` (your Vercel URL)
   - `ENABLE_CRON=true`
   - `OPENWEATHER_API_KEY` (optional)
6. Set build command: `npm run build`
7. Set start command: `npm start`
8. Deploy

### Post-Deployment

1. Run database migrations:
   ```bash
   # From Railway CLI or dashboard
   npx prisma migrate deploy
   ```

2. Create initial users in database

3. Verify cron job is running (check logs at 3:00 AM Prague time)

4. Test the app!

## Automation

The daily scraping job runs automatically at **3:00 AM Prague time** when `ENABLE_CRON=true`.

**Workflow**:
1. **3:00-3:30 AM**: Scrape all 11 sources
2. **3:30-4:00 AM**: Process, deduplicate, geocode, filter by 130km radius
3. **4:00-4:30 AM**: Fetch weather, score events for all age groups
4. **4:30-5:00 AM**: Update database, archive events >30 days old

**Manual Trigger**:
```bash
cd backend
npm run scrape
```

Or via API:
```bash
curl -X POST http://localhost:3001/api/scrape/trigger
```

## Development Tips

### Adding New Scrapers

Follow the pattern in `backend/src/scrapers/goout.ts`:

```typescript
// 1. Create new scraper file
export async function scrapeYourSource(): Promise<ScraperResult> {
  const events: RawEvent[] = [];
  const errors: string[] = [];

  try {
    // Fetch page
    const response = await axios.get(URL);
    const $ = cheerio.load(response.data);

    // Parse events
    $('.event-selector').each((index, element) => {
      // Extract: title, date, location, price, etc.
      events.push({
        externalId: `source-${id}`,
        source: 'source-name',
        title,
        startDateTime,
        // ... other fields
      });
    });
  } catch (error) {
    errors.push(error.message);
  }

  return { source: 'source-name', events, errors, executionTime };
}

// 2. Add to scrapers/index.ts
export const SCRAPERS = [
  { name: 'your-source', fn: scrapeYourSource },
  // ...
];
```

### Testing Scrapers

```bash
# Test single scraper
cd backend
ts-node -e "import('./src/scrapers/goout').then(m => m.scrapeGoOut().then(console.log))"

# Test full workflow
npm run scrape
```

### Database Queries

```typescript
// Get top 10 events for toddlers this weekend
const events = await prisma.event.findMany({
  where: {
    startDateTime: {
      gte: startOfWeekend(),
      lte: endOfWeekend(),
    },
  },
  orderBy: { scoreToddler: 'desc' },
  take: 10,
});
```

## Security & Privacy

- ✅ **Private Deployment**: Add `noindex` meta tag, no public registration
- ✅ **Authentication**: NextAuth.js with email/password (2 users only)
- ✅ **HTTPS Only**: Enforce in production
- ✅ **Environment Variables**: All secrets in .env files
- ✅ **No Tracking**: No analytics or third-party tracking
- ✅ **Password Hashing**: bcrypt with salt rounds
- ⚠️ **TODO**: Add authentication middleware to scrape trigger endpoint
- ⚠️ **TODO**: Implement rate limiting on API

## Troubleshooting

### Database Connection Issues
```bash
# Check DATABASE_URL format
postgresql://user:password@host:port/database?schema=public

# Test connection
cd backend
npx prisma studio
```

### Scraping Failures
```bash
# Check logs
GET /api/scrape-logs

# Common issues:
# - Rate limiting: Increase SCRAPER_DELAY_MS
# - Website changed: Update CSS selectors
# - Network timeout: Check firewall/VPN
```

### Geocoding Not Working
```bash
# Nominatim is free but rate-limited
# Check logs for errors
# Consider caching geocoded addresses
```

## Future Enhancements

- [ ] Complete remaining 9 scrapers
- [ ] Email daily digest with top events
- [ ] Push notifications for highly-scored events
- [ ] ML-based preference learning (track attendance patterns)
- [ ] Similar event recommendations
- [ ] Transportation time estimates (Google Maps API)
- [ ] Booking deadline reminders
- [ ] Photo gallery for attended events
- [ ] CSV export for budget tracking
- [ ] Multi-language support (EN/CS)

## Contributing

This is a private family project, but the code structure can serve as a template for similar applications.

## License

Private use only.

## Support

For issues or questions, open a GitHub issue or contact the maintainer.

---

**Built with ❤️ for finding amazing family experiences in Prague**
