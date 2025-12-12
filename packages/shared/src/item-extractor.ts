/**
 * Unified item extraction layer - category-aware, modular
 * Detects category, then routes to category-specific extraction logic
 */

import { ItemProfile, Condition, Category } from './types';

interface ExtractionStep {
  extracted: boolean;
  value: string | number | boolean | null;
  confidence: number; // 0-1
}

export class ItemExtractor {
  /**
   * Main entry point: analyze a title and extract structured attributes
   */
  extractFromTitle(title: string, url?: string): ItemProfile {
    const lowerTitle = title.toLowerCase();
    
    // Step 1: Detect category from keywords
    const category = this.detectCategory(lowerTitle);
    
    // Step 2: Extract general attributes
    const brand = this.extractBrand(lowerTitle);
    const model = this.extractModel(lowerTitle);
    const year = this.extractYear(lowerTitle);
    const material = this.extractMaterial(lowerTitle, category);
    const size = this.extractSize(lowerTitle);
    const color = this.extractColor(lowerTitle);
    const condition = this.extractCondition(lowerTitle);
    
    // Step 3: Extract category-specific attributes
    const categoryAttrs = this.extractCategorySpecificAttributes(title, category);
    
    // Step 4: Infer subcategory and item type
    const subcategory = this.inferSubcategory(title, category);
    const itemType = this.inferItemType(title, category);
    
    // Step 5: Check if this is a lot
    const isLot = this.detectLot(lowerTitle);
    const lotSize = isLot ? this.extractLotSize(lowerTitle) : undefined;
    
    // Step 6: Calculate overall extraction confidence
    const confidence = this.calculateConfidence(brand, model, year, material, condition);
    
    // Step 7: Collect notes
    const notes: string[] = [];
    if (isLot) notes.push(`Lot of ${lotSize || 'unknown'} items`);
    if (!brand.extracted) notes.push('Brand not detected');
    if (!model.extracted) notes.push('Model not detected');
    if (category === 'unknown') notes.push('Category could not be determined');
    
    return {
      raw_title: title,
      category,
      subcategory,
      item_type: itemType,
      brand: brand.value?.toString() || undefined,
      model: model.value?.toString() || undefined,
      year: typeof year.value === 'number' ? year.value : undefined,
      material: material.value?.toString() || undefined,
      size: size.value?.toString() || undefined,
      color: color.value?.toString() || undefined,
      condition,
      attributes: categoryAttrs,
      extraction_confidence: confidence,
      extraction_notes: notes,
      is_lot: isLot,
      lot_size: lotSize ?? undefined,
    };
  }

  // ============================================================================
  // CATEGORY DETECTION
  // ============================================================================

  private detectCategory(title: string): Category {
    // Jewelry patterns
    if (/\b(ring|earring|necklace|bracelet|pendant|brooch|chain|watch|locket)\b/i.test(title) ||
        /\b(gold|silver|platinum|diamond|gemstone|jewelry)\b/i.test(title)) {
      return 'jewelry';
    }

    // Electronics patterns
    if (/\b(phone|laptop|computer|tablet|camera|headphone|speaker|monitor|keyboard|mouse|console|tv)\b/i.test(title) ||
        /\b(iphone|samsung|dell|hp|sony|canon|apple|microsoft)\b/i.test(title)) {
      return 'electronics';
    }

    // Furniture patterns
    if (/\b(chair|table|desk|sofa|couch|bed|dresser|cabinet|shelf|bookcase|ottoman|stool)\b/i.test(title) ||
        /\b(furniture|dining|bedroom|living|office)\b/i.test(title)) {
      return 'furniture';
    }

    // Collectibles patterns
    if (/\b(vintage|antique|collectible|figurine|statue|doll|card|comic|memorabilia|signed)\b/i.test(title) ||
        /\b(mint|rare|edition|first)\b/i.test(title)) {
      return 'collectibles';
    }

    // Sports patterns
    if (/\b(bike|bicycle|golf|skate|ski|baseball|football|soccer|hockey|racket|jersey)\b/i.test(title) ||
        /\b(sports|equipment|athletic)\b/i.test(title)) {
      return 'sports';
    }

    // Books patterns
    if (/\b(book|novel|textbook|hardcover|paperback|edition)\b/i.test(title)) {
      return 'books';
    }

    // Fashion patterns
    if (/\b(dress|coat|jacket|pants|shirt|blouse|jeans|sweater|suit|shoe|bag|purse|handbag)\b/i.test(title) ||
        /\b(designer|fashion|apparel|clothing)\b/i.test(title)) {
      return 'fashion';
    }

    // Toys patterns
    if (/\b(toy|action figure|doll|lego|puzzle|game|board game|rc|remote control)\b/i.test(title)) {
      return 'toys';
    }

    // Tools patterns
    if (/\b(drill|saw|hammer|screwdriver|wrench|tool|power tool|compressor|generator)\b/i.test(title)) {
      return 'tools';
    }

    return 'unknown';
  }

  // ============================================================================
  // GENERAL ATTRIBUTE EXTRACTION
  // ============================================================================

  private extractBrand(title: string): ExtractionStep {
    // Common brand patterns
    const brands = [
      'Apple', 'Samsung', 'Sony', 'Canon', 'Nikon', 'Dell', 'HP', 'Lenovo',
      'Nike', 'Adidas', 'Rolex', 'Omega', 'TAG Heuer', 'Cartier', 'Tiffany',
      'Gucci', 'Louis Vuitton', 'Prada', 'Coach', 'Michael Kors',
      'Intel', 'AMD', 'NVIDIA', 'Microsoft', 'Google', 'Meta'
    ];

    for (const brand of brands) {
      if (new RegExp(`\\b${brand}\\b`, 'i').test(title)) {
        return { extracted: true, value: brand, confidence: 0.9 };
      }
    }

    // Pattern: "Brand [Model]" style
    const brandPatterns = [
      /^([A-Z][a-z]+)\s+/,
      /\b(brand|made by|manufactured by)\s+([A-Za-z]+)/i,
    ];

    for (const pattern of brandPatterns) {
      const match = pattern.exec(title);
      if (match) {
        const candidate = match[match.length - 1];
        if (candidate && candidate.length > 1 && candidate.length < 30) {
          return { extracted: true, value: candidate, confidence: 0.6 };
        }
      }
    }

    return { extracted: false, value: null, confidence: 0 };
  }

  private extractModel(title: string): ExtractionStep {
    // Common model patterns
    const modelPatterns = [
      /\b(model|model#|model no|m)[\s-]?([A-Z0-9\-\.]+)/i,
      /\b([A-Z]{1,4}\d{3,5})\b/, // e.g., EOS 80D, RTX 3080
      /iphone[\s-]?(\d+[\s\w]*)/i,
      /ipad[\s-]?(\w+\d*)/i,
      /macbook[\s-]?(\w+)/i,
    ];

    for (const pattern of modelPatterns) {
      const match = pattern.exec(title);
      if (match) {
        const candidate = match[match.length - 1];
        if (candidate && candidate.length > 1) {
          return { extracted: true, value: candidate.trim(), confidence: 0.8 };
        }
      }
    }

    return { extracted: false, value: null, confidence: 0 };
  }

  private extractYear(title: string): ExtractionStep {
    // Year patterns
    const yearPattern = /\b(19|20)\d{2}\b/;
    const match = yearPattern.exec(title);
    if (match) {
      const year = parseInt(match[0]);
      if (year >= 1900 && year <= new Date().getFullYear() + 1) {
        return { extracted: true, value: year, confidence: 0.9 };
      }
    }
    return { extracted: false, value: null, confidence: 0 };
  }

  private extractMaterial(title: string, category: Category): ExtractionStep {
    // Material patterns by category
    const materialPatterns: Record<Category, RegExp[]> = {
      jewelry: [
        /\b(gold|silver|platinum|copper|bronze|stainless steel|sterling)/i,
      ],
      electronics: [
        /\b(aluminum|plastic|glass|metal|carbon fiber)\b/i,
      ],
      furniture: [
        /\b(wood|leather|fabric|upholstered|oak|mahogany|walnut|pine|metal|glass)\b/i,
      ],
      collectibles: [
        /\b(ceramic|porcelain|resin|plastic|metal|glass|paper)\b/i,
      ],
      sports: [
        /\b(aluminum|carbon|leather|rubber|metal|plastic|composite)\b/i,
      ],
      fashion: [
        /\b(cotton|polyester|silk|wool|denim|leather|suede|synthetic|blend)\b/i,
      ],
      books: [
        /\b(hardcover|paperback|leather|cloth)\b/i,
      ],
      toys: [
        /\b(plastic|wood|rubber|metal|fabric|resin|vinyl)\b/i,
      ],
      tools: [
        /\b(steel|metal|plastic|composite|titanium|cast iron)\b/i,
      ],
      unknown: [
        /\b(wood|metal|plastic|glass|leather|fabric|ceramic)\b/i,
      ],
    };

    const patterns = materialPatterns[category] || materialPatterns.unknown;
    for (const pattern of patterns) {
      const match = pattern.exec(title);
      if (match) {
        return { extracted: true, value: match[0].trim(), confidence: 0.85 };
      }
    }

    return { extracted: false, value: null, confidence: 0 };
  }

  private extractSize(title: string): ExtractionStep {
    const sizePatterns = [
      /\b(size|sz)[\s-]?([XS]{1,2}|M|L|XL|XXL|\d{1,2})\b/i,
      /(\d+(?:\.\d+)?)\s*(inch|in|cm|mm|ft|feet|')/i,
      /\b(ring size|ring)\s+(\d+(?:\.\d+)?)\b/i,
      /^size\s+([XS]{1,2}|M|L|XL|XXL|\d{1,2})/i,
    ];

    for (const pattern of sizePatterns) {
      const match = pattern.exec(title);
      if (match) {
        const candidate = match[match.length - 1];
        if (candidate) {
          return { extracted: true, value: candidate.trim(), confidence: 0.85 };
        }
      }
    }

    return { extracted: false, value: null, confidence: 0 };
  }

  private extractColor(title: string): ExtractionStep {
    const colors = [
      'red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'grey', 'silver',
      'gold', 'pink', 'purple', 'orange', 'brown', 'bronze', 'copper', 'rose', 'ivory',
    ];

    for (const color of colors) {
      if (new RegExp(`\\b${color}\\b`, 'i').test(title)) {
        return { extracted: true, value: color, confidence: 0.85 };
      }
    }

    return { extracted: false, value: null, confidence: 0 };
  }

  private extractCondition(title: string): Condition {
    const conditionPatterns: Array<[RegExp, Condition]> = [
      [/\b(new|unused|mint|sealed)\b/i, 'new'],
      [/\b(like.?new|excellent|pristine)\b/i, 'like_new'],
      [/\b(good|great|very good|gently used)\b/i, 'good'],
      [/\b(fair|some wear|used)\b/i, 'fair'],
      [/\b(poor|damaged|broken|as.?is|parts)\b/i, 'poor'],
    ];

    for (const [pattern, condition] of conditionPatterns) {
      if (pattern.test(title)) {
        return condition;
      }
    }

    return 'unknown';
  }

  // ============================================================================
  // CATEGORY-SPECIFIC ATTRIBUTES
  // ============================================================================

  private extractCategorySpecificAttributes(
    title: string,
    category: Category
  ): Record<string, string | number | boolean | null> {
    const attrs: Record<string, string | number | boolean | null> = {};

    if (category === 'jewelry') {
      attrs['metal_type'] = this.extractMetalType(title);
      attrs['fineness'] = this.extractFineness(title);
      attrs['primary_stone'] = this.extractGemstone(title);
      attrs['jewelry_type'] = this.extractJewelryType(title);
      attrs['jewelry_style'] = this.extractJewelryStyle(title);
      attrs['weight_grams'] = this.extractWeight(title);
    } else if (category === 'electronics') {
      attrs['cpu_brand'] = this.extractCPUBrand(title);
      attrs['memory_gb'] = this.extractMemory(title);
      attrs['storage_type'] = this.extractStorageType(title);
      attrs['screen_size'] = this.extractScreenSize(title);
    } else if (category === 'furniture') {
      attrs['furniture_type'] = this.extractFurnitureType(title);
      attrs['style'] = this.extractFurnitureStyle(title);
    }

    return attrs;
  }

  // Jewelry-specific
  private extractMetalType(title: string): string | null {
    const metals = ['gold', 'silver', 'platinum', 'copper', 'bronze', 'stainless steel'];
    for (const metal of metals) {
      if (new RegExp(`\\b${metal}\\b`, 'i').test(title)) {
        return metal;
      }
    }
    return null;
  }

  private extractFineness(title: string): string | null {
    const patterns = [
      /\b(14k|14kt|14k?\s+gold)\b/i,
      /\b(18k|18kt|18k?\s+gold)\b/i,
      /\b(10k|10kt|10k?\s+gold)\b/i,
      /\b(925|sterling)\b/i,
      /\bplated\b/i,
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(title);
      if (match) return match[0];
    }
    return null;
  }

  private extractGemstone(title: string): string | null {
    const stones = ['diamond', 'ruby', 'sapphire', 'emerald', 'pearl', 'opal'];
    for (const stone of stones) {
      if (new RegExp(`\\b${stone}\\b`, 'i').test(title)) {
        return stone;
      }
    }
    return null;
  }

  private extractJewelryType(title: string): string | null {
    const types = ['ring', 'earring', 'necklace', 'bracelet', 'pendant', 'brooch', 'anklet', 'chain'];
    for (const type of types) {
      if (new RegExp(`\\b${type}`, 'i').test(title)) {
        return type;
      }
    }
    return null;
  }

  private extractJewelryStyle(title: string): string | null {
    const styles = ['vintage', 'antique', 'modern', 'solitaire', 'cluster', 'halo'];
    for (const style of styles) {
      if (new RegExp(`\\b${style}\\b`, 'i').test(title)) {
        return style;
      }
    }
    return null;
  }

  private extractWeight(title: string): number | null {
    const patterns = [
      /(\d+(?:\.\d+)?)\s*g(?:ram)?s?(?:\)|[^a-z]|$)/i,
      /(\d+(?:\.\d+)?)\s*dwt\b/i,
      /(\d+(?:\.\d+)?)\s*oz\b/i,
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(title);
      if (match) {
        return parseFloat(match[1]);
      }
    }
    return null;
  }

  // Electronics-specific
  private extractCPUBrand(title: string): string | null {
    if (/\bintel\b/i.test(title)) return 'Intel';
    if (/\bamd\b/i.test(title)) return 'AMD';
    if (/\bqualcomm\b/i.test(title)) return 'Qualcomm';
    if (/\bapple\s+m\d/i.test(title)) return 'Apple Silicon';
    return null;
  }

  private extractMemory(title: string): number | null {
    const match = /(\d+)\s*gb\s*(ram|memory|ddr)/i.exec(title);
    return match ? parseInt(match[1]) : null;
  }

  private extractStorageType(title: string): string | null {
    if (/\bssd\b/i.test(title)) return 'SSD';
    if (/\bhdd\b/i.test(title)) return 'HDD';
    if (/\bnvme\b/i.test(title)) return 'NVMe';
    return null;
  }

  private extractScreenSize(title: string): number | null {
    const match = /(\d+(?:\.\d+)?)\s*(?:inch|in|")\s*screen/i.exec(title);
    return match ? parseFloat(match[1]) : null;
  }

  // Furniture-specific
  private extractFurnitureType(title: string): string | null {
    const types = ['chair', 'table', 'desk', 'sofa', 'couch', 'bed', 'dresser', 'cabinet', 'bookcase'];
    for (const type of types) {
      if (new RegExp(`\\b${type}\\b`, 'i').test(title)) {
        return type;
      }
    }
    return null;
  }

  private extractFurnitureStyle(title: string): string | null {
    const styles = ['modern', 'vintage', 'mid-century', 'traditional', 'industrial', 'farmhouse'];
    for (const style of styles) {
      if (new RegExp(`\\b${style}\\b`, 'i').test(title)) {
        return style;
      }
    }
    return null;
  }

  // ============================================================================
  // INFERENTIAL EXTRACTION
  // ============================================================================

  private inferSubcategory(title: string, category: Category): string {
    if (category === 'jewelry') {
      return this.extractJewelryType(title) || 'jewelry';
    } else if (category === 'electronics') {
      if (/\blaptop\b/i.test(title)) return 'laptop';
      if (/\bphone\b/i.test(title)) return 'phone';
      if (/\btablet\b/i.test(title)) return 'tablet';
      if (/\bcamera\b/i.test(title)) return 'camera';
      return 'electronics';
    } else if (category === 'furniture') {
      return this.extractFurnitureType(title) || 'furniture';
    }
    return category;
  }

  private inferItemType(title: string, category: Category): string {
    const subcategory = this.inferSubcategory(title, category);
    if (category === 'jewelry' && /\bdiamond\b/i.test(title)) {
      return 'diamond_jewelry';
    } else if (category === 'electronics' && /\bused\b/i.test(title)) {
      return 'refurbished';
    }
    return subcategory;
  }

  private detectLot(title: string): boolean {
    return /\b(lot|mixed|bundle|bundle|set of|pack of|qty)\b/i.test(title);
  }

  private extractLotSize(title: string): number | null {
    const patterns = [
      /lot(?:\s+of)?\s+(\d+)/i,
      /(\d+)\s*(?:item|pc|pcs|pieces?)\s+(?:lot|bundle)/i,
      /^(\d+)\s*(?:item|pc|pcs|pieces?)/i,
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(title);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return null;
  }

  // ============================================================================
  // CONFIDENCE CALCULATION
  // ============================================================================

  private calculateConfidence(
    brand: ExtractionStep,
    model: ExtractionStep,
    year: ExtractionStep,
    material: ExtractionStep,
    condition: Condition
  ): number {
    let score = 0;
    let maxScore = 0;

    // Brand (20% of confidence)
    score += brand.extracted ? 0.2 : 0;
    maxScore += 0.2;

    // Model (20% of confidence)
    score += model.extracted ? 0.2 : 0;
    maxScore += 0.2;

    // Year (15% of confidence)
    score += year.extracted ? 0.15 : 0;
    maxScore += 0.15;

    // Material (25% of confidence)
    score += material.extracted ? 0.25 : 0;
    maxScore += 0.25;

    // Condition (20% of confidence)
    score += condition !== 'unknown' ? 0.2 : 0;
    maxScore += 0.2;

    return maxScore > 0 ? score / maxScore : 0.3; // Default 30% if nothing extracted
  }
}



