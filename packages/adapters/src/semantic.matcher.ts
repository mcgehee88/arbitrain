// Simple string distance matcher (no external API needed)
// Good enough for MVP - captures semantic similarity via overlap

export class SemanticMatcher {
  private cache = new Map<string, number>();

  async scoreComp(listingTitle: string, compTitle: string): Promise<number> {
    const key = `${listingTitle}|${compTitle}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const similarity = this.stringSimilarity(listingTitle, compTitle);
    this.cache.set(key, similarity);
    return similarity;
  }

  private stringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Tokenize
    const tokens1 = new Set(s1.split(/\s+/));
    const tokens2 = new Set(s2.split(/\s+/));
    
    // Jaccard similarity
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
  }
}

