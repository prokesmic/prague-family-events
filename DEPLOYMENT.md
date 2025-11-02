# Deployment Guide - Prague Family Events

This guide will help you deploy the Prague Family Events application to production.

## Architecture Overview

- **Frontend**: Next.js 16 (App Router) → Deploy to **Vercel**
- **Backend**: Express.js + PostgreSQL → Deploy to **Railway** or **Render**
- **Database**: PostgreSQL → **Railway** or **Supabase**

## Prerequisites

1. GitHub account (for code hosting)
2. Vercel account (for frontend) - https://vercel.com
3. Railway account (for backend & database) - https://railway.app
   - Alternative: Render.com for backend + Supabase for database

---

## Step 1: Push Code to GitHub

```bash
# In the project root directory
git add .
git commit -m "Initial commit - Prague Family Events"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/prague-family-events.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Backend to Railway

### 2.1 Create Railway Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Select your `prague-family-events` repository
5. Railway will detect it's a Node.js app

### 2.2 Configure Backend Service

1. In Railway dashboard, select your service
2. Go to **Settings** → **Root Directory**
3. Set root directory to: `backend`
4. Set start command to: `npm start`

### 2.3 Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway will create a PostgreSQL instance
4. Copy the **DATABASE_URL** from the PostgreSQL service

### 2.4 Set Environment Variables

In Railway backend service settings → Variables, add:

```
DATABASE_URL=postgresql://... (from Railway PostgreSQL service)
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend.vercel.app (will add later)
FIRECRAWL_API_KEY=<YOUR_FIRE_CRAWL_API_KEY>
ENABLE_CRON=true
SCRAPER_DELAY_MS=2000
OPENWEATHER_API_KEY=(optional)
```

### 2.5 Run Database Migrations

1. In Railway, go to your backend service
2. Open the **Deploy** tab
3. Once deployed, open a shell
4. Run: `npx prisma migrate deploy`
5. Run: `npx prisma db seed` (optional - to add initial data)

### 2.6 Get Backend URL

- Railway will provide a public URL like: `https://your-app-production.up.railway.app`
- Copy this URL for the next step

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Connect GitHub Repository

1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import your GitHub repository: `prague-family-events`
4. Vercel will auto-detect Next.js

### 3.2 Configure Build Settings

- **Framework Preset**: Next.js
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install`

### 3.3 Set Environment Variables

In Vercel project settings → Environment Variables, add:

```
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app (from Railway)
```

### 3.4 Deploy

1. Click "Deploy"
2. Vercel will build and deploy your frontend
3. You'll get a URL like: `https://prague-family-events.vercel.app`

### 3.5 Update Backend CORS

Go back to Railway backend service and update:

```
FRONTEND_URL=https://prague-family-events.vercel.app
```

Redeploy the backend service for changes to take effect.

---

## Step 4: Configure Custom Domain (Optional)

### On Vercel (Frontend):
1. Go to Project Settings → Domains
2. Add your custom domain (e.g., `events.yourdomain.com`)
3. Follow DNS configuration instructions

### On Railway (Backend):
1. Go to backend service → Settings
2. Add custom domain (e.g., `api.yourdomain.com`)
3. Configure DNS records as instructed

---

## Step 5: Set Up Automated Scraping

The backend includes a cron job that runs daily at 6 AM to scrape new events.

To enable it, ensure in Railway:
```
ENABLE_CRON=true
```

The cron job will:
1. Scrape all configured sources
2. Deduplicate events
3. Geocode locations
4. Score events based on quality
5. Store in database

---

## Environment Variables Reference

### Frontend (.env.local for development)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend (.env for development)
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/prague_family_events"
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:3000"
FIRECRAWL_API_KEY="<YOUR_FIRE_CRAWL_API_KEY>"
ENABLE_CRON="false"
SCRAPER_DELAY_MS=2000
OPENWEATHER_API_KEY=""  # Optional
```

---

## Monitoring & Logs

### Railway:
- View logs in real-time: Service → Deploy → Logs
- Monitor resource usage: Service → Metrics

### Vercel:
- View build logs: Project → Deployments → View Logs
- Monitor performance: Project → Analytics

---

## Troubleshooting

### Issue: Frontend can't connect to backend
**Solution**: Check NEXT_PUBLIC_API_URL in Vercel and FRONTEND_URL in Railway

### Issue: Database connection errors
**Solution**: Verify DATABASE_URL in Railway and ensure migrations ran successfully

### Issue: Events not appearing
**Solution**: Check backend logs and run `npm run scrape` manually in Railway shell

### Issue: Build fails on Vercel
**Solution**: Check Node.js version compatibility in package.json

---

## Updating the Application

### To update frontend:
```bash
git add frontend/
git commit -m "Update frontend"
git push
```
Vercel will auto-deploy on push to main branch.

### To update backend:
```bash
git add backend/
git commit -m "Update backend"
git push
```
Railway will auto-deploy on push to main branch.

---

## Cost Estimates

- **Vercel** (Frontend): Free tier (up to 100GB bandwidth/month)
- **Railway** (Backend + Database): ~$5-20/month depending on usage
  - PostgreSQL: ~$5/month
  - Backend server: ~$5/month (with 500MB RAM, should be sufficient)
- **Firecrawl API**: Free tier (500 credits/month)

Total estimated cost: **$10-20/month**

---

## Production Checklist

- [ ] Code pushed to GitHub
- [ ] Backend deployed to Railway
- [ ] PostgreSQL database created
- [ ] Database migrations run
- [ ] Environment variables configured (Backend)
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured (Frontend)
- [ ] CORS configured correctly
- [ ] Cron job enabled
- [ ] Test scraping manually
- [ ] Verify events appear in frontend
- [ ] (Optional) Custom domain configured
- [ ] (Optional) Add monitoring/alerts

---

## Support & Resources

- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- Next.js Docs: https://nextjs.org/docs
- Prisma Docs: https://www.prisma.io/docs

Happy deploying! 🚀
