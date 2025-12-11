import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ArbitrainPipeline, PipelineResult } from '../packages/adapters/src/pipeline';

dotenv.config({ path: '/home/workspace/Arbitrain.com/secrets/.env.ebay' });

const REAL_URLS = [
  'https://www.ebay.com/itm/185810487116?_trkparms=amclksrc%3DITM%26aid%3D777008%26algo%3DPERSONAL.TOPIC%26ao%3D1%26asc%3D20250528152807%26meid%3Da71e20a28e0b405d903594efab6d1bb8%26pid%3D102796%26rk%3D8%26rkt%3D19%26mehot%3Dpp%26itm%3D185810487116%26pmt%3D0%26noa%3D1%26pg%3D4375194%26algv%3DRecentlyViewedItemsV2DWebWithPSItemDRV2_BP%26brand%3DUnbranded%26tu%3D01KC7BK7FQT7FX3HJJP3RK14DB',
  'https://www.ebay.com/itm/227127658737?_trkparms=amclksrc%3DITM%26aid%3D777008%26algo%3DPERSONAL.TOPIC%26ao%3D1%26asc%3D20250528152807%26meid%3Da71e20a28e0b405d903594efab6d1bb8%26pid%3D102796%26rk%3D8%26rkt%3D19%26mehot%3Dpp%26itm%3D227127658737%26pmt%3D0%26noa%3D1%26pg%3D4375194%26algv%3DRecentlyViewedItemsV2DWebWithPSItemDRV2_BP%26brand%3DUnbranded',
  'https://www.facebook.com/marketplace/item/1234567890',
  'https://ctbids.com/estate-sale/40139/item/4678063/White-Clad-Stainless-Steel-14k-Gold-Heart-Earrings-And-14k-AK-Turkey-Byzantine-Chain',
  'https://www.mercari.com/us/item/m9892963581/?ref=search_results',
];

async function runPipeline() {
  console.log('\n🚀 ARBITRAIN UNIFIED PIPELINE V1\n');
  console.log('Pipeline: URL → Scrape → Profile → Query Ladder → eBay Comps → Semantic Filter (0.3) → Analysis\n');

  const pipeline = new ArbitrainPipeline(
    process.env.EBAY_PROD_APP_ID || '',
    process.env.EBAY_PROD_CERT_ID || ''
  );

  const results: PipelineResult[] = [];

  for (let i = 0; i < REAL_URLS.length; i++) {
    const url = REAL_URLS[i];
    console.log(`📍 Test ${i + 1}/5: ${url.substring(0, 60)}...`);

    const result = await pipeline.process(url);
    results.push(result);

    if (result.error) {
      console.log(`   ✗ Error: ${result.error}`);
    } else {
      console.log(`   ✓ Title: "${result.scrapedTitle.substring(0, 60)}..."`);
      console.log(`   ✓ Type: ${result.itemType}, Condition: ${result.condition}`);
      console.log(`   ✓ Found ${result.rawCompsCount} comps`);
      console.log(`   ✓ Filtered to ${result.filteredCompsCount} comps (similarity >= 0.3)`);
      if (result.analysis) {
        console.log(`   ✓ Analysis: Median $${result.analysis.median_price}, Bid $${result.analysis.max_safe_bid}, ${result.analysis.confidence_score}% confidence`);
      }
    }
  }

  // Generate HTML report
  generateHTMLReport(results);
}

function generateHTMLReport(results: PipelineResult[]) {
  const testCasesHTML = results
    .map(r => {
      if (r.error) {
        return `
    <div class="test-case">
      <h3>Test: ${r.scrapedTitle}</h3>
      <table>
        <tr><td>URL</td><td><a href="${r.url}" target="_blank">${r.url.substring(0, 80)}...</a></td></tr>
        <tr><td colspan="2" style="color: red;">ERROR: ${r.error}</td></tr>
      </table>
    </div>`;
      }

      const analysisRows = r.analysis
        ? `
        <tr><td>Median Resale Price</td><td><strong>$${r.analysis.median_price}</strong></td></tr>
        <tr><td>Max Safe Bid (30% ROI)</td><td><strong>$${r.analysis.max_safe_bid}</strong></td></tr>
        <tr><td>Confidence Score</td><td><span class="confidence-${r.analysis.confidence_score >= 80 ? 'high' : r.analysis.confidence_score >= 50 ? 'medium' : 'low'}">${r.analysis.confidence_score}/100</span></td></tr>
        <tr><td>Risk Score</td><td>${r.analysis.risk_score}/100</td></tr>
        <tr><td>Opportunities</td><td>${r.analysis.opportunities.join(', ')}</td></tr>`
        : `<tr><td colspan="2" style="color: red;">ERROR: No comps passed semantic filter</td></tr>`;

      return `
    <div class="test-case">
      <h3>Test: ${r.scrapedTitle}</h3>
      <table>
        <tr><td>URL</td><td><a href="${r.url}" target="_blank">${r.url.substring(0, 80)}...</a></td></tr>
        <tr><td>Item Type</td><td>${r.itemType}</td></tr>
        <tr><td>Condition</td><td>${r.condition}</td></tr>
        <tr><td>Query Ladder</td><td>${r.queryLadder.join(' → ')}</td></tr>
        <tr><td>Comps Found (Raw)</td><td>${r.rawCompsCount}</td></tr>
        <tr><td>Comps Filtered (≥ 0.3 similarity)</td><td>${r.filteredCompsCount}</td></tr>
        ${analysisRows}
      </table>
    </div>`;
    })
    .join('\n');

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
    <h1>🎯 Arbitrain Phase 2 - Unified Pipeline V1</h1>
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
  console.log('\n✅ Test suite complete');
  console.log('🌐 View at: https://arbitrain-results-freetrials.zocomputer.io/test-results-real-urls.html\n');
}

runPipeline().catch(console.error);

