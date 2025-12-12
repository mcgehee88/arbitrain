/**
 * Comp filtering layer - semantic similarity + attribute matching
 * Filters raw eBay comps to find truly comparable items
 */

import { ItemProfile, Comp } from './types';

export interface FilterConfig {
  similarityThreshold: number; // 0-1, e.g., 0.3
  outlierPercentile: number; // e.g., 0.1 for remove top/bottom 10%
  minAttributeMatch: number; // 0-1
  conditionWeighting: number; // how much to penalize condition mismatch
}

export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  similarityThreshold: 0.3,
  outlierPercentile: 0.1,
  minAttributeMatch: 0.2,
  conditionWeighting: 0.15,
};

export class CompFilter {
  private config: FilterConfig;

  constructor(config: Partial<FilterConfig> = {}) {
    this.config = { ...DEFAULT_FILTER_CONFIG, ...config };
  }

  /**
   * Static convenience method for filtering
   */
  static filterComps(itemProfile: ItemProfile, comps: Comp[], config?: Partial<FilterConfig>): Comp[] {
    const filter = new CompFilter(config);
    return filter.filter(itemProfile, comps);
  }

  /**
   * Main filtering pipeline
   */
  filter(
    listingItem: ItemProfile,
    rawComps: Comp[],
    embeddingScores?: Map<string, number>
  ): Comp[] {
    if (rawComps.length === 0) {
      return [];
    }

    // Step 1: Score each comp (attribute match + semantic similarity)
    const scoredComps = rawComps.map(comp => {
      const attributeMatch = this.scoreAttributeMatch(listingItem, comp);
      const semanticScore = embeddingScores?.get(comp.id) ?? 0.5;
      const conditionPenalty = this.scoreConditionMatch(listingItem.condition, comp.condition);

      // Weighted combination
      const quality =
        attributeMatch * 0.4 + // 40% attribute match
        semanticScore * 0.4 + // 40% semantic similarity
        conditionPenalty * 0.2; // 20% condition match

      return { ...comp, quality_score: quality };
    });

    // Step 2: Remove price outliers (top/bottom percentile)
    const filteredByOutlier = this.removeOutliers(scoredComps, this.config.outlierPercentile);

    // Step 3: Filter by minimum quality threshold
    const filtered = filteredByOutlier.filter(
      comp => comp.quality_score >= this.config.similarityThreshold
    );

    // Step 4: Sort by quality (best matches first)
    filtered.sort((a, b) => (b.quality_score ?? 0) - (a.quality_score ?? 0));

    return filtered;
  }

  /**
   * Score how well a comp matches the listing item based on attributes
   */
  private scoreAttributeMatch(listingItem: ItemProfile, comp: Comp): number {
    let score = 0;
    let maxScore = 0;

    // Category match (critical)
    if (listingItem.category !== 'unknown' && listingItem.category === comp.id.split(':')[0]) {
      score += 0.4;
    }
    maxScore += 0.4;

    // Brand match
    if (listingItem.brand) {
      if (this.stringMatch(listingItem.brand, comp.title)) {
        score += 0.15;
      }
    }
    maxScore += 0.15;

    // Subcategory match
    if (listingItem.subcategory) {
      if (this.stringMatch(listingItem.subcategory, comp.title)) {
        score += 0.15;
      }
    }
    maxScore += 0.15;

    // Material match
    if (listingItem.material) {
      if (this.stringMatch(listingItem.material, comp.title)) {
        score += 0.15;
      }
    }
    maxScore += 0.15;

    // Category-specific attributes
    for (const [key, value] of Object.entries(listingItem.attributes)) {
      if (value === null || value === undefined) continue;

      const valueStr = String(value).toLowerCase();
      if (this.stringMatch(valueStr, comp.title)) {
        score += 0.05;
      }
      maxScore += 0.05;
    }

    // Normalize
    return maxScore > 0 ? Math.min(1.0, score / maxScore) : 0.3;
  }

  /**
   * Score condition match between listing and comp
   * Returns penalty: 1.0 = perfect match, 0.5 = acceptable, 0.0 = mismatch
   */
  private scoreConditionMatch(listingCondition: string, compCondition: string): number {
    if (listingCondition === 'unknown' || compCondition === 'unknown') {
      return 0.7; // Accept if unknown
    }

    const mapping: Record<string, string[]> = {
      new: ['new', 'like_new'],
      like_new: ['new', 'like_new', 'good'],
      good: ['like_new', 'good', 'fair'],
      fair: ['good', 'fair', 'poor'],
      poor: ['poor', 'fair'],
    };

    const acceptable = mapping[listingCondition] || [listingCondition];
    return acceptable.includes(compCondition) ? 1.0 : 0.5;
  }

  /**
   * Helper: check if needle appears in haystack (case-insensitive)
   */
  private stringMatch(needle: string, haystack: string): boolean {
    const needleLower = needle.toLowerCase();
    const haystackLower = haystack.toLowerCase();
    return haystackLower.includes(needleLower);
  }

  /**
   * Remove price outliers using percentile method
   */
  private removeOutliers(comps: Comp[], percentile: number): Comp[] {
    if (comps.length < 4) {
      return comps; // Not enough to remove outliers
    }

    const prices = comps.map(c => c.sold_price).sort((a, b) => a - b);
    const lowerBound = prices[Math.floor(prices.length * percentile)];
    const upperBound = prices[Math.ceil(prices.length * (1 - percentile))];

    return comps.filter(comp => {
      const isOutlier = comp.sold_price < lowerBound || comp.sold_price > upperBound;
      return !isOutlier;
    });
  }
}



