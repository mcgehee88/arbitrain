import { Listing, Comp, CalculationOutput } from './types';

export class CalculationEngine {
  private targetROI: number = 30;

  analyze(listing: Listing, comps: Comp[]): CalculationOutput {
    const expectedResalePrice = this.getMedianPrice(comps);
    const allInCosts = this.calculateAllInCosts(listing);
    const maxBid = this.calculateMaxBid(expectedResalePrice, allInCosts);
    const profit = expectedResalePrice - maxBid - allInCosts;
    const roi = profit > 0 ? (profit / maxBid) * 100 : 0;

    return {
      expected_resale_price: expectedResalePrice,
      max_safe_bid: maxBid,
      estimated_profit: Math.max(0, profit),
      estimated_roi_percent: Math.round(roi * 100) / 100,
      opportunity_score: this.scoreOpportunity(roi, profit),
      risk_score: this.scoreRisk(comps.length, expectedResalePrice),
      confidence_score: this.scoreConfidence(comps.length),
      explanation: {
        summary: `Expected resale: $${expectedResalePrice.toFixed(2)}. Max safe bid: $${maxBid.toFixed(2)}. Estimated profit: $${Math.max(0, profit).toFixed(2)} at ${Math.round(roi * 100) / 100}% ROI.`,
        resale_reasoning: `Median sold price from ${comps.length} recent comps is $${expectedResalePrice.toFixed(2)}.`,
        max_bid_reasoning: `Max bid accounts for buyer premium (${listing.buyer_premium_percent}%), shipping ($${listing.shipping_cost}), resale fees (~$15), and maintains ${this.targetROI}% ROI target.`,
        risk_factors: comps.length < 3 ? ['Limited comps available'] : [],
        opportunities: roi < 10 ? ['Limited upside. Bid conservatively.'] : ['Good margin. Can afford to bid higher if needed.'],
      },
    };
  }

  private getMedianPrice(comps: Comp[]): number {
    const prices = comps.map((c) => c.sold_price).sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    return prices.length % 2 !== 0 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
  }

  private calculateAllInCosts(listing: Listing): number {
    const buyerPremium = listing.current_bid * (listing.buyer_premium_percent / 100);
    const resaleFees = 15; // Rough estimate
    return buyerPremium + listing.shipping_cost + resaleFees;
  }

  private calculateMaxBid(expectedResalePrice: number, allInCosts: number): number {
    return (expectedResalePrice - allInCosts) / (1 + this.targetROI / 100);
  }

  private scoreOpportunity(roi: number, profit: number): number {
    if (roi > 50 && profit > 100) return 100;
    if (roi > 30 && profit > 50) return 80;
    if (roi > 10) return 50;
    return Math.max(0, Math.round(roi * 5));
  }

  private scoreRisk(compCount: number, expectedResalePrice: number): number {
    if (compCount > 10) return 10;
    if (compCount > 5) return 20;
    if (compCount > 3) return 40;
    return 80;
  }

  private scoreConfidence(compCount: number): number {
    if (compCount > 10) return 95;
    if (compCount > 5) return 80;
    if (compCount > 3) return 60;
    return 30;
  }
}

