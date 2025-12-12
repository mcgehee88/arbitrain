import { JewelryItemExtractor } from '../packages/adapters/src/jewelry-extractor';

const extractor = new JewelryItemExtractor();

const testTitles = [
  'Vintage Estate 14K Yellow Gold and Diamond Masonic Shriner Ring',
  '14K White Gold Diamond Ring 1/2cttw Size 7 2.9dwt (4.5g)',
];

console.log('\n' + '='.repeat(80));
console.log('🔬 JEWELRY ITEM EXTRACTOR TEST');
console.log('='.repeat(80) + '\n');

for (const title of testTitles) {
  const item = extractor.extractFromTitle(title, 'https://example.com');
  
  console.log(`\nTitle: ${title}`);
  console.log(`Metal: ${item.metal_type} (${item.fineness})`);
  console.log(`Type: ${item.jewelry_type} (${item.style})`);
  console.log(`Stone: ${item.primary_stone}` + (item.stone_carat ? ` (${item.stone_carat}ct)` : ''));
  console.log(`Weight: ${item.weight_grams || item.weight_dwt ? 
    (item.weight_grams ? item.weight_grams + 'g' : '') + 
    (item.weight_dwt ? ' / ' + item.weight_dwt + 'dwt' : '') 
    : 'unknown'}`);
  console.log(`Condition: ${item.condition}`);
  console.log(`Extraction confidence: ${(item.extraction_confidence * 100).toFixed(0)}%`);
}

console.log('\n' + '='.repeat(80) + '\n');

