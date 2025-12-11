import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { URLScraper } from '../packages/adapters/src/url.scraper';
import { ItemExtractor } from '../packages/adapters/src/item.extractor';
import { EBayClient } from '../packages/adapters/src/ebay.client';
import { CalculationEngine } from '../packages/shared/src/calculator';
import { SemanticMatcher } from '../packages/adapters/src/semantic.matcher';

dotenv.config({ path: '/home/workspace/Arbitrain.com/secrets/.env.ebay' });

const REAL_URLS = [
  'https://www.ebay.com/itm/185810487116?_trkparms=amclksrc%3DITM%26aid%3D777008%26algo%3DPERSONAL.TOPIC%26ao%3D1%26asc%3D20250528152807%26meid%3Da71e20a28e0b405d903594efab6d1bb8%26pid%3D102796%26rk%3D8%26rkt%3D19%26mehot%3Dpp%26itm%3D185810487116%26pmt%3D0%26noa%3D1%26pg%3D4375194%26algv%3DRecentlyViewedItemsV2DWebWithPSItemDRV2_BP%26brand%3DUnbranded%26tu%3D01KC7BK7FQT7FX3HJJP3RK14DB',
  'https://www.ebay.com/itm/227127658737?_trkparms=amclksrc%3DITM%26aid%3D777008%26algo%3DPERSONAL.TOPIC%26ao%3D1%26asc%3D20250528152807%26meid%3Da71e20a28e0b405d903594efab6d1bb8%26pid%3D102796%26rk%3D8%26rkt%3D19%26mehot%3Dpp%26itm%3D227127658737%26pmt%3D0%26noa%3D1%26pg%3D4375194%26algv%3DRecentlyViewedItemsV2DWebWithPSItemDRV2_BP%26brand%3DUnbranded',
  'https://www.facebook.com/marketplace/item/1234567890',
  'https://ctbids.com/estate-sale/40139/item/4678063/White-Clad-Stainless-Steel-14k-Gold-Heart-Earrings-And-14k-AK-Turkey-Byzantine-Chain',
  'https://www.mercari.com/us/item/m9892963581/?ref=search_results',
];

interface TestResult {
  url: string;
  scrapedTitle: string;
  itemType: string;
  condition: string;
  queryLadder: string[];
  compsFound: number;
  compsFiltered: number;
  medianPrice: number | null;
  maxSafeBid: number | null;
  confidenceScore: number;
  riskScore: number;
  analysis: any;
  error?: string;
}

async function runTests() {
  console.log('\n🚀 ARBITRAIN PHASE 2 - PRODUCTION TEST SUITE\n');
  console.log('Pipeline: URL → Scrape → Profile → Query Ladder → eBay Comps → Semantic Filter → Analysis\n');

  const scraper = new URLScraper();
  const extractor = new ItemExtractor();
  const calculator = new CalculationEngine();
  const matcher = new SemanticMatcher();
  const ebayClient = new EBayClient(
    process.env.EBAY_PROD_APP_ID || '',
    process.env.EBAY_PROD_CERT_ID || ''
  );

  const results: TestResult[] = [];

  for (let i = 0; i < REAL_URLS.length; i++) {
    const url = REAL_URLS[i];
    console.log(`📍 Test ${i + 1}/5: ${url.substring(0, 60)}...`);

    const result: TestResult = {
      url,
      scrapedTitle: '',
      itemType: 'unknown',
      condition: 'unknown',
      queryLadder: [],
      compsFound: 0,
      compsFiltered: 0,
      medianPrice: null,
      maxSafeBid: null,
      confidenceScore: 0,
      riskScore: 0,
      analysis: {},
    };

    try {
      // STEP 1: Scrape
      console.log('   → Scraping URL...');
      const scraped = await scraper.scrape(url);
      result.scrapedTitle = scraped.title;
      console.log(`   ✓ Title: "${scraped.title.substring(0, 60)}..."`);

      // STEP 2: Extract profile
      const profile = extractor.extract(scraped.title);
      result.itemType = profile.item_type;
      result.condition = profile.condition;
      console.log(`   ✓ Type: ${profile.item_type}, Condition: ${profile.condition}`);

      // STEP 3: Generate query ladder
      const queryLadder = extractor.generateQueryLadder(profile);
      result.queryLadder = queryLadder;

      // STEP 4: Fetch comps from eBay
      let allComps: any[] = [];
      for (const query of queryLadder) {
        try {
          const comps = await ebayClient.searchSoldListings(query);
          allComps = [...allComps, ...comps];
        } catch (e) {
          // Silently continue - query ladder fallback
        }
      }
      result.compsFound = allComps.length;
      console.log(`   ✓ Found ${allComps.length} comps from eBay searches`);

      // STEP 5: Semantic filtering
      const filteredComps = [];
      for (const comp of allComps) {
        const similarity = matcher.calculateSimilarity(scraped.title, comp.title);
        if (similarity >= 0.3) {
          filteredComps.push(comp);
        }
      }
      result.compsFiltered = filteredComps.length;
      console.log(`   ✓ Filtered to ${filteredComps.length} comps (similarity >= 0.3)`);

      // STEP 6: Calculate analysis
      if (filteredComps.length > 0) {
        const listing = { url, title: scraped.title };
        const analysis = await calculator.analyze(profile, queryLadder, filteredComps, listing as any);
        result.analysis = analysis;
        result.medianPrice = analysis.expected_resale_price;
        result.maxSafeBid = analysis.max_safe_bid;
        result.confidenceScore = analysis.confidence_score;
        result.riskScore = analysis.risk_score;
        console.log(`   ✓ Analysis: Median $${analysis.expected_resale_price}, Bid $${analysis.max_safe_bid}, ${analysis.confidence_score}% confidence`);
      } else {
        result.error = 'No comps passed semantic filter';
        console.log(`   ⚠️  ${result.error}`);
      }

      results.push(result);
    } catch (error: any) {
      result.error = error.message;
      console.log(`   ✗ Error: ${error.message}`);
      results.push(result);
    }
  }

  // Generate HTML report
  console.log('\n✅ Test suite complete');

  const testCasesHTML = results
    .map(
      (r) => `
    <div class="test-case">
      <h3>Test: ${r.scrapedTitle || 'Unknown'}</h3>
      <table>
        <tr><td>URL</td><td><a href="${r.url}" target="_blank">${r.url.substring(0, 80)}...</a></td></tr>
        <tr><td>Item Type</td><td>${r.itemType}</td></tr>
        <tr><td>Condition</td><td>${r.condition}</td></tr>
        <tr><td>Query Ladder</td><td>${r.queryLadder.slice(0, 3).join(' → ')}</td></tr>
        <tr><td>Comps Found (Raw)</td><td>${r.compsFound}</td></tr>
        <tr><td>Comps Filtered (≥ 0.3 similarity)</td><td>${r.compsFiltered}</td></tr>
        ${
          r.medianPrice
            ? `
        <tr><td>Median Resale Price</td><td><strong>$${r.medianPrice.toFixed(2)}</strong></td></tr>
        <tr><td>Max Safe Bid (30% ROI)</td><td><strong>$${r.maxSafeBid?.toFixed(2)}</strong></td></tr>
        <tr><td>Confidence Score</td><td><span class="confidence-${
                r.confidenceScore >= 80 ? 'high' : r.confidenceScore >= 50 ? 'medium' : 'low'
              }">${r.confidenceScore}/100</span></td></tr>
        <tr><td>Risk Score</td><td>${r.riskScore}/100</td></tr>
        <tr><td>Summary</td><td>${r.analysis.explanation?.summary || 'N/A'}</td></tr>
        <tr><td>Opportunities</td><td>${(r.analysis.explanation?.opportunities || []).join('<br>')}</td></tr>
        `
            : `<tr><td colspan="2" style="color: red;">ERROR: ${r.error}</td></tr>`
        }
      </table>
    </div>
  `
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Arbitrain Phase 2 - Test Results</title>
  <style>
    body { font-family: system-ui; margin: 20px; background: #f5f5f5; }
    .header { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { margin: 0; color: #333; }
    .subtitle { color: #666; margin: 10px 0 0 0; font-size: 14px; }
    .content { max-width: 1200px; margin: 20px auto; }
    .test-case { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #007bff; }
    .test-case h3 { margin-top: 0; color: #007bff; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    td { padding: 10px; border-bottom: 1px solid #eee; }
    td:first-child { font-weight: bold; color: #555; width: 25%; }
    a { color: #007bff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .confidence-high { color: green; font-weight: bold; }
    .confidence-medium { color: orange; font-weight: bold; }
    .confidence-low { color: red; font-weight: bold; }
    strong { color: #333; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎯 Arbitrain Phase 2 - Production Test Suite</h1>
    <p class="subtitle">
      Pipeline: URL → Scrape → Profile → Query Ladder → eBay Comps → Semantic Filter (0.3 threshold) → Analysis
    </p>
  </div>
  <div class="content">
    ${testCasesHTML}
  </div>
</body>
</html>`;

  fs.writeFileSync('/home/workspace/Arbitrain.com/arbitrain/test-results-real-urls.html', html);
  console.log('🌐 View at: https://arbitrain-results-freetrials.zocomputer.io/test-results-real-urls.html\n');
}

runTests().catch(console.error);

