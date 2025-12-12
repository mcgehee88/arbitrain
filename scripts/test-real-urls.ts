/**
 * Real URL pipeline test
 * Uses actual scraped data from 5 marketplace URLs
 */

import { ArbitrainPipeline, Listing } from '@arbitrain/shared';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load eBay credentials
const envPath = path.join(__dirname, '../../secrets/.env.ebay');
dotenv.config({ path: envPath });

const listings: Listing[] = [
  {
    title: '2 rings and a necklace',
    description: `A good condition engagement ring 1 karat diamond, I1 clarity , 10 karat Gold, size 8, Reviewed at Adele jewelry.
A good condition wedding ring 14 karat gold with 15 quarter karat diamonds, Size 8.
A necklace with gold and gemstones.`,
    url: 'https://www.facebook.com/marketplace/item/3754252184708029/',
    asking_price: 900.00,
    marketplace: 'facebook',
  },
  {
    title: 'White Clad Vintage Oak Ice Box',
    description: 'Vintage antique ice box, white clad exterior, oak wood interior. Estate sale item.',
    url: 'https://ctbids.com/estate-sale/40139/item/4678063/White-Clad-Vintage-Oak-Ice-Box',
    asking_price: undefined,
    marketplace: 'ctbids',
  },
  {
    title: '14k Gold Heart Earrings And 14k AK Turkey Byzantine Band Ring',
    description: 'Two 14k gold pieces: heart-shaped earrings and a Byzantine band ring from Turkey. Estate jewelry.',
    url: 'https://ctbids.com/estate-sale/40607/item/4676938/14k-Gold-Heart-Earrings-And-14k-AK-Turkey-Byzantine-Band-Ring',
    asking_price: undefined,
    marketplace: 'ctbids',
  },
  {
    title: 'Nintendo Minecraft-JUST THE CASE Like new',
    description: 'Case only for Minecraft for switch. Like new condition.',
    url: 'https://www.mercari.com/us/item/m98929635815/',
    asking_price: 5.00,
    marketplace: 'mercari',
  },
  {
    title: 'Vintage Estate 14K Yellow Gold and Diamond Masonic Shriner Ring *see appraisal*',
    description: `Beautifully unique, this ring was well-loved and worn proudly for many years before the gentleman passed on to his great reward. His legacy of helping others will be continued with any proceeds.
14K Yellow Gold with diamonds. Masonic Shriner theme.`,
    url: 'https://www.ebay.com/itm/185810487116',
    asking_price: 2999.00,
    marketplace: 'ebay',
  },
];

async function main() {
  console.log('\n' + '='.repeat(100));
  console.log('ARBITRAIN REAL URL PIPELINE TEST');
  console.log('='.repeat(100));
  console.log(`\nProcessing ${listings.length} real marketplace listings\n`);

  const pipeline = new ArbitrainPipeline({
    ebayAppId: process.env.EBAY_PROD_APP_ID || 'DEMO',
    ebayAppSecret: process.env.EBAY_PROD_CERT_ID || 'DEMO',
  });

  const results: any[] = [];

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(`\n${'─'.repeat(100)}`);
    console.log(`[${i + 1}/${listings.length}] ${listing.marketplace.toUpperCase()}: ${listing.title}`);
    console.log(`─`.repeat(100));

    try {
      // Process the listing
      const result = await pipeline.processListing(listing);
      results.push(result);

      // Display results
      console.log('\n✓ ITEM PROFILE:');
      console.log(`  Title: ${result.item_profile.raw_title}`);
      console.log(`  Category: ${result.item_profile.category}${result.item_profile.subcategory ? ' / ' + result.item_profile.subcategory : ''}`);
      console.log(`  Extraction confidence: ${(result.item_profile.extraction_confidence * 100).toFixed(0)}%`);
      console.log(`  Is lot: ${result.item_profile.is_lot ? 'YES' : 'no'}`);
      console.log(`  Key attributes:`);
      if (result.item_profile.brand) console.log(`    - Brand: ${result.item_profile.brand}`);
      if (result.item_profile.material) console.log(`    - Material: ${result.item_profile.material}`);
      if (result.item_profile.condition) console.log(`    - Condition: ${result.item_profile.condition}`);
      if (result.item_profile.item_type) console.log(`    - Type: ${result.item_profile.item_type}`);

      console.log('\n✓ QUERY LADDER:');
      result.query_ladder.forEach((q, idx) => {
        console.log(`  [L${idx + 1}] "${q}"`);
      });

      console.log('\n✓ COMPS FETCHED:');
      console.log(`  Raw comps: ${result.comps_found_raw}`);
      console.log(`  After filtering: ${result.comps_found_filtered}`);

      if (result.comps.length > 0) {
        console.log('\n✓ TOP 3 COMPS:');
        result.comps.slice(0, 3).forEach((comp, idx) => {
          console.log(`  [${idx + 1}] ${comp.title}`);
          console.log(`      Price: $${comp.sold_price} | Condition: ${comp.condition} | Quality: ${(comp.quality_score * 100).toFixed(0)}%`);
        });
      }

      console.log('\n✓ VALUATION:');
      if (result.confidence_label === 'insufficient') {
        console.log(`  Status: INSUFFICIENT DATA (need ≥3 comps, found ${result.comps.length})`);
        if (result.explanation.warnings.length > 0) {
          console.log(`  Reason: ${result.explanation.warnings[0]}`);
        }
      } else {
        console.log(`  Median price: $${result.median_price?.toFixed(2)}`);
        console.log(`  Max safe bid (30% ROI): $${result.max_bid?.toFixed(2)}`);
        console.log(`  Confidence: ${(result.confidence_score * 100).toFixed(0)}/100 (${result.confidence_label})`);
      }

      if (result.explanation.risk_factors.length > 0) {
        console.log(`  Risk factors: ${result.explanation.risk_factors[0]}`);
      }
    } catch (error: any) {
      console.error(`❌ Error processing listing: ${error.message}`);
      results.push({ error: error.message });
    }
  }

  // Generate HTML report
  console.log('\n' + '='.repeat(100));
  console.log('GENERATING HTML REPORT');
  console.log('='.repeat(100));

  const htmlPath = '/home/workspace/Arbitrain.com/arbitrain/test-results-real-urls.html';
  const html = generateHTMLReport(results);
  fs.writeFileSync(htmlPath, html, 'utf-8');

  console.log(`\n✓ Report saved to: ${htmlPath}`);
  console.log(`✓ Report URL: https://arbitrain-results-freetrials.zocomputer.io/test-results-real-urls.html\n`);
}

function generateHTMLReport(results: any[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Arbitrain Real URL Test Report</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      background: #f5f5f5;
      color: #333;
    }
    .header {
      background: white;
      border-bottom: 3px solid #007bff;
      padding: 30px 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 32px;
      color: #007bff;
    }
    .header p {
      margin: 5px 0;
      font-size: 14px;
      color: #666;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px 40px;
    }
    .test-case {
      background: white;
      border-left: 4px solid #007bff;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .test-case.error {
      border-left-color: #dc3545;
    }
    .test-case.success {
      border-left-color: #28a745;
    }
    .test-case h2 {
      margin: 0 0 15px 0;
      font-size: 20px;
      color: #333;
    }
    .test-case h3 {
      margin: 20px 0 10px 0;
      font-size: 16px;
      color: #007bff;
      border-bottom: 2px solid #e9ecef;
      padding-bottom: 5px;
    }
    .test-case h3:first-child {
      margin-top: 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin-bottom: 15px;
    }
    .metric {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 4px;
      border-left: 3px solid #007bff;
    }
    .metric-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      font-weight: 600;
    }
    .metric-value {
      font-size: 18px;
      font-weight: bold;
      color: #333;
      margin-top: 5px;
    }
    .query-list {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;
      max-height: 200px;
      overflow-y: auto;
    }
    .query-item {
      margin: 5px 0;
      padding: 5px;
      background: white;
      border-left: 2px solid #ddd;
      padding-left: 10px;
    }
    .comp-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-bottom: 15px;
    }
    .comp-table th {
      background: #f8f9fa;
      padding: 10px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #dee2e6;
    }
    .comp-table td {
      padding: 10px;
      border-bottom: 1px solid #dee2e6;
    }
    .comp-table tr:hover {
      background: #f8f9fa;
    }
    .status {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: 600;
    }
    .status.high {
      background: #d4edda;
      color: #155724;
    }
    .status.medium {
      background: #fff3cd;
      color: #856404;
    }
    .status.low {
      background: #f8d7da;
      color: #721c24;
    }
    .status.insufficient {
      background: #e2e3e5;
      color: #383d41;
    }
    .error-box {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 15px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #999;
      font-size: 12px;
      border-top: 1px solid #e9ecef;
      margin-top: 40px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔬 Arbitrain Real URL Pipeline Test</h1>
    <p>Testing the unified 5-layer pipeline on actual marketplace data</p>
    <p>Generated: ${new Date().toLocaleString()}</p>
  </div>

  <div class="container">
    ${results.map((result, idx) => {
      if (result.error) {
        return `
          <div class="test-case error">
            <h2>[${idx + 1}] ERROR</h2>
            <div class="error-box">${result.error}</div>
          </div>
        `;
      }

      const { item_profile, comps, confidence_label, confidence_score, median_price, max_bid, explanation } = result;
      
      return `
        <div class="test-case ${confidence_label === 'insufficient' ? '' : 'success'}">
          <h2>[${idx + 1}] ${item_profile.raw_title}</h2>
          
          <h3>Item Profile</h3>
          <div class="grid">
            <div class="metric">
              <div class="metric-label">Category</div>
              <div class="metric-value">${item_profile.category}${item_profile.subcategory ? ' / ' + item_profile.subcategory : ''}</div>
            </div>
            <div class="metric">
              <div class="metric-label">Extraction Confidence</div>
              <div class="metric-value">${(item_profile.extraction_confidence * 100).toFixed(0)}%</div>
            </div>
            <div class="metric">
              <div class="metric-label">Is Lot</div>
              <div class="metric-value">${item_profile.is_lot ? 'YES' : 'NO'}</div>
            </div>
            ${item_profile.brand ? `
            <div class="metric">
              <div class="metric-label">Brand</div>
              <div class="metric-value">${item_profile.brand}</div>
            </div>
            ` : ''}
          </div>

          <h3>Query Ladder (${result.query_ladder.length} levels)</h3>
          <div class="query-list">
            ${result.query_ladder.map((q: string, i: number) => `<div class="query-item">[L${i+1}] ${q}</div>`).join('')}
          </div>

          <h3>Comparables</h3>
          <div class="grid">
            <div class="metric">
              <div class="metric-label">Raw Comps Found</div>
              <div class="metric-value">${result.comps_found_raw}</div>
            </div>
            <div class="metric">
              <div class="metric-label">After Filtering</div>
              <div class="metric-value">${result.comps_found_filtered}</div>
            </div>
          </div>

          ${comps.length > 0 ? `
            <table class="comp-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Price</th>
                  <th>Condition</th>
                  <th>Quality</th>
                </tr>
              </thead>
              <tbody>
                ${comps.slice(0, 5).map((comp: any) => `
                  <tr>
                    <td>${comp.title.substring(0, 50)}...</td>
                    <td>$${comp.sold_price.toFixed(2)}</td>
                    <td>${comp.condition}</td>
                    <td>${(comp.quality_score * 100).toFixed(0)}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          <h3>Valuation</h3>
          <div class="grid">
            ${confidence_label !== 'insufficient' ? `
              <div class="metric">
                <div class="metric-label">Median Price</div>
                <div class="metric-value">$${median_price?.toFixed(2)}</div>
              </div>
              <div class="metric">
                <div class="metric-label">Max Safe Bid</div>
                <div class="metric-value">$${max_bid?.toFixed(2)}</div>
              </div>
            ` : ''}
            <div class="metric">
              <div class="metric-label">Confidence</div>
              <div class="metric-value">
                <span class="status ${confidence_label}">${confidence_label.toUpperCase()}</span>
                <br>${(confidence_score * 100).toFixed(0)}/100
              </div>
            </div>
          </div>

          ${explanation.warnings.length > 0 ? `
            <h3>⚠️ Warnings</h3>
            <ul style="margin: 0; padding-left: 20px;">
              ${explanation.warnings.map((w: string) => `<li>${w}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      `;
    }).join('')}
  </div>

  <div class="footer">
    <p>Arbitrain Pipeline v1 | Real URL Test | ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>`;
}

main().catch(console.error);


