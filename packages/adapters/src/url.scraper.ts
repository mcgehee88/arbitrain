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
      // Fallback for other marketplaces
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

    // eBay title is in <h1 class="it-title"> or <span id="itemTitle">
    let title = doc.querySelector('h1.it-title')?.textContent?.trim() ||
                doc.querySelector('span#itemTitle')?.textContent?.trim() ||
                doc.querySelector('[data-test-id="vi-acc-del-range"]')?.textContent?.trim() ||
                'Unknown Item';

    title = title.split('|')[0].trim(); // Remove extra info after |

    // Try to extract condition
    const condText = doc.body.textContent || '';
    let condition = 'unknown';
    if (condText.includes('Used - Good')) condition = 'good';
    else if (condText.includes('New')) condition = 'new';
    else if (condText.includes('Like New')) condition = 'like_new';
    else if (condText.includes('Pre-owned')) condition = 'used';

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

