import { Comp, CalculationOutput, ItemProfile, Listing, Condition } from './types';
import { SemanticMatcher } from '../../adapters/src/semantic.matcher';

const SIMILARITY_THRESHOLD = 0.3;

export class CalculationEngine {
  private semanticMatcher = new SemanticMatcher();

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
        risk_score: 100,
        confidence_score: 0,
        explanation: {
          summary: 'No comparable sales found.',
          resale_reasoning: 'Unable to estimate without comps.',
          max_bid_reasoning: 'Cannot calculate bid strategy.',
          risk_factors: ['No data available'],
          opportunities: [],
        },
      };
    }

    // Score all comps by semantic similarity to listing title
    const scoredComps = await Promise.all(
      comps.map(async (comp) => ({
        comp,
        similarity: await this.semanticMatcher.scoreComp(listing.title, comp.title),
      }))
    );

    // Filter: Keep comps with >30% title similarity (captures same product class)
    const validComps = scoredComps
      .filter(s => s.similarity > SIMILARITY_THRESHOLD)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 15) // Top 15 most similar
      .map(s => s.comp);

    if (validComps.length < 3) {
      return {
        expected_resale_price: 0,
        max_safe_bid: 0,
        estimated_profit: 0,
        estimated_roi_percent: 0,
        opportunity_score: 0,
        risk_score: 100,
        confidence_score: 20,
        explanation: {
          summary: `Only ${validComps.length} valid comps found. Too risky to bid.`,
          resale_reasoning: 'Insufficient similar sales data.',
          max_bid_reasoning: 'Cannot calculate reliable bid strategy with <3 comps.',
          risk_factors: ['Low comp count', 'High uncertainty'],
          opportunities: [],
        },
      };
    }

    // Calculate statistics
    const prices = validComps.map(c => c.sold_price);
    const median = this.median(prices);
    const stdDev = this.standardDeviation(prices);
    
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;

    // Estimate resale price (median of comps)
    const resalePrice = median * (itemProfile.condition === 'new' ? 1.05 : 1.0);

    // Calculate max safe bid (30% ROI target)
    const targetProfit = resalePrice * 0.30;
    const fees = resalePrice * 0.15; // eBay + PayPal fees
    const shipping = listing.shipping_cost || 5;
    const maxBid = resalePrice - targetProfit - fees - shipping;

    // Profit at current listing price
    const estimatedProfit = resalePrice - listing.current_price - fees - shipping;
    const roi = listing.current_price > 0 ? (estimatedProfit / listing.current_price) * 100 : 0;

    // Confidence scoring
    let confidence = 100;
    if (validComps.length < 5) confidence -= 15;
    if (stdDev > mean * 0.5) confidence -= 20; // High price variance = lower confidence
    if (itemProfile.condition === 'unknown') confidence -= 10;
    confidence = Math.max(0, Math.min(100, confidence));

    const confidenceLevel = confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low';

    const opportunities = [];
    if (estimatedProfit > 0) opportunities.push(`Potential profit: $${estimatedProfit.toFixed(2)}`);
    if (roi > 30) opportunities.push('Strong ROI - bid aggressively');
    if (validComps.length < 5) opportunities.push('Limited comps - bid conservatively');

    return {
      expected_resale_price: Math.round(resalePrice * 100) / 100,
      max_safe_bid: Math.round(maxBid * 100) / 100,
      estimated_profit: Math.round(estimatedProfit * 100) / 100,
      estimated_roi_percent: Math.round(roi * 100) / 100,
      opportunity_score: opportunities.length * 20,
      risk_score: Math.round((1 - confidence / 100) * 100),
      confidence_score: confidence,
      explanation: {
        summary: `Based on ${validComps.length} similar sales (median: $${median.toFixed(2)}). Max safe bid: $${maxBid.toFixed(2)}. Confidence: ${confidenceLevel}.`,
        resale_reasoning: `Median sold price from ${validComps.length} comparable items is $${median.toFixed(2)}.${stdDev > mean * 0.3 ? ' Note: High price variance in comps.' : ''}`,
        max_bid_reasoning: `Calculated to maintain 30% ROI after fees ($${fees.toFixed(2)}) and shipping ($${shipping}).`,
        risk_factors: stdDev > mean * 0.5 ? ['High price variance in comps'] : [],
        opportunities,
      },
    };
  }

  private median(nums: number[]): number {
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private standardDeviation(nums: number[]): number {
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const variance = nums.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / nums.length;
    return Math.sqrt(variance);
  }
}


