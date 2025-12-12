/**
 * Real URL pipeline test with SerpApi
 * REAL sold listings from eBay
 */

import { ArbitrainPipeline, Listing } from '@arbitrain/shared';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load SerpApi credentials
const envPath = path.join(__dirname, '../../secrets/.env.serpapi');
dotenv.config({ path: envPath });

const SERPAPI_KEY = process.env.SERPAPI_API_KEY;

if (!SERPAPI_KEY) {
  console.error('❌ SERPAPI_API_KEY not found in .env.serpapi');
  process.exit(1);
}

// Real listings from your URLs
const listings: Listing[] = [
  {
    title: '2 rings and a necklace',
    description: 'Gold rings and necklace set, estate sale item',
    url: 'https://www.facebook.com/marketplace/item/3754252184708029/',
    current_price: 35,
    marketplace: 'facebook',
  },
  {
    title: 'White Clad Vintage Oak Ice Box',
    description: 'Antique oak ice box with original hardware and white clad interior',
    url: 'https://ctbids.com/estate-sale/40139/item/4678063/White-Clad-Vintage-Oak-Ice-Box',
    current_price: 125,
    marketplace: 'ctbids',
  },
  {
    title: '14k Gold Heart Earrings And 14k AK Turkey Byzantine Band Ring',
    description: 'Gold jewelry set, 14k gold earrings and ring',
    url: 'https://ctbids.com/estate-sale/40607/item/4676938/14k-Gold-Heart-Earrings-And-14k-AK-Turkey-Byzantine-Band-Ring',
    current_price: 150,
    marketplace: 'ctbids',
  },
  {
    title: 'Vintage Nintendo Game Boy Original',
    description: 'Classic Nintendo Game Boy in good working condition',
    url: 'https://www.mercari.com/us/item/m98929635815/?ref=category_detail',
    current_price: 45,
    marketplace: 'mercari',
  },
  {
    title: 'Used Apple AirPods Pro',
    description: 'Second generation AirPods Pro, minor cosmetic wear',
    url: 'https://www.ebay.com/itm/185810487116',
    current_price: 120,
    marketplace: 'ebay',
  },
];

async function main() {
  console.log('\n' + '='.repeat(100));
  console.log('🚀 ARBITRAIN PIPELINE - REAL DATA TEST (SerpApi)');
  console.log('='.repeat(100));

  console.log('\n📊 Processing 5 real marketplace listings...\n');

  const pipeline = new ArbitrainPipeline({
    serpApiKey: SERPAPI_KEY,
    queryLadderLimit: 5,
  });

  const results = await pipeline.processBatch(listings);

  // Generate HTML report
  const htmlReport = pipeline.generateReport(results);
  const outputPath = path.join(__dirname, '../test-results-serpapi.html');
  fs.writeFileSync(outputPath, htmlReport, 'utf-8');

  console.log('\n' + '='.repeat(100));
  console.log('✅ PIPELINE EXECUTION COMPLETE');
  console.log('='.repeat(100));
  console.log(`\n📄 Report saved to: ${outputPath}`);
  console.log(`   HTML output: ${path.basename(outputPath)}`);
  console.log(`\n📈 Summary:`);
  console.log(`   Listings processed: ${results.length}`);
  console.log(`   Total comps found: ${results.reduce((sum, r) => sum + r.comps_found_raw, 0)}`);
  console.log(`   Total comps filtered: ${results.reduce((sum, r) => sum + r.comps_after_filtering, 0)}`);

  results.forEach((result, i) => {
    console.log(`\n[${i + 1}] ${result.item_profile.raw_title}`);
    console.log(`    Raw comps: ${result.comps_found_raw}`);
    console.log(`    Filtered: ${result.comps_after_filtering}`);
    if (result.median_price) {
      console.log(`    Median: $${result.median_price.toFixed(2)}`);
      console.log(`    Max safe bid: $${result.max_safe_bid?.toFixed(2) || 'N/A'}`);
      console.log(`    Confidence: ${Math.round((result.confidence_score || 0) * 100)}%`);
    } else {
      console.log(`    Status: INSUFFICIENT DATA`);
    }
  });

  console.log('\n' + '='.repeat(100) + '\n');
}

main().catch(error => {
  console.error('❌ Pipeline error:', error.message);
  console.error(error.stack);
  process.exit(1);
});

