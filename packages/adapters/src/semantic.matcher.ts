export class SemanticMatcher {
  private cache = new Map<string, number>();

  async scoreComp(listingTitle: string, compTitle: string): Promise<number> {
    const key = `${listingTitle}|${compTitle}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const similarity = this.jaccardSimilarity(listingTitle, compTitle);
    this.cache.set(key, similarity);
    return similarity;
  }

  private jaccardSimilarity(str1: string, str2: string): number {
    const tokens1 = new Set(str1.toLowerCase().split(/\s+/));
    const tokens2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }
}

