import { Comp, CalculationOutput, ItemProfile, Listing, Condition } from './types';
import { ConfidenceScorer, ConfidenceLevel } from './confidence.scorer';

export class CalculationEngine {
  private targetROI = 0.3;
  private confidenceScorer = new ConfidenceScorer();

  analyze(
    itemProfile: ItemProfile,
    comps: Comp[],
    listing: Listing,
    primaryQuery: string,
    queryLadder: string[]
  ): CalculationOutput {
    if (!comps || comps.length === 0) {
      return {
        expected_resale_price: 0,
        max_safe_bid: 0,
        estimated_profit: 0,
        estimated_roi_percent: 0,
        opportunity_score: 0,
        confidence_label: 'MANUAL_REVIEW',
        confidence_score: 0,
        num_comps: 0,
        price_low: 0,
        price_high: 0,
        price_median: 0,
        price_variance: 0,
        explanation: {
          summary: 'No comparable sold listings found. Manual research required.',
          resale_reasoning: 'Insufficient data.',
          max_bid_reasoning: 'Cannot calculate without comps.',
          risk_factors: ['No market data available'],
          opportunities: [],
        },
      };
    }

    // Extract prices
    const prices = comps.map((c) => c.sold_price).filter((p) => p > 0);
    const sortedPrices = prices.sort((a, b) => a - b);
    const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
    const low = sortedPrices[0];
    const high = sortedPrices[sortedPrices.length - 1];

    // Calculate variance
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance =
      Math.sqrt(prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length) /
      mean;

    // Calculate confidence
    const avgSemanticQuality = 0.82; // Placeholder - would come from semantic matcher
    const avgTaxonomyScore = 72; // Placeholder - would come from taxonomy matcher
    const confidenceBreakdown = this.confidenceScorer.score(
      comps.length,
      variance,
      avgSemanticQuality,
      avgTaxonomyScore
    );

    // Calculate max bid (conservative)
    const buyersPremium = median * 0.12;
    const shippingEstimate = 8;
    const resaleFees = median * 0.15;
    const desiredProfit = median * this.targetROI;
    const maxBid = median - buyersPremium - shippingEstimate - resaleFees - desiredProfit;

    const estimatedProfit = median - listing.current_price - buyersPremium - shippingEstimate - resaleFees;
    const roi = estimatedProfit > 0 ? estimatedProfit / (listing.current_price + buyersPremium) : 0;

    return {
      expected_resale_price: Math.round(median * 100) / 100,
      max_safe_bid: Math.round(maxBid * 100) / 100,
      estimated_profit: Math.round(estimatedProfit * 100) / 100,
      estimated_roi_percent: Math.round(roi * 10000) / 100,
      opportunity_score: this.calculateOpportunityScore(roi, variance),
      confidence_label: confidenceBreakdown.level,
      confidence_score: confidenceBreakdown.factors.compCount,
      num_comps: comps.length,
      price_low: Math.round(low * 100) / 100,
      price_high: Math.round(high * 100) / 100,
      price_median: Math.round(median * 100) / 100,
      price_variance: Math.round(variance * 10000) / 100,
      explanation: {
        summary: `${comps.length} verified comps. Resale: $${median.toFixed(2)}. Max bid: $${maxBid.toFixed(2)}. Confidence: ${confidenceBreakdown.level} (${confidenceBreakdown.score}/100).`,
        resale_reasoning: `Median sold price from ${comps.length} recent comps is $${median.toFixed(2)}. Range: $${low.toFixed(2)} - $${high.toFixed(2)}.`,
        max_bid_reasoning: `Max bid = Median ($${median.toFixed(2)}) - Buyer premium (12%) - Shipping ($8) - Resale fees (15%) - Desired profit (30%).`,
        risk_factors: [
          variance > 0.35 ? 'High price variance' : 'Price stable',
          comps.length < 5 ? 'Limited comps' : 'Sufficient comps',
        ],
        opportunities: [
          estimatedProfit > median * 0.3
            ? 'Strong profit potential'
            : estimatedProfit > 0
              ? 'Modest profit potential'
              : 'Poor economics',
        ],
      },
    };
  }

  private calculateOpportunityScore(roi: number, variance: number): number {
    if (roi < 0.05) return 10;
    if (roi < 0.15) return 30;
    if (roi < 0.3) return 60;
    if (roi < 0.5) return 80;
    return 100;
  }
}

