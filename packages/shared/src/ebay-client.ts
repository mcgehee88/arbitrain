/**
 * eBay API client with OAuth2 client_credentials authentication
 * Uses eBay Browse API for fetching sold comparables
 */

import axios, { AxiosInstance } from 'axios';
import { Comp, Condition } from './types';

export interface eBayClientConfig {
  appId: string;      // EBAY_PROD_APP_ID (used as client_id)
  certId: string;     // EBAY_PROD_CERT_ID (used as client_secret)
  baseUrl?: string;
  timeout?: number;
}

export interface QueryLadderResult {
  level: number;
  query: string;
  compsFound: Comp[];
}

export class eBayClient {
  private appId: string;
  private certId: string;
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: eBayClientConfig) {
    this.appId = config.appId;
    this.certId = config.certId;

    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.ebay.com',
      timeout: config.timeout || 10000,
    });
  }

  /**
   * Get or refresh the OAuth access token
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken !== null && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    console.log('[eBay Auth] Fetching new OAuth token...');

    try {
      const response = await axios.post(
        'https://api.ebay.com/identity/v1/oauth2/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
        }).toString(),
        {
          auth: {
            username: this.appId,
            password: this.certId,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        }
      );

      const token = response.data.access_token;
      this.accessToken = token;
      // Token expires in `expires_in` seconds, refresh after 90% of that time
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiry = Date.now() + expiresIn * 1000 * 0.9;

      console.log(`[eBay Auth] Token acquired. Expires in ${expiresIn}s`);
      return token;
    } catch (error: any) {
      console.error('[eBay Auth] Failed to get token:', error.response?.data || error.message);
      throw new Error(`eBay OAuth failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Execute query ladder - progressive search from specific → general
   */
  async executeQueryLadder(queries: string[]): Promise<QueryLadderResult[]> {
    const results: QueryLadderResult[] = [];

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`  [eBay] Level ${i + 1}: "${query}"`);

      try {
        const comps = await this.searchSoldItems(query, 50);
        console.log(`       → Found ${comps.length} comps`);

        results.push({
          level: i + 1,
          query,
          compsFound: comps,
        });

        // Stop if we found enough comps
        const totalComps = results.reduce((sum, r) => sum + r.compsFound.length, 0);
        if (totalComps >= 20) {
          console.log(`  [eBay] Reached 20 comps, stopping query ladder`);
          break;
        }
      } catch (error: any) {
        console.error(`       ✗ Error: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Search for sold items on eBay
   */
  async searchSoldItems(query: string, limit: number = 50): Promise<Comp[]> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get('https://api.ebay.com/buy/browse/v1/item_summary/search', {
        params: {
          q: query,
          limit: Math.min(limit, 200),
          filter: 'conditionIds:{3000|3050}', // Any condition
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        },
        timeout: 10000,
      });

      const comps: Comp[] = [];
      const items = response.data.itemActivities || [];

      for (const item of items) {
        const listing = item.listings?.[0];
        if (!listing) continue;

        comps.push({
          id: item.item?.itemId || '',
          title: listing.title || item.item?.title || 'Unknown',
          sold_price: parsing.parsePrice(listing.soldPrice?.value),
          sold_date: listing.soldDate || new Date().toISOString(),
          condition: this.parseCondition(item.item?.condition),
          shipping_cost: parsing.parsePrice(listing.shippingCost?.value) || 0,
          listing_type: 'auction',
          is_outlier: false,
          quality_score: 0.5,
          source: 'ebay',
        });
      }

      return comps;
    } catch (error: any) {
      console.error(`[eBay Search] Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse eBay condition to our enum
   */
  private parseCondition(ebayCondition?: string): Condition {
    if (!ebayCondition) return 'unknown';

    const lower = ebayCondition.toLowerCase();
    if (lower.includes('new')) return 'new';
    if (lower.includes('excellent') || lower.includes('like new')) return 'like_new';
    if (lower.includes('good')) return 'good';
    if (lower.includes('acceptable') || lower.includes('fair')) return 'fair';
    if (lower.includes('poor') || lower.includes('for parts')) return 'poor';

    return 'unknown';
  }
}

// Price parsing utility
const parsing = {
  parsePrice: (value?: string | number): number => {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    const parsed = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  },
};






