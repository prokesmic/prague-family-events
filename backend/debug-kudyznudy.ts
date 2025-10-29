import { scrapeAndLoadCheerio } from './src/utils/firecrawlHelper';

async function test() {
  console.log('Testing kudyznudy.cz scraping...\n');

  console.log('Testing with 10 second wait time...');
  const $ = await scrapeAndLoadCheerio('https://www.kudyznudy.cz/kalendar-akci/akce-pro-deti/hlavni-mesto-praha', {
    waitFor: 10000,  // Wait 10 seconds for AJAX to load
    timeout: 60000,
  });

  if (!$) {
    console.log('Failed to scrape');
    return;
  }

  // Look for event listings
  console.log('\n=== Page Analysis ===');
  console.log('Total elements:', $('*').length);
  console.log('Total links:', $('a').length);
  console.log('Total headings:', $('h1, h2, h3, h4').length);

  // Look for event detail links (not category links)
  const detailLinks = $('a').filter((i, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    // Look for actual event detail pages, not category pages
    return href.includes('/akce/') && !href.includes('/kalendar-akci/') && text.length > 15;
  });

  console.log('Found event detail links:', detailLinks.length);

  if (detailLinks.length > 0) {
    console.log('\n✅ Found actual events!');
    detailLinks.slice(0, 5).each((i, el) => {
      const $el = $(el);
      console.log(`\nEvent ${i + 1}:`);
      console.log('  Title:', $el.text().trim().substring(0, 80));
      console.log('  URL:', $el.attr('href'));

      // Get parent to find date/location
      const parent = $el.closest('div[class*="event"], div[class*="item"], li, article');
      if (parent.length) {
        console.log('  Parent class:', parent.attr('class'));
        console.log('  Parent HTML structure:');

        // Show all elements in parent to understand structure
        parent.children().each((j, child) => {
          const $child = $(child);
          const tag = child.tagName;
          const classes = $child.attr('class') || '';
          const text = $child.text().trim().substring(0, 50);
          console.log(`    <${tag} class="${classes}">${text}</>`);
        });

        const dateEl = parent.find('time, [class*="date"], [class*="datum"]').first();
        if (dateEl.length) {
          console.log('  Date element tag:', dateEl[0].tagName);
          console.log('  Date element class:', dateEl.attr('class'));
          console.log('  Date text:', dateEl.text().trim());
          console.log('  Date HTML:', dateEl.html()?.substring(0, 100));
        }
      }
    });
  } else {
    console.log('\n⚠️  No event detail links found. Trying alternative search...');

    // Try finding any links with substantial text
    const substantialLinks = $('a').filter((i, el) => {
      const text = $(el).text().trim();
      return text.length > 20 && text.length < 200;
    });

    console.log(`\nFound ${substantialLinks.length} links with substantial text:`);
    substantialLinks.slice(0, 5).each((i, el) => {
      console.log(`  "${$(el).text().trim().substring(0, 60)}" -> ${$(el).attr('href')}`);
    });
  }
}

test().catch(console.error);
