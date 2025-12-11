import { Comp, CalculationOutput, ItemProfile, Listing, Condition } from './types';

export class CalculationEngine {
  private targetROI: number = 30;
  private buyerPremiumPercent: number = 12;
  private platformFeePercent: number = 13.25;
  private outboundShippingCost: number = 8;

  analyze(
    itemProfile: ItemProfile,
    comps: Comp[],
    listing: Listing,
    ebayQuery?: string,
    queryLadder?: string[]
  ): CalculationOutput {
    if (!comps || comps.length === 0) {
      throw new Error('No comps provided to calculator');
    }

    const afterOutlierRemoval = this.removeOutliers(comps);
    const prices = afterOutlierRemoval.map((c) => c.sold_price);
    
    if (prices.length === 0) {
      throw new Error('No valid comps after outlier removal');
    }

    const medianPrice = this.calculateMedian(prices);
    const priceRange = {
      low: Math.min(...prices),
      high: Math.max(...prices),
    };

    const numComps = afterOutlierRemoval.length;
    const confidenceScore = this.calculateConfidence(numComps);
    const confidenceLabel = this.getConfidenceLabel(confidenceScore);

    const buyerPremium = listing.current_price * (this.buyerPremiumPercent / 100);
    const allInCost =
      listing.current_price +
      buyerPremium +
      (listing.bid_increment || 0) +
      (comps[0]?.shipping_cost || 10);

    const resaleFees = medianPrice * (this.platformFeePercent / 100);
    const netProceeds = medianPrice - resaleFees - this.outboundShippingCost;
    const profit = netProceeds - allInCost;
    const roiPercent = (profit / allInCost) * 100;

    const maxSafeBid = this.calculateMaxBid(
      medianPrice,
      this.targetROI,
      this.outboundShippingCost,
      this.platformFeePercent
    );

    const opportunityScore = Math.max(0, Math.min(100, roiPercent * 2));
    const riskScore = this.calculateRiskScore(
      numComps,
      priceRange,
      medianPrice,
      listing.current_price
    );

    const warnings = this.generateWarnings(
      numComps,
      confidenceScore,
      priceRange,
      medianPrice,
      listing.current_price,
      itemProfile.is_lot,
      itemProfile.extraction_confidence
    );

    const opportunities = this.generateOpportunities(
      roiPercent,
      profit,
      numComps,
      priceRange,
      medianPrice
    );

    return {
      item_profile: itemProfile,
      ebay_query: ebayQuery || 'auto-generated',
      query_ladder: queryLadder || [itemProfile.raw_title],
      comps_found: comps,
      comps_after_outlier_removal: afterOutlierRemoval,
      median_price: medianPrice,
      price_range: priceRange,
      num_comps: numComps,
      confidence_score: confidenceScore,
      confidence_label: confidenceLabel,
      estimated_resale_price: medianPrice,
      max_safe_bid: maxSafeBid,
      estimated_profit: profit,
      estimated_roi_percent: roiPercent,
      opportunity_score: opportunityScore,
      risk_score: riskScore,
      explanation: {
        summary: `Median resale: $${medianPrice.toFixed(2)}. Max safe bid: $${maxSafeBid.toFixed(2)}. Est. profit: $${profit.toFixed(2)} at ${roiPercent.toFixed(1)}% ROI.`,
        resale_reasoning: `Based on ${numComps} recent sold ${itemProfile.condition} condition comps from eBay.`,
        max_bid_reasoning: `Accounts for buyer premium (${this.buyerPremiumPercent}%), shipping, resale fees (~${this.platformFeePercent}%), and ${this.targetROI}% target ROI.`,
        risk_factors: warnings,
        opportunities: opportunities,
        warnings: warnings,
      },
    };
  }

  private removeOutliers(comps: Comp[]): Comp[] {
    if (comps.length < 4) return comps;

    const prices = comps.map((c) => c.sold_price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance =
      prices.reduce((a, p) => a + Math.pow(p - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    // Use 2.5 std devs instead of 2, and keep at least 3 comps
    const filtered = comps.filter((c) => {
      const zscore = Math.abs((c.sold_price - mean) / stdDev);
      return zscore < 2.5;
    });

    // If we filtered too aggressively, return at least the median priced ones
    if (filtered.length < 3) {
      return comps.sort((a, b) => a.sold_price - b.sold_price).slice(Math.floor(comps.length * 0.2), Math.ceil(comps.length * 0.8));
    }

    return filtered;
  }

  private calculateMedian(prices: number[]): number {
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private calculateConfidence(numComps: number): number {
    if (numComps >= 10) return 90;
    if (numComps >= 5) return 75;
    if (numComps >= 3) return 60;
    return 40;
  }

  private getConfidenceLabel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 75) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  private calculateMaxBid(
    medianPrice: number,
    targetROI: number,
    outboundShipping: number,
    platformFeePercent: number
  ): number {
    const fees = medianPrice * (platformFeePercent / 100);
    const netProceeds = medianPrice - fees - outboundShipping;
    const targetProfit = netProceeds * (targetROI / 100);
    return netProceeds - targetProfit;
  }

  private calculateRiskScore(
    numComps: number,
    priceRange: { low: number; high: number },
    medianPrice: number,
    currentPrice: number
  ): number {
    let risk = 0;

    if (numComps < 3) risk += 40;
    else if (numComps < 5) risk += 25;
    else if (numComps < 10) risk += 10;

    const priceSpread = (priceRange.high - priceRange.low) / medianPrice;
    if (priceSpread > 0.5) risk += 25;
    else if (priceSpread > 0.3) risk += 15;

    if (currentPrice > medianPrice * 0.8) risk += 20;

    return Math.min(100, risk);
  }

  private generateWarnings(
    numComps: number,
    confidenceScore: number,
    priceRange: { low: number; high: number },
    medianPrice: number,
    currentPrice: number,
    isLot: boolean,
    extractionConfidence: number
  ): string[] {
    const warnings: string[] = [];

    if (numComps < 3)
      warnings.push('Low comp count - results may be unreliable.');
    if (confidenceScore < 60)
      warnings.push('Low confidence score - use caution.');
    
    const spread = (priceRange.high - priceRange.low) / medianPrice;
    if (spread > 0.5)
      warnings.push('High price variance - market may be volatile.');
    
    if (currentPrice > medianPrice * 0.8)
      warnings.push('Bid is high relative to median - margins thin.');
    
    if (isLot)
      warnings.push('Bundle/lot detected - harder to value accurately.');
    
    if (extractionConfidence < 0.7)
      warnings.push('Item profile confidence low - may need manual review.');

    return warnings;
  }

  private generateOpportunities(
    roiPercent: number,
    profit: number,
    numComps: number,
    priceRange: { low: number; high: number },
    medianPrice: number
  ): string[] {
    const opps: string[] = [];

    if (roiPercent > 50) opps.push('Excellent ROI potential.');
    if (roiPercent > 30 && roiPercent <= 50)
      opps.push('Good profit margin.');
    
    if (profit > 100 && profit < 500)
      opps.push('Mid-range profit - solid deal.');
    
    if (numComps > 10)
      opps.push('Strong comp data - reliable valuation.');
    
    const spread = (priceRange.high - priceRange.low) / medianPrice;
    if (spread < 0.2)
      opps.push('Tight price range - stable market.');

    if (opps.length === 0) {
      opps.push('Conservative opportunity - lower risk.');
    }

    return opps;
  }
}


