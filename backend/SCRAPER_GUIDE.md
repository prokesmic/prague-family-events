# Scraper Implementation Guide

This guide will help you implement and update web scrapers for the Prague Family Events application.

## Quick Start - Update a Scraper

### Step 1: Analyze the Website

Use the scraper debugger tool to find the correct selectors:

```bash
cd /Users/michal/prague-family-events/backend
npx ts-node src/utils/scraperDebugger.ts "https://website-url.com"
```

**Example:**
```bash
npx ts-node src/utils/scraperDebugger.ts "https://goout.net/cs/praha/akce"
```

The tool will output:
- **Event container selectors** (e.g., `.event`, `.event-card`)
- **Title selectors** (e.g., `.title`, `h2`)
- **Date selectors** (e.g., `time`, `.date`)
- **Location selectors** (e.g., `.venue`, `.location`)

### Step 2: Update the Scraper File

Open the scraper file in `src/scrapers/[source-name].ts` and update the selectors:

```typescript
// Example: src/scrapers/goout.ts

// OLD (generic selectors that don't work):
$('.event-card, .eventCard, article.event').each((index, element) => {
  const title = $el.find('h2, h3, .title').first().text().trim();
  // ...
});

// NEW (actual selectors from debugger):
$('.event').each((index, element) => {
  const title = $el.find('.title').first().text().trim();
  const dateStr = $el.find('time').first().text().trim();
  const dateTime = $el.find('time').first().attr('datetime');
  // ...
});
```

### Step 3: Test the Scraper

```bash
npm run scrape
```

Check the output for:
- ✓ Number of events found
- ✓ No errors
- ✓ Events have required fields (title, date, location)

## All Scrapers Status

| # | Website | Status | Method | Notes |
|---|---------|--------|--------|-------|
| 1 | goout.net | ✅ **WORKING** | Cheerio | Selector: `.event`, location in 2nd `<a>` tag |
| 2 | vylety-zabava.cz | ✅ **WORKING** | Cheerio | Selector: `article.item`, data in `ul.uvod` |
| 3 | kudyznudy.cz | 🔥 **READY** | Firecrawl | Dynamic content - requires API key |
| 4 | overenorodici.cz | 🔥 **READY** | Firecrawl | Template created - requires API key |
| 5 | praguest.com | ❌ Skip | - | 404 error - URL needs fixing |
| 6 | ententyky.cz | 🔄 Template needed | Firecrawl | Needs scraper implementation |
| 7 | slevomat.cz | 🔄 Template needed | Firecrawl | Needs scraper implementation |
| 8 | skvelecesko.cz | 🔄 Template needed | Firecrawl | Needs scraper implementation |
| 9 | prahahrave.cz | ❌ Skip | - | Not an event listing site |
| 10 | aktivnidite.cz | 🔄 Template needed | Firecrawl | Needs scraper implementation |

**Current Status (Oct 29, 2025):**
- ✅ 2 scrapers working without API key (goout.net, vylety-zabava.cz)
- 🔥 2 scrapers ready with Firecrawl (kudyznudy.cz, overenorodici.cz)
- 📊 13 events currently in database
- 🎯 **Next Steps:**
  1. Add Firecrawl API key to `.env` (see `FIRECRAWL_SETUP.md`)
  2. Test Firecrawl scrapers
  3. Create scrapers for remaining 4 sites
  4. Consider skipping non-event sites (praguest.com, prahahrave.cz)

## Firecrawl Integration

**What is Firecrawl?**
- 🔥 Handles JavaScript rendering and dynamic content
- 🚀 Works with React, Vue, Angular sites
- 💰 Free tier: 500 credits/month (~500 page scrapes)
- 📖 See `FIRECRAWL_SETUP.md` for complete setup guide

**Setup:**
```bash
# 1. Get API key from firecrawl.dev
# 2. Add to backend/.env:
FIRECRAWL_API_KEY="fc-your-api-key-here"

# 3. Test scrapers
npm run scrape
```

**Scrapers will gracefully skip if no API key is configured.**

## Scraper Template

Use this template to create new scrapers:

```typescript
import axios from 'axios';
import * as cheerio from 'cheerio';
import { RawEvent, ScraperResult } from '../types';
import { parseCzechDate, combineDateAndTime } from '../utils/dateParser';
import { parseCzechPrice, extractPrices, extractAgeRange } from '../utils/priceParser';
import {
  extractTextWithFallback,
  extractAttrWithFallback,
  cleanText,
  determineCategoryFromText,
  createHash
} from '../utils/scraperHelper';

const SOURCE_NAME = 'source.com';
const BASE_URL = 'https://source.com/events';

export async function scrapeSiteName(): Promise<ScraperResult> {
  const startTime = Date.now();
  const events: RawEvent[] = [];
  const errors: string[] = [];

  try {
    console.log(`[${SOURCE_NAME}] Starting scrape...`);

    const response = await axios.get(BASE_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept-Language': 'cs,en;q=0.9',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);

    // USE DEBUGGER TO FIND THIS SELECTOR:
    $('.event-container-selector').each((index, element) => {
      try {
        const $el = $(element);

        // Extract data using helper functions
        const title = extractTextWithFallback($el, ['.title', 'h2', 'h3']);
        if (!title) return;

        const description = extractTextWithFallback($el, ['.description', 'p']);
        const dateStr = extractTextWithFallback($el, ['time', '.date']);
        const timeStr = extractTextWithFallback($el, ['.time']);
        const location = extractTextWithFallback($el, ['.venue', '.location']);
        const priceStr = extractTextWithFallback($el, ['.price']);

        const imageUrl = extractAttrWithFallback($el, ['img'], 'src');
        const link = extractAttrWithFallback($el, ['a'], 'href');

        // Parse dates
        const startDateTime = combineDateAndTime(dateStr, timeStr);
        if (!startDateTime) {
          errors.push(`Failed to parse date: ${title}`);
          return;
        }

        // Parse price
        const price = parseCzechPrice(priceStr);
        const prices = extractPrices($el.text());
        const ageRange = extractAgeRange($el.text());

        // Determine category
        const category = determineCategoryFromText(title + ' ' + description);

        // Check if outdoor
        const fullText = cleanText(title + ' ' + description).toLowerCase();
        const isOutdoor = fullText.includes('venku') || fullText.includes('outdoor');

        // Create event
        const event: RawEvent = {
          externalId: `${SOURCE_NAME}-${createHash(title + dateStr + location)}`,
          source: SOURCE_NAME,
          title: cleanText(title),
          description: description ? cleanText(description) : undefined,
          startDateTime,
          locationName: location || undefined,
          address: location || undefined,
          category,
          ageMin: ageRange.ageMin,
          ageMax: ageRange.ageMax,
          adultPrice: prices.adultPrice || price || undefined,
          childPrice: prices.childPrice,
          familyPrice: prices.familyPrice,
          isOutdoor,
          imageUrl: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl}`) : undefined,
          bookingUrl: link ? (link.startsWith('http') ? link : `${BASE_URL}${link}`) : undefined,
        };

        events.push(event);
      } catch (error: any) {
        errors.push(`Error parsing event: ${error.message}`);
      }
    });

    console.log(`[${SOURCE_NAME}] Found ${events.length} events`);
  } catch (error: any) {
    errors.push(`Failed to fetch: ${error.message}`);
    console.error(`[${SOURCE_NAME}] Error:`, error.message);
  }

  return {
    source: SOURCE_NAME,
    events,
    errors,
    executionTime: Date.now() - startTime,
  };
}
```

## Common Issues & Solutions

### Issue: No events found

**Solution:**
1. Run the debugger tool
2. Check if the website changed its structure
3. Update selectors in the scraper

### Issue: Dates not parsing

**Solution:**
1. Log the raw date string: `console.log('Date string:', dateStr);`
2. Check if format is in `src/utils/dateParser.ts`
3. Add new format if needed

### Issue: Prices not extracting

**Solution:**
1. Log the raw price string: `console.log('Price string:', priceStr);`
2. Check format in `src/utils/priceParser.ts`
3. Add pattern if needed

### Issue: Getting blocked by website

**Solution:**
1. Increase delay between requests (in `src/scrapers/index.ts`)
2. Add more realistic User-Agent
3. Use Puppeteer for dynamic content (already installed)

## Testing Individual Scrapers

```bash
# Test all scrapers
npm run scrape

# Test specific scraper (create test script)
npx ts-node -e "import('./src/scrapers/goout').then(m => m.scrapeGoOut().then(console.log))"
```

## Debugging Tips

1. **Save HTML for offline inspection:**
```typescript
import { fetchAndSaveHTML } from '../utils/scraperHelper';
await fetchAndSaveHTML(url, 'goout.html');
// Check debug-html/goout.html
```

2. **Use browser DevTools:**
- Open website in browser
- Press F12 → Elements tab
- Use Ctrl+F to search for text
- Right-click element → Copy → Copy selector

3. **Log everything during development:**
```typescript
console.log('Title:', title);
console.log('Date:', dateStr);
console.log('Location:', location);
```

## Next Steps

1. Run debugger on each website
2. Update selectors in scrapers
3. Test each scraper
4. Check database for events: `npx prisma studio`
5. View events in app: http://localhost:3000

Happy scraping! 🕷️
