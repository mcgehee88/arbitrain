/**
 * Unified pipeline orchestrator
 * Coordinates all 5 layers: IUL → CRL → CFL → VL → OL
 */

import { Listing, CalculationOutput } from './types';
import { ItemExtractor } from './item-extractor';
import { QueryBuilder } from './query-builder';
import { CompFilter } from './comp-filter';
import { Valuator } from './valuation';
import { HTMLGenerator } from './html-generator';
import { SerpApiClient } from './serpapi-client';

export interface PipelineConfig {
  serpApiKey: string;
  queryLadderLimit?: number;
}

export class ArbitrainPipeline {
  private serpApi: SerpApiClient;
  private queryLadderLimit: number;
  private extractor: ItemExtractor;
  private compFilter: CompFilter;

  constructor(config: PipelineConfig) {
    this.serpApi = new SerpApiClient(config.serpApiKey);
    this.queryLadderLimit = config.queryLadderLimit || 5;
    this.extractor = new ItemExtractor();
    this.compFilter = new CompFilter();
  }

  async processListing(listing: Listing): Promise<CalculationOutput> {
    // LAYER 1: Item profile extraction
    console.log(`\n  [1/5] Extracting item profile...`);
    const itemProfile = this.extractor.extractFromTitle(listing.title, listing.url);
    console.log(`       Category: ${itemProfile.category}`);
    console.log(`       Confidence: ${Math.round(itemProfile.extraction_confidence * 100)}%`);

    // LAYER 2: Query ladder generation
    console.log(`  [2/5] Building query ladder...`);
    const queryBuilder = new QueryBuilder();
    const queryLadder = queryBuilder.buildQueryLadder(itemProfile, this.queryLadderLimit);
    console.log(`       Queries: ${queryLadder.length}`);
    queryLadder.forEach((q: string, idx: number) => console.log(`         [${idx + 1}] "${q}"`));

    // LAYER 3: Fetch comps from SerpApi (REAL DATA)
    console.log(`  [3/5] Fetching real sold listings from eBay (via SerpApi)...`);
    const queryResults = await this.serpApi.executeQueryLadder(queryLadder, 15);
    const allComps = queryResults.flatMap((r: any) => r.compsFound);
    console.log(`       Found: ${allComps.length} sold items`);

    // LAYER 4: Filter comps
    console.log(`  [4/5] Filtering comps (semantic + attribute matching)...`);
    const filteredComps = this.compFilter.filter(itemProfile, allComps);
    console.log(`       Filtered: ${filteredComps.length} high-quality comps`);

    // LAYER 5: Valuation
    console.log(`  [5/5] Computing valuation...`);
    const valuator = new Valuator();
    const result = valuator.calculateValuation(
      itemProfile,
      filteredComps,
      listing.url || '',
      queryLadder,
      allComps.length
    );

    return result;
  }

  async processBatch(listings: Listing[]): Promise<CalculationOutput[]> {
    const results: CalculationOutput[] = [];

    for (const listing of listings) {
      try {
        const result = await this.processListing(listing);
        results.push(result);
      } catch (error: any) {
        console.error(`Error processing listing: ${error.message}`);
      }
    }

    return results;
  }

  generateReport(results: CalculationOutput[]): string {
    return HTMLGenerator.generateReport(results);
  }
}








