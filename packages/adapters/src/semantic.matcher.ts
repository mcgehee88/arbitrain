export class SemanticMatcher {
  calculateSimilarity(title1: string, title2: string): number {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const t1 = normalize(title1);
    const t2 = normalize(title2);
    
    const words1 = new Set(t1.split(/\s+/));
    const words2 = new Set(t2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  async scoreComp(listingTitle: string, compTitle: string): Promise<number> {
    return this.calculateSimilarity(listingTitle, compTitle);
  }
}


