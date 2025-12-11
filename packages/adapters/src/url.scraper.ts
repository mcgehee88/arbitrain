import axios from 'axios';
import { JSDOM } from 'jsdom';

export interface ScrapedItem {
  url: string;
  title: string;
  description?: string;
  price?: number;
  condition?: string;
  source: 'ebay' | 'facebook' | 'ctbids' | 'shopgoodwill' | 'fallback';
  timestamp: string;
}

export class URLScraper {
  async scrape(url: string): Promise<ScrapedItem | null> {
    try {
      // Try marketplace-specific scrapers first
      if (url.includes('ebay.com')) return await this.scrapeEBay(url);
      if (url.includes('facebook.com')) return await this.scrapeFacebook(url);
      if (url.includes('ctbids.com')) return await this.scrapeCTBids(url);
      if (url.includes('shopgoodwill.com')) return await this.scrapeShopGoodwill(url);
      
      // Fallback to generic title extraction
      return await this.scrapeGeneric(url);
    } catch (error) {
      console.error(`Scrape failed for ${url}:`, error);
      return null;
    }
  }

  private async scrapeEBay(url: string): Promise<ScrapedItem> {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    const dom = new JSDOM(response.data);
    const doc = dom.window.document;

    const title = doc.querySelector('h1.it-title')?.textContent?.trim() ||
                  doc.querySelector('[data-testid="vi-acc-del-range"] span')?.textContent?.trim() ||
                  '';
    const condition = doc.querySelector('.SECONDARY_INFO')?.textContent?.trim() || 'unknown';

    return {
      url,
      title: title || 'Unknown Item',
      condition,
      source: 'ebay',
      timestamp: new Date().toISOString(),
    };
  }

  private async scrapeFacebook(url: string): Promise<ScrapedItem> {
    // Facebook Marketplace blocks scraping; fall back to title extraction
    return await this.scrapeGeneric(url);
  }

  private async scrapeCTBids(url: string): Promise<ScrapedItem> {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const dom = new JSDOM(response.data);
    const doc = dom.window.document;

    const title = doc.querySelector('h1')?.textContent?.trim() ||
                  doc.querySelector('.item-title')?.textContent?.trim() ||
                  '';

    return {
      url,
      title: title || 'Unknown Item',
      source: 'ctbids',
      timestamp: new Date().toISOString(),
    };
  }

  private async scrapeShopGoodwill(url: string): Promise<ScrapedItem> {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const dom = new JSDOM(response.data);
    const doc = dom.window.document;

    const title = doc.querySelector('.item-title')?.textContent?.trim() ||
                  doc.querySelector('h1')?.textContent?.trim() ||
                  '';

    return {
      url,
      title: title || 'Unknown Item',
      source: 'shopgoodwill',
      timestamp: new Date().toISOString(),
    };
  }

  private async scrapeGeneric(url: string): Promise<ScrapedItem> {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000,
      });
      const dom = new JSDOM(response.data);
      const doc = dom.window.document;

      // Try common title selectors
      let title = 
        doc.querySelector('h1')?.textContent?.trim() ||
        doc.querySelector('title')?.textContent?.trim() ||
        doc.querySelector('[data-test-id="title"]')?.textContent?.trim() ||
        'Unknown Item';

      return {
        url,
        title,
        source: 'fallback',
        timestamp: new Date().toISOString(),
      };
    } catch {
      // Extract title from URL as last resort
      const urlParts = url.split('/');
      let title = urlParts[urlParts.length - 1]
        .replace(/[-_]/g, ' ')
        .replace(/\?.*/, '')
        .trim();

      return {
        url,
        title: title || 'Unknown Item',
        source: 'fallback',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

