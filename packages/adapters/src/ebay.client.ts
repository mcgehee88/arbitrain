import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface EBaySearchResponse {
  itemSummaries?: Array<{
    itemId: string;
    title: string;
    price: { value: string; currency: string };
    condition: string;
    itemWebUrl: string;
    soldDate?: string;
  }>;
  total: number;
  warnings?: Array<{ message: string }>;
}

interface EBayTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class EBayClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private tokenExpiry: number = 0;
  private clientId: string;
  private clientSecret: string;
  private isProduction: boolean;

  constructor(clientId: string, clientSecret: string, isProduction = true) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.isProduction = isProduction;

    const baseURL = isProduction
      ? 'https://api.ebay.com'
      : 'https://api.sandbox.ebay.com';

    this.client = axios.create({
      baseURL,
      timeout: 10000,
    });
  }

  private async getToken(): Promise<string> {
    // Return cached token if still valid
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    const auth = Buffer.from(
      `${this.clientId}:${this.clientSecret}`
    ).toString('base64');

    const response = await axios.post<EBayTokenResponse>(
      'https://api.ebay.com/identity/v1/oauth2/token',
      'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    this.token = response.data.access_token;
    this.tokenExpiry = Date.now() + response.data.expires_in * 1000 - 60000; // Refresh 1 min before expiry

    return this.token;
  }

  async searchSoldListings(query: string, condition: string): Promise<any[]> {
    try {
      const token = await this.getToken();
      
      const response = await this.client.get<EBaySearchResponse>('/buy/browse/v1/item_summary/search', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
        },
        params: {
          q: query,
          filter: 'conditionIds:{3000}',
          limit: 25,
          sort: '-soldDate',
        }
      });

      if (!response.data.itemSummaries) {
        return [];
      }

      const mappedComps = response.data.itemSummaries.map(item => ({
        id: item.itemId,
        title: item.title,
        sold_price: parseFloat(item.price.value),
        condition: item.condition,
        sold_date: item.soldDate || new Date().toISOString(),
        shipping_cost: 0,
        listing_type: 'auction',
        is_outlier: false,
        quality_score: 0.5,
        source: 'ebay',
      }));

      return mappedComps;
    } catch (error) {
      console.error('eBay search error:', error);
      throw error;
    }
  }

  async searchSoldComps(
    query: string,
    limit: number = 50,
    conditionFilter?: string[]
  ): Promise<EBaySearchResponse> {
    try {
      const token = await this.getToken();

      let filters = `(condition:${['LIKE_NEW', 'GOOD', 'EXCELLENT'].join(',')})`;
      if (conditionFilter?.length) {
        filters = `(condition:${conditionFilter.join(',')})`;
      }

      const params = new URLSearchParams({
        q: query,
        sort: 'newlyListed',
        limit: limit.toString(),
        filter: filters,
      });

      const response = await this.client.get<EBaySearchResponse>(
        '/buy/browse/v1/item_summary/search',
        {
          params,
          headers: {
            Authorization: `Bearer ${token}`,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('eBay API Error:', {
          status: error.response?.status,
          message: error.response?.data,
          query,
        });
      }
      throw error;
    }
  }

  mapCondition(ebayCondition: string): string {
    const conditionMap: { [key: string]: string } = {
      NEW: 'new',
      LIKE_NEW: 'like_new',
      GOOD: 'good',
      ACCEPTABLE: 'fair',
      UNSPECIFIED: 'unknown',
    };
    return conditionMap[ebayCondition] || 'unknown';
  }
}



