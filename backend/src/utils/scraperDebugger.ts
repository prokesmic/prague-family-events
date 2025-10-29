/**
 * Scraper Debugger Tool
 * Helps analyze website structure and find correct selectors
 *
 * Usage: ts-node src/utils/scraperDebugger.ts <url>
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const COMMON_EVENT_SELECTORS = [
  'article',
  '.event',
  '.event-card',
  '.event-item',
  '.eventCard',
  '[class*="event"]',
  '.card',
  '.item',
  '[class*="card"]',
  '[class*="item"]',
];

const COMMON_TITLE_SELECTORS = [
  'h1',
  'h2',
  'h3',
  '.title',
  '.event-title',
  '.name',
  '.heading',
  '[class*="title"]',
  '[class*="name"]',
  '[class*="heading"]',
];

const COMMON_DATE_SELECTORS = [
  '.date',
  '.event-date',
  'time',
  '[datetime]',
  '[class*="date"]',
  '[class*="time"]',
];

const COMMON_LOCATION_SELECTORS = [
  '.location',
  '.venue',
  '.place',
  '[class*="location"]',
  '[class*="venue"]',
  '[class*="place"]',
];

async function analyzeWebsite(url: string) {
  console.log(`\n🔍 Analyzing: ${url}\n`);

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept-Language': 'cs,en;q=0.9',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);

    console.log('📄 Page Analysis:');
    console.log(`   Title: ${$('title').text()}`);
    console.log(`   Total Elements: ${$('*').length}`);
    console.log('');

    // Test event container selectors
    console.log('🎯 Testing Event Container Selectors:');
    for (const selector of COMMON_EVENT_SELECTORS) {
      const count = $(selector).length;
      if (count > 0 && count < 100) {
        console.log(`   ✓ ${selector}: ${count} elements`);

        // Show sample classes
        const sampleClasses = $(selector).first().attr('class');
        if (sampleClasses) {
          console.log(`     Sample classes: ${sampleClasses}`);
        }
      }
    }
    console.log('');

    // Find potential event containers
    const potentialContainers = findPotentialEventContainers($);
    if (potentialContainers.length > 0) {
      console.log('🎪 Potential Event Containers Found:');
      potentialContainers.forEach((container, i) => {
        console.log(`\n   Container #${i + 1}:`);
        console.log(`   Selector: ${container.selector}`);
        console.log(`   Count: ${container.count}`);
        console.log(`   Sample classes: ${container.classes}`);

        // Test child selectors
        const $container = $(container.selector).first();

        console.log(`   \n   Testing child selectors:`);
        COMMON_TITLE_SELECTORS.forEach((sel) => {
          const title = $container.find(sel).first().text().trim();
          if (title) {
            console.log(`     Title (${sel}): ${title.substring(0, 60)}...`);
          }
        });

        COMMON_DATE_SELECTORS.forEach((sel) => {
          const date = $container.find(sel).first().text().trim();
          if (date) {
            console.log(`     Date (${sel}): ${date}`);
          }
        });

        COMMON_LOCATION_SELECTORS.forEach((sel) => {
          const loc = $container.find(sel).first().text().trim();
          if (loc) {
            console.log(`     Location (${sel}): ${loc}`);
          }
        });
      });
    }

    // Look for lists
    console.log('\n\n📋 List Structures:');
    $('ul, ol').each((i, el) => {
      const $list = $(el);
      const itemCount = $list.find('> li').length;
      if (itemCount >= 3 && itemCount < 100) {
        const classes = $list.attr('class') || 'no class';
        console.log(`   List with ${itemCount} items: .${classes}`);
      }
    });

    console.log('\n\n💡 Recommendations:');
    console.log('   1. Look for selectors with 5-50 matches');
    console.log('   2. Use specific class names from "Sample classes"');
    console.log('   3. Test selectors in browser DevTools');
    console.log('   4. Update scraper with found selectors\n');

  } catch (error: any) {
    console.error('❌ Error analyzing website:', error.message);
  }
}

function findPotentialEventContainers($: cheerio.CheerioAPI) {
  const containers: Array<{ selector: string; count: number; classes: string }> = [];

  // Look for repeated structures with reasonable counts
  const selectors = [
    ...COMMON_EVENT_SELECTORS,
    '[class*="card"]',
    '[class*="item"]',
    '[class*="box"]',
    '[class*="post"]',
    '[class*="entry"]',
  ];

  selectors.forEach((selector) => {
    try {
      const count = $(selector).length;
      if (count >= 3 && count <= 50) {
        const classes = $(selector).first().attr('class') || 'no class';
        containers.push({ selector, count, classes });
      }
    } catch (e) {
      // Skip invalid selectors
    }
  });

  return containers.slice(0, 5); // Return top 5
}

// Run if called directly
if (require.main === module) {
  const url = process.argv[2];

  if (!url) {
    console.log('Usage: ts-node src/utils/scraperDebugger.ts <url>');
    console.log('');
    console.log('Examples:');
    console.log('  ts-node src/utils/scraperDebugger.ts https://goout.net/cs/praha/akce');
    console.log('  ts-node src/utils/scraperDebugger.ts https://www.kudyznudy.cz/kalendar-akci');
    process.exit(1);
  }

  analyzeWebsite(url);
}

export { analyzeWebsite };
