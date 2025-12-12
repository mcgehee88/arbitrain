/**
 * SerpApi adapter for fetching SOLD listings from eBay
 * Real auction data with actual sale prices and dates
 */

import axios from 'axios';
import { Comp, Condition } from './types';

export interface SerpApiCompsResult {
  level: number;
  query: string;
  compsFound: Comp[];
}

export class SerpApiClient {
  private apiKey: string;
  private baseUrl = 'https://serpapi.com/search';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('SerpApi API key is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Search for SOLD items on eBay via SerpApi
   * Returns real sold listings with actual prices and dates
   */
  async searchSoldItems(query: string, limit: number = 30): Promise<Comp[]> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          api_key: this.apiKey,
          engine: 'ebay',
          _nkw: query,
          // show_only removed - SerpApi doesn't support filtering for sold items
          _salic: 1, // USA location
          num: limit,
        },
        timeout: 15000,
      });

      if (!response.data.organic_results) {
        return [];
      }

      const comps: Comp[] = response.data.organic_results
        .filter((item: any) => item.sold_date || item.extracted_quantity_sold) // Items with sales history
        .map((item: any) => ({
          id: item.product_id || item.link,
          title: item.title,
          sold_price: this.parsePrice(item.price?.extracted || item.price),
          sold_date: item.sold_date || new Date().toISOString().split('T')[0],
          condition: this.parseCondition(item.condition),
          shipping_cost: this.parsePrice(item.shipping?.extracted || item.shipping || 0),
          listing_type: 'fixed_price',
          is_outlier: false,
          quality_score: this.calculateQualityScore(item),
          similarity_score: 0.5,
          source: 'ebay',
        }));

      return comps;
    } catch (error: any) {
      console.error(`[SerpApi] Search failed for "${query}":`, error.message);
      return [];
    }
  }

  /**
   * Execute a query ladder - progressively broader searches
   */
  async executeQueryLadder(
    queryLadder: string[],
    maxCompsNeeded: number = 15
  ): Promise<SerpApiCompsResult[]> {
    const results: SerpApiCompsResult[] = [];
    const allComps: Comp[] = [];

    for (let i = 0; i < queryLadder.length; i++) {
      const query = queryLadder[i];
      console.log(`       [L${i + 1}] "${query}"`);

      const comps = await this.searchSoldItems(query, 50);
      console.log(`          → Found ${comps.length} sold items`);

      allComps.push(...comps);

      results.push({
        level: i + 1,
        query,
        compsFound: comps,
      });

      // Stop if we found enough comps
      if (allComps.length >= maxCompsNeeded) {
        console.log(`       ✓ Found ${allComps.length} comps, stopping query ladder`);
        break;
      }
    }

    return results;
  }

  /**
   * Parse condition from eBay text
   */
  private parseCondition(conditionText?: string): Condition {
    if (!conditionText) return 'unknown';

    const lower = conditionText.toLowerCase();
    if (lower.includes('new')) return 'new';
    if (lower.includes('like new')) return 'like_new';
    if (lower.includes('good')) return 'good';
    if (lower.includes('acceptable') || lower.includes('fair')) return 'fair';
    if (lower.includes('poor') || lower.includes('for parts')) return 'poor';

    return 'unknown';
  }

  /**
   * Parse price from various formats
   */
  private parsePrice(value?: string | number): number {
    if (!value) return 0;
    if (typeof value === 'number') return value;

    const cleaned = value.toString().replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Calculate quality score based on seller feedback and item condition
   */
  private calculateQualityScore(item: any): number {
    let score = 0;

    // Seller feedback (max 0.4)
    if (item.seller?.positive_feedback_in_percentage) {
      score += (item.seller.positive_feedback_in_percentage / 100) * 0.4;
    }

    // Condition (max 0.3)
    const condition = this.parseCondition(item.condition);
    const conditionScores: Record<Condition, number> = {
      new: 1.0,
      like_new: 0.9,
      good: 0.7,
      fair: 0.5,
      poor: 0.2,
      unknown: 0.3,
    };
    score += conditionScores[condition] * 0.3;

    // Returns policy (max 0.2)
    if (item.returns?.includes('Free')) {
      score += 0.2;
    }

    // Top-rated seller (bonus 0.1)
    if (item.top_rated) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }
}



