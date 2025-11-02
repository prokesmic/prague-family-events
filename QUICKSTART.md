# Quick Start Guide

Get the Prague Family Events app running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or Railway)

## Step 1: Install Dependencies

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

## Step 2: Set Up Database

### Option A: Local PostgreSQL

```bash
# macOS
brew install postgresql@14
brew services start postgresql@14
createdb prague_family_events

# Your DATABASE_URL will be:
# postgresql://your_username@localhost:5432/prague_family_events
```

### Option B: Railway (Recommended)

1. Go to [railway.app](https://railway.app)
2. Create new project → Add PostgreSQL
3. Copy the `DATABASE_URL` from the database settings

## Step 3: Configure Environment

### Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://..." # Your database URL
PORT=3001
FRONTEND_URL="http://localhost:3000"
ENABLE_CRON="false"
```

### Frontend

```bash
cd frontend
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://..." # Same as backend
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

## Step 4: Initialize Database

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

## Step 5: Populate with Events (Optional)

```bash
cd backend
npm run scrape
```

This will scrape events from goout.net and kudyznudy.cz. Wait 2-3 minutes.

## Step 6: Run the App

### Terminal 1 - Backend

```bash
cd backend
npm run dev
```

Backend will run at: http://localhost:3001

### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

Frontend will run at: http://localhost:3000

## Step 7: View the App

Open http://localhost:3000 in your browser!

## Common Issues

### "Database connection failed"

Check your `DATABASE_URL` is correct in both `.env` files.

### "No events showing"

Run the scraper: `cd backend && npm run scrape`

### "Port already in use"

Change `PORT` in backend `.env` to 3002 or kill the process using the port.

## Next Steps

1. **Implement remaining scrapers**: Follow the pattern in `backend/src/scrapers/goout.ts`
2. **Add `FIRE_CRAWL_API_KEY`**: To run all scrapers, add a `FIRE_CRAWL_API_KEY` to the `backend/.env` file.
3. **Deploy**: Follow deployment instructions in README.md

## Need Help?

- Check the full [README.md](README.md) for detailed documentation
- Review API endpoints: http://localhost:3001/health
- Check database: `cd backend && npx prisma studio`

---

**You're ready to discover amazing family events in Prague!**
