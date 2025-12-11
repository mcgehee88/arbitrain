import axios from 'axios';

interface SemanticScore {
  similarity: number;
  reasoning: string;
}

export class SemanticMatcher {
  private apiKey: string;
  private model = 'text-embedding-3-small';
  private threshold = 0.78;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor(apiKey: string, threshold?: number) {
    this.apiKey = apiKey;
    if (threshold) this.threshold = threshold;
  }

  async scoreComp(
    sourceListing: { title: string; material?: string; type?: string; condition?: string },
    compTitle: string
  ): Promise<SemanticScore> {
    try {
      const sourceEmbed = await this.embed(
        `${sourceListing.title} ${sourceListing.material || ''} ${sourceListing.type || ''}`.trim()
      );
      const compEmbed = await this.embed(compTitle);

      const similarity = this.cosineSimilarity(sourceEmbed, compEmbed);

      return {
        similarity,
        reasoning:
          similarity >= this.threshold
            ? 'Semantic match'
            : `Below threshold (${similarity.toFixed(2)} < ${this.threshold})`,
      };
    } catch (err) {
      console.error('Embedding error:', err);
      return {
        similarity: 0,
        reasoning: 'Embedding failed - treating as no match',
      };
    }
  }

  private async embed(text: string): Promise<number[]> {
    const cached = this.embeddingCache.get(text);
    if (cached) return cached;

    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        input: text,
        model: this.model,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const embedding = response.data.data[0].embedding;
    this.embeddingCache.set(text, embedding);
    return embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return magA && magB ? dotProduct / (magA * magB) : 0;
  }
}

