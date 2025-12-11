import * as dotenv from 'dotenv';
import { URLScraper } from './packages/adapters/src/url.scraper';
import { ItemExtractor } from './packages/adapters/src/item.extractor';
import { EBayClient } from './packages/adapters/src/ebay.client';
import { CalculationEngine } from './packages/shared/src/calculator';
import { Marketplace } from './packages/shared/src/types';

dotenv.config({ path: '/home/workspace/Arbitrain.com/secrets/.env.ebay' });

async function test() {
  const scraper = new URLScraper();
  const extractor = new ItemExtractor();
  const ebayClient = new EBayClient(process.env.EBAY_PROD_APP_ID || '', process.env.EBAY_PROD_CERT_ID || '');
  const calc = new CalculationEngine();

  const url = 'https://www.ebay.com/itm/185810487116';
  
  try {
    const scraped = await scraper.scrape(url);
    console.log('\n=== SCRAPED ===');
    console.log('Title:', scraped.title);
    
    const profile = extractor.extract(scraped.title, scraped.description);
    console.log('\n=== PROFILE ===');
    console.log('Type:', profile.item_type);
    console.log('Condition:', profile.condition);
    console.log('Material:', profile.material);
    console.log('Keywords:', profile.keywords);
    
    const ladder = extractor.generateQueryLadder(profile);
    console.log('\n=== QUERY LADDER ===');
    ladder.forEach((q, i) => console.log(`${i+1}. "${q}"`));
    
    const comps = await ebayClient.searchSoldListings(ladder[0], profile.condition);
    console.log('\n=== COMPS ===');
    console.log('Count:', comps.length);
    console.log('First comp type:', typeof comps[0]);
    console.log('First comp:', JSON.stringify(comps[0], null, 2).substring(0, 200));
    
    const listing = {
      title: scraped.title,
      description: scraped.description,
      url: url,
      current_price: 0,
      marketplace: 'ebay' as Marketplace,
    };
    
    const analysis = calc.analyze(profile, ladder[0], ladder, comps, listing);
    console.log('\n=== ANALYSIS ===');
    console.log('Median:', analysis.median_price);
    console.log('Max Bid:', analysis.max_safe_bid);
    console.log('Confidence:', analysis.confidence_label, `(${analysis.confidence_score}/100)`);
    console.log('Warnings:', analysis.explanation.warnings);
    
  } catch (err: any) {
    console.error('Error:', err.message);
    console.error(err.stack);
  }
}

test();
