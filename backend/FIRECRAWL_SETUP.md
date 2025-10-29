# Firecrawl Setup Guide

## What is Firecrawl?

Firecrawl is a powerful web scraping API that handles:
- ✅ JavaScript rendering (React, Vue, Angular apps)
- ✅ Dynamic content loading
- ✅ Complex anti-bot protection
- ✅ Rate limiting and retries
- ✅ Clean HTML extraction

## Getting Started

### 1. Get Your API Key

1. Visit [firecrawl.dev](https://firecrawl.dev)
2. Sign up for a free account
3. Copy your API key from the dashboard

**Free Tier:**
- 500 credits/month
- ~500 page scrapes
- Perfect for testing and small projects

**Paid Plans:**
- Starter: $29/month (5,000 credits)
- Growth: $99/month (20,000 credits)
- Scale: $299/month (75,000 credits)

### 2. Add API Key to Environment

Edit `/Users/michal/prague-family-events/backend/.env`:

```bash
# Firecrawl API (for dynamic content scraping)
FIRECRAWL_API_KEY="fc-your-api-key-here"
```

**Important:** Never commit your API key to git! The `.env` file is already in `.gitignore`.

### 3. Test Firecrawl

Run the scrapers to test:

```bash
cd /Users/michal/prague-family-events/backend
export DATABASE_URL="postgresql://michal@localhost:5432/prague_family_events?schema=public"
npm run scrape
```

## Which Scrapers Use Firecrawl?

| Scraper | Status | Why Firecrawl? |
|---------|--------|----------------|
| goout.net | ✅ No Firecrawl | Static HTML works fine |
| vylety-zabava.cz | ✅ No Firecrawl | Static HTML works fine |
| **kudyznudy.cz** | 🔥 Firecrawl | Dynamic content, needs JS rendering |
| overenorodici.cz | 🔥 Firecrawl (ready) | Needs investigation |
| slevomat.cz | 🔥 Firecrawl (ready) | Needs investigation |
| skvelecesko.cz | 🔥 Firecrawl (ready) | Needs investigation |
| aktivnidite.cz | 🔥 Firecrawl (ready) | Needs investigation |
| praguest.com | ❌ 404 error | URL needs fixing |
| ententyky.cz | ❌ No selectors | Needs manual review |
| prahahrave.cz | ❌ No events | Not an event listing |

## How It Works

### Firecrawl Helper (`src/utils/firecrawlHelper.ts`)

```typescript
import { scrapeAndLoadCheerio } from '../utils/firecrawlHelper';

// Scrape with Firecrawl and get Cheerio instance
const $ = await scrapeAndLoadCheerio(url, {
  waitFor: 3000,  // Wait 3 seconds for JavaScript
  timeout: 45000, // 45 second timeout
});

if (!$) {
  // Firecrawl failed or API key not configured
  return { events: [], errors: [] };
}

// Now use Cheerio as normal
$('.event').each((i, el) => {
  const title = $(el).find('.title').text();
  // ...
});
```

### Example: kudyznudy.cz Scraper

See `src/scrapers/kudyznudy.ts` for a complete implementation.

Key features:
- ✅ Checks if Firecrawl is available
- ✅ Falls back gracefully if no API key
- ✅ Uses helper functions for robust extraction
- ✅ Handles errors properly

## Cost Estimation

### Monthly Usage

With 10 scrapers running daily:
- **10 sites × 1 page each × 30 days = 300 scrapes/month**
- **Cost: FREE** (under 500 credit limit)

With crawling multiple pages:
- **10 sites × 5 pages each × 30 days = 1,500 scrapes/month**
- **Cost: $29/month** (Starter plan)

### Optimization Tips

1. **Cache results**: Store HTML locally during development
2. **Scrape less frequently**: Daily scraping might be overkill
3. **Filter URLs**: Only scrape pages with events
4. **Use existing scrapers**: goout.net and vylety-zabava work without Firecrawl

## Alternative: Puppeteer

If you want to avoid costs, you can use Puppeteer (already installed):

**Pros:**
- ✅ Free
- ✅ Full control
- ✅ Already in package.json

**Cons:**
- ❌ Slower
- ❌ More complex setup
- ❌ Requires Chrome/Chromium
- ❌ More maintenance

**To use Puppeteer instead:**
1. Create `src/utils/puppeteerHelper.ts`
2. Update scrapers to use Puppeteer
3. Handle headless browser lifecycle

## Testing Without API Key

Scrapers will gracefully skip if no API key is configured:

```
[kudyznudy.cz] Firecrawl API key not configured, skipping dynamic content scraper
```

This allows you to:
- ✅ Test the app without Firecrawl
- ✅ Use free scrapers (goout.net, vylety-zabava.cz)
- ✅ Add Firecrawl later when ready

## Next Steps

1. ✅ Firecrawl SDK installed
2. ✅ Helper utilities created
3. ✅ kudyznudy.cz updated to use Firecrawl
4. ⏳ **Add your API key to `.env`**
5. ⏳ **Test the scraper**
6. ⏳ **Create scrapers for remaining 4 sites**

## Support

- 📖 [Firecrawl Docs](https://docs.firecrawl.dev/)
- 💬 [Firecrawl Discord](https://discord.gg/firecrawl)
- 🐛 [GitHub Issues](https://github.com/mendableai/firecrawl)
