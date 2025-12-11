import { ItemProfile, Condition, ItemType } from '../../../packages/shared/src/types';

export class ItemExtractor {
  extract(title: string, description: string = ''): ItemProfile {
    const fullText = (title + ' ' + description).toLowerCase();

    // Extract key attributes
    const material = this.extractMaterial(fullText);
    const itemType = this.detectItemType(title, material);
    const condition = this.detectCondition(fullText);
    const keywords = this.extractKeywords(fullText, material, itemType);
    const isLot = this.detectLot(fullText);
    
    return {
      raw_title: title,
      item_type: itemType,
      category: this.getCategoryFromType(itemType),
      keywords: keywords,
      condition: condition,
      brand: this.extractBrand(fullText),
      material: material,
      is_lot: isLot,
      extraction_confidence: 0.85,
      extraction_notes: this.generateExtractionNotes(title, material, condition)
    };
  }

  private extractMaterial(text: string): string {
    const materials = [
      '14k', '10k', '18k', 'gold', 'silver', 'platinum', 'bronze', 'copper',
      'leather', 'wood', 'plastic', 'glass', 'ceramic', 'porcelain', 'steel'
    ];
    
    for (const mat of materials) {
      if (text.includes(mat)) {
        return mat;
      }
    }
    return 'unknown';
  }

  private detectItemType(title: string, material: string): ItemType {
    const text = title.toLowerCase();
    
    if (text.includes('ring') || text.includes('earring') || text.includes('necklace') || 
        text.includes('bracelet') || text.includes('pendant') || text.includes('brooch')) {
      return 'jewelry';
    }
    if (text.includes('watch')) return 'jewelry';
    if (text.includes('phone') || text.includes('laptop') || text.includes('iphone')) return 'electronics';
    if (text.includes('chair') || text.includes('table') || text.includes('desk')) return 'furniture';
    if (text.includes('comic') || text.includes('card') || text.includes('trading')) return 'collectibles';
    if (text.includes('book')) return 'books';
    if (text.includes('ball') || text.includes('helmet') || text.includes('sports')) return 'sports';
    if (text.includes('lot') || text.includes('bundle')) return 'lot';
    
    return 'unknown';
  }

  private detectCondition(text: string): Condition {
    if (text.includes('new in box') || text.includes('nib')) return 'new';
    if (text.includes('like new') || text.includes('mint') || text.includes('unopened')) return 'like_new';
    if (text.includes('pre-owned') || text.includes('used') || text.includes('estate') || text.includes('vintage')) return 'good';
    if (text.includes('fair') || text.includes('needs work')) return 'fair';
    if (text.includes('poor') || text.includes('damaged')) return 'poor';
    
    return 'unknown';
  }

  private extractKeywords(text: string, material: string, itemType: ItemType): string[] {
    const keywords: string[] = [];
    
    // Always include material and type
    if (material !== 'unknown') keywords.push(material);
    
    // Specialty markers
    const specialties = ['masonic', 'shriner', 'vintage', 'estate', 'antique', 'designer', 'signed'];
    for (const spec of specialties) {
      if (text.includes(spec)) keywords.push(spec);
    }
    
    // Gemstones
    const gemstones = ['diamond', 'ruby', 'emerald', 'sapphire', 'pearl', 'crystal'];
    for (const gem of gemstones) {
      if (text.includes(gem)) keywords.push(gem);
    }
    
    // Specific item details
    if (itemType === 'jewelry') {
      if (text.includes('ring')) keywords.push('ring');
      if (text.includes('necklace')) keywords.push('necklace');
      if (text.includes('earring')) keywords.push('earring');
      if (text.includes('bracelet')) keywords.push('bracelet');
    }
    
    // Size/weight info
    const sizeMatch = text.match(/size\s*(\d+)/i);
    if (sizeMatch) keywords.push(`size${sizeMatch[1]}`);
    
    const weightMatch = text.match(/(\d+)\s*(?:grams?|g|dwt)/i);
    if (weightMatch) keywords.push(`weight${weightMatch[1]}`);
    
    return [...new Set(keywords)]; // Remove duplicates
  }

  private extractBrand(text: string): string | undefined {
    const brands = ['cartier', 'tiffany', 'rolex', 'omega', 'gucci', 'coach', 'louis vuitton'];
    for (const brand of brands) {
      if (text.includes(brand)) return brand;
    }
    return undefined;
  }

  private detectLot(text: string): boolean {
    return text.includes('lot') || text.includes('bundle') || text.includes('set of');
  }

  private generateExtractionNotes(title: string, material: string, condition: Condition): string[] {
    const notes: string[] = [];
    
    if (material === 'unknown') {
      notes.push('Material not detected - may affect comp matching');
    }
    
    if (condition === 'unknown') {
      notes.push('Condition unclear from description');
    }
    
    if (title.length < 10) {
      notes.push('Title is very short - may be missing key details');
    }
    
    return notes;
  }

  private getCategoryFromType(itemType: ItemType): string {
    const categoryMap: Record<ItemType, string> = {
      jewelry: 'Jewelry & Watches',
      electronics: 'Electronics',
      furniture: 'Furniture',
      collectibles: 'Collectibles',
      sports: 'Sports',
      books: 'Books',
      fashion: 'Fashion',
      lot: 'Lot/Bundle',
      unknown: 'General'
    };
    return categoryMap[itemType];
  }

  generateQueryLadder(profile: ItemProfile): string[] {
    const queries: string[] = [];
    
    // Start with most specific query
    const specific = [profile.material, ...profile.keywords.slice(0, 2)].filter(k => k).join(' ');
    if (specific) queries.push(specific);
    
    // Then drop one detail at a time
    if (profile.keywords.length > 0) {
      queries.push(`${profile.material} ${profile.keywords[0]}`);
    }
    
    if (profile.keywords.includes('diamond') || profile.keywords.includes('ruby')) {
      queries.push(`${profile.material} gemstone`);
    }
    
    // Then broader queries
    queries.push(`${profile.material} ${profile.category.split(' ')[0].toLowerCase()}`);
    queries.push(profile.category.split(' ')[0].toLowerCase());
    
    // Remove duplicates and empty strings
    return [...new Set(queries.filter(q => q && q.length > 2))];
  }
}

