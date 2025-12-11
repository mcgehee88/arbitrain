import { URLScraper } from './url.scraper';
import { EBayClient } from './ebay.client';
import { SemanticMatcher } from './semantic.matcher';
import { Comp, ItemProfile, Listing, CalculationOutput } from '../../../packages/shared/src/types';

const SIMILARITY_THRESHOLD = 0.3;
const MIN_COMPS_FOR_ANALYSIS = 3;
const ROI_TARGET = 0.30;

export interface PipelineResult {
  url: string;
  scrapedTitle: string;
  itemType: string;
  condition: string;
  queryLadder: string[];
  rawCompsCount: number;
  filteredCompsCount: number;
  filteredComps: Comp[];
  analysis: CalculationOutput | null;
  error: string | null;
}

export class ArbitrainPipeline {
  private scraper: URLScraper;
  private ebayClient: EBayClient;
  private matcher: SemanticMatcher;

  constructor(ebayAppId: string, ebayCertId: string) {
    this.scraper = new URLScraper();
    this.ebayClient = new EBayClient(ebayAppId, ebayCertId);
    this.matcher = new SemanticMatcher();
  }

  async process(url: string): Promise<PipelineResult> {
    try {
      // STEP 1: Scrape URL
      const scraped = await this.scraper.scrape(url);
      if (!scraped.title) {
        return {
          url,
          scrapedTitle: 'Unknown Item',
          itemType: 'unknown',
          condition: 'unknown',
          queryLadder: [],
          rawCompsCount: 0,
          filteredCompsCount: 0,
          filteredComps: [],
          analysis: null,
          error: 'Failed to extract title from listing',
        };
      }

      // STEP 2: Extract item profile and build query ladder
      const profile = this.buildItemProfile(scraped.title);
      const queryLadder = this.buildQueryLadder(profile);

      // STEP 3: Search eBay for comps
      let allComps: Comp[] = [];
      for (const query of queryLadder) {
        const comps = await this.ebayClient.searchSoldListings(query);
        allComps = allComps.concat(comps);
      }

      // Remove duplicates by ID
      const uniqueComps = Array.from(
        new Map(allComps.map(c => [c.id, c])).values()
      );

      // STEP 4: Semantic similarity filtering
      const filteredComps = uniqueComps.filter(comp => {
        const similarity = this.matcher.calculateSimilarity(scraped.title, comp.title);
        return similarity >= SIMILARITY_THRESHOLD;
      });

      // STEP 5: Analysis
      let analysis: CalculationOutput | null = null;
      if (filteredComps.length >= MIN_COMPS_FOR_ANALYSIS) {
        analysis = this.calculateAnalysis(scraped.title, filteredComps);
      }

      return {
        url,
        scrapedTitle: scraped.title,
        itemType: profile.type,
        condition: profile.condition,
        queryLadder,
        rawCompsCount: uniqueComps.length,
        filteredCompsCount: filteredComps.length,
        filteredComps,
        analysis,
        error: null,
      };
    } catch (error) {
      return {
        url,
        scrapedTitle: 'Unknown Item',
        itemType: 'unknown',
        condition: 'unknown',
        queryLadder: [],
        rawCompsCount: 0,
        filteredCompsCount: 0,
        filteredComps: [],
        analysis: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private buildItemProfile(title: string): ItemProfile {
    const titleLower = title.toLowerCase();

    // Detect type
    let type = 'unknown';
    if (titleLower.includes('ring') || titleLower.includes('necklace') || titleLower.includes('bracelet') || titleLower.includes('earring') || titleLower.includes('14k') || titleLower.includes('gold') || titleLower.includes('diamond') || titleLower.includes('watch')) {
      type = 'jewelry';
    }

    // Detect condition
    let condition = 'unknown';
    if (titleLower.includes('vintage') || titleLower.includes('estate') || titleLower.includes('antique')) {
      condition = 'good';
    }
    if (titleLower.includes('new') || titleLower.includes('mint')) {
      condition = 'new';
    }
    if (titleLower.includes('used') || titleLower.includes('worn')) {
      condition = 'used';
    }

    return { type, condition };
  }

  private buildQueryLadder(profile: ItemProfile): string[] {
    const queries: string[] = [];

    // Start with broad searches
    if (profile.type === 'jewelry') {
      queries.push('14k diamond ring');
      queries.push('14k gold ring');
      queries.push('14k jewelry');
    } else {
      queries.push('general');
    }

    return queries;
  }

  private calculateAnalysis(title: string, comps: Comp[]): CalculationOutput {
    const prices = comps.map(c => c.sold_price).filter(p => p > 0);

    if (prices.length === 0) {
      return {
        median_price: 0,
        max_safe_bid: 0,
        confidence_score: 0,
        risk_score: 100,
        opportunities: ['No valid prices in comps'],
      };
    }

    // Calculate statistics
    prices.sort((a, b) => a - b);
    const median = prices[Math.floor(prices.length / 2)];
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    // Max safe bid (30% ROI)
    const maxSafeBid = Math.round(median * (1 - ROI_TARGET) * 100) / 100;

    // Confidence scoring
    let confidence = 85;
    if (comps.length < 5) confidence -= 15;
    if (comps.length < 3) confidence -= 30;
    if (stdDev > mean * 0.5) confidence -= 10;

    const riskScore = 100 - Math.max(0, confidence);

    const opportunities = [];
    if (comps.length >= 10) opportunities.push('High comp count - bid with confidence');
    if (stdDev < mean * 0.2) opportunities.push('Low price variance - stable market');
    if (comps.length >= 5 && comps.length < 10) opportunities.push('Moderate comps - fair confidence');
    if (comps.length < 5) opportunities.push('Limited comps - bid conservatively');

    return {
      median_price: Math.round(median * 100) / 100,
      max_safe_bid: maxSafeBid,
      confidence_score: confidence,
      risk_score: riskScore,
      opportunities,
    };
  }
}

