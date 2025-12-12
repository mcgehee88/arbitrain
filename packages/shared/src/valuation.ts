/**
 * Valuation calculation layer
 * Computes median, IQR, volatility, and max safe bid from filtered comps
 */

import { Comp, ItemProfile, CalculationOutput } from './types';

export interface ValuationConfig {
  roiTarget: number; // e.g., 0.30 for 30% target ROI
  feesPercent: number; // e.g., 0.12 for 12% marketplace + shipping fees
  minCompsForConfidence: number; // e.g., 5
  optimalCompsForConfidence: number; // e.g., 25
}

export const DEFAULT_VALUATION_CONFIG: ValuationConfig = {
  roiTarget: 0.30, // 30% ROI target
  feesPercent: 0.12, // 12% fees
  minCompsForConfidence: 5,
  optimalCompsForConfidence: 25,
};

export class Valuator {
  private config: ValuationConfig;

  constructor(config: Partial<ValuationConfig> = {}) {
    this.config = { ...DEFAULT_VALUATION_CONFIG, ...config };
  }

  /**
   * Calculate valuation from filtered comps
   */
  calculateValuation(
    itemProfile: ItemProfile,
    comps: Comp[],
    listingUrl: string,
    queryLadder: string[],
    rawCompCount: number
  ): CalculationOutput {
    // If insufficient comps, return graceful "INSUFFICIENT DATA" response
    if (comps.length < 3) {
      return this.insufficientDataResponse(
        itemProfile,
        listingUrl,
        queryLadder,
        rawCompCount,
        comps.length
      );
    }

    const prices = comps.map(c => c.sold_price).sort((a, b) => a - b);

    // Calculate statistics
    const median = this.median(prices);
    const mean = this.mean(prices);
    const stdDev = this.standardDeviation(prices);
    const { q1, q3 } = this.quartiles(prices);
    const iqr = q3 - q1;

    // Price range
    const priceRange = {
      low: prices[0],
      high: prices[prices.length - 1],
    };

    // Calculate max safe bid
    const maxSafeBid = this.calculateMaxSafeBid(median);
    const estimatedResalePrice = median;
    const estimatedProfit = estimatedResalePrice - maxSafeBid - (estimatedResalePrice * this.config.feesPercent);
    const estimatedRoi = estimatedProfit / maxSafeBid * 100;

    // Calculate confidence score
    const { confidence, label } = this.calculateConfidence(
      comps.length,
      stdDev / mean, // coefficient of variation
      this.avgQualityScore(comps)
    );

    // Opportunity and risk scores
    const opportunityScore = this.calculateOpportunityScore(estimatedRoi, confidence);
    const riskScore = 100 - confidence;

    // Risk factors and opportunities
    const { riskFactors, opportunities, warnings } = this.analyzeRisks(
      comps.length,
      stdDev / mean,
      median,
      maxSafeBid
    );

    // Build explanation
    const explanation = {
      summary: `Based on ${comps.length} comparable eBay sales, estimated resale value is $${median.toFixed(2)}`,
      resale_reasoning: `${comps.length} recent sales of similar items averaged $${median.toFixed(2)} (median). Price range: $${priceRange.low.toFixed(2)} - $${priceRange.high.toFixed(2)}`,
      max_bid_reasoning: `To achieve ${(this.config.roiTarget * 100).toFixed(0)}% ROI after fees, max safe bid is $${maxSafeBid.toFixed(2)}`,
      risk_factors: riskFactors,
      opportunities,
      warnings,
    };

    return {
      item_profile: itemProfile,
      listing_url: listingUrl,
      query_ladder: queryLadder,
      comps_found_raw: rawCompCount,
      comps_after_filtering: comps.length,
      comps,
      median_price: median,
      mean_price: mean,
      price_range: priceRange,
      price_volatility: stdDev,
      iqr: { q1, q3 },
      max_safe_bid: maxSafeBid,
      estimated_resale_price: estimatedResalePrice,
      estimated_profit: estimatedProfit,
      estimated_roi_percent: estimatedRoi,
      confidence_score: confidence,
      confidence_label: label,
      opportunity_score: opportunityScore,
      risk_score: riskScore,
      explanation,
    };
  }

  /**
   * Return a "no data" response with explanation
   */
  private insufficientDataResponse(
    itemProfile: ItemProfile,
    listingUrl: string,
    queryLadder: string[],
    rawCompCount: number,
    filteredCompCount: number
  ): CalculationOutput {
    return {
      item_profile: itemProfile,
      listing_url: listingUrl,
      query_ladder: queryLadder,
      comps_found_raw: rawCompCount,
      comps_after_filtering: filteredCompCount,
      comps: [],
      median_price: null,
      mean_price: null,
      price_range: null,
      price_volatility: 0,
      iqr: null,
      max_safe_bid: null,
      estimated_resale_price: null,
      estimated_profit: null,
      estimated_roi_percent: null,
      confidence_score: 0,
      confidence_label: 'insufficient',
      opportunity_score: 0,
      risk_score: 100,
      explanation: {
        summary: 'INSUFFICIENT DATA - Cannot valuate',
        resale_reasoning: `Found ${rawCompCount} listings but only ${filteredCompCount} passed filtering. Need at least 3 valid comps.`,
        max_bid_reasoning: 'Cannot calculate - insufficient comparable sales data',
        risk_factors: [
          `Only ${filteredCompCount} valid comps (need ≥3 for analysis)`,
          'Item may be too niche or recently listed',
          'Search query may not capture exact matches',
        ],
        opportunities: [],
        warnings: [
          'PASS on this item - insufficient data to value safely',
          'Try a more general search or wait for more listings',
        ],
      },
    };
  }

  // ============================================================================
  // STATISTICAL CALCULATIONS
  // ============================================================================

  private median(sortedPrices: number[]): number {
    const mid = Math.floor(sortedPrices.length / 2);
    return sortedPrices.length % 2 === 0
      ? (sortedPrices[mid - 1] + sortedPrices[mid]) / 2
      : sortedPrices[mid];
  }

  private mean(prices: number[]): number {
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  }

  private standardDeviation(prices: number[]): number {
    const m = this.mean(prices);
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - m, 2), 0) / prices.length;
    return Math.sqrt(variance);
  }

  private quartiles(sortedPrices: number[]): { q1: number; q3: number } {
    const q1Idx = Math.floor(sortedPrices.length * 0.25);
    const q3Idx = Math.floor(sortedPrices.length * 0.75);
    return {
      q1: sortedPrices[q1Idx],
      q3: sortedPrices[q3Idx],
    };
  }

  private avgQualityScore(comps: Comp[]): number {
    if (comps.length === 0) return 0;
    return comps.reduce((sum, c) => sum + (c.quality_score ?? 0.5), 0) / comps.length;
  }

  // ============================================================================
  // BIDDING LOGIC
  // ============================================================================

  private calculateMaxSafeBid(estimatedResalePrice: number): number {
    // Max safe bid = resale price / (1 + ROI target)
    // Example: $100 resale, 30% ROI → max bid = $100 / 1.3 = $76.92
    return estimatedResalePrice / (1 + this.config.roiTarget);
  }

  // ============================================================================
  // CONFIDENCE CALCULATION
  // ============================================================================

  private calculateConfidence(
    compCount: number,
    coefficientOfVariation: number,
    avgQuality: number
  ): { confidence: number; label: 'high' | 'medium' | 'low' | 'insufficient' } {
    let score = 70; // Base score

    // Penalty: low comp count
    if (compCount < this.config.minCompsForConfidence) {
      score -= 30;
    } else if (compCount < this.config.optimalCompsForConfidence) {
      score -= 10;
    } else {
      score += 10;
    }

    // Penalty: high price variance
    if (coefficientOfVariation > 0.5) {
      score -= 20;
    } else if (coefficientOfVariation > 0.3) {
      score -= 10;
    }

    // Penalty: low average quality match
    if (avgQuality < 0.5) {
      score -= 15;
    } else if (avgQuality < 0.7) {
      score -= 5;
    }

    const finalScore = Math.max(0, Math.min(100, score));

    let label: 'high' | 'medium' | 'low' | 'insufficient';
    if (finalScore >= 75) {
      label = 'high';
    } else if (finalScore >= 50) {
      label = 'medium';
    } else if (finalScore >= 25) {
      label = 'low';
    } else {
      label = 'insufficient';
    }

    return { confidence: Math.round(finalScore), label };
  }

  private calculateOpportunityScore(estimatedRoi: number, confidence: number): number {
    // Higher ROI + higher confidence = better opportunity
    const roiBonus = Math.min(50, estimatedRoi / 2); // Cap at 50
    const confidenceBonus = confidence / 2;
    return Math.min(100, roiBonus + confidenceBonus);
  }

  // ============================================================================
  // RISK ANALYSIS
  // ============================================================================

  private analyzeRisks(
    compCount: number,
    coeffVar: number,
    median: number,
    maxSafeBid: number
  ): { riskFactors: string[]; opportunities: string[]; warnings: string[] } {
    const riskFactors: string[] = [];
    const opportunities: string[] = [];
    const warnings: string[] = [];

    // Risk factors
    if (compCount < 5) {
      riskFactors.push(`Limited data: only ${compCount} comps`);
    }
    if (compCount < 3) {
      riskFactors.push('Minimal sample size - unreliable estimate');
    }

    if (coeffVar > 0.5) {
      riskFactors.push('High price variance in comps - inconsistent market');
    } else if (coeffVar > 0.3) {
      riskFactors.push('Moderate price variance');
    }

    // Opportunities
    if (median > maxSafeBid * 1.5) {
      opportunities.push(`Strong margin potential (${((median / maxSafeBid - 1) * 100).toFixed(0)}% upside)`);
    }
    if (compCount >= 10) {
      opportunities.push('Good data quality - sufficient comps');
    }

    // Warnings
    if (maxSafeBid <= 0) {
      warnings.push('WARNING: Unable to calculate valid bid - pass on item');
    }

    return { riskFactors, opportunities, warnings };
  }
}

