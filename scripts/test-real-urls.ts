import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { URLScraper } from '../packages/adapters/src/url.scraper';
import { ItemExtractor } from '../packages/adapters/src/item.extractor';
import { EBayClient } from '../packages/adapters/src/ebay.client';
import { CalculationEngine } from '../packages/shared/src/calculator';
import { CalculationOutput, Listing, Marketplace } from '../packages/shared/src/types';

dotenv.config({ path: '/home/workspace/Arbitrain.com/secrets/.env.ebay' });

const REAL_URLS = [
  'https://www.ebay.com/itm/185810487116',
  'https://ctbids.com/estate-sale/40139/item/4678063/White-Clad-Vintage-Oak-Ice-Box',
  'https://ctbids.com/estate-sale/40607/item/4676938/14k-Gold-Heart-Earrings-And-14k-AK-Turkey-Byzantine-Band-Ring',
  'https://www.mercari.com/us/item/m98929635815/',
  'https://www.ebay.com/itm/275814509162'
];

interface TestResult {
  url: string;
  scraped?: { success: boolean; source: string; title: string; description: string; error?: string };
  itemProfile?: any;
  queryLadder?: string[];
  ebayComps?: any[];
  analysis?: CalculationOutput;
  error?: string;
}

async function runTests() {
  console.log('\n🚀 ARBITRAIN PHASE 2 - REAL URL TEST SUITE');
  console.log('='.repeat(50));
  console.log('\nProcessing 5 real-world listings...\n');

  const scraper = new URLScraper();
  const extractor = new ItemExtractor();
  const ebayClient = new EBayClient(
    process.env.EBAY_PROD_APP_ID || '',
    process.env.EBAY_PROD_CERT_ID || ''
  );
  const calculator = new CalculationEngine();

  const results: TestResult[] = [];

  for (let i = 0; i < REAL_URLS.length; i++) {
    const url = REAL_URLS[i];
    console.log(`📍 Test ${i + 1}/5: ${url.substring(0, 80)}...`);

    const result: TestResult = { url };

    try {
      // Step 1: Scrape URL
      console.log('   → Scraping URL...');
      const scrapedData = await scraper.scrape(url);

      if (!scrapedData.success || !scrapedData.title) {
        throw new Error(scrapedData.error || 'Failed to scrape listing');
      }

      result.scraped = scrapedData;
      console.log(`   ✓ Title: "${scrapedData.title.substring(0, 60)}..."`);

      // Step 2: Extract Item Profile
      console.log('   → Building item profile...');
      const itemProfile = extractor.extract(
        scrapedData.title,
        scrapedData.description
      );
      result.itemProfile = itemProfile;
      console.log(`   ✓ Type: ${itemProfile.item_type}, Condition: ${itemProfile.condition}`);

      // Step 3: Generate Query Ladder
      console.log('   → Generating query ladder...');
      const queryLadder = extractor.generateQueryLadder(itemProfile);
      result.queryLadder = queryLadder;
      console.log(`   ✓ Queries: ${queryLadder.length} ladder steps`);

      // Step 4: Search eBay Comps
      console.log('   → Searching eBay sold comps...');
      const comps = await ebayClient.searchSoldListings(
        queryLadder[0],
        itemProfile.condition
      );

      if (!comps || comps.length === 0) {
        throw new Error('No eBay comps found for this item');
      }

      result.ebayComps = comps;
      console.log(`   ✓ Found ${comps.length} comps`);

      // Step 5: Calculate Analysis
      console.log('   → Running calculation engine...');
      const listing: Listing = {
        title: scrapedData.title,
        description: scrapedData.description,
        url: url,
        current_price: 0, // Placeholder - would be extracted from listing in real flow
        marketplace: (scrapedData.source.toLowerCase() as Marketplace) || 'ebay',
      };

      const analysis = calculator.analyze(
        itemProfile,
        comps,
        listing,
        queryLadder[0],
        queryLadder
      );

      result.analysis = analysis;
      console.log(
        `   ✓ Analysis: ${analysis.num_comps} comps, confidence ${analysis.confidence_label}`
      );
      console.log('');
    } catch (err: any) {
      result.error = err.message || 'Unknown error';
      console.log(`   ❌ Error: ${result.error}\n`);
    }

    results.push(result);
  }

  // Generate HTML Report
  const html = generateHTMLReport(results);
  const outputPath = path.resolve(__dirname, '../test-results-real-urls.html');
  fs.writeFileSync(outputPath, html);

  console.log(`✅ Test suite complete`);
  console.log(`📄 Report: ${outputPath}`);
  console.log(`🌐 View at: https://arbitrain-results-freetrials.zocomputer.io/test-results-real-urls.html\n`);
}

function generateHTMLReport(results: TestResult[]) {
  const testCasesHTML = results
    .map(
      (r, i) => `
    <div class="test-case">
      <h3>Test ${i + 1}: ${r.scraped?.source?.toUpperCase() || 'FAILED'}</h3>
      <p><strong>URL:</strong> <a href="${r.url}" target="_blank">${r.url.substring(0, 100)}...</a></p>

      <div class="section">
        <h4>📋 Scraped Listing</h4>
        ${
          r.scraped?.success
            ? `
          <p><strong>Title:</strong> ${r.scraped.title}</p>
          <p><strong>Description:</strong> ${(r.scraped.description || 'N/A').substring(0, 300)}...</p>
        `
            : `<p style="color: red;"><strong>Error:</strong> ${r.scraped?.error || r.error}</p>`
        }
      </div>

      <div class="section">
        <h4>🔍 Item Profile</h4>
        ${
          r.itemProfile
            ? `
          <table>
            <tr><td>Type</td><td>${r.itemProfile.item_type}</td></tr>
            <tr><td>Condition</td><td>${r.itemProfile.condition}</td></tr>
            <tr><td>Category</td><td>${r.itemProfile.category}</td></tr>
            <tr><td>Brand</td><td>${r.itemProfile.brand || 'N/A'}</td></tr>
            <tr><td>Is Lot?</td><td>${r.itemProfile.is_lot ? 'Yes' : 'No'}</td></tr>
            <tr><td>Extraction Confidence</td><td>${(r.itemProfile.extraction_confidence * 100).toFixed(0)}%</td></tr>
          </table>
        `
            : '<p style="color: orange;">Skipped (failed to scrape)</p>'
        }
      </div>

      <div class="section">
        <h4>🔎 Search Queries</h4>
        ${
          r.queryLadder
            ? `
          <p>Query Ladder (${r.queryLadder.length} queries):</p>
          <ol>
            ${r.queryLadder.map((q) => `<li>${q}</li>`).join('')}
          </ol>
        `
            : '<p style="color: orange;">Skipped (no profile)</p>'
        }
      </div>

      <div class="section">
        <h4>💰 eBay Sold Comps (Last 30 Days)</h4>
        ${
          r.ebayComps && r.ebayComps.length > 0
            ? `
          <p>Found <strong>${r.ebayComps.length} comps</strong></p>
          <table>
            <tr>
              <th>Price</th>
              <th>Condition</th>
              <th>Sold Date</th>
              <th>Title</th>
            </tr>
            ${r.ebayComps
              .slice(0, 5)
              .map(
                (c) => `
              <tr>
                <td>$${c.sold_price.toFixed(2)}</td>
                <td>${c.condition}</td>
                <td>${new Date(c.sold_date).toLocaleDateString()}</td>
                <td>${c.title.substring(0, 50)}...</td>
              </tr>
            `
              )
              .join('')}
          </table>
          <p style="font-size: 0.9em; color: #666;">Showing first 5 of ${r.ebayComps.length} comps</p>
        `
            : '<p style="color: orange;"><strong>⚠️ No comps found</strong></p>'
        }
      </div>

      ${
        r.analysis
          ? `
      <div class="section result-section">
        <h4>🎯 Arbitrain Analysis</h4>
        
        <div class="result-metrics">
          <div class="metric">
            <label>Median Price</label>
            <div class="value">$${r.analysis.median_price?.toFixed(2) || 'N/A'}</div>
          </div>
          <div class="metric">
            <label>Price Range</label>
            <div class="value" style="font-size: 0.9em;">
              $${r.analysis.price_range?.low?.toFixed(0) || 'N/A'}<br>–<br>$${r.analysis.price_range?.high?.toFixed(0) || 'N/A'}
            </div>
          </div>
          <div class="metric">
            <label>Max Safe Bid</label>
            <div class="value">$${r.analysis.max_safe_bid?.toFixed(2) || 'N/A'}</div>
          </div>
          <div class="metric">
            <label>Confidence</label>
            <div class="value ${
              r.analysis.confidence_label === 'high'
                ? 'high'
                : r.analysis.confidence_label === 'medium'
                  ? 'medium'
                  : 'low'
            }">
              ${(r.analysis.confidence_label || 'UNKNOWN').toUpperCase()}<br><span style="font-size: 0.7em;">${r.analysis.confidence_score?.toFixed(0) || '?'}/100</span>
            </div>
          </div>
        </div>

        <div style="margin-top: 20px;">
          <p><strong>📊 Summary:</strong> ${r.analysis.explanation?.summary || 'No summary'}</p>
          <p><strong>💡 Reasoning:</strong> ${r.analysis.explanation?.resale_reasoning || 'No reasoning'}</p>
          <p><strong>📈 Max Bid Logic:</strong> ${r.analysis.explanation?.max_bid_reasoning || 'No explanation'}</p>
        </div>

        ${
          r.analysis.explanation?.warnings && r.analysis.explanation.warnings.length > 0
            ? `
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 15px; border-radius: 4px;">
            <strong style="color: #856404;">⚠️ Warnings:</strong>
            <ul style="margin: 10px 0 0 20px;">
              ${r.analysis.explanation.warnings.map((w: string) => `<li style="color: #856404;">${w}</li>`).join('')}
            </ul>
          </div>
        `
            : ''
        }

        ${
          r.analysis.explanation?.opportunities && r.analysis.explanation.opportunities.length > 0
            ? `
          <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin-top: 15px; border-radius: 4px;">
            <strong style="color: #155724;">✅ Opportunities:</strong>
            <ul style="margin: 10px 0 0 20px;">
              ${r.analysis.explanation.opportunities.map((o: string) => `<li style="color: #155724;">${o}</li>`).join('')}
            </ul>
          </div>
        `
            : ''
        }
      </div>
    `
          : `
      <div class="section result-section">
        <h4>🎯 Analysis Result</h4>
        <div style="background: #f8d7da; padding: 10px; color: #721c24;">
          <strong>❌ Analysis Failed:</strong> ${r.error}
        </div>
      </div>
    `
      }
    </div>
  `
    )
    .join('');

  return (
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Arbitrain Phase 2 - Real URL Test Results</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f5f5f5;
      padding: 40px 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    header h1 {
      font-size: 2em;
      margin-bottom: 10px;
    }
    header p {
      opacity: 0.9;
    }
    .content {
      padding: 40px;
    }
    .test-case {
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .test-case h3 {
      color: #333;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #667eea;
    }
    .section {
      margin: 20px 0;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 4px;
    }
    .section h4 {
      color: #667eea;
      margin-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    table td, table th {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    table th {
      background: #f0f0f0;
      font-weight: 600;
    }
    .result-section {
      background: #f0f7ff;
      border-left: 4px solid #667eea;
    }
    .result-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .metric {
      background: white;
      padding: 15px;
      border-radius: 4px;
      text-align: center;
      border: 1px solid #ddd;
    }
    .metric label {
      font-size: 0.85em;
      color: #666;
      display: block;
      margin-bottom: 5px;
    }
    .metric .value {
      font-size: 1.5em;
      font-weight: bold;
      color: #333;
    }
    .metric .value.high {
      color: #28a745;
    }
    .metric .value.medium {
      color: #ffc107;
    }
    .metric .value.low {
      color: #dc3545;
    }
    a {
      color: #667eea;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    ol, ul {
      margin: 10px 0 10px 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🚀 Arbitrain Phase 2 Test Suite</h1>
      <p>Real URL → Scrape → Profile → Query Ladder → eBay Comps → Analysis</p>
    </header>
    <div class="content">
      ` +
    testCasesHTML +
    `
    </div>
  </div>
</body>
</html>`
  );
}

runTests().catch(console.error);


