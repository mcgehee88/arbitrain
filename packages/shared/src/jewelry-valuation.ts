import { JewelryComp } from './jewelry-item';

export interface ValuationResult {
  valid_comps_count: number;
  median_price: number;
  mean_price: number;
  price_range: { low: number; high: number };
  standard_deviation: number;
  max_safe_bid: number; // 30% ROI target
  confidence_score: number; // 0-100
  risk_factors: string[];
  recommendation: string;
}

export class JewelryValuation {
  calculateValuation(validComps: JewelryComp[], roiTarget: number = 0.30): ValuationResult {
    if (validComps.length === 0) {
      return {
        valid_comps_count: 0,
        median_price: 0,
        mean_price: 0,
        price_range: { low: 0, high: 0 },
        standard_deviation: 0,
        max_safe_bid: 0,
        confidence_score: 0,
        risk_factors: ['No valid comps found'],
        recommendation: 'Cannot value - insufficient data',
      };
    }

    const prices = validComps.map(c => c.sold_price).sort((a, b) => a - b);
    
    const median = this.calculateMedian(prices);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const stdDev = this.calculateStandardDeviation(prices, mean);
    
    const riskFactors: string[] = [];
    let confidence = 100;

    // Confidence penalties based on data quality
    if (validComps.length < 5) {
      confidence -= 20;
      riskFactors.push(`Only ${validComps.length} comps - limited sample size`);
    } else if (validComps.length < 10) {
      confidence -= 10;
      riskFactors.push(`${validComps.length} comps - moderate sample size`);
    }

    // Penalize high price variance
    const coefficientOfVariation = stdDev / mean;
    if (coefficientOfVariation > 0.4) {
      confidence -= 15;
      riskFactors.push('High price variance in comps');
    } else if (coefficientOfVariation > 0.25) {
      confidence -= 5;
      riskFactors.push('Moderate price variance');
    }

    // Penalize low average attribute match
    const avgAttrMatch = validComps.reduce((a, b) => a + b.attribute_match_score, 0) / validComps.length;
    if (avgAttrMatch < 0.6) {
      confidence -= 10;
      riskFactors.push('Comps are imperfect matches');
    }

    // Calculate max safe bid (30% ROI = sell at median, profit 30%)
    const maxSafeBid = median / (1 + roiTarget);

    // Ensure confidence is 0-100
    confidence = Math.max(0, Math.min(100, confidence));

    const recommendation = this.getRecommendation(confidence, validComps.length, coefficientOfVariation);

    return {
      valid_comps_count: validComps.length,
      median_price: parseFloat(median.toFixed(2)),
      mean_price: parseFloat(mean.toFixed(2)),
      price_range: {
        low: parseFloat(prices[0].toFixed(2)),
        high: parseFloat(prices[prices.length - 1].toFixed(2)),
      },
      standard_deviation: parseFloat(stdDev.toFixed(2)),
      max_safe_bid: parseFloat(maxSafeBid.toFixed(2)),
      confidence_score: Math.round(confidence),
      risk_factors: riskFactors,
      recommendation,
    };
  }

  private calculateMedian(sortedPrices: number[]): number {
    const mid = Math.floor(sortedPrices.length / 2);
    return sortedPrices.length % 2 !== 0
      ? sortedPrices[mid]
      : (sortedPrices[mid - 1] + sortedPrices[mid]) / 2;
  }

  private calculateStandardDeviation(prices: number[], mean: number): number {
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    return Math.sqrt(variance);
  }

  private getRecommendation(confidence: number, compCount: number, coeffVar: number): string {
    if (confidence >= 80) return 'Strong valuation - bid with confidence';
    if (confidence >= 60) return 'Moderate valuation - reasonable bid';
    if (confidence >= 40) return 'Weak valuation - bid conservatively or pass';
    return 'Cannot confidently value - suggest passing';
  }
}

