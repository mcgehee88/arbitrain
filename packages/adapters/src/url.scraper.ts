import axios from 'axios';
import { JSDOM } from 'jsdom';

export interface ScrapedListing {
  url: string;
  title: string;
  description: string;
  source: string;
  success: boolean;
  error?: string;
}

export class URLScraper {
  private ax = axios.create({
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    timeout: 10000
  });

  async scrapeCtBids(url: string): Promise<ScrapedListing> {
    try {
      const { data } = await this.ax.get(url);
      const dom = new JSDOM(data);
      const doc = dom.window.document;
      
      const title = doc.querySelector('h1')?.textContent || '';
      const description = doc.querySelector('[class*="description"]')?.textContent || 
                         doc.querySelector('[class*="details"]')?.textContent || '';
      
      return {
        url,
        title: title.trim(),
        description: description.trim(),
        source: 'ctbids',
        success: !!title
      };
    } catch (error) {
      return {
        url,
        title: '',
        description: '',
        source: 'ctbids',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async scrapeEbay(url: string): Promise<ScrapedListing> {
    try {
      const { data } = await this.ax.get(url);
      const dom = new JSDOM(data);
      const doc = dom.window.document;
      
      const title = doc.querySelector('[data-test-id="vi-VR-cvipTitle"]')?.textContent ||
                   doc.querySelector('h1[class*="it-title"]')?.textContent ||
                   doc.querySelector('h1')?.textContent || '';
      
      const description = doc.querySelector('[class*="ds_div"]')?.textContent ||
                         doc.querySelector('[id*="viTabs"]')?.textContent || '';
      
      return {
        url,
        title: title.trim(),
        description: description.trim().substring(0, 500),
        source: 'ebay',
        success: !!title
      };
    } catch (error) {
      return {
        url,
        title: '',
        description: '',
        source: 'ebay',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async scrapeMercari(url: string): Promise<ScrapedListing> {
    try {
      const { data } = await this.ax.get(url);
      const dom = new JSDOM(data);
      const doc = dom.window.document;
      
      const title = doc.querySelector('[class*="itemName"]')?.textContent ||
                   doc.querySelector('h1')?.textContent || '';
      
      const description = doc.querySelector('[class*="itemDescription"]')?.textContent ||
                         doc.querySelector('[class*="description"]')?.textContent || '';
      
      return {
        url,
        title: title.trim(),
        description: description.trim().substring(0, 500),
        source: 'mercari',
        success: !!title
      };
    } catch (error) {
      return {
        url,
        title: '',
        description: '',
        source: 'mercari',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async scrapeFacebook(url: string): Promise<ScrapedListing> {
    return {
      url,
      title: '',
      description: '',
      source: 'facebook',
      success: false,
      error: 'Facebook requires authentication. Cannot scrape from this environment.'
    };
  }

  async scrape(url: string): Promise<ScrapedListing> {
    if (url.includes('ctbids.com')) {
      return this.scrapeCtBids(url);
    } else if (url.includes('ebay.com')) {
      return this.scrapeEbay(url);
    } else if (url.includes('mercari.com')) {
      return this.scrapeMercari(url);
    } else if (url.includes('facebook.com')) {
      return this.scrapeFacebook(url);
    } else if (url.includes('shopgoodwill')) {
      return this.scrapeShopGoodwill(url);
    }
    
    return {
      url,
      title: '',
      description: '',
      source: 'unknown',
      success: false,
      error: 'Unknown marketplace'
    };
  }

  private async scrapeShopGoodwill(url: string): Promise<ScrapedListing> {
    try {
      const { data } = await this.ax.get(url);
      const dom = new JSDOM(data);
      const doc = dom.window.document;
      
      const title = doc.querySelector('[class*="itemtitle"]')?.textContent ||
                   doc.querySelector('h1')?.textContent || '';
      
      const description = doc.querySelector('[class*="itemdescription"]')?.textContent ||
                         doc.querySelector('[class*="description"]')?.textContent || '';
      
      return {
        url,
        title: title.trim(),
        description: description.trim().substring(0, 500),
        source: 'shopgoodwill',
        success: !!title
      };
    } catch (error) {
      return {
        url,
        title: '',
        description: '',
        source: 'shopgoodwill',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

