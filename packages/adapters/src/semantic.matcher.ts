import axios from 'axios';

interface EmbeddingResponse {
  data: Array<{ embedding: number[] }>;
}

export class SemanticMatcher {
  private openaiKey: string;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor(openaiKey: string) {
    this.openaiKey = openaiKey;
  }

  async getEmbedding(text: string): Promise<number[]> {
    const normalized = text.toLowerCase().trim();
    if (this.embeddingCache.has(normalized)) {
      return this.embeddingCache.get(normalized)!;
    }

    try {
      const response = await axios.post<EmbeddingResponse>(
        'https://api.openai.com/v1/embeddings',
        {
          model: 'text-embedding-3-small',
          input: text,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const embedding = response.data.data[0].embedding;
      this.embeddingCache.set(normalized, embedding);
      return embedding;
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      return Array(1536).fill(0);
    }
  }

  cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magA += vecA[i] * vecA[i];
      magB += vecB[i] * vecB[i];
    }

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);
    return magA && magB ? dotProduct / (magA * magB) : 0;
  }

  async scoreComp(listingTitle: string, compTitle: string): Promise<number> {
    const [listingEmbed, compEmbed] = await Promise.all([
      this.getEmbedding(listingTitle),
      this.getEmbedding(compTitle),
    ]);

    const similarity = this.cosineSimilarity(listingEmbed, compEmbed);
    return Math.max(0, Math.min(1, similarity));
  }
}


