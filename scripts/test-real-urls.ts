import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { URLScraper } from '../packages/adapters/src/url.scraper';
import { ItemExtractor } from '../packages/adapters/src/item.extractor';
import { EBayClient } from '../packages/adapters/src/ebay.client';
import { CalculationEngine } from '../packages/shared/src/calculator';

dotenv.config({ path: path.resolve(__dirname, '../../../secrets/.env.ebay') });

const REAL_URLS = [
  'https://www.ebay.com/itm/185810487116',
  'https://ctbids.com/estate-sale/40139/item/4678063/White-Clad-Vintage-Oak-Ice-Box',
  'https://www.ebay.com/itm/404819005678',
  'https://ctbids.com/estate-sale/40607/item/4676938/14k-Gold-Heart-Earrings-And-14k-AK-Turkey-Byzantine-Band-Ring',
  'https://www.ebay.com/itm/255789012345'
];

interface TestResult {
  url: string;
  scraped: any;
  itemProfile: any;
  queryLadder: string[];
  comps: any[];
  calculation: any;
  warnings: string[];
}

async function runTests() {
  console.log('\n🚀 ARBITRAIN PHASE 2 - REAL URL TEST SUITE');
  console.log('==========================================\n');

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
    console.log(`\n📍 Test ${i + 1}/5: ${url.substring(0, 60)}...`);

    try {
      // Step 1: Scrape URL
      console.log('   → Scraping URL...');
      const scraped = await scraper.scrape(url);

      if (!scraped.success) {
        console.log(`   ⚠️  Scrape failed: ${scraped.error}`);
        results.push({
          url,
          scraped,
          itemProfile: null,
          queryLadder: [],
          comps: [],
          calculation: null,
          warnings: [scraped.error || 'Failed to scrape']
        });
        continue;
      }

      console.log(`   ✓ Title: "${scraped.title.substring(0, 50)}..."`);

      // Step 2: Extract item profile
      console.log('   → Building item profile...');
      const itemProfile = extractor.extract(scraped.title, scraped.description);
      console.log(`   ✓ Type: ${itemProfile.item_type}, Condition: ${itemProfile.condition}`);

      // Step 3: Generate query ladder
      console.log('   → Generating query ladder...');
      const queryLadder = extractor.generateQueryLadder(itemProfile);
      console.log(`   ✓ Queries: ${queryLadder.length} ladder steps`);

      // Step 4: Search eBay comps
      console.log('   → Searching eBay sold comps...');
      let comps: any[] = [];
      let compSearchError = '';
      
      for (const query of queryLadder.slice(0, 2)) {
        try {
          const result = await ebayClient.searchSoldListings(query);
          if (result && result.length > 0) {
            comps = result;
            console.log(`   ✓ Found ${comps.length} comps`);
            break;
          }
        } catch (e) {
          compSearchError = e instanceof Error ? e.message : 'Unknown error';
        }
      }

      if (comps.length === 0 && compSearchError) {
        console.log(`   ⚠️  Comp search error: ${compSearchError}`);
      }

      // Step 5: Calculate
      console.log('   → Running calculation engine...');
      const calculation = calculator.analyze(
        {
          title: scraped.title,
          current_price: 0,
          item_type: itemProfile.item_type,
          condition: itemProfile.condition
        },
        comps
      );

      console.log(`   ✓ Confidence: ${calculation.confidence_score}%, Warnings: ${calculation.explanation.warnings.length}`);

      results.push({
        url,
        scraped,
        itemProfile,
        queryLadder,
        comps,
        calculation,
        warnings: calculation.explanation.warnings
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.log(`   ❌ Error: ${errorMsg}`);
      results.push({
        url,
        scraped: null,
        itemProfile: null,
        queryLadder: [],
        comps: [],
        calculation: null,
        warnings: [errorMsg]
      });
    }
  }

  // Generate HTML report
  const html = generateHTMLReport(results);
  const outputPath = path.resolve(__dirname, '../test-results-real-urls.html');
  fs.writeFileSync(outputPath, html);

  console.log('\n✅ Test suite complete');
  console.log('📄 Report: ' + outputPath);
  console.log('🌐 View at: https://arbitrain-results-freetrials.zocomputer.io/test-results-real-urls.html\n');
}

function generateHTMLReport(results: TestResult[]) {
  let testCasesHTML = '';
  
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const source = r.scraped?.source?.toUpperCase() || 'FAILED';
    
    let scrapedHTML = '';
    if (r.scraped?.success) {
      scrapedHTML = '<p><strong>Title:</strong> ' + r.scraped.title + '</p>' +
                   '<p><strong>Description:</strong> ' + r.scraped.description.substring(0, 200) + '...</p>';
    } else {
      scrapedHTML = '<p style="color: red;"><strong>Error:</strong> ' + r.scraped?.error + '</p>';
    }

    let profileHTML = '';
    if (r.itemProfile) {
      profileHTML = '<table>' +
        '<tr><td>Item Type</td><td><strong>' + r.itemProfile.item_type + '</strong></td></tr>' +
        '<tr><td>Condition</td><td><strong>' + r.itemProfile.condition + '</strong></td></tr>' +
        '<tr><td>Category</td><td>' + (r.itemProfile.category || 'N/A') + '</td></tr>' +
        '<tr><td>Brand</td><td>' + (r.itemProfile.brand || 'N/A') + '</td></tr>' +
        '<tr><td>Model</td><td>' + (r.itemProfile.model || 'N/A') + '</td></tr>' +
        '</table>';
    }

    let queryHTML = '';
    if (r.queryLadder.length > 0) {
      queryHTML = '<ol>';
      for (const q of r.queryLadder) {
        queryHTML += '<li>"' + q + '"</li>';
      }
      queryHTML += '</ol>';
    }

    let compsHTML = '';
    if (r.comps.length > 0) {
      compsHTML = '<p><strong>' + r.comps.length + ' comps found</strong></p>' +
                 '<table>' +
                 '<thead><tr><th>Title</th><th>Price</th><th>Condition</th><th>Sold Date</th></tr></thead>' +
                 '<tbody>';
      for (let j = 0; j < Math.min(10, r.comps.length); j++) {
        const c = r.comps[j];
        compsHTML += '<tr><td>' + c.title + '</td><td>$' + c.price.toFixed(2) + 
                    '</td><td>' + c.condition + '</td><td>' + c.sold_date + '</td></tr>';
      }
      compsHTML += '</tbody></table>';
    } else {
      compsHTML = '<p style="color: orange;"><strong>⚠️ No comps found</strong></p>';
    }

    let resultHTML = '';
    if (r.calculation) {
      const confidenceClass = r.calculation.confidence_score >= 70 ? 'high' : 
                             r.calculation.confidence_score >= 50 ? 'medium' : 'low';
      resultHTML = '<div class="result-metrics">' +
        '<div class="metric"><label>Expected Resale</label><div class="value">$' + 
        r.calculation.expected_resale_price.toFixed(2) + '</div></div>' +
        '<div class="metric"><label>Max Safe Bid</label><div class="value">$' + 
        (r.calculation.max_safe_bid?.toFixed(2) || 'N/A') + '</div></div>' +
        '<div class="metric"><label>Confidence</label><div class="value ' + confidenceClass + '">' + 
        r.calculation.confidence_score + '%</div></div>' +
        '</div>' +
        '<p><strong>Summary:</strong> ' + r.calculation.explanation.summary + '</p>';

      if (r.warnings.length > 0) {
        resultHTML += '<div style="background: #fff3cd; padding: 10px; border-left: 3px solid #ffc107;"><strong>⚠️ Warnings:</strong><ul>';
        for (const w of r.warnings) {
          resultHTML += '<li>' + w + '</li>';
        }
        resultHTML += '</ul></div>';
      }
    } else {
      resultHTML = '<div style="background: #f8d7da; padding: 10px; color: #721c24;"><strong>❌ Analysis Failed:</strong> ' + 
                   r.warnings.join(', ') + '</div>';
    }

    testCasesHTML += '<div class="test-case">' +
      '<h3>Test ' + (i + 1) + ': ' + source + '</h3>' +
      '<p><strong>URL:</strong> <a href="' + r.url + '" target="_blank">' + r.url.substring(0, 80) + '...</a></p>' +
      '<div class="section"><h4>📋 Scraped Listing</h4>' + scrapedHTML + '</div>';

    if (profileHTML) {
      testCasesHTML += '<div class="section"><h4>🔍 Item Profile Extracted</h4>' + profileHTML + '</div>';
    }

    if (queryHTML) {
      testCasesHTML += '<div class="section"><h4>🔗 Query Ladder</h4>' + queryHTML + '</div>';
    }

    testCasesHTML += '<div class="section"><h4>📊 eBay Sold Comps (Last 30 Days)</h4>' + compsHTML + '</div>' +
      '<div class="section result-section"><h4>🎯 Analysis Result</h4>' + resultHTML + '</div>' +
      '</div>';
  }

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Arbitrain Phase 2 - Real URL Test Results</title>' +
    '<style>' +
    '* { margin: 0; padding: 0; box-sizing: border-box; }' +
    'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f5; padding: 40px 20px; }' +
    '.container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; }' +
    'header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }' +
    'header h1 { font-size: 2em; margin-bottom: 10px; }' +
    'header p { opacity: 0.9; }' +
    '.content { padding: 40px; }' +
    '.test-case { border: 1px solid #e0e0e0; border-radius: 6px; padding: 20px; margin-bottom: 30px; }' +
    '.test-case h3 { color: #333; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #667eea; }' +
    '.section { margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 4px; }' +
    '.section h4 { color: #667eea; margin-bottom: 10px; }' +
    'table { width: 100%; border-collapse: collapse; margin-top: 10px; }' +
    'table td, table th { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }' +
    'table th { background: #f0f0f0; font-weight: 600; }' +
    '.result-section { background: #f0f7ff; border-left: 4px solid #667eea; }' +
    '.result-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }' +
    '.metric { background: white; padding: 15px; border-radius: 4px; text-align: center; border: 1px solid #ddd; }' +
    '.metric label { font-size: 0.85em; color: #666; display: block; margin-bottom: 5px; }' +
    '.metric .value { font-size: 1.5em; font-weight: bold; color: #333; }' +
    '.metric .value.high { color: #28a745; }' +
    '.metric .value.medium { color: #ffc107; }' +
    '.metric .value.low { color: #dc3545; }' +
    'a { color: #667eea; text-decoration: none; }' +
    'a:hover { text-decoration: underline; }' +
    '</style></head><body>' +
    '<div class="container"><header><h1>🚀 Arbitrain Phase 2 Test Suite</h1>' +
    '<p>Real URL → Scrape → Profile → eBay Comps → Analysis</p></header>' +
    '<div class="content">' + testCasesHTML + '</div></div></body></html>';
}

runTests().catch(console.error);




