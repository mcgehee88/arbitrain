export interface CompTaxonomy {
  categoryId: string;
  categoryName: string;
  itemSpecifics: Record<string, string | string[]>;
}

interface TaxonomyScore {
  score: number;
  details: {
    categoryMatch: boolean;
    specificsMatch: number;
    warnings: string[];
  };
}

export class TaxonomyMatcher {
  private minimumScore = 50;

  score(
    sourceTaxonomy: CompTaxonomy,
    compTaxonomy: CompTaxonomy,
    sourceCondition: string
  ): TaxonomyScore {
    let score = 0;
    const details: TaxonomyScore['details'] = {
      categoryMatch: false,
      specificsMatch: 0,
      warnings: [],
    };

    // Category match (50 points)
    if (sourceTaxonomy.categoryId === compTaxonomy.categoryId) {
      score += 50;
      details.categoryMatch = true;
    } else {
      // Check if in same parent category (jewelry vs watches vs rings)
      const sourceParent = this.getParentCategory(sourceTaxonomy.categoryId);
      const compParent = this.getParentCategory(compTaxonomy.categoryId);
      if (sourceParent === compParent) {
        score += 30;
        details.warnings.push(`Category mismatch (same parent: ${sourceParent})`);
      } else {
        details.warnings.push(
          `Different categories: ${sourceTaxonomy.categoryName} vs ${compTaxonomy.categoryName}`
        );
        return { score: 0, details };
      }
    }

    // Item specifics match (up to 50 points)
    const specificsMatched = this.matchSpecifics(
      sourceTaxonomy.itemSpecifics,
      compTaxonomy.itemSpecifics,
      sourceCondition
    );
    score += specificsMatched * 50;
    details.specificsMatch = specificsMatched;

    if (specificsMatched < 0.5) {
      details.warnings.push(`Low specifics match: ${(specificsMatched * 100).toFixed(0)}%`);
    }

    return { score, details };
  }

  private matchSpecifics(
    sourceSpecs: Record<string, string | string[]>,
    compSpecs: Record<string, string | string[]>,
    sourceCondition: string
  ): number {
    const criticalKeys = this.getCriticalKeys(Object.keys(sourceSpecs));
    if (criticalKeys.length === 0) return 0.5; // Default if no critical specs

    let matched = 0;
    for (const key of criticalKeys) {
      const sourceVal = sourceSpecs[key];
      const compVal = compSpecs[key];

      if (!sourceVal || !compVal) {
        matched += 0.3; // Missing spec, partial credit
        continue;
      }

      if (this.valuesMatch(sourceVal, compVal)) {
        matched += 1;
      }
    }

    return Math.min(1, matched / criticalKeys.length);
  }

  private getCriticalKeys(keys: string[]): string[] {
    // Priority: material > type > brand > color > style
    const priority = ['Material', 'Type', 'Brand', 'Metal', 'Gemstone', 'Color'];
    return keys.filter((k) =>
      priority.some((p) => k.toLowerCase().includes(p.toLowerCase()))
    );
  }

  private valuesMatch(a: string | string[], b: string | string[]): boolean {
    const aVals = Array.isArray(a) ? a : [a];
    const bVals = Array.isArray(b) ? b : [b];

    return aVals.some((av) =>
      bVals.some((bv) => av.toLowerCase().includes(bv.toLowerCase()))
    );
  }

  private getParentCategory(categoryId: string): string {
    // Simplified parent category mapping
    // In production, this would use eBay's full taxonomy
    const parentMap: Record<string, string> = {
      '927': 'jewelry', // Fine jewelry
      '6000': 'jewelry', // Costume jewelry
      '10534': 'jewelry', // Vintage jewelry
      '111733': 'watches', // Wristwatches
      '281': 'coins', // Collectible coins
    };

    return parentMap[categoryId] || 'general';
  }
}

