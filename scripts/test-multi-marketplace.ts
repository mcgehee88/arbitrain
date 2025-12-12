/**
 * Real multi-marketplace test
 * Extracts item data from 5 different marketplaces
 * Then finds eBay comps via SerpApi
 * Generates production HTML report
 */

import { ArbitrainPipeline, Listing } from '@arbitrain/shared';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '/home/workspace/Arbitrain.com/secrets/.env.serpapi' });

const listings: Listing[] = [
  {
    // Facebook Marketplace: 2 rings and a necklace
    url: 'https://www.facebook.com/marketplace/item/3754252184708029/',
    title: '2 rings and a necklace',
    description: 'Jewelry lot - 2 rings and a necklace',
    source_price: 15,
    marketplace: 'facebook',
  },
  {
    // CTBids estate sale: Vintage oak ice box
    url: 'https://ctbids.com/estate-sale/40139/item/4678063/White-Clad-Vintage-Oak-Ice-Box',
    title: 'White Clad Vintage Oak Ice Box',
    description: 'Vintage oak ice box with white clad exterior, collectible furniture piece',
    source_price: 45,
    marketplace: 'ctbids',
  },
  {
    // CTBids estate sale: 14k gold jewelry
    url: 'https://ctbids.com/estate-sale/40607/item/4676938/14k-Gold-Heart-Earrings-And-14k-AK-Turkey-Byzantine-Band-Ring',
    title: '14k Gold Heart Earrings and 14k Byzantine Band Ring',
    description: '14k gold jewelry set - heart earrings and band ring',
    source_price: 120,
    marketplace: 'ctbids',
  },
  {
    // Mercari: Vintage Game Boy
    url: 'https://www.mercari.com/us/item/m98929635815/',
    title: 'Vintage Game Boy',
    description: 'Classic Nintendo Game Boy handheld console',
    source_price: 35,
    marketplace: 'mercari',
  },
  {
    // eBay: Apple AirPods Pro
    url: 'https://www.ebay.com/itm/185810487116',
    title: 'Apple AirPods Pro',
    description: 'Apple AirPods Pro wireless earbuds with charging case',
    source_price: 189,
    marketplace: 'ebay',
  },
];

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('ARBITRAIN - MULTI-MARKETPLACE VALUATION TEST');
  console.log('='.repeat(80));
  console.log(`\nTesting ${listings.length} items from different marketplaces`);
  console.log(`Using SerpApi to find eBay comparables for each item\n`);

  const pipeline = new ArbitrainPipeline({
    serpApiKey: process.env.SERPAPI_API_KEY || '',
    queryLadderLimit: 5,
  });

  const results = [];

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    console.log(
      `[${'█'.repeat(Math.floor((i + 1) / listings.length * 40))}${' '.repeat(
        40 - Math.floor((i + 1) / listings.length * 40)
      )}] ${i + 1}/${listings.length}`
    );
    console.log(`\n[${i + 1}/${listings.length}] Processing: ${listing.title}`);
    console.log(`─`.repeat(100));
    console.log(`Marketplace: ${listing.marketplace.toUpperCase()}`);
    console.log(`Source Price: $${listing.source_price}`);
    console.log(`URL: ${listing.url}`);

    try {
      const result = await pipeline.processListing(listing);
      results.push(result);

      // Display results
      console.log('\n✓ ITEM PROFILE:');
      console.log(`  Title: ${result.item_profile.raw_title}`);
      console.log(`  Category: ${result.item_profile.category}`);
      console.log(`  Brand: ${result.item_profile.brand || 'N/A'}`);
      console.log(`  Condition: ${result.item_profile.condition}`);

      console.log('\n✓ QUERY LADDER:');
      result.query_ladder.forEach((q, idx) => {
        console.log(`  [L${idx + 1}] "${q}"`);
      });

      console.log('\n✓ COMPS:');
      console.log(
        `  Raw: ${result.comps_found_raw} | Filtered: ${result.comps_after_filtering} | Selected: ${result.comps.length}`
      );

      if (result.comps.length >= 3) {
        console.log('\n✓ VALUATION:');
        console.log(
          `  Median: $${result.median_price?.toFixed(2) || 'N/A'} | Mean: $${result.mean_price?.toFixed(2) || 'N/A'}`
        );
        console.log(`  Max Safe Bid: $${result.max_safe_bid?.toFixed(2) || 'N/A'}`);
        console.log(`  Confidence: ${result.confidence_label} (${result.confidence_score}%)`);
        console.log(`  ROI Potential: ${result.estimated_roi_percent?.toFixed(1) || 'N/A'}%`);
      } else {
        console.log(
          '\n⚠ VALUATION: INSUFFICIENT DATA (need ≥3 comps, found ' +
            result.comps.length +
            ')'
        );
      }

      console.log(`\n✓ Summary: ${result.explanation.summary}`);
    } catch (error: any) {
      console.log(`\n✗ ERROR: ${error.message}`);
      results.push({
        item_profile: {
          raw_title: listing.title,
          category: 'unknown',
          condition: 'unknown',
          brand: null,
          attributes: {},
          extraction_confidence: 0,
        },
        listing_url: listing.url,
        query_ladder: [],
        comps_found_raw: 0,
        comps_after_filtering: 0,
        comps: [],
        median_price: null,
        mean_price: null,
        price_range: null,
        price_volatility: 0,
        iqr: null,
        max_safe_bid: null,
        estimated_resale_price: null,
        estimated_profit: null,
        estimated_roi_percent: null,
        confidence_score: 0,
        confidence_label: 'insufficient',
        opportunity_score: 0,
        risk_score: 100,
        explanation: {
          summary: `Error processing item: ${error.message}`,
          resale_reasoning: 'Unable to process',
          max_bid_reasoning: 'Unable to process',
          risk_factors: [error.message],
          opportunities: [],
          warnings: [error.message],
        },
      });
    }

    console.log();
  }

  // Generate HTML report
  console.log('='.repeat(80));
  console.log('GENERATING HTML REPORT...');
  console.log('='.repeat(80));

  const htmlReport = pipeline.generateReport(results);

  // Save to production location
  const reportPath = '/home/workspace/Arbitrain.com/arbitrain/test-results-real-urls.html';
  fs.writeFileSync(reportPath, htmlReport);
  console.log(`\n✓ Report saved: ${reportPath}`);

  // Display summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total items processed: ${results.length}`);
  console.log(
    `Successful valuations: ${results.filter((r) => r.confidence_label !== 'insufficient').length}`
  );
  console.log(`Items needing more data: ${results.filter((r) => r.confidence_label === 'insufficient').length}`);
  console.log(`\nProduction URL:`);
  console.log(`  https://arbitrain-results-freetrials.zocomputer.io/test-results-real-urls.html`);
  console.log('\n' + '='.repeat(80) + '\n');
}

main().catch(console.error);



