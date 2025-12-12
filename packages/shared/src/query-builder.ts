/**
 * Query ladder builder
 * Generates progressive search queries from specific → general
 */

import { ItemProfile } from './types';

export class QueryBuilder {
  /**
   * Build a query ladder for eBay search
   * Goes from most-specific to most-general
   */
  buildQueryLadder(item: ItemProfile, limit: number = 5): string[] {
    const queries: string[] = [];

    // Level 1: All specific attributes
    const level1 = this.buildLevel1(item);
    if (level1) queries.push(level1);

    // Level 2: Category + key attributes
    const level2 = this.buildLevel2(item);
    if (level2 && !queries.includes(level2)) queries.push(level2);

    // Level 3: Category + subcategory
    const level3 = this.buildLevel3(item);
    if (level3 && !queries.includes(level3)) queries.push(level3);

    // Level 4: Category + material (if relevant)
    const level4 = this.buildLevel4(item);
    if (level4 && !queries.includes(level4)) queries.push(level4);

    // Level 5: Subcategory alone
    const level5 = this.buildLevel5(item);
    if (level5 && !queries.includes(level5)) queries.push(level5);

    // Level 6: Category alone
    const level6 = this.buildLevel6(item);
    if (level6 && !queries.includes(level6)) queries.push(level6);

    // Return top N unique queries
    return queries.slice(0, limit);
  }

  /**
   * Level 1: All specific attributes (most specific)
   * e.g., "14k gold diamond ring vintage"
   */
  private buildLevel1(item: ItemProfile): string | null {
    const parts: string[] = [];

    // Add key attributes
    if (item.attributes['fineness']) parts.push(String(item.attributes['fineness']));
    if (item.attributes['metal_type']) parts.push(String(item.attributes['metal_type']));
    if (item.attributes['primary_stone']) parts.push(String(item.attributes['primary_stone']));
    if (item.attributes['jewelry_style']) parts.push(String(item.attributes['jewelry_style']));
    if (item.attributes['jewelry_type']) parts.push(String(item.attributes['jewelry_type']));

    // Add brand, model if present
    if (item.brand) parts.push(item.brand);
    if (item.model) parts.push(item.model);

    // Add material
    if (item.material && !parts.includes(item.material)) parts.push(item.material);

    // Add color
    if (item.color) parts.push(item.color);

    if (parts.length === 0) return null;
    return parts.join(' ').trim();
  }

  /**
   * Level 2: Key attributes without rarities
   * e.g., "14k gold diamond ring"
   */
  private buildLevel2(item: ItemProfile): string | null {
    const parts: string[] = [];

    if (item.attributes['fineness']) parts.push(String(item.attributes['fineness']));
    if (item.attributes['metal_type']) parts.push(String(item.attributes['metal_type']));
    if (item.attributes['primary_stone']) parts.push(String(item.attributes['primary_stone']));
    if (item.attributes['jewelry_type']) parts.push(String(item.attributes['jewelry_type']));

    if (item.brand && !parts.some(p => p.toLowerCase().includes(item.brand!.toLowerCase()))) {
      parts.push(item.brand);
    }

    if (parts.length === 0) return null;
    return parts.join(' ').trim();
  }

  /**
   * Level 3: Category + subcategory
   * e.g., "gold ring"
   */
  private buildLevel3(item: ItemProfile): string | null {
    const parts: string[] = [];

    // Add fineness or metal type
    if (item.attributes['fineness']) parts.push(String(item.attributes['fineness']));
    else if (item.attributes['metal_type']) parts.push(String(item.attributes['metal_type']));

    // Add jewelry type (ring, earring, necklace, etc.)
    if (item.attributes['jewelry_type']) parts.push(String(item.attributes['jewelry_type']));
    else if (item.subcategory && item.category === 'jewelry') parts.push(item.subcategory);

    if (parts.length === 0) return null;
    return parts.join(' ').trim();
  }

  /**
   * Level 4: Category + material
   * e.g., "gold jewelry" or "14k jewelry"
   */
  private buildLevel4(item: ItemProfile): string | null {
    const parts: string[] = [];

    if (item.attributes['fineness']) {
      parts.push(String(item.attributes['fineness']));
    } else if (item.attributes['metal_type']) {
      parts.push(String(item.attributes['metal_type']));
    } else if (item.material) {
      parts.push(item.material);
    }

    // Add generic category term
    if (item.category === 'jewelry') parts.push('jewelry');
    else if (item.category === 'electronics') parts.push('electronics');
    else if (item.category === 'furniture') parts.push('furniture');
    else parts.push(item.subcategory || 'items');

    if (parts.length === 0) return null;
    return parts.join(' ').trim();
  }

  /**
   * Level 5: Subcategory alone
   * e.g., "ring" or "laptop"
   */
  private buildLevel5(item: ItemProfile): string | null {
    if (item.subcategory) return item.subcategory;
    if (item.category !== 'unknown') return item.category;
    return null;
  }

  /**
   * Level 6: Very general
   * e.g., "jewelry" or "electronics"
   */
  private buildLevel6(item: ItemProfile): string | null {
    if (item.category !== 'unknown') return item.category;
    return null;
  }
}

