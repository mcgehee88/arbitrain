import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { URLScraper } from '../packages/adapters/src/url.scraper';
import { ItemExtractor } from '../packages/adapters/src/item.extractor';
import { EBayClient } from '../packages/adapters/src/ebay.client';
import { CalculationEngine } from '../packages/shared/src/calculator';

dotenv.config({ path: '/home/workspace/Arbitrain.com/secrets/.env.ebay' });
dotenv.config({ path: '/home/workspace/Arbitrain.com/secrets/.env.openai' });

const REAL_URLS = [
  'https://www.ebay.com/itm/185810487116',
  'https://www.ebay.com/itm/404819005678',
  'https://www.ebay.com/itm/255789012345',
  'https://www.ebay.com/itm/227127658737',
  'https://www.ebay.com/itm/266555555555',
];

interface TestResult {
  url: string;
  scrapedTitle: string;
  itemProfile: any;
  compsCount: number;
  analysis: any;
  error?: string;
}

async function runTests() {
  console.log('\n🚀 ARBITRAIN PHASE 2 - PRODUCTION TEST SUITE\n');

  const scraper = new URLScraper();
  const extractor = new ItemExtractor();
  const ebayClient = new EBayClient(
    process.env.EBAY_PROD_APP_ID || '',
    process.env.EBAY_PROD_CERT_ID || ''
  );
  const calculator = new CalculationEngine(process.env.OPENAI_API_KEY || '');

  const results: TestResult[] = [];

  for (let i = 0; i < REAL_URLS.length; i++) {
    const url = REAL_URLS[i];
    console.log(`📍 Test ${i + 1}/5: ${url.substring(0, 50)}...`);

    try {
      // Step 1: Scrape URL
      console.log('   → Scraping URL...');
      const scraped = await scraper.scrape(url);
      if (!scraped) {
        console.log('   ⚠️  Scrape failed');
        results.push({
          url,
          scrapedTitle: 'SCRAPE FAILED',
          itemProfile: {},
          compsCount: 0,
          analysis: {},
          error: 'URL scraping failed',
        });
        continue;
      }

      console.log(`   ✓ Title: "${scraped.title.substring(0, 60)}..."`);

      // Step 2: Extract item profile
      const itemProfile = extractor.extract(scraped.title);
      const queryLadder = extractor.generateQueryLadder(itemProfile);
      console.log(`   ✓ Type: ${itemProfile.item_type}, Condition: ${itemProfile.condition}`);

      // Step 3: Search eBay for comps
      console.log(`   → Searching eBay comps...`);
      const comps = await ebayClient.searchSoldListings(queryLadder[0]);
      console.log(`   ✓ Found ${comps.length} comps`);

      // Step 4: Analyze
      const listing = {
        url,
        title: scraped.title,
        current_bid: 100,
      };

      const analysis = await calculator.analyze(itemProfile, queryLadder, comps, listing);

      results.push({
        url,
        scrapedTitle: scraped.title,
        itemProfile,
        compsCount: comps.length,
        analysis,
      });

      console.log(`   ✓ Analysis: ${analysis.confidence_score}/100\n`);
    } catch (err: any) {
      console.log(`   ❌ Error: ${err.message}\n`);
      results.push({
        url,
        scrapedTitle: 'ERROR',
        itemProfile: {},
        compsCount: 0,
        analysis: {},
        error: err.message,
      });
    }
  }

  // Generate HTML report
  const html = generateHTMLReport(results);
  fs.writeFileSync('/home/workspace/Arbitrain.com/arbitrain/test-results-real-urls.html', html);

  console.log('✅ Test suite complete');
  console.log('🌐 View at: https://arbitrain-results-freetrials.zocomputer.io/test-results-real-urls.html\n');
}

function generateHTMLReport(results: TestResult[]): string {
  const testCasesHTML = results
    .map(
      (r, i) => `
    <div class="test-case">
      <h3>Test ${i + 1}: ${r.scrapedTitle}</h3>
      <table>
        <tr><td>URL</td><td><a href="${r.url}" target="_blank">${r.url}</a></td></tr>
        <tr><td>Source</td><td>${r.url.includes('ebay') ? 'eBay' : 'Other'}</td></tr>
        <tr><td>Item Type</td><td>${r.itemProfile?.item_type || 'N/A'}</td></tr>
        <tr><td>Condition</td><td>${r.itemProfile?.condition || 'N/A'}</td></tr>
        <tr><td>Comps Found</td><td>${r.compsCount}</td></tr>
        <tr><td>Expected Resale</td><td>$${r.analysis?.expected_resale_price?.toFixed(2) || 'N/A'}</td></tr>
        <tr><td>Max Safe Bid</td><td>$${r.analysis?.max_safe_bid?.toFixed(2) || 'N/A'}</td></tr>
        <tr><td>Estimated Profit</td><td>$${r.analysis?.estimated_profit?.toFixed(2) || 'N/A'}</td></tr>
        <tr><td>ROI</td><td>${r.analysis?.estimated_roi_percent?.toFixed(1) || 'N/A'}%</td></tr>
        <tr><td>Confidence</td><td>${r.analysis?.confidence_score || 'N/A'}/100</td></tr>
        <tr><td>Summary</td><td>${r.analysis?.explanation?.summary || r.error || 'No analysis'}</td></tr>
      </table>
    </div>
  `
    )
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <title>Arbitrain Phase 2 Test Results</title>
  <style>
    body { font-family: system-ui; margin: 2rem; background: #f5f5f5; }
    h1 { color: #333; }
    .test-case { background: white; padding: 1.5rem; margin: 1rem 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    td { padding: 0.75rem; border-bottom: 1px solid #eee; }
    td:first-child { font-weight: bold; width: 25%; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <header>
    <h1>🚀 Arbitrain Phase 2 - Production Test Results</h1>
    <p>Full end-to-end pipeline: URL → Scrape → Profile → eBay Comps → Analysis</p>
  </header>
  <div class="content">${testCasesHTML}</div>
</body>
</html>`;
}

runTests().catch(console.error);

