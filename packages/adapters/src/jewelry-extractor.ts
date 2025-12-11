import { JewelryItem, MetalType, Fineness, GemstoneType, JewelryStyle, JewelryType, Condition } from '../../../packages/shared/src/jewelry-item';

export class JewelryItemExtractor {
  extractFromTitle(title: string, url: string): JewelryItem {
    const lowerTitle = title.toLowerCase();
    
    // Extract metal type
    const metalMatch = this.extractMetalType(lowerTitle);
    
    // Extract fineness (karat/purity)
    const fineMatch = this.extractFineness(lowerTitle);
    
    // Extract gemstone
    const stoneMatch = this.extractGemstone(lowerTitle);
    
    // Extract jewelry type
    const typeMatch = this.extractJewelryType(lowerTitle);
    
    // Extract style
    const styleMatch = this.extractStyle(lowerTitle);
    
    // Extract condition
    const condMatch = this.extractCondition(lowerTitle);
    
    // Extract weight
    const weightMatch = this.extractWeight(lowerTitle);
    
    // Extract size
    const sizeMatch = this.extractSize(lowerTitle);
    
    // Extract gender
    const genderMatch = this.extractGender(lowerTitle);
    
    // Calculate confidence
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
    const patterns: [RegExp, MetalType, number][] = [
      (/\b(14k|14kt|14 k)\s*(white\s+)?gold\b/i, 'gold', 1.0),
      (/\b(18k|18kt|18 k)\s*(white\s+)?gold\b/i, 'gold', 1.0),
      (/\b(10k|10kt|10 k)\s*(white\s+)?gold\b/i, 'gold', 1.0),
      (/\b(22k|22kt|22 k)\s*(white\s+)?gold\b/i, 'gold', 1.0),
      (/\b(24k|24kt|24 k)\s*(white\s+)?gold\b/i, 'gold', 1.0),
      (/\byellow\s+gold\b/i, 'gold', 0.8),
      (/\bwhite\s+gold\b/i, 'gold', 0.8),
      (/\brose\s+gold\b/i, 'gold', 0.8),
      (/\bsterling\s+(silver|925)\b/i, 'silver', 1.0),
      (/\b925\s+silver\b/i, 'silver', 1.0),
      (/\bplatinum\b/i, 'platinum', 0.9),
      (/\bpt950\b/i, 'platinum', 1.0),
      (/\bgold\s+plated\b/i, 'gold', 0.7),
      (/\b(gold|silver)\b/i, 'mixed', 0.5),
    ];

    for (const [pattern, metalType, confidence] of patterns) {
      if (pattern.test(title)) {
        return { value: metalType, confidence };
      }
    }

    return { value: 'unknown', confidence: 0 };
  }

  private extractFineness(title: string): { value: Fineness; confidence: number } {
    const patterns: [RegExp, Fineness, number][] = [
      (/\b14k(t)?\b/i, '14K', 1.0),
      (/\b18k(t)?\b/i, '18K', 1.0),
      (/\b10k(t)?\b/i, '10K', 1.0),
      (/\b22k(t)?\b/i, '22K', 1.0),
      (/\b24k(t)?\b/i, '24K', 1.0),
      (/\b925\b/i, '925', 1.0),
      (/\b950\b/i, '950', 1.0),
      (/\bplated\b/i, 'plated', 0.8),
      (/\bgold\s+plated\b/i, 'plated', 0.9),
    ];

    for (const [pattern, fineness, confidence] of patterns) {
      if (pattern.test(title)) {
        return { value: fineness, confidence };
      }
    }

    return { value: 'unknown', confidence: 0 };
  }

  private extractGemstone(title: string): { value: GemstoneType; carat?: number; count?: number; confidence: number } {
    const stonePatterns: [RegExp, GemstoneType, number][] = [
      (/\bdiamond(s)?\b/i, 'diamond', 1.0),
      (/\bruby(ies)?\b/i, 'ruby', 1.0),
      (/\bsapphire(s)?\b/i, 'sapphire', 1.0),
      (/\bemerald(s)?\b/i, 'emerald', 1.0),
      (/\bpearl(s)?\b/i, 'pearl', 1.0),
    ];

    for (const [pattern, stoneType, confidence] of stonePatterns) {
      if (pattern.test(title)) {
        const caratMatch = /(\d+(?:\.\d+)?)\s*carat(s)?|(\d+(?:\.\d+)?)\s*ct(w)?/i.exec(title);
        const carat = caratMatch ? parseFloat(caratMatch[1] || caratMatch[3]) : null;

        const countMatch = /(\d+)\s*(stone|gemstone|diamond|ruby|sapphire|emerald)/i.exec(title);
        const count = countMatch ? parseInt(countMatch[1]) : null;

        return { value: stoneType, carat: carat || undefined, count: count || undefined, confidence };
      }
    }

    return { value: 'none', confidence: 0.5 };
  }

  private extractJewelryType(title: string): { value: JewelryType; confidence: number } {
    const patterns: [RegExp, JewelryType, number][] = [
      (/\bring(s)?\b/i, 'ring', 1.0),
      (/\bearring(s)?\b/i, 'earring', 1.0),
      (/\bnecklace(s)?\b/i, 'necklace', 1.0),
      (/\bbracelet(s)?\b/i, 'bracelet', 1.0),
      (/\bpendant(s)?\b/i, 'pendant', 1.0),
      (/\bbrooch(es)?\b/i, 'brooch', 1.0),
    ];

    for (const [pattern, typeVal, confidence] of patterns) {
      if (pattern.test(title)) {
        return { value: typeVal, confidence };
      }
    }

    return { value: 'unknown', confidence: 0 };
  }

  private extractStyle(title: string): { value: JewelryStyle; confidence: number } {
    const patterns: [RegExp, JewelryStyle, number][] = [
      (/\bmasonic\b/i, 'masonic', 1.0),
      (/\bsignet\b/i, 'signet', 1.0),
      (/\bcluster\b/i, 'cluster', 1.0),
      (/\bhalo\b/i, 'halo', 1.0),
      (/\bsolitaire\b/i, 'solitaire', 1.0),
      (/\bband\b/i, 'band', 1.0),
      (/\bvintage\b/i, 'vintage', 0.9),
      (/\bmodern\b/i, 'modern', 0.8),
    ];

    for (const [pattern, styleVal, confidence] of patterns) {
      if (pattern.test(title)) {
        return { value: styleVal, confidence };
      }
    }

    return { value: 'unknown', confidence: 0 };
  }

  private extractCondition(title: string): { value: Condition; confidence: number } {
    const patterns: [RegExp, Condition, number][] = [
      (/\b(new|unused|in\s+box|sealed)\b/i, 'new', 1.0),
      (/\b(like\s+new|excellent|mint)\b/i, 'like-new', 1.0),
      (/\b(good|very\s+good|great\s+condition)\b/i, 'good', 1.0),
      (/\b(fair|some\s+wear|minor\s+wear)\b/i, 'fair', 1.0),
      (/\b(poor|damaged|heavily\s+worn)\b/i, 'poor', 1.0),
    ];

    for (const [pattern, condVal, confidence] of patterns) {
      if (pattern.test(title)) {
        return { value: condVal, confidence };
      }
    }

    return { value: 'unknown', confidence: 0 };
  }

  private extractWeight(title: string): { grams: number | null; dwt: number | null } {
    // Try to extract grams
    const gramMatch = /(\d+(?:\.\d+)?)\s*g(rams?)?\b/i.exec(title);
    const grams = gramMatch ? parseFloat(gramMatch[1]) : null;

    // Try to extract pennyweight
    const dwtMatch = /(\d+(?:\.\d+)?)\s*(dwt|pennyweight)\b/i.exec(title);
    const dwt = dwtMatch ? parseFloat(dwtMatch[1]) : null;

    return { grams, dwt };
  }

  private extractSize(title: string): string | null {
    const sizeMatch = /\bsize\s+([0-9.]+[a-z]*)/i.exec(title);
    return sizeMatch ? sizeMatch[1] : null;
  }

  private extractGender(title: string): 'mens' | 'womens' | 'unisex' | 'unknown' {
    if (/\b(men|men's|mens|for\s+men)\b/i.test(title)) return 'mens';
    if (/\b(women|women's|womens|ladies|for\s+women|ladies')\b/i.test(title)) return 'womens';
    if (/\b(unisex|one\s+size|universal)\b/i.test(title)) return 'unisex';
    return 'unknown';
  }

  private extractEra(title: string): string | null {
    if (/\bvintage\b/i.test(title)) return 'vintage';
    if (/\bantique\b/i.test(title)) return 'antique';
    if (/\bmodern\b/i.test(title)) return 'modern';
    if (/\b(retro|art\s+deco|victorian|edwardian)\b/i.test(title)) return title.match(/\b(retro|art\s+deco|victorian|edwardian)\b/i)?.[0] || 'vintage';
    return null;
  }

  private extractHallmark(title: string): string | null {
    const hallmarkMatch = /\b(925|950|14k|18k|10k|pt950|hallmark)\b/i.exec(title);
    return hallmarkMatch ? hallmarkMatch[1] : null;
  }

  private calculateExtractionConfidence(...confidences: number[]): number {
    if (confidences.length === 0) return 0;
    return confidences.reduce((a, b) => a + b) / confidences.length;
  }
}

