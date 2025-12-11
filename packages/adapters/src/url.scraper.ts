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
      if (url.includes('facebook.com/marketplace')) {
        return await this.scrapeFacebookMarketplace(url);
      }
      if (url.includes('ctbids.com')) {
        return await this.scrapeCTBids(url);
      }
      if (url.includes('mercari.com')) {
        return await this.scrapeMercari(url);
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

    let title = 'Unknown Item';
    const productMatch = data.match(/"@type":"Product"[^}]*?"name":"([^"]+)"/);
    if (productMatch) {
      title = productMatch[1].substring(0, 200);
    }

    if (title === 'Unknown Item') {
      const textMatch = data.match(/Picture \d+ of \d+([^<]{20,200}?)(?:Have one to sell|$)/);
      if (textMatch) {
        title = textMatch[1].trim().substring(0, 200);
      }
    }

    let condition = 'unknown';
    if (data.includes('Pre-owned - Good')) condition = 'good';
    else if (data.includes('New')) condition = 'new';
    else if (data.includes('Like New')) condition = 'like_new';
    else if (data.includes('Pre-owned')) condition = 'used';

    return { title, condition, url };
  }

  private async scrapeFacebookMarketplace(url: string): Promise<ScrapedItem> {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    let title = 'Unknown Item';
    
    // Facebook embeds title in meta tags or og:title
    const titleMatch = data.match(/<meta property="og:title" content="([^"]+)"/);
    if (titleMatch) {
      title = titleMatch[1].substring(0, 200);
    }

    // Fallback: look in script tags for item data
    if (title === 'Unknown Item') {
      const scriptMatch = data.match(/"title":"([^"]+)"/);
      if (scriptMatch) {
        title = scriptMatch[1].substring(0, 200);
      }
    }

    return { title, url };
  }

  private async scrapeCTBids(url: string): Promise<ScrapedItem> {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const dom = new JSDOM(data);
    const doc = dom.window.document;

    // CTBids stores title in h1 or specific class
    let title = doc.querySelector('h1')?.textContent?.trim() || '';
    if (!title) {
      title = doc.querySelector('[class*="title"]')?.textContent?.trim() || '';
    }

    // Fallback to URL parsing if h1 fails
    if (!title || title.length < 5) {
      const pathParts = url.split('/');
      title = pathParts[pathParts.length - 1]
        ?.replace(/[?#].+/, '')
        .replace(/-/g, ' ')
        .substring(0, 200) || 'Unknown Item';
    }

    return { title, url };
  }

  private async scrapeMercari(url: string): Promise<ScrapedItem> {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    let title = 'Unknown Item';

    // Mercari uses meta tags
    const ogTitleMatch = data.match(/<meta property="og:title" content="([^"]+)"/);
    if (ogTitleMatch) {
      title = ogTitleMatch[1].substring(0, 200);
    }

    // Fallback: look for h1
    if (title === 'Unknown Item') {
      const h1Match = data.match(/<h1[^>]*>([^<]+)<\/h1>/);
      if (h1Match) {
        title = h1Match[1].trim().substring(0, 200);
      }
    }

    return { title, url };
  }

  private async scrapeGeneric(url: string): Promise<ScrapedItem> {
    const { data } = await axios.get(url);
    const dom = new JSDOM(data);
    const doc = dom.window.document;

    const title = doc.querySelector('h1')?.textContent?.trim() || 'Unknown Item';

    return { title, url };
  }
}

