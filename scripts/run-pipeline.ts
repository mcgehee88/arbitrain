/**
 * Real test runner for the unified Arbitrain pipeline
 * Tests 5 real URLs with the complete 5-layer pipeline
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Listing } from '../packages/shared/src/types';
import { ArbitrainPipeline } from '../packages/shared/src/pipeline';

// Load environment variables
dotenv.config({ path: '/home/workspace/Arbitrain.com/secrets/.env.ebay' });
dotenv.config({ path: '/home/workspace/Arbitrain.com/secrets/.env.openai' });

const EBAY_APP_ID = process.env.EBAY_PROD_APP_ID || 'missing';

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

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 ARBITRAIN PIPELINE - UNIFIED V1');
  console.log('='.repeat(80));
  console.log(`eBay API: ${EBAY_APP_ID.substring(0, 20)}...`);
  console.log(`Test listings: ${TEST_LISTINGS.length}`);
  console.log('');

  if (!EBAY_APP_ID || EBAY_APP_ID === 'missing') {
    console.error('❌ ERROR: EBAY_PROD_APP_ID not set');
    process.exit(1);
  }

  try {
    const pipeline = new ArbitrainPipeline({
      ebayAppId: EBAY_APP_ID,
      queryLadderLimit: 5,
      similarityThreshold: 0.3,
    });

    console.log('Starting pipeline...\n');
    const htmlReport = await pipeline.processListingsAndGenerateReport(TEST_LISTINGS);

    // Save HTML report
    const outputPath = '/home/workspace/Arbitrain.com/arbitrain/test-results-real-urls.html';
    fs.writeFileSync(outputPath, htmlReport, { encoding: 'utf-8' });
    console.log(`\n✅ Report saved to: ${outputPath}`);
    console.log(`📊 Open in browser to view results\n`);

    console.log('='.repeat(80));
  } catch (error: any) {
    console.error('❌ Pipeline failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

