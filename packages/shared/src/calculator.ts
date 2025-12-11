import { Comp, CalculationOutput, ItemProfile, Listing } from './types';

export class CalculationEngine {
  private targetROI: number = 30;
  private buyerPremiumPercent: number = 12;
  private platformFeePercent: number = 13.25;
  private outboundShippingCost: number = 8;

  analyze(
    itemProfile: ItemProfile,
    ebayQuery: string,
    queryLadder: string[],
    comps: Comp[],
    listing: Listing
  ): CalculationOutput {
    const afterOutlierRemoval = this.removeOutliers(comps);
    const medianPrice = this.calculateMedian(
      afterOutlierRemoval.map((c) => c.sold_price)
    );
    const priceRange = {
      low: Math.min(...afterOutlierRemoval.map((c) => c.sold_price)),
      high: Math.max(...afterOutlierRemoval.map((c) => c.sold_price)),
    };

    const numComps = afterOutlierRemoval.length;
    const confidenceScore = this.calculateConfidence(numComps);
    const confidenceLabel = this.getConfidenceLabel(confidenceScore);

    const buyerPremium = listing.current_price * (this.buyerPremiumPercent / 100);
    const allInCost =
      listing.current_price +
      buyerPremium +
      (listing.bid_increment || 0) +
      5; // handling

    const platformFee = medianPrice * (this.platformFeePercent / 100);
    const totalExitCost = platformFee + this.outboundShippingCost;

    const netProfit = medianPrice - allInCost - totalExitCost;
    const roi = (netProfit / allInCost) * 100;

    const maxBid = this.calculateMaxBid(
      medianPrice,
      this.targetROI,
      buyerPremium,
      platformFee
    );

    const opportunityScore = this.calculateOpportunityScore(
      numComps,
      confidenceScore,
      roi
    );
    const riskScore = this.calculateRiskScore(
      numComps,
      priceRange,
      itemProfile.is_lot
    );

    const warnings: string[] = [];
    if (numComps < 3) warnings.push('Low comp count - confidence limited');
    if (itemProfile.is_lot) warnings.push('Matching lots only - may be inaccurate');
    if (itemProfile.condition === 'unknown') warnings.push('Condition unclear - estimates broad');
    if (priceRange.high - priceRange.low > medianPrice * 0.5)
      warnings.push('Large price variance - check conditions');

    return {
      item_profile: itemProfile,
      ebay_query: ebayQuery,
      query_ladder: queryLadder,
      comps_found: comps,
      comps_after_outlier_removal: afterOutlierRemoval,
      median_price: medianPrice,
      price_range: priceRange,
      num_comps: numComps,
      confidence_score: confidenceScore,
      confidence_label: confidenceLabel,
      estimated_resale_price: medianPrice,
      max_safe_bid: Math.round(maxBid),
      estimated_profit: Math.round(netProfit),
      estimated_roi_percent: Math.round(roi * 10) / 10,
      opportunity_score: opportunityScore,
      risk_score: riskScore,
      explanation: {
        summary: `Found ${numComps} comps (${confidenceLabel} confidence). Median: $${medianPrice.toFixed(
          2
        )}. Safe max bid: $${Math.round(maxBid)}.`,
        resale_reasoning: `Median eBay sold price from ${numComps} ${confidenceLabel} confidence comps: $${medianPrice.toFixed(
          2
        )}.`,
        max_bid_reasoning: `Accounts for ${this.buyerPremiumPercent}% buyer premium, ~${this.platformFeePercent}% resale fees, $${this.outboundShippingCost} shipping. Maintains ${this.targetROI}% ROI target.`,
        risk_factors: this.identifyRisks(
          itemProfile,
          numComps,
          priceRange,
          medianPrice
        ),
        opportunities: this.identifyOpportunities(
          numComps,
          roi,
          confidenceScore
        ),
        warnings,
      },
    };
  }

  private removeOutliers(comps: Comp[]): Comp[] {
    if (comps.length <= 3) return comps;

    const prices = comps.map((c) => c.sold_price);
    const mean = prices.reduce((a, b) => a + b) / prices.length;
    const stdDev = Math.sqrt(
      prices.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / prices.length
    );

    return comps.filter(
      (comp) =>
        Math.abs(comp.sold_price - mean) <= stdDev * 2
    );
  }

  private calculateMedian(prices: number[]): number {
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private calculateConfidence(numComps: number): number {
    if (numComps >= 8) return 95;
    if (numComps >= 5) return 80;
    if (numComps >= 3) return 60;
    if (numComps >= 1) return 30;
    return 0;
  }

  private getConfidenceLabel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 75) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  private calculateMaxBid(
    medianPrice: number,
    targetROI: number,
    buyerPremium: number,
    platformFee: number
  ): number {
    const desiredProfit =
      medianPrice * (targetROI / 100 / (1 + targetROI / 100));
    const maxBid =
      medianPrice - desiredProfit - buyerPremium - platformFee - this.outboundShippingCost;
    return Math.max(maxBid, 0);
  }

  private calculateOpportunityScore(
    numComps: number,
    confidenceScore: number,
    roi: number
  ): number {
    const compScore = Math.min(numComps / 10, 1) * 30;
    const confScore = (confidenceScore / 100) * 30;
    const roiScore = Math.min(roi / 50, 1) * 40;
    return Math.round(compScore + confScore + roiScore);
  }

  private calculateRiskScore(
    numComps: number,
    priceRange: { low: number; high: number },
    isLot: boolean
  ): number {
    let score = 0;
    if (numComps < 3) score += 30;
    else if (numComps < 5) score += 20;
    const variance = (priceRange.high - priceRange.low) / priceRange.low;
    if (variance > 0.5) score += 30;
    else if (variance > 0.25) score += 15;
    if (isLot) score += 20;
    return Math.min(score, 100);
  }

  private identifyRisks(
    itemProfile: ItemProfile,
    numComps: number,
    priceRange: { low: number; high: number },
    medianPrice: number
  ): string[] {
    const risks: string[] = [];
    if (numComps < 3) risks.push('Limited comps - extrapolation risk');
    if (priceRange.high / priceRange.low > 1.5)
      risks.push('High price variance - condition sensitivity');
    if (itemProfile.extraction_confidence < 70)
      risks.push('Item profile uncertain');
    if (itemProfile.is_lot)
      risks.push('Lot matching is approximate');
    return risks;
  }

  private identifyOpportunities(
    numComps: number,
    roi: number,
    confidenceScore: number
  ): string[] {
    const opps: string[] = [];
    if (numComps >= 8 && roi > 30)
      opps.push('Strong data + good margin - bid confidently');
    if (roi > 50) opps.push('High ROI potential');
    if (confidenceScore >= 80 && numComps >= 5)
      opps.push('Solid comp set - reliable estimate');
    return opps;
  }
}

