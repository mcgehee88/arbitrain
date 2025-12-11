import { Comp, CalculationOutput, ItemProfile, Listing, Condition } from './types';
import { SemanticMatcher } from '../../../packages/adapters/src/semantic.matcher';
import { TaxonomyMatcher } from '../../../packages/adapters/src/taxonomy.matcher';
import { ConfidenceScorer } from './confidence.scorer';

export class CalculationEngine {
  private semanticMatcher: SemanticMatcher;
  private taxonomyMatcher: TaxonomyMatcher;
  private confidenceScorer: ConfidenceScorer;

  constructor(openaiKey: string) {
    this.semanticMatcher = new SemanticMatcher(openaiKey);
    this.taxonomyMatcher = new TaxonomyMatcher();
    this.confidenceScorer = new ConfidenceScorer();
  }

  async analyze(
    itemProfile: ItemProfile,
    queryLadder: string[],
    comps: Comp[],
    listing: Listing
  ): Promise<CalculationOutput> {
    if (!comps || comps.length === 0) {
      return {
        expected_resale_price: 0,
        max_safe_bid: 0,
        estimated_profit: 0,
        estimated_roi_percent: 0,
        opportunity_score: 0,
        risk_score: 0,
        confidence_score: 0,
        explanation: {
          summary: 'No comparable sales found.',
          resale_reasoning: 'Insufficient data.',
          max_bid_reasoning: 'Cannot calculate without comps.',
          risk_factors: ['No comps available'],
          opportunities: [],
          warnings: ['Unable to provide accurate analysis.'],
        },
      };
    }

    // Score each comp using semantic matching
    const scoredComps = await Promise.all(
      comps.map(async (comp) => ({
        ...comp,
        semanticScore: await this.semanticMatcher.scoreComp(listing.title, comp.title),
        taxonomyScore: this.taxonomyMatcher.scoreMatch(itemProfile, comp.title),
      }))
    );

    // Filter: keep only high-quality comps (both semantic and taxonomy)
    const qualityComps = scoredComps.filter(
      (c) => c.semanticScore > 0.70 && c.taxonomyScore > 0.60
    );

    if (qualityComps.length === 0) {
      return {
        expected_resale_price: 0,
        max_safe_bid: 0,
        estimated_profit: 0,
        estimated_roi_percent: 0,
        opportunity_score: 0,
        risk_score: 0,
        confidence_score: 0,
        explanation: {
          summary: 'No sufficiently similar comps found after quality filtering.',
          resale_reasoning: 'Available comps are not similar enough to this item.',
          max_bid_reasoning: 'Cannot estimate safely with low-quality matches.',
          risk_factors: ['Poor comp match quality'],
          opportunities: [],
          warnings: ['Expand search or try different keywords.'],
        },
      };
    }

    // Calculate statistics from quality comps
    const prices = qualityComps.map((c) => c.sold_price).sort((a, b) => a - b);
    const median = prices[Math.floor(prices.length / 2)];
    const low = prices[0];
    const high = prices[prices.length - 1];

    // Estimate resale price (median from comps)
    const resalePrice = median;

    // Calculate max safe bid
    const buyerPremium = listing.current_bid * 0.12;
    const shipping = 5;
    const resaleFees = resalePrice * 0.15;
    const targetProfit = resalePrice * 0.30;
    const maxSafeBid = resalePrice - buyerPremium - shipping - resaleFees - targetProfit;

    // Calculate confidence
    const confidenceData = {
      numComps: qualityComps.length,
      avgSemanticScore: qualityComps.reduce((sum, c) => sum + c.semanticScore, 0) / qualityComps.length,
      priceVariance: this.calculateVariance(prices),
      medianPrice: median,
    };
    const confidenceResult = this.confidenceScorer.score(confidenceData);

    // Estimate profit and ROI
    const currentBid = listing.current_bid;
    const estimatedProfit = resalePrice - currentBid - buyerPremium - shipping - resaleFees;
    const estimatedROI = currentBid > 0 ? (estimatedProfit / currentBid) * 100 : 0;

    return {
      expected_resale_price: resalePrice,
      max_safe_bid: Math.max(0, maxSafeBid),
      estimated_profit: estimatedProfit,
      estimated_roi_percent: estimatedROI,
      opportunity_score: estimatedROI > 20 ? 80 : estimatedROI > 10 ? 60 : 40,
      risk_score: this.calculateRiskScore(prices),
      confidence_score: confidenceResult.score,
      explanation: {
        summary: `Expected resale: $${resalePrice.toFixed(2)}. Max safe bid: $${maxSafeBid.toFixed(2)}. Estimated profit: $${estimatedProfit.toFixed(2)} at ${estimatedROI.toFixed(1)}% ROI.`,
        resale_reasoning: `Median sold price from ${qualityComps.length} quality comps is $${median.toFixed(2)} (range: $${low.toFixed(2)}-$${high.toFixed(2)}).`,
        max_bid_reasoning: `Max bid accounts for buyer premium (12%), shipping ($${shipping}), resale fees (~${(resaleFees / resalePrice * 100).toFixed(0)}%), and maintains 30% ROI target.`,
        risk_factors: this.identifyRisks(confidenceData),
        opportunities: this.identifyOpportunities(estimatedROI, confidenceResult.level),
        warnings: confidenceResult.level !== 'HIGH' ? ['Low confidence. Manual verification recommended.'] : [],
      },
    };
  }

  private calculateVariance(prices: number[]): number {
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance =
      prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    return Math.sqrt(variance);
  }

  private calculateRiskScore(prices: number[]): number {
    const variance = this.calculateVariance(prices);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const cv = variance / mean; // Coefficient of variation
    return Math.min(100, cv * 100);
  }

  private identifyRisks(data: { numComps: number; priceVariance: number; medianPrice: number }): string[] {
    const risks = [];
    if (data.numComps < 5) risks.push(`Limited comps (${data.numComps})`);
    if (data.priceVariance / data.medianPrice > 0.25) risks.push('High price variance');
    return risks;
  }

  private identifyOpportunities(roi: number, confidence: string): string[] {
    const opps = [];
    if (roi > 30) opps.push('Strong margin opportunity.');
    if (roi > 20) opps.push('Solid profit potential.');
    if (confidence === 'HIGH') opps.push('High confidence in estimate.');
    return opps;
  }
}

