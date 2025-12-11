import axios from 'axios';
import { JSDOM } from 'jsdom';

export interface ScrapedItem {
  title: string;
  price?: number;
  condition?: string;
  url: string;
}

export class URLScraper {
  async scrape(url: string): Promise<ScrapedItem | null> {
    try {
      if (url.includes('ebay.com')) {
        return await this.scrapeEBay(url);
      }
      return await this.scrapeGeneric(url);
    } catch (err) {
      console.log(`Scrape failed for ${url}: ${err}`);
      return null;
    }
  }

  private async scrapeEBay(url: string): Promise<ScrapedItem> {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const dom = new JSDOM(data);
    const doc = dom.window.document;

    // Try to extract from schema.org Product name
    let title = 'Unknown Item';
    const htmlText = data || '';
    
    // Look for Schema.org Product definition with name
    const productMatch = htmlText.match(/"@type":"Product"[^}]*?"name":"([^"]+)"/);
    if (productMatch) {
      title = productMatch[1].substring(0, 200);
    }

    // Fallback: Look for text patterns
    if (title === 'Unknown Item') {
      const textMatch = htmlText.match(/Picture \d+ of \d+([^<]{20,200}?)(?:Have one to sell|$)/);
      if (textMatch) {
        title = textMatch[1].trim().substring(0, 200);
      }
    }

    // Try to extract condition from body text
    let condition = 'unknown';
    if (htmlText.includes('Pre-owned - Good')) condition = 'good';
    else if (htmlText.includes('New')) condition = 'new';
    else if (htmlText.includes('Like New')) condition = 'like_new';
    else if (htmlText.includes('Pre-owned')) condition = 'used';

    return {
      title: title || 'Unknown Item',
      condition,
      url,
    };
  }

  private async scrapeGeneric(url: string): Promise<ScrapedItem> {
    const { data } = await axios.get(url);
    const dom = new JSDOM(data);
    const doc = dom.window.document;

    const title = doc.querySelector('h1')?.textContent?.trim() || 'Unknown Item';

    return {
      title,
      url,
    };
  }
}

