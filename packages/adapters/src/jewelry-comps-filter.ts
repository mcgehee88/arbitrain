import { JewelryItem, JewelryComp } from '../../../packages/shared/src/jewelry-item';

export class JewelryCompsFilter {
  filterValidComps(listingItem: JewelryItem, comps: JewelryComp[]): JewelryComp[] {
    return comps.filter(comp => {
      // Must match: metal type, fineness, jewelry type, style
      // Should match: gemstone, condition, weight range
      
      const metalMatch = this.compareMetalType(listingItem.metal_type, comp.metal_type);
      const fineMatch = this.compareFineness(listingItem.fineness, comp.fineness);
      const typeMatch = listingItem.jewelry_type === comp.jewelry_type;
      const styleMatch = listingItem.style === comp.style || listingItem.style === 'unknown' || comp.style === 'unknown';
      
      const stoneMatch = this.compareGemstone(listingItem.primary_stone, comp.primary_stone);
      const weightMatch = this.compareWeight(listingItem.weight_grams, comp.weight_grams, listingItem.weight_dwt, comp.weight_dwt);
      
      // Hard filters: must match
      const passHardFilters = metalMatch && fineMatch && typeMatch && styleMatch;
      
      // Soft filters: should match (used for scoring)
      const softFilterScore = (stoneMatch ? 1 : 0) + (weightMatch ? 1 : 0);
      
      // Calculate attribute match score (0-1)
      comp.attribute_match_score = this.calculateAttributeMatchScore(
        listingItem,
        comp,
        metalMatch,
        fineMatch,
        typeMatch,
        styleMatch,
        stoneMatch,
        weightMatch
      );
      
      // Keep if hard filters pass AND attribute match score is decent
      return passHardFilters && comp.attribute_match_score >= 0.4;
    });
  }

  private compareMetalType(listing: string, comp: string): boolean {
    if (listing === 'unknown' || comp === 'unknown') return true;
    return listing === comp;
  }

  private compareFineness(listing: string, comp: string): boolean {
    if (listing === 'unknown' || comp === 'unknown') return true;
    if (listing === 'plated' && comp !== 'plated') return false;
    if (listing !== 'plated' && comp === 'plated') return false;
    
    // Same karat?
    if (listing === comp) return true;
    
    // Both are 14K+ quality?
    const highQuality = ['14K', '18K', '22K', '24K', '925', '950'];
    return highQuality.includes(listing) && highQuality.includes(comp);
  }

  private compareGemstone(listing: string, comp: string): boolean {
    if (listing === 'none' && comp === 'none') return true;
    if (listing === 'unknown' || comp === 'unknown') return true;
    return listing === comp;
  }

  private compareWeight(listingG: number | null, compG: number | null, listingD: number | null, compD: number | null): boolean {
    // Convert to common unit (grams)
    const listingGrams = listingG || (listingD ? listingD * 1.555 : null); // 1 dwt = 1.555 grams
    const compGrams = compG || (compD ? compD * 1.555 : null);
    
    if (!listingGrams || !compGrams) return true; // Can't compare, assume OK
    
    const variance = Math.abs(listingGrams - compGrams) / listingGrams;
    return variance <= 0.25; // Within 25% is OK
  }

  private calculateAttributeMatchScore(
    listing: JewelryItem,
    comp: JewelryComp,
    metalMatch: boolean,
    fineMatch: boolean,
    typeMatch: boolean,
    styleMatch: boolean,
    stoneMatch: boolean,
    weightMatch: boolean
  ): number {
    let score = 0;
    let maxScore = 0;
    
    // Hard filters (weighted heavily)
    score += metalMatch ? 2 : 0;
    maxScore += 2;
    
    score += fineMatch ? 2 : 0;
    maxScore += 2;
    
    score += typeMatch ? 2 : 0;
    maxScore += 2;
    
    score += styleMatch ? 1.5 : 0;
    maxScore += 1.5;
    
    // Soft filters (weighted less)
    score += stoneMatch ? 1 : 0;
    maxScore += 1;
    
    score += weightMatch ? 1 : 0;
    maxScore += 1;
    
    return maxScore > 0 ? score / maxScore : 0;
  }
}

