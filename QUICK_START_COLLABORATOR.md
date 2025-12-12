# Arbitrain - Collaborator Quick Start Guide

## What Just Happened
The complete data ingestion and valuation pipeline has been pushed to GitHub. You now have access to:
- Item attribute extraction from product titles
- Query ladder generation for eBay searches
- Real comparable sales data fetching
- Semantic filtering of comparables
- Statistical valuation analysis
- Production-ready HTML reporting

## Get Started in 5 Minutes

### 1. Clone the Repository
```bash
git clone https://github.com/mcgehee88/arbitrain.git
cd arbitrain
npm install
```

### 2. Understand the Data Flow
```
Product URL (from any marketplace)
   ↓ [Extract attributes: category, brand, condition, etc]
   ↓ [Build query ladder: specific → general]
   ↓ [Fetch sold listings from eBay]
   ↓ [Filter by semantic similarity + attributes]
   ↓ [Calculate valuation: median, IQR, confidence]
   ↓ HTML Report with pricing & risk analysis
```

### 3. Core Files to Review (in order)
- `packages/shared/src/pipeline.ts` - The conductor (5-layer orchestrator)
- `packages/shared/src/item-extractor.ts` - Extracts item attributes
- `packages/shared/src/query-builder.ts` - Builds search queries
- `packages/shared/src/comp-filter.ts` - Filters comparable sales
- `packages/shared/src/valuation.ts` - Calculates prices & scores

### 4. Try It Out
```bash
# See the full pipeline in action (with real marketplace URLs)
node scripts/test-real-urls.ts

# You'll get an HTML report like:
# - Product profile (extracted category, brand, condition)
# - 15-40 comparable sales
# - Median price & safe bid
# - Confidence score
# - Risk factors
```

### 5. Set Up Your Environment
Copy your API keys to a `.env` file (NOT in git):
```bash
mkdir -p secrets
echo "EBAY_APP_ID=..." > secrets/.env.ebay
echo "SERPAPI_API_KEY=..." > secrets/.env.serpapi
```

## Key Architecture Points

### Item Extraction
- **Input**: Product title + URL
- **Output**: Category, brand, model, year, material, condition, confidence %
- **Supports**: 10+ product categories
- **Confidence**: 0-100% based on how much was extracted

### Comparable Sales
- **Source**: eBay sold listings (via SerpAPI)
- **Strategy**: Query ladder (specific → general)
- **Quality**: Filtered by semantic similarity + attribute matching
- **Count**: 15-50 raw, filtered to 3-25 high-quality

### Valuation
- **Metric**: Median sold price
- **Range**: IQR (25th-75th percentile)
- **Bid Rec**: Median × (1 - 30% ROI margin)
- **Score**: 0-100 based on comp quality
- **Risk**: Measured by price variance

## What Can You Do Now?

### Analyze Products
```typescript
import { ArbitrainPipeline } from './packages/shared/src/pipeline';

const pipeline = new ArbitrainPipeline({
  serpApiKey: process.env.SERPAPI_API_KEY
});

const result = await pipeline.processListing({
  title: '14k Gold Diamond Ring',
  url: 'https://marketplace.com/item/123'
});

console.log(`Median Price: $${result.median_price}`);
console.log(`Max Safe Bid: $${result.max_safe_bid}`);
console.log(`Confidence: ${result.confidence_score}/100`);
```

### Generate Reports
```typescript
const htmlReport = pipeline.generateReport([result]);
fs.writeFileSync('valuation.html', htmlReport);
```

### Extend Categories
Add a new product category:
1. Update `types.ts` with category type
2. Add extraction rules to `item-extractor.ts`
3. Define filtering logic in `comp-filter.ts`
4. Create test script

## Test Suite

### Run All Tests
```bash
npm run test
```

### Individual Tests
```bash
# Extract item attributes
node scripts/test-extractor.ts

# Full pipeline with real URLs
node scripts/test-real-urls.ts

# eBay API validation
node scripts/test-ebay-auth.ts
```

## File Structure
```
arbitrain/
├── packages/
│   ├── shared/src/          ← Main pipeline logic
│   │   ├── pipeline.ts      ← Orchestrator
│   │   ├── item-extractor.ts
│   │   ├── query-builder.ts
│   │   ├── comp-filter.ts
│   │   ├── valuation.ts
│   │   ├── types.ts         ← All TypeScript interfaces
│   │   └── ...
│   └── adapters/src/        ← Category-specific adapters
│       └── jewelry-extractor.ts
├── scripts/                 ← Test runners
│   ├── test-real-urls.ts    ← Try this first
│   └── ...
└── docs/                    ← Architecture docs
```

## Data You Get

Each valuation report includes:
- **Item Profile**: What was extracted from the title
- **Query Ladder**: How we searched for comps
- **Comparables**: 15-40 similar sold items
- **Statistics**: Median, range, distribution
- **Valuation**: Recommended max bid with ROI margin
- **Confidence**: How sure we are about the price
- **Risk Factors**: What could be wrong
- **Opportunities**: Potential margins if condition is good

## Common Questions

**Q: How accurate are the valuations?**  
A: Confidence score tells you (25-85/100). Higher = more reliable. Low scores mean high price variance in the market.

**Q: Can I use other data sources?**  
A: Yes! Replace `serpapi-client.ts` or add parallel sources. The pipeline is modular.

**Q: How do I add a new marketplace?**  
A: Create a marketplace-specific scraper/client, modify `item-extractor.ts` if needed, add test script.

**Q: What if extraction confidence is 0%?**  
A: Title didn't match any known patterns. Query builder will use fallback queries. You'll get valuations but may need to verify manually.

## Next Steps
1. Clone the repo
2. Run `npm install`
3. Execute `node scripts/test-real-urls.ts`
4. Review the HTML output
5. Explore the code - start with `pipeline.ts`
6. Add your own API keys to secrets/
7. Start analyzing products!

---

**Questions?** Review the files in `docs/` or check the test scripts for examples.

**Ready to ship?** All code is production-ready. No breaking changes.
