# Next Steps - Prague Family Events

## ✅ What's Been Accomplished

Your Prague Family Events Calendar is now **fully deployed and live**! 🎉

### Live URLs:
- **Frontend**: https://prague-family-events-git-main-michalp-projects.vercel.app/dashboard
- **Backend**: https://prague-family-events-production.up.railway.app/api

### What's Working:
- ✅ Backend deployed on Railway with PostgreSQL database
- ✅ Frontend deployed on Vercel
- ✅ 4 working scrapers collecting 50+ events:
  - goout.net (5 events)
  - vylety-zabava.cz (7 events)
  - kdykde.cz (18 events)
  - kudyznudy.cz (23 events)
- ✅ Automatic daily scraping at 6 AM (Prague time)
- ✅ Event geocoding and quality scoring
- ✅ Advanced filtering by age, category, date, price
- ✅ Interactive map view
- ✅ Responsive mobile design
- ✅ Auto-deployment from GitHub

---

## 🚀 Next Features to Implement

### 1. Calendar View Component
**Goal**: Add a beautiful monthly calendar view showing events

**Requirements**:
- New button next to "Settings" button on dashboard
- Monthly calendar grid showing events on their dates
- Click on date to see events for that day
- Color-coded by event type or age group
- Responsive for mobile

**Suggested Library**:
- `react-big-calendar` or `@fullcalendar/react`

**Files to Create/Modify**:
- `frontend/app/calendar/page.tsx` - New calendar page
- `frontend/components/calendar-view.tsx` - Calendar component
- `frontend/app/dashboard/page.tsx` - Add calendar button

---

### 2. Implement Additional Scrapers

**Four scrapers still need implementation**:

#### A. praguest.com
- **URL**: https://www.praguest.com/akce
- **Type**: Event aggregator for Prague
- **Estimated Events**: 10-15
- **Challenge**: Need to check if they have family/kids filtering

#### B. ententyky.cz
- **URL**: https://www.ententyky.cz/akce
- **Type**: Kids activities and events
- **Estimated Events**: 15-20
- **Challenge**: May need Firecrawl for JavaScript-rendered content

#### C. slevomat.cz
- **URL**: https://www.slevomat.cz/slevy/pro-deti
- **Type**: Deals/discounts for kids activities
- **Estimated Events**: 10-15
- **Challenge**: Mostly deals, not time-bound events
- **Note**: May want to filter for only time-sensitive events

#### D. skvelecesko.cz
- **URL**: https://www.skvelecesko.cz/akce
- **Type**: Czech tourism events
- **Estimated Events**: 5-10
- **Challenge**: Need to filter for Prague region and family-friendly

**Files to Create**:
- `backend/src/scrapers/praguest.ts`
- `backend/src/scrapers/ententyky.ts`
- `backend/src/scrapers/slevomat.ts`
- `backend/src/scrapers/skvelecesko.ts`

**File to Modify**:
- `backend/src/scrapers/index.ts` - Register new scrapers

---

## 📋 Implementation Plan

### Phase 1: Calendar View (2-3 hours)
1. Install calendar library: `npm install react-big-calendar date-fns`
2. Create calendar page component
3. Fetch events grouped by date from API
4. Style calendar to match app theme
5. Add navigation button on dashboard
6. Test on mobile devices

### Phase 2: New Scrapers (4-6 hours)
1. Research each website's structure
2. Implement praguest.com scraper
3. Implement ententyky.cz scraper
4. Implement slevomat.cz scraper (with event filtering)
5. Implement skvelecesko.cz scraper
6. Test each scraper individually
7. Run full scrape and check for duplicates
8. Deploy to Railway and verify

---

## 🎯 How to Continue

### To Start a Fresh Conversation:

1. **In Claude Code**, simply type `/clear` or start a new chat session
2. **Reference this file** by saying:
   ```
   I want to continue implementing features for my Prague Family Events app.
   Please read NEXT_STEPS.md to see what's been done and what's next.
   ```

3. **Or be specific**:
   ```
   Read NEXT_STEPS.md and help me implement the calendar view component
   ```

   OR

   ```
   Read NEXT_STEPS.md and help me implement the remaining 4 event scrapers
   ```

---

## 📊 Current Database Stats

After deployment scrape:
- Total Events: 53+
- Active Sources: 4 out of 8
- Update Frequency: Daily at 6:00 AM
- Database: PostgreSQL on Railway
- Frontend: Next.js 15 on Vercel
- Backend: Express.js on Railway

---

## 🔐 Important Environment Variables

### Railway (Backend)
```
DATABASE_URL=postgresql://...
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://prague-family-events-git-main-michalp-projects.vercel.app
FIRECRAWL_API_KEY=fc-7b5a295a433c43aaa4bc2df621a20aeb
ENABLE_CRON=true
SCRAPER_DELAY_MS=2000
```

### Vercel (Frontend)
```
NEXT_PUBLIC_API_URL=https://prague-family-events-production.up.railway.app/api
```

---

## 📚 Useful Commands

### Local Development:
```bash
# Start backend
cd backend && npm run dev

# Start frontend
cd frontend && npm run dev

# Run scrapers manually
cd backend && npm run scrape
```

### Deployment:
```bash
# Push to GitHub (triggers auto-deploy)
git add .
git commit -m "Your message"
git push

# Railway and Vercel will auto-deploy from GitHub
```

---

## 🐛 Known Issues / Future Improvements

1. **overenorodici.cz** scraper returns 0 events - it scrapes places, not time-bound events
   - Consider removing or repurposing this scraper

2. **Event Deduplication** - Currently basic title matching
   - Could be improved with fuzzy matching

3. **Geocoding** - Some addresses may fail to geocode
   - Consider adding fallback coordinates for common venues

4. **Image URLs** - Currently using placeholder images from Unsplash
   - Could scrape actual event images from source websites

5. **User Authentication** - Not yet implemented
   - Would enable favorites and attendance tracking per user

---

## 💡 Additional Feature Ideas

1. **Email Notifications** - Weekly digest of upcoming events
2. **PWA Support** - Make it installable as a mobile app
3. **Event Reviews** - Let users rate and review events they attended
4. **Social Sharing** - Share events to social media
5. **Multi-language Support** - Czech and English
6. **Dark Mode** - Toggle between light and dark themes
7. **Export to Calendar** - iCal/Google Calendar export
8. **Weather Integration** - Show weather forecast for outdoor events

---

Good luck with the next features! The foundation is solid and ready for expansion. 🚀
