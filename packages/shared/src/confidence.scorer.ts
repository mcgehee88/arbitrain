export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'MANUAL_REVIEW';

export interface ConfidenceBreakdown {
  level: ConfidenceLevel;
  score: number;
  factors: {
    compCount: number;
    priceVariance: number;
    semanticQuality: number;
    taxonomyQuality: number;
    recommendation: string;
  };
}

export class ConfidenceScorer {
  score(
    numComps: number,
    priceVariance: number,
    avgSemanticSimilarity: number,
    avgTaxonomyScore: number
  ): ConfidenceBreakdown {
    const factors = {
      compCount: numComps,
      priceVariance,
      semanticQuality: avgSemanticSimilarity,
      taxonomyQuality: avgTaxonomyScore / 100,
      recommendation: '',
    };

    // Decision tree
    if (numComps < 3) {
      return {
        level: 'MANUAL_REVIEW',
        score: 0,
        factors: {
          ...factors,
          recommendation:
            'Insufficient comps. Manual research required for reliable pricing.',
        },
      };
    }

    if (avgTaxonomyScore < 50) {
      return {
        level: 'LOW',
        score: 25,
        factors: {
          ...factors,
          recommendation:
            'Taxonomy match is poor. Comps may be misaligned. Manual verification recommended.',
        },
      };
    }

    if (avgSemanticSimilarity < 0.72) {
      return {
        level: 'MEDIUM',
        score: 55,
        factors: {
          ...factors,
          recommendation:
            'Semantic match is moderate. Consider manual review for borderline decisions.',
        },
      };
    }

    // Calculate numeric score (0-100)
    let score = 60; // Base for passing all gates

    // Comp count bonus (max +15)
    if (numComps >= 10) score += 15;
    else if (numComps >= 7) score += 12;
    else if (numComps >= 5) score += 8;

    // Price variance penalty (max -15)
    if (priceVariance > 0.4) score -= 15;
    else if (priceVariance > 0.3) score -= 10;
    else if (priceVariance > 0.2) score -= 5;

    // Semantic quality bonus (max +15)
    if (avgSemanticSimilarity >= 0.88) score += 15;
    else if (avgSemanticSimilarity >= 0.82) score += 10;
    else if (avgSemanticSimilarity >= 0.75) score += 5;

    // Taxonomy quality bonus (max +15)
    if (avgTaxonomyScore >= 80) score += 15;
    else if (avgTaxonomyScore >= 70) score += 10;
    else if (avgTaxonomyScore >= 60) score += 5;

    score = Math.min(100, Math.max(0, score));

    let level: ConfidenceLevel;
    let recommendation = '';

    if (score >= 85) {
      level = 'HIGH';
      recommendation = 'Strong comp match. Safe to use for pricing decisions.';
    } else if (score >= 70) {
      level = 'MEDIUM';
      recommendation = 'Acceptable match. Use as reference but verify with manual research.';
    } else {
      level = 'LOW';
      recommendation =
        'Weak match. Do not rely solely on this analysis. Manual review required.';
    }

    return {
      level,
      score,
      factors: {
        ...factors,
        recommendation,
      },
    };
  }
}

