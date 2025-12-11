import { Comp, CalculationOutput, ItemProfile, Listing, Condition } from './types';

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
    // Filter comps for quality match
    const qualityFiltered = this.filterCompsForQualityMatch(itemProfile, comps);
    const afterOutlierRemoval = this.removeOutliers(qualityFiltered);

    if (afterOutlierRemoval.length === 0) {
      return this.generateLowConfidenceOutput(itemProfile, ebayQuery, queryLadder, comps, listing, 'No valid comps after quality filtering');
    }

    const medianPrice = this.calculateMedian(afterOutlierRemoval.map(c => c.sold_price));
    const priceRange = {
      low: Math.min(...afterOutlierRemoval.map(c => c.sold_price)),
      high: Math.max(...afterOutlierRemoval.map(c => c.sold_price)),
    };

    const numComps = afterOutlierRemoval.length;
    const confidenceScore = this.calculateConfidence(numComps, itemProfile, afterOutlierRemoval, comps);
    const confidenceLabel = this.getConfidenceLabel(confidenceScore);

    const buyerPremium = listing.current_price * (this.buyerPremiumPercent / 100);
    const allInCost = listing.current_price + buyerPremium + this.outboundShippingCost + (medianPrice * 0.1325);
    const profit = medianPrice - allInCost;
    const roi = (profit / listing.current_price) * 100;

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
      max_safe_bid: this.calculateMaxBid(medianPrice, this.targetROI),
      estimated_profit: profit,
      estimated_roi_percent: roi,
      opportunity_score: Math.min(100, Math.max(0, roi * 5)),
      risk_score: this.calculateRisk(numComps, itemProfile, priceRange),
      explanation: {
        summary: `Expected resale: $${medianPrice.toFixed(2)}. Max safe bid: $${this.calculateMaxBid(medianPrice, this.targetROI).toFixed(2)}. ${numComps} quality comps. Confidence: ${confidenceLabel.toUpperCase()}.`,
        resale_reasoning: `Median sold price from ${numComps} comparable ${itemProfile.material} ${itemProfile.category} items is $${medianPrice.toFixed(2)}.`,
        max_bid_reasoning: `Max bid accounts for buyer premium (${this.buyerPremiumPercent}%), shipping ($${this.outboundShippingCost}), resale fees (~${this.platformFeePercent}%), and maintains ${this.targetROI}% ROI target.`,
        risk_factors: this.generateRiskFactors(numComps, itemProfile, afterOutlierRemoval, comps),
        opportunities: this.generateOpportunities(roi, numComps, priceRange, listing.current_price),
        warnings: this.generateWarnings(confidenceScore, numComps, itemProfile, comps),
      },
    };
  }

  private filterCompsForQualityMatch(profile: ItemProfile, comps: Comp[]): Comp[] {
    const filtered = comps.filter(comp => {
      const compTitle = comp.title.toLowerCase();
      
      // For jewelry: must contain material or type keywords
      if (profile.item_type === 'jewelry') {
        const hasMaterial = profile.material && (compTitle.includes(profile.material) || compTitle.includes('ring') || compTitle.includes('jewelry'));
        const hasType = profile.keywords.some(k => compTitle.includes(k.toLowerCase()));
        const isCostumeLot = compTitle.includes('lot') || compTitle.includes('bundle') || compTitle.includes('mix') || compTitle.includes('fashion');
        
        if (isCostumeLot) return false;
        return hasMaterial && (hasType || profile.material !== 'unknown');
      }
      
      return true;
    });

    return filtered.length > 0 ? filtered : comps.slice(0, Math.max(3, comps.length / 2));
  }

  private removeOutliers(comps: Comp[]): Comp[] {
    if (comps.length < 4) return comps;

    const prices = comps.map(c => c.sold_price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    const threshold = 2.5;
    const filtered = comps.filter(c => Math.abs(c.sold_price - mean) <= threshold * stdDev);

    return filtered.length >= 3 ? filtered : comps;
  }

  private calculateConfidence(numComps: number, profile: ItemProfile, qualityComps: Comp[], allComps: Comp[]): number {
    let score = 50; // Start at 50

    // Comp count bonus (up to 30 points)
    if (numComps >= 20) score += 30;
    else if (numComps >= 10) score += 20;
    else if (numComps >= 5) score += 10;
    else if (numComps < 3) score -= 20;

    // Title overlap check
    const titleOverlap = this.checkTitleOverlap(profile, qualityComps);
    if (titleOverlap > 0.7) score += 15;
    else if (titleOverlap > 0.4) score += 5;
    else if (titleOverlap < 0.2) score -= 20;

    // Material match bonus
    if (profile.material !== 'unknown' && qualityComps.some(c => c.title.toLowerCase().includes(profile.material!))) {
      score += 10;
    }

    // Lot/bundle penalty
    if (profile.is_lot) score -= 15;

    // Price variance penalty
    if (qualityComps.length > 2) {
      const prices = qualityComps.map(c => c.sold_price);
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const cv = Math.sqrt(prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length) / mean;
      if (cv > 0.5) score -= 10; // High variance
    }

    return Math.min(100, Math.max(0, score));
  }

  private checkTitleOverlap(profile: ItemProfile, comps: Comp[]): number {
    if (comps.length === 0) return 0;

    const sourceKeywords = new Set([
      ...profile.keywords,
      profile.material,
      profile.category
    ].filter(k => k).map(k => String(k).toLowerCase().split(' ')[0]));

    const overlaps = comps.map(comp => {
      const compKeywords = new Set(comp.title.toLowerCase().split(/\W+/));
      const matches = [...sourceKeywords].filter(k => compKeywords.has(k)).length;
      return matches / sourceKeywords.size;
    });

    return overlaps.reduce((a, b) => a + b, 0) / overlaps.length;
  }

  private calculateMaxBid(resalePrice: number, targetRoi: number): number {
    const feePercent = this.platformFeePercent + this.buyerPremiumPercent;
    const totalCost = this.outboundShippingCost;

    const maxBid = (resalePrice * (1 - targetRoi / 100) - totalCost) / (1 + feePercent / 100);
    return Math.max(0, maxBid);
  }

  private calculateMedian(prices: number[]): number {
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private calculateRisk(numComps: number, profile: ItemProfile, priceRange: { low: number; high: number }): number {
    let risk = 30; // Base risk

    if (numComps < 3) risk += 40;
    else if (numComps < 10) risk += 20;

    if (profile.is_lot) risk += 20;
    if (profile.extraction_confidence < 0.6) risk += 15;

    const variance = priceRange.high > 0 ? (priceRange.high - priceRange.low) / (priceRange.high) : 0;
    if (variance > 0.5) risk += 20;

    return Math.min(100, risk);
  }

  private generateRiskFactors(numComps: number, profile: ItemProfile, qualityComps: Comp[], allComps: Comp[]): string[] {
    const factors: string[] = [];

    if (numComps < 5) factors.push('Low comp count - limited market data');
    if (numComps < 3) factors.push('Very few comps - market is unclear');
    if (profile.is_lot) factors.push('Lot/bundle - harder to price individual items');
    if (profile.extraction_confidence < 0.7) factors.push('Item profile confidence is medium - check extraction notes');
    if (qualityComps.length < allComps.length / 2) factors.push('Many comps were filtered out for low quality match');

    return factors;
  }

  private generateOpportunities(roi: number, numComps: number, priceRange: { low: number; high: number }, currentBid: number): string[] {
    const opps: string[] = [];

    if (roi > 50) opps.push('Excellent arbitrage opportunity - strong profit margin.');
    else if (roi > 30) opps.push('Good opportunity - healthy profit at current bid level.');

    if (numComps > 15) opps.push('Strong market liquidity - easy to resell.');

    if (currentBid < priceRange.low * 0.5) opps.push('Listing price significantly below market comps - potential bargain.');

    return opps;
  }

  private generateWarnings(confidence: number, numComps: number, profile: ItemProfile, comps: Comp[]): string[] {
    const warnings: string[] = [];

    if (confidence < 40) warnings.push('⚠️ LOW CONFIDENCE - Results may not be reliable. Verify manually before bidding.');
    else if (confidence < 60) warnings.push('⚠️ MEDIUM CONFIDENCE - Limited comp matching. Check results carefully.');

    if (numComps === 0) warnings.push('⚠️ NO VALID COMPS - Cannot establish market price.');
    if (profile.is_lot) warnings.push('⚠️ LOT ITEM - Per-unit value is unclear. Verify lot size and condition.');
    if (profile.extraction_confidence < 0.6) warnings.push('⚠️ WEAK EXTRACTION - Item details may be misclassified.');

    if (comps.length > 0 && comps.length < numComps) {
      warnings.push(`⚠️ QUALITY FILTERING - Removed ${comps.length - numComps} comps that didn't match item profile.`);
    }

    return warnings;
  }

  private getConfidenceLabel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private generateLowConfidenceOutput(
    itemProfile: ItemProfile,
    ebayQuery: string,
    queryLadder: string[],
    comps: Comp[],
    listing: Listing,
    reason: string
  ): CalculationOutput {
    return {
      item_profile: itemProfile,
      ebay_query: ebayQuery,
      query_ladder: queryLadder,
      comps_found: comps,
      comps_after_outlier_removal: [],
      median_price: 0,
      price_range: { low: 0, high: 0 },
      num_comps: 0,
      confidence_score: 10,
      confidence_label: 'low',
      estimated_resale_price: 0,
      max_safe_bid: 0,
      estimated_profit: 0,
      estimated_roi_percent: 0,
      opportunity_score: 0,
      risk_score: 95,
      explanation: {
        summary: `ANALYSIS FAILED: ${reason}`,
        resale_reasoning: reason,
        max_bid_reasoning: 'Cannot calculate - insufficient data.',
        risk_factors: [`${reason}. Do not bid without manual research.`],
        opportunities: [],
        warnings: [
          `🚫 CANNOT ANALYZE - ${reason}`,
          'Manual market research required before bidding.'
        ],
      },
    };
  }
}

