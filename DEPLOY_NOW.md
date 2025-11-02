# Quick Deploy - Start Here! 🚀

Your code is ready to deploy! Follow these simple steps:

## Option 1: Automatic Deployment (Recommended)

### Step 1: Push to GitHub

```bash
# Create a new repository on GitHub: https://github.com/new
# Name it: prague-family-events
# Keep it public or private (your choice)
# DON'T initialize with README (we already have one)

# Then run these commands in your terminal:
git remote add origin https://github.com/YOUR_USERNAME/prague-family-events.git
git push -u origin main
```

### Step 2: Deploy Backend to Railway

1. **Go to**: https://railway.app/new
2. **Click**: "Deploy from GitHub repo"
3. **Select**: `prague-family-events`
4. **Configure**:
   - Root Directory: `backend`
   - Start Command: `npm start`
5. **Add PostgreSQL**:
   - Click "+ New" → "Database" → "PostgreSQL"
6. **Set Environment Variables**:
   ```
   DATABASE_URL=<from Railway PostgreSQL>
   NODE_ENV=production
   PORT=3001
   FIRECRAWL_API_KEY=<YOUR_FIRE_CRAWL_API_KEY>
   ENABLE_CRON=true
   SCRAPER_DELAY_MS=2000
   ```
7. **Run Migrations**:
   - Open Railway shell
   - Run: `npx prisma migrate deploy`
   - Run: `npx prisma db seed`

8. **Copy the Railway URL** (looks like: `https://xxx.up.railway.app`)

### Step 3: Deploy Frontend to Vercel

1. **Go to**: https://vercel.com/new
2. **Import**: Your GitHub repository
3. **Configure**:
   - Framework: Next.js
   - Root Directory: `frontend`
   - Build Command: `npm run build`
4. **Add Environment Variable**:
   ```
   NEXT_PUBLIC_API_URL=<your-railway-url>
   ```
5. **Click Deploy**

6. **Go back to Railway** and add:
   ```
   FRONTEND_URL=<your-vercel-url>
   ```

### Step 4: Test Your Site! 🎉

Visit your Vercel URL (e.g., `https://prague-family-events.vercel.app`)

You should see:
- ✅ 50+ family events from Prague
- ✅ Interactive map
- ✅ Filtering by age, category, date
- ✅ Event details with booking links

---

## Option 2: Deploy with Vercel CLI (Advanced)

### Install Vercel CLI:
```bash
npm i -g vercel
```

### Deploy Frontend:
```bash
cd frontend
vercel --prod
```

### Deploy Backend:
Use Railway as described above (Vercel serverless functions don't support cron jobs well)

---

## Troubleshooting

### Frontend shows "Failed to fetch events"
**Fix**: Check `NEXT_PUBLIC_API_URL` in Vercel matches your Railway backend URL

### Backend shows CORS errors
**Fix**: Check `FRONTEND_URL` in Railway matches your Vercel frontend URL

### No events showing
**Fix**:
1. Check Railway logs
2. Run scraper manually in Railway shell: `npm run scrape`
3. Check if DATABASE_URL is set correctly

---

## What You Built 🎯

**Frontend**:
- Modern Next.js 16 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Mapbox GL for interactive maps
- Fully responsive mobile design

**Backend**:
- Express.js REST API
- PostgreSQL database with Prisma ORM
- 4 working web scrapers:
  - goout.net (5 events)
  - vylety-zabava.cz (7 events)
  - kdykde.cz (18 events)
  - kudyznudy.cz (23 events)
- Automated daily scraping at 6 AM
- Event geocoding and quality scoring
- Advanced filtering and search

**Total**: 52+ family events automatically updated daily!

---

## Cost

- **Vercel**: FREE (100GB bandwidth/month)
- **Railway**: ~$10-15/month (backend + PostgreSQL)
- **Firecrawl**: FREE (500 scrapes/month)

**Total**: ~$10-15/month for a fully automated family events platform!

---

## Next Steps

After deployment:

1. **Test all features**:
   - Browse events
   - Use filters
   - Click on map markers
   - View event details

2. **Monitor**:
   - Railway logs for backend
   - Vercel analytics for frontend
   - Check scraper runs daily

3. **Customize** (optional):
   - Add your own logo
   - Change color scheme
   - Add more event sources
   - Add email notifications

4. **Share**:
   - Share with friends and family
   - Post on social media
   - Get feedback!

---

## Support

Need help? Check:
- `DEPLOYMENT.md` - Detailed deployment guide
- `README.md` - Project overview
- `SCRAPER_GUIDE.md` - How to add new scrapers

Happy deploying! 🚀
