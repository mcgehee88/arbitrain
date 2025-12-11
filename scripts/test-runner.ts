import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { EBayClient } from '../packages/adapters/src/ebay.client';

// Load production credentials
const secretsPath = path.join(__dirname, '../../secrets/.env.ebay');
dotenv.config({ path: secretsPath });

const EBAY_PROD_CLIENT_ID = process.env.EBAY_PROD_APP_ID || '';
const EBAY_PROD_CLIENT_SECRET = process.env.EBAY_PROD_CERT_ID || '';

interface TestCase {
  name: string;
  title: string;
  description: string;
  queries: string[]; // Query ladder
  expectedConditions: string[];
}

const TEST_CASES: TestCase[] = [
  {
    name: 'iPhone 14 - High Specificity',
    title: 'Apple iPhone 14 Pro Max 256GB Unlocked - Mint Condition',
    description:
      'Latest flagship phone, specific model, storage, condition clearly stated',
    queries: [
      'Apple iPhone 14 Pro Max 256GB unlocked',
      'iPhone 14 Pro Max 256GB',
      'Apple iPhone 14 Pro Max',
      'iPhone 14 Pro',
      'iPhone 14',
    ],
    expectedConditions: ['LIKE_NEW', 'GOOD', 'EXCELLENT'],
  },
  {
    name: 'Vintage Camera - Low Specificity',
    title: 'Vintage Film Camera - condition unknown, no model number',
    description:
      'Only know: old camera, no brand, no model, condition vague. Tests fallback logic.',
    queries: [
      'vintage film camera',
      'old camera',
      'antique camera',
      'film camera',
      'camera vintage',
    ],
    expectedConditions: ['ACCEPTABLE', 'GOOD', 'LIKE_NEW'],
  },
  {
    name: 'Gold Jewelry Lot - Bundle',
    title: 'Lot: Gold Jewelry - Rings, Earrings, Necklace (5 pieces)',
    description:
      'Multiple items bundled. Tests lot detection and unit price normalization.',
    queries: [
      'gold jewelry lot rings earrings necklace',
      'gold jewelry bundle',
      'vintage gold jewelry',
      'gold ring earring necklace',
      'gold jewelry',
    ],
    expectedConditions: ['LIKE_NEW', 'GOOD'],
  },
  {
    name: 'Rare Pokémon Card - Collectible',
    title:
      'Pokémon Card: Charizard Base Set Holo 1st Edition - PSA 8 Graded',
    description:
      'High-value collectible. Tests rarity/grading detection and premium pricing.',
    queries: [
      'Pokémon Charizard Base Set 1st Edition PSA 8',
      'Charizard Base Set holo PSA',
      'Pokémon Charizard Base Set',
      'Charizard 1st Edition',
      'Pokémon card Charizard',
    ],
    expectedConditions: ['LIKE_NEW'],
  },
  {
    name: 'Mid-Range Furniture - Commodity',
    title: 'IKEA Mid-Century Style Coffee Table - Like New',
    description:
      'Common furniture item. Tests category detection and commodity-style pricing.',
    queries: [
      'IKEA coffee table mid-century',
      'wooden coffee table',
      'mid-century modern coffee table',
      'coffee table wood',
      'coffee table',
    ],
    expectedConditions: ['LIKE_NEW', 'GOOD'],
  },
];

async function runTests() {
  console.log('🚀 ARBITRAIN PHASE 2 TEST SUITE');
  console.log('================================\n');
  console.log(`Using eBay Production API (${new Date().toISOString()})\n`);

  if (!EBAY_PROD_CLIENT_ID || !EBAY_PROD_CLIENT_SECRET) {
    console.error(
      '❌ Missing eBay Production credentials. Check /home/workspace/Arbitrain.com/secrets/.env.ebay\n'
    );
    process.exit(1);
  }

  const ebay = new EBayClient(EBAY_PROD_CLIENT_ID, EBAY_PROD_CLIENT_SECRET, true);
  const results: any[] = [];

  for (const testCase of TEST_CASES) {
    console.log(`\n📊 Test: ${testCase.name}`);
    console.log(`   Title: ${testCase.title}`);
    console.log(`   Desc: ${testCase.description}\n`);

    const result = {
      name: testCase.name,
      title: testCase.title,
      description: testCase.description,
      queries: testCase.queries,
      queries_executed: [] as any[],
      final_results: null as any,
      warnings: [] as string[],
    };

    // Try each query in the ladder
    for (let i = 0; i < testCase.queries.length; i++) {
      const query = testCase.queries[i];
      console.log(`   [Ladder ${i + 1}/${testCase.queries.length}] "${query}"`);

      try {
        const response = await ebay.searchSoldComps(query, 50, testCase.expectedConditions);

        const comps = (response.itemSummaries || []).map((item) => ({
          title: item.title,
          price: parseFloat(item.price.value),
          condition: item.condition,
          soldDate: item.soldDate,
          url: item.itemWebUrl,
        }));

        console.log(`     → Found ${comps.length} comps\n`);

        result.queries_executed.push({
          query,
          ladder_position: i + 1,
          comps_found: comps.length,
          comps,
        });

        // If we got good results, use this query level
        if (comps.length >= 3) {
          result.final_results = {
            query_used: query,
            ladder_level: i + 1,
            total_comps: comps.length,
            comps: comps.slice(0, 10), // Top 10
            median_price:
              comps.length > 0
                ? comps.sort((a, b) => a.price - b.price)[
                    Math.floor(comps.length / 2)
                  ].price
                : null,
            price_range: {
              low: Math.min(...comps.map((c) => c.price)),
              high: Math.max(...comps.map((c) => c.price)),
            },
            confidence_score:
              comps.length >= 10
                ? 'HIGH'
                : comps.length >= 5
                  ? 'MEDIUM'
                  : 'LOW',
          };
          break;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.log(`     ❌ Error: ${msg}\n`);
        result.warnings.push(`Query ${i + 1} failed: ${msg}`);
      }

      // Delay between API calls
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!result.final_results) {
      result.warnings.push('No comps found across all query attempts');
      result.final_results = {
        query_used: 'FAILED',
        ladder_level: null,
        total_comps: 0,
        comps: [],
        median_price: null,
        price_range: { low: null, high: null },
        confidence_score: 'NO_DATA',
      };
    }

    results.push(result);
  }

  // Generate HTML report
  const htmlContent = generateHTMLReport(results);
  const outputPath = path.join(
    __dirname,
    '../test-results.html'
  );
  fs.writeFileSync(outputPath, htmlContent);

  console.log(`\n✅ Results saved to: ${outputPath}`);
  console.log('   Open in browser to review all 5 test cases\n');
}

function generateHTMLReport(results: any[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Arbitrain Phase 2 - eBay Comp Testing</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f5f5f5; 
      padding: 40px 20px;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header { 
      background: white; 
      padding: 30px; 
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 { color: #222; font-size: 28px; margin-bottom: 10px; }
    .meta { color: #666; font-size: 14px; }
    .test-case {
      background: white;
      padding: 30px;
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .test-title { 
      font-size: 20px; 
      color: #222; 
      margin-bottom: 10px;
      font-weight: 600;
    }
    .test-desc { 
      color: #666; 
      font-size: 14px; 
      margin-bottom: 20px;
      font-style: italic;
    }
    .item-profile {
      background: #f9f9f9;
      padding: 15px;
      border-left: 4px solid #0066cc;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    .item-profile strong { color: #222; }
    .queries-section {
      margin: 20px 0;
    }
    .queries-section h3 { 
      color: #222; 
      font-size: 14px;
      margin-bottom: 10px;
    }
    .query-ladder {
      background: #f0f0f0;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      color: #333;
      line-height: 1.8;
    }
    .results-section {
      margin: 20px 0;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 4px;
    }
    .results-section h3 { 
      color: #222; 
      font-size: 14px;
      margin-bottom: 10px;
    }
    .result-item { 
      display: grid; 
      grid-template-columns: 1fr 1fr; 
      gap: 10px;
      margin-bottom: 10px;
      font-size: 13px;
    }
    .result-label { 
      font-weight: 600; 
      color: #666; 
    }
    .result-value { 
      color: #222; 
    }
    .confidence-high { color: #28a745; font-weight: 600; }
    .confidence-medium { color: #ffc107; font-weight: 600; }
    .confidence-low { color: #dc3545; font-weight: 600; }
    .confidence-no-data { color: #999; font-weight: 600; }
    .comps-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 10px;
    }
    .comps-table th {
      background: #e9ecef;
      padding: 8px;
      text-align: left;
      font-weight: 600;
      color: #222;
      border: 1px solid #ddd;
    }
    .comps-table td {
      padding: 8px;
      border: 1px solid #ddd;
      color: #333;
    }
    .comps-table tr:nth-child(even) {
      background: #f9f9f9;
    }
    .warning { 
      background: #fff3cd; 
      padding: 10px; 
      border-left: 4px solid #ffc107;
      margin-top: 10px;
      border-radius: 4px;
      color: #856404;
      font-size: 12px;
    }
    .footer {
      background: white;
      padding: 20px;
      border-radius: 8px;
      color: #666;
      font-size: 12px;
      margin-top: 30px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🔍 Arbitrain Phase 2 - eBay Comp Testing Report</h1>
      <div class="meta">Generated: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}</div>
      <div class="meta">Environment: Production eBay API</div>
    </header>

    ${results
      .map(
        (result, idx) => `
    <div class="test-case">
      <div class="test-title">Test ${idx + 1}: ${result.name}</div>
      <div class="test-desc">${result.description}</div>
      
      <div class="item-profile">
        <strong>Listing Title:</strong> ${result.title}
      </div>

      <div class="queries-section">
        <h3>📍 Query Ladder (Fallback Chain)</h3>
        <div class="query-ladder">
          ${result.queries.map((q, i) => `${i + 1}. "${q}"`).join('<br>')}
        </div>
      </div>

      <div class="results-section">
        <h3>📊 Comp Matching Results</h3>
        <div class="result-item">
          <div class="result-label">Query Used (Ladder Level):</div>
          <div class="result-value">${result.final_results.query_used} ${result.final_results.ladder_level ? `(Level ${result.final_results.ladder_level})` : ''}</div>
        </div>
        <div class="result-item">
          <div class="result-label">Total Comps Found:</div>
          <div class="result-value">${result.final_results.total_comps}</div>
        </div>
        <div class="result-item">
          <div class="result-label">Median Sale Price:</div>
          <div class="result-value">${result.final_results.median_price ? '$' + result.final_results.median_price.toFixed(2) : 'N/A'}</div>
        </div>
        <div class="result-item">
          <div class="result-label">Price Range:</div>
          <div class="result-value">${
            result.final_results.price_range.low
              ? `$${result.final_results.price_range.low.toFixed(2)} - $${result.final_results.price_range.high.toFixed(2)}`
              : 'N/A'
          }</div>
        </div>
        <div class="result-item">
          <div class="result-label">Confidence Score:</div>
          <div class="result-value confidence-${result.final_results.confidence_score.toLowerCase()}">${result.final_results.confidence_score}</div>
        </div>

        ${
          result.final_results.comps.length > 0
            ? `
        <h4 style="margin-top: 20px; font-size: 13px; color: #222;">Top Comps (Last 30 Days)</h4>
        <table class="comps-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Price</th>
              <th>Condition</th>
              <th>Sold Date</th>
            </tr>
          </thead>
          <tbody>
            ${result.final_results.comps.map((comp) => `
            <tr>
              <td><a href="${comp.url}" target="_blank">${comp.title.substring(0, 60)}...</a></td>
              <td>$${comp.price.toFixed(2)}</td>
              <td>${comp.condition}</td>
              <td>${new Date(comp.soldDate).toLocaleDateString()}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
        `
            : '<p style="color: #999; font-size: 12px; margin-top: 10px;">No comps found</p>'
        }
      </div>

      ${
        result.warnings.length > 0
          ? `<div class="warning">⚠️ ${result.warnings.join('<br>')}</div>`
          : ''
      }
    </div>
    `
      )
      .join('')}

    <div class="footer">
      <p>✅ Test suite complete. Review accuracy and approve for Phase 2 production deployment.</p>
    </div>
  </div>
</body>
</html>`;
}

runTests().catch(console.error);

