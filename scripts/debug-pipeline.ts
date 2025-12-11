import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { URLScraper } from '../packages/adapters/src/url.scraper';
import { ItemExtractor } from '../packages/adapters/src/item.extractor';
import { EBayClient } from '../packages/adapters/src/ebay.client';
import { CalculationEngine } from '../packages/shared/src/calculator';
import { SemanticMatcher } from '../packages/adapters/src/semantic.matcher';

dotenv.config({ path: '/home/workspace/Arbitrain.com/secrets/.env.ebay' });

async function debugPipeline() {
  console.log('='.repeat(80));
  console.log('ARBITRAIN PIPELINE DEBUG - TEST 5 (eBay Jewelry)');
  console.log('='.repeat(80));

  const testUrl = 'https://www.ebay.com/itm/185810487116?_trkparms=amclksrc%3DITM%26aid%3D777008%26algo%3DPERSONAL.TOPIC%26ao%3D1%26asc%3D20250528152807%26meid%3Da71e20a28e0b405d903594efab6d1bb8%26pid%3D102796%26rk%3D8%26rkt%3D19%26mehot%3Dpp%26itm%3D185810487116%26pmt%3D0%26noa%3D1%26pg%3D4375194%26algv%3DRecentlyViewedItemsV2DWebWithPSItemDRV2_BP%26brand%3DUnbranded%26tu%3D01KC7BK7FQT7FX3HJJP3RK14DB';

  // STEP 1: SCRAPE
  console.log('\n' + '='.repeat(80));
  console.log('STEP 1: URL SCRAPING');
  console.log('='.repeat(80));
  const scraper = new URLScraper();
  const scraped = await scraper.scrape(testUrl);
  console.log('Scraped:', JSON.stringify(scraped, null, 2));

  // STEP 2: EXTRACT PROFILE
  console.log('\n' + '='.repeat(80));
  console.log('STEP 2: ITEM PROFILE EXTRACTION');
  console.log('='.repeat(80));
  const extractor = new ItemExtractor();
  const profile = extractor.extract(scraped.title);
  console.log('Profile:', JSON.stringify(profile, null, 2));

  // STEP 3: GENERATE QUERY LADDER
  console.log('\n' + '='.repeat(80));
  console.log('STEP 3: QUERY LADDER GENERATION');
  console.log('='.repeat(80));
  const queryLadder = extractor.generateQueryLadder(profile);
  console.log('Query Ladder:', JSON.stringify(queryLadder, null, 2));

  // STEP 4: FETCH EBAY COMPS
  console.log('\n' + '='.repeat(80));
  console.log('STEP 4: FETCH eBay COMPS');
  console.log('='.repeat(80));
  const ebayClient = new EBayClient(
    process.env.EBAY_PROD_APP_ID || '',
    process.env.EBAY_PROD_CERT_ID || ''
  );

  let allComps: any[] = [];
  for (const query of queryLadder) {
    console.log(`\nSearching for: "${query}"`);
    try {
      const comps = await ebayClient.searchSoldListings(query);
      console.log(`Found ${comps.length} comps`);
      console.log('First 3 comps:', JSON.stringify(comps.slice(0, 3), null, 2));
      allComps = [...allComps, ...comps];
    } catch (error: any) {
      console.log(`Error searching "${query}":`, error.message);
    }
  }
  
  console.log(`\nTotal comps collected: ${allComps.length}`);
  console.log('All comps:', JSON.stringify(allComps, null, 2));

  // STEP 5: SEMANTIC FILTERING
  console.log('\n' + '='.repeat(80));
  console.log('STEP 5: SEMANTIC SIMILARITY FILTERING');
  console.log('='.repeat(80));
  const matcher = new SemanticMatcher();
  const filteredComps = [];
  
  for (const comp of allComps) {
    const similarity = matcher.calculateSimilarity(scraped.title, comp.title);
    console.log(`Comp: "${comp.title}"`);
    console.log(`  Similarity Score: ${similarity.toFixed(3)}`);
    
    if (similarity >= 0.5) {
      console.log(`  ✓ KEPT (>= 0.5 threshold)`);
      filteredComps.push(comp);
    } else {
      console.log(`  ✗ FILTERED OUT (< 0.5 threshold)`);
    }
  }

  console.log(`\nComps after semantic filtering: ${filteredComps.length}`);
  console.log('Filtered comps:', JSON.stringify(filteredComps, null, 2));

  // STEP 6: CALCULATE ANALYSIS
  console.log('\n' + '='.repeat(80));
  console.log('STEP 6: CALCULATION ENGINE');
  console.log('='.repeat(80));
  const calculator = new CalculationEngine();
  const listing = { url: testUrl };
  
  try {
    const analysis = calculator.analyze(profile, queryLadder, filteredComps, listing as any);
    console.log('Analysis Result:', JSON.stringify(analysis, null, 2));
  } catch (error: any) {
    console.log('Analysis Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

debugPipeline().catch(console.error);

