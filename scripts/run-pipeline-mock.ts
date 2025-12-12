/**
 * Test runner with MOCK eBay data
 * Demonstrates the complete 5-layer pipeline working with realistic data
 */

import * as fs from 'fs';
import { Listing, Comp } from '../packages/shared/src/types';
import { ItemExtractor } from '../packages/shared/src/item-extractor';
import { QueryBuilder } from '../packages/shared/src/query-builder';
import { CompFilter } from '../packages/shared/src/comp-filter';
import { Valuator } from '../packages/shared/src/valuation';
import { HTMLGenerator } from '../packages/shared/src/html-generator';

const TEST_LISTINGS: Listing[] = [
  {
    title: 'Vintage Estate 14K Yellow Gold and Diamond Masonic Shriner Ring *see appraisal*',
    url: 'https://www.ebay.com/itm/185810487116',
    current_price: 99.99,
    marketplace: 'ebay',
  },
  {
    title: '14K White Gold Diamond Ring 1/2cttw Size 7 2.9dwt (4.5g)',
    url: 'https://www.ebay.com/itm/227127658737',
    current_price: 149.99,
    marketplace: 'ebay',
  },
  {
    title: 'Apple MacBook Pro 15" 2019 Intel Core i9 16GB RAM 512GB SSD',
    url: 'https://www.ebay.com/itm/123456789012',
    current_price: 599.99,
    marketplace: 'ebay',
  },
  {
    title: 'Vintage Mid-Century Modern Walnut Dining Table 6 Seater',
    url: 'https://www.ebay.com/itm/987654321098',
    current_price: 299.99,
    marketplace: 'ebay',
  },
  {
    title: 'Mixed Lot: Stainless Steel 14k Gold Heart Earrings & Byzantine Chain',
    url: 'https://www.ebay.com/itm/555666777888',
    current_price: 49.99,
    marketplace: 'ebay',
  },
];

// Mock comps for jewelry
function getMockJewelryComps(): Comp[] {
  return [
    { id: 'j1', title: '14K Gold Diamond Ring Size 6', sold_price: 425.00, sold_date: '2025-12-08', condition: 'good', shipping_cost: 5.00, listing_type: 'auction', is_outlier: false, quality_score: 0.85, source: 'ebay' },
    { id: 'j2', title: '14K Yellow Gold Diamond Ring', sold_price: 475.00, sold_date: '2025-12-07', condition: 'good', shipping_cost: 8.00, listing_type: 'auction', is_outlier: false, quality_score: 0.88, source: 'ebay' },
    { id: 'j3', title: '14K Gold Vintage Diamond Ring', sold_price: 498.00, sold_date: '2025-12-06', condition: 'like_new', shipping_cost: 10.00, listing_type: 'auction', is_outlier: false, quality_score: 0.92, source: 'ebay' },
    { id: 'j4', title: '14K Diamond Ring Vintage', sold_price: 525.00, sold_date: '2025-12-05', condition: 'good', shipping_cost: 12.00, listing_type: 'auction', is_outlier: false, quality_score: 0.80, source: 'ebay' },
    { id: 'j5', title: 'White Gold Diamond Ring 1.2g', sold_price: 445.00, sold_date: '2025-12-04', condition: 'like_new', shipping_cost: 7.00, listing_type: 'auction', is_outlier: false, quality_score: 0.78, source: 'ebay' },
    { id: 'j6', title: 'Gold Solitaire Diamond Ring Size 7', sold_price: 510.00, sold_date: '2025-12-03', condition: 'good', shipping_cost: 6.00, listing_type: 'auction', is_outlier: false, quality_score: 0.82, source: 'ebay' },
    { id: 'j7', title: '14K Gold 0.5ct Diamond Ring', sold_price: 465.00, sold_date: '2025-12-02', condition: 'fair', shipping_cost: 8.00, listing_type: 'auction', is_outlier: false, quality_score: 0.75, source: 'ebay' },
    { id: 'j8', title: 'Diamond Gold Ring 14k', sold_price: 485.00, sold_date: '2025-12-01', condition: 'good', shipping_cost: 9.00, listing_type: 'auction', is_outlier: false, quality_score: 0.83, source: 'ebay' },
  ];
}

// Mock comps for electronics
function getMockElectronicsComps(): Comp[] {
  return [
    { id: 'e1', title: 'Apple MacBook Pro 15 inch 2019 i9 16GB', sold_price: 1150.00, sold_date: '2025-12-08', condition: 'good', shipping_cost: 20.00, listing_type: 'fixed_price', is_outlier: false, quality_score: 0.88, source: 'ebay' },
    { id: 'e2', title: 'MacBook Pro 15" 2019 Core i9 512GB SSD', sold_price: 1200.00, sold_date: '2025-12-07', condition: 'like_new', shipping_cost: 15.00, listing_type: 'auction', is_outlier: false, quality_score: 0.90, source: 'ebay' },
    { id: 'e3', title: 'Apple MacBook Pro 15-inch 2019 Intel i9 16GB RAM', sold_price: 1100.00, sold_date: '2025-12-06', condition: 'good', shipping_cost: 20.00, listing_type: 'auction', is_outlier: false, quality_score: 0.85, source: 'ebay' },
    { id: 'e4', title: 'MacBook Pro 15 2019 i9 512GB SSD RAM 16GB', sold_price: 1175.00, sold_date: '2025-12-05', condition: 'good', shipping_cost: 18.00, listing_type: 'auction', is_outlier: false, quality_score: 0.87, source: 'ebay' },
    { id: 'e5', title: '2019 Apple MacBook Pro 15 inch Intel Core i9', sold_price: 1050.00, sold_date: '2025-12-04', condition: 'fair', shipping_cost: 20.00, listing_type: 'auction', is_outlier: false, quality_score: 0.75, source: 'ebay' },
    { id: 'e6', title: 'MacBook Pro 15" Space Gray 2019 i9 512GB', sold_price: 1225.00, sold_date: '2025-12-03', condition: 'like_new', shipping_cost: 16.00, listing_type: 'fixed_price', is_outlier: false, quality_score: 0.91, source: 'ebay' },
  ];
}

// Mock comps for furniture
function getMockFurnitureComps(): Comp[] {
  return [
    { id: 'f1', title: 'Mid Century Walnut Dining Table 6 Seater', sold_price: 550.00, sold_date: '2025-12-08', condition: 'good', shipping_cost: 100.00, listing_type: 'auction', is_outlier: false, quality_score: 0.87, source: 'ebay' },
    { id: 'f2', title: 'Walnut Dining Table Seats 6', sold_price: 495.00, sold_date: '2025-12-07', condition: 'good', shipping_cost: 100.00, listing_type: 'auction', is_outlier: false, quality_score: 0.80, source: 'ebay' },
    { id: 'f3', title: 'Vintage Walnut Mid-Century Dining Table', sold_price: 575.00, sold_date: '2025-12-06', condition: 'like_new', shipping_cost: 120.00, listing_type: 'auction', is_outlier: false, quality_score: 0.88, source: 'ebay' },
    { id: 'f4', title: 'Mid-Century Modern Walnut Dining Table 6 Person', sold_price: 525.00, sold_date: '2025-12-05', condition: 'good', shipping_cost: 100.00, listing_type: 'auction', is_outlier: false, quality_score: 0.85, source: 'ebay' },
    { id: 'f5', title: 'Walnut Table for Dining MCM', sold_price: 480.00, sold_date: '2025-12-04', condition: 'fair', shipping_cost: 100.00, listing_type: 'auction', is_outlier: false, quality_score: 0.72, source: 'ebay' },
    { id: 'f6', title: 'Vintage Walnut 6 Seater Dining Table', sold_price: 510.00, sold_date: '2025-12-03', condition: 'good', shipping_cost: 100.00, listing_type: 'fixed_price', is_outlier: false, quality_score: 0.83, source: 'ebay' },
  ];
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 ARBITRAIN PIPELINE - UNIFIED V1 (MOCK DATA)');
  console.log('='.repeat(80));
  console.log(`Test listings: ${TEST_LISTINGS.length}`);
  console.log('');

  const extractor = new ItemExtractor();
  const queryBuilder = new QueryBuilder();
  const compFilter = new CompFilter({ similarityThreshold: 0.3 });
  const valuator = new Valuator();

  const results = [];

  for (const listing of TEST_LISTINGS) {
    try {
      console.log(`\n📍 Processing: ${listing.title.substring(0, 70)}...`);

      // LAYER 1: Item Understanding
      console.log('  [1/5] Extracting item profile...');
      const itemProfile = extractor.extractFromTitle(listing.title, listing.url);
      console.log(`       Category: ${itemProfile.category} / ${itemProfile.subcategory}`);
      console.log(`       Extraction confidence: ${(itemProfile.extraction_confidence * 100).toFixed(0)}%`);

      // LAYER 2: Query Ladder
      console.log('  [2/5] Building query ladder...');
      const queryLadder = queryBuilder.buildQueryLadder(itemProfile, 5);
      console.log(`       Queries: ${queryLadder.length}`);

      // Get mock comps based on category
      console.log('  [3/5] Fetching comps (mock data)...');
      let comps: Comp[] = [];
      if (itemProfile.category === 'jewelry') {
        comps = getMockJewelryComps();
      } else if (itemProfile.category === 'electronics') {
        comps = getMockElectronicsComps();
      } else if (itemProfile.category === 'furniture') {
        comps = getMockFurnitureComps();
      }
      console.log(`       Found: ${comps.length} raw comps`);

      // LAYER 3: Comp Filtering
      console.log('  [4/5] Filtering comps...');
      const filteredComps = compFilter.filterComps(itemProfile, comps);
      console.log(`       After filtering: ${filteredComps.length} comps`);

      // LAYER 4: Valuation
      console.log('  [5/5] Computing valuation...');
      const valuation = valuator.calculateValuation(
        itemProfile,
        filteredComps,
        listing.url || 'unknown',
        queryLadder,
        comps.length
      );

      if (valuation.confidence_label === 'insufficient') {
        console.log(`       Result: INSUFFICIENT DATA`);
      } else {
        console.log(`       Median: $${valuation.median_price?.toFixed(2)}`);
        console.log(`       Max safe bid: $${valuation.max_safe_bid?.toFixed(2)}`);
        console.log(`       Confidence: ${valuation.confidence_score}/100`);
      }

      results.push(valuation);
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  // LAYER 5: HTML Output
  console.log('\n  [OL] Generating HTML report...');
  const htmlReport = HTMLGenerator.generateReport(results);

  // Save
  const outputPath = '/home/workspace/Arbitrain.com/arbitrain/test-results-real-urls.html';
  fs.writeFileSync(outputPath, htmlReport, { encoding: 'utf-8' });

  console.log(`\n✅ Report saved: ${outputPath}`);
  console.log(`📊 View at: https://arbitrain-results-freetrials.zocomputer.io/test-results-real-urls.html`);
  console.log('\n' + '='.repeat(80) + '\n');
}

main().catch(console.error);

