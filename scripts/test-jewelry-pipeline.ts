import * as dotenv from 'dotenv';
import axios from 'axios';
import { JewelryItemExtractor } from '../packages/adapters/src/jewelry-extractor';
import { JewelryCompsFilter } from '../packages/adapters/src/jewelry-comps-filter';
import { JewelryValuation } from '../packages/shared/src/jewelry-valuation';
import { JewelryItem, JewelryComp } from '../packages/shared/src/jewelry-item';

dotenv.config({ path: '/home/workspace/Arbitrain.com/secrets/.env.ebay' });

const TEST_URLS = [
  'https://www.ebay.com/itm/185810487116',
  'https://www.ebay.com/itm/227127658737',
];

async function testJewelryPipeline() {
  const extractor = new JewelryItemExtractor();
  const filter = new JewelryCompsFilter();
  const valuation = new JewelryValuation();

  console.log('\n' + '='.repeat(80));
  console.log('🔬 JEWELRY VALUATION PIPELINE TEST');
  console.log('='.repeat(80));

  for (const url of TEST_URLS) {
    console.log(`\n\n📍 Testing: ${url}`);
    console.log('-'.repeat(80));

    try {
      // Step 1: Fetch listing
      const html = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 10000,
      }).then(r => r.data);

      // Step 2: Extract title
      const titleMatch = html.match(/<h1[^>]*class="it-title"[^>]*>([^<]+)<\/h1>/i) ||
                        html.match(/<span[^>]*class="it-title"[^>]*>([^<]+)<\/span>/i) ||
                        html.match(/<title>([^<]+) \| eBay<\/title>/i);
      
      const title = titleMatch ? titleMatch[1].trim() : 'Unknown Item';

      // Step 3: Extract item attributes
      const listingItem = extractor.extractFromTitle(title, url);
      
      console.log('\n✓ STEP 1: ITEM EXTRACTION');
      console.log(`  Title: ${title}`);
      console.log(`  Metal: ${listingItem.metal_type} (${listingItem.fineness})`);
      console.log(`  Type: ${listingItem.jewelry_type} (${listingItem.style})`);
      console.log(`  Stone: ${listingItem.primary_stone}` + (listingItem.stone_carat ? ` (${listingItem.stone_carat}ct)` : ''));
      console.log(`  Weight: ${listingItem.weight_grams || listingItem.weight_dwt ? 
        (listingItem.weight_grams ? listingItem.weight_grams + 'g' : '') + 
        (listingItem.weight_dwt ? ' / ' + listingItem.weight_dwt + 'dwt' : '') 
        : 'unknown'}`);
      console.log(`  Condition: ${listingItem.condition}`);
      console.log(`  Extraction confidence: ${(listingItem.extraction_confidence * 100).toFixed(0)}%`);

      // Step 4: Fetch eBay comps
      console.log('\n✓ STEP 2: FETCHING EBAY COMPS...');
      
      const queries = generateQueryLadder(listingItem);
      let allComps: JewelryComp[] = [];

      for (const query of queries) {
        try {
          const response = await axios.get('https://api.ebay.com/buy/browse/v1/item_summary/search', {
            headers: {
              'Authorization': `Bearer ${process.env.EBAY_PROD_APP_ID}`,
              'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
            },
            params: {
              q: query,
              sort: '-sale_date',
              limit: 25,
              filter: 'buyingOptions:{AUCTION}',
            },
            timeout: 10000,
          }).catch(() => ({ data: { itemSummaries: [] } }));

          const comps = (response.data.itemSummaries || []).map((item: any) => {
            const comp = extractor.extractFromTitle(item.title, item.itemWebUrl) as any;
            comp.sold_price = item.price?.value || 0;
            comp.sold_date = new Date().toISOString();
            comp.comp_id = item.itemId;
            comp.attribute_match_score = 0;
            return comp as JewelryComp;
          });

          allComps = allComps.concat(comps);
        } catch (e) {
          // Skip failed queries
        }
      }

      console.log(`  Found ${allComps.length} raw comps`);

      // Step 5: Filter valid comps
      console.log('\n✓ STEP 3: COMPS FILTERING');
      const validComps = filter.filterValidComps(listingItem, allComps);
      console.log(`  Valid comps: ${validComps.length} (attribute match >= 0.4)`);

      if (validComps.length > 0) {
        validComps.slice(0, 3).forEach((comp, i) => {
          console.log(`    ${i + 1}. ${comp.title} - $${comp.sold_price} (${(comp.attribute_match_score * 100).toFixed(0)}% match)`);
        });
      }

      // Step 6: Calculate valuation
      console.log('\n✓ STEP 4: VALUATION');
      const val = valuation.calculateValuation(validComps);
      console.log(`  Median: $${val.median_price}`);
      console.log(`  Range: $${val.price_range.low} - $${val.price_range.high}`);
      console.log(`  Max safe bid: $${val.max_safe_bid}`);
      console.log(`  Confidence: ${val.confidence_score}/100`);
      console.log(`  Recommendation: ${val.recommendation}`);
      if (val.risk_factors.length > 0) {
        val.risk_factors.forEach(f => console.log(`  ⚠️  ${f}`));
      }

    } catch (error: any) {
      console.log(`  ✗ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

function generateQueryLadder(item: JewelryItem): string[] {
  const queries = [];
  
  const metalStr = item.metal_type === 'gold' ? '14k gold' : item.metal_type;
  const stoneStr = item.primary_stone !== 'none' ? item.primary_stone : '';
  const typeStr = item.jewelry_type;
  const styleStr = item.style !== 'unknown' ? item.style : '';

  if (stoneStr && styleStr) {
    queries.push(`${item.fineness} ${metalStr} ${stoneStr} ${styleStr} ${typeStr}`);
  }
  queries.push(`${item.fineness} ${metalStr} ${stoneStr || 'diamond'} ${typeStr}`);
  queries.push(`${item.fineness} ${metalStr} ${typeStr}`);
  
  return queries.filter(q => q.length > 0);
}

testJewelryPipeline().catch(console.error);


