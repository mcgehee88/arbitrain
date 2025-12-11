// Working proof of CalculationEngine - no dependencies
import { CalculationEngine } from '../packages/shared/src/calculator';

const engine = new CalculationEngine();

const mockListing = {
  title: 'Apple iPhone 14 - Mint Condition',
  marketplace: 'ebay' as const,
  current_bid: 500,
  shipping_cost: 5,
  buyer_premium_percent: 12,
  listing_url: 'https://example.com',
};

const mockComps = [
  { title: 'Item', sold_price: 640, shipping_cost_explicit: 5, platform_fee_paid: 18 },
  { title: 'Item', sold_price: 660, shipping_cost_explicit: 8, platform_fee_paid: 20 },
  { title: 'Item', sold_price: 650, shipping_cost_explicit: 6, platform_fee_paid: 19 },
  { title: 'Item', sold_price: 670, shipping_cost_explicit: 10, platform_fee_paid: 21 },
  { title: 'Item', sold_price: 630, shipping_cost_explicit: 4, platform_fee_paid: 17 },
];

console.log('=== ARBITRAIN CALCULATION ENGINE ===\n');
console.log('INPUT:');
console.log(`  Listing: ${mockListing.title}`);
console.log(`  Current Bid: $${mockListing.current_bid}`);
console.log(`  Comps Available: ${mockComps.length}\n`);

const result = engine.analyze(mockListing, mockComps);

console.log('OUTPUT:');
console.log(JSON.stringify(result, null, 2));

