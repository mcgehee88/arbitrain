import { JewelryItem, MetalType, Fineness, GemstoneType, JewelryStyle, JewelryType, Condition } from '../../../packages/shared/src/jewelry-item';

export class JewelryItemExtractor {
  extractFromTitle(title: string, url: string): JewelryItem {
    const lowerTitle = title.toLowerCase();
    
    const metalMatch = this.extractMetalType(lowerTitle);
    const fineMatch = this.extractFineness(lowerTitle);
    const stoneMatch = this.extractGemstone(lowerTitle);
    const typeMatch = this.extractJewelryType(lowerTitle);
    const styleMatch = this.extractStyle(lowerTitle);
    const condMatch = this.extractCondition(lowerTitle);
    const weightMatch = this.extractWeight(lowerTitle);
    const sizeMatch = this.extractSize(lowerTitle);
    const genderMatch = this.extractGender(lowerTitle);
    
    const confidence = this.calculateExtractionConfidence(
      metalMatch.confidence,
      fineMatch.confidence,
      stoneMatch.confidence,
      typeMatch.confidence,
      styleMatch.confidence,
      condMatch.confidence
    );
    
    return {
      title,
      url,
      metal_type: metalMatch.value,
      fineness: fineMatch.value,
      weight_grams: weightMatch.grams,
      weight_dwt: weightMatch.dwt,
      primary_stone: stoneMatch.value,
      stone_carat: stoneMatch.carat,
      stone_count: stoneMatch.count,
      jewelry_type: typeMatch.value,
      style: styleMatch.value,
      condition: condMatch.value,
      era: this.extractEra(lowerTitle),
      hallmark: this.extractHallmark(title),
      size: sizeMatch,
      gender: genderMatch,
      extraction_confidence: confidence,
    };
  }

  private extractMetalType(title: string): { value: MetalType; confidence: number } {
    const patterns: Array<[RegExp, MetalType, number]> = [
      [/\b(14k|14kt)\s*gold\b/i, 'gold', 1.0],
      [/\b(18k|18kt)\s*gold\b/i, 'gold', 1.0],
      [/\b(10k|10kt)\s*gold\b/i, 'gold', 1.0],
      [/\byellow\s+gold\b/i, 'gold', 0.9],
      [/\bwhite\s+gold\b/i, 'gold', 0.9],
      [/\bsteel\b/i, 'silver', 0.7],
      [/\bplatinum\b/i, 'platinum', 0.9],
      [/\bgold\b/i, 'gold', 0.6],
    ];

    for (const [pattern, metalType, confidence] of patterns) {
      if (pattern.test(title)) {
        return { value: metalType, confidence };
      }
    }
    return { value: 'unknown', confidence: 0 };
  }

  private extractFineness(title: string): { value: Fineness; confidence: number } {
    const patterns: Array<[RegExp, Fineness, number]> = [
      [/\b14k\b/i, '14K', 1.0],
      [/\b18k\b/i, '18K', 1.0],
      [/\b10k\b/i, '10K', 1.0],
      [/\b925\b/i, '925', 1.0],
      [/\bplated\b/i, 'plated', 0.8],
    ];

    for (const [pattern, fineness, confidence] of patterns) {
      if (pattern.test(title)) {
        return { value: fineness, confidence };
      }
    }
    return { value: 'unknown', confidence: 0 };
  }

  private extractGemstone(title: string): { value: GemstoneType; carat?: number; count?: number; confidence: number } {
    const patterns: Array<[RegExp, GemstoneType, number]> = [
      [/\bdiamond(s)?\b/i, 'diamond', 1.0],
      [/\bruby\b/i, 'ruby', 1.0],
      [/\bsapphire\b/i, 'sapphire', 1.0],
      [/\bemerald\b/i, 'emerald', 1.0],
      [/\bpearl(s)?\b/i, 'pearl', 1.0],
    ];

    for (const [pattern, stoneType, confidence] of patterns) {
      if (pattern.test(title)) {
        const caratMatch = /(\d+(?:\.\d+)?)\s*carat|(\d+(?:\.\d+)?)\s*ct/i.exec(title);
        const carat = caratMatch ? parseFloat(caratMatch[1] || caratMatch[2]) : null;
        const countMatch = /(\d+)\s*stone/i.exec(title);
        const count = countMatch ? parseInt(countMatch[1]) : null;
        return { value: stoneType, carat: carat || undefined, count: count || undefined, confidence };
      }
    }
    return { value: 'none', confidence: 0.5 };
  }

  private extractJewelryType(title: string): { value: JewelryType; confidence: number } {
    const patterns: Array<[RegExp, JewelryType, number]> = [
      [/\bring(s)?\b/i, 'ring', 1.0],
      [/\bearring(s)?\b/i, 'earring', 1.0],
      [/\bnecklace(s)?\b/i, 'necklace', 1.0],
      [/\bbracelet(s)?\b/i, 'bracelet', 1.0],
      [/\bpendant(s)?\b/i, 'pendant', 1.0],
      [/\bbrooch(es)?\b/i, 'brooch', 1.0],
    ];

    for (const [pattern, typeVal, confidence] of patterns) {
      if (pattern.test(title)) {
        return { value: typeVal, confidence };
      }
    }
    return { value: 'unknown', confidence: 0 };
  }

  private extractStyle(title: string): { value: JewelryStyle; confidence: number } {
    const patterns: Array<[RegExp, JewelryStyle, number]> = [
      [/\bmasonic\b/i, 'masonic', 1.0],
      [/\bsignet\b/i, 'signet', 1.0],
      [/\bcluster\b/i, 'cluster', 1.0],
      [/\bhalo\b/i, 'halo', 1.0],
      [/\bsolitaire\b/i, 'solitaire', 1.0],
      [/\bband\b/i, 'band', 1.0],
      [/\bvintage\b/i, 'vintage', 0.9],
      [/\bmodern\b/i, 'modern', 0.8],
    ];

    for (const [pattern, styleVal, confidence] of patterns) {
      if (pattern.test(title)) {
        return { value: styleVal, confidence };
      }
    }
    return { value: 'unknown', confidence: 0 };
  }

  private extractCondition(title: string): { value: Condition; confidence: number } {
    const patterns: Array<[RegExp, Condition, number]> = [
      [/\b(new|unused|mint)\b/i, 'new', 1.0],
      [/\b(like.?new|excellent)\b/i, 'like-new', 1.0],
      [/\b(good|great)\b/i, 'good', 1.0],
      [/\b(fair|wear)\b/i, 'fair', 1.0],
      [/\b(poor|damaged)\b/i, 'poor', 1.0],
    ];

    for (const [pattern, condVal, confidence] of patterns) {
      if (pattern.test(title)) {
        return { value: condVal, confidence };
      }
    }
    return { value: 'unknown', confidence: 0 };
  }

  private extractWeight(title: string): { grams: number | null; dwt: number | null } {
    const gramMatch = /(\d+(?:\.\d+)?)\s*g(?:ram)?/i.exec(title);
    const grams = gramMatch ? parseFloat(gramMatch[1]) : null;

    const dwtMatch = /(\d+(?:\.\d+)?)\s*dwt/i.exec(title);
    const dwt = dwtMatch ? parseFloat(dwtMatch[1]) : null;

    return { grams, dwt };
  }

  private extractSize(title: string): string | null {
    const sizeMatch = /\bsize\s+([0-9.]+)/i.exec(title);
    return sizeMatch ? sizeMatch[1] : null;
  }

  private extractGender(title: string): 'mens' | 'womens' | 'unisex' | 'unknown' {
    if (/\b(men|mens)\b/i.test(title)) return 'mens';
    if (/\b(women|womens|ladies)\b/i.test(title)) return 'womens';
    if (/\bunisex\b/i.test(title)) return 'unisex';
    return 'unknown';
  }

  private extractEra(title: string): string | null {
    if (/\bvintage\b/i.test(title)) return 'vintage';
    if (/\bantique\b/i.test(title)) return 'antique';
    if (/\bmodern\b/i.test(title)) return 'modern';
    return null;
  }

  private extractHallmark(title: string): string | null {
    const match = /\b(925|950|14k|18k|pt950)\b/i.exec(title);
    return match ? match[1] : null;
  }

  private calculateExtractionConfidence(...confidences: number[]): number {
    if (confidences.length === 0) return 0;
    return confidences.reduce((a, b) => a + b) / confidences.length;
  }
}

