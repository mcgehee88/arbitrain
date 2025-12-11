import { ItemProfile, Condition, ItemType } from '../../../packages/shared/src/types';

const ITEM_TYPE_PATTERNS: Record<ItemType, RegExp[]> = {
  electronics: [
    /iphone|ipad|airpods|watch|mac|laptop|computer|tv|monitor|camera|phone/i,
  ],
  jewelry: [
    /ring|earring|necklace|bracelet|pendant|gold|silver|diamond|watch(?!.*digital)/i,
  ],
  furniture: [
    /chair|table|desk|couch|sofa|bed|dresser|cabinet|shelf|lamp/i,
  ],
  collectibles: [
    /vintage|antique|rare|card|comic|poster|figurine|toy|doll|collectible/i,
  ],
  sports: [
    /bicycle|bike|skateboard|snowboard|ski|golf|tennis|baseball|football|soccer|jersey|cleats/i,
  ],
  books: [
    /book|textbook|novel|hardcover|paperback|edition/i,
  ],
  fashion: [
    /shirt|dress|pants|jeans|coat|jacket|sweater|hoodie|shoe|sneaker|boots|handbag|purse|sunglasses/i,
  ],
  lot: [
    /lot\s+of|bundle|set\s+of|box\s+of|assorted|mixed|multiple/i,
  ],
  unknown: [],
};

const CONDITION_PATTERNS: Record<string, Condition> = {
  'new': 'new',
  'sealed': 'new',
  'unopened': 'new',
  'like new': 'like_new',
  'likenew': 'like_new',
  'mint': 'like_new',
  'excellent': 'like_new',
  'very good': 'good',
  'good': 'good',
  'fair': 'fair',
  'poor': 'poor',
  'damaged': 'poor',
  'broken': 'poor',
};

export class ItemExtractor {
  extract(title: string, description?: string): ItemProfile {
    const combined = `${title} ${description || ''}`.toLowerCase();

    const itemType = this.detectItemType(combined);
    const condition = this.detectCondition(combined);
    const keywords = this.extractKeywords(title);
    const brand = this.extractBrand(title);
    const year = this.extractYear(combined);
    const isLot = this.detectLot(title);

    return {
      raw_title: title,
      item_type: itemType,
      category: this.itemTypeToCategory(itemType),
      keywords,
      condition,
      brand,
      model: undefined,
      year,
      material: undefined,
      is_lot: isLot,
      lot_size: isLot ? this.extractLotSize(combined) : undefined,
      extraction_confidence: this.calculateExtractionConfidence(
        itemType,
        condition,
        keywords.length
      ),
      extraction_notes: this.generateExtractionNotes(
        itemType,
        condition,
        keywords
      ),
    };
  }

  private detectItemType(text: string): ItemType {
    for (const [type, patterns] of Object.entries(ITEM_TYPE_PATTERNS)) {
      if (type === 'unknown') continue;
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return type as ItemType;
        }
      }
    }
    return 'unknown';
  }

  private detectCondition(text: string): Condition {
    for (const [key, condition] of Object.entries(CONDITION_PATTERNS)) {
      if (text.includes(key)) {
        return condition;
      }
    }
    return 'unknown';
  }

  private extractKeywords(title: string): string[] {
    return title
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 3 &&
          !['the', 'and', 'with', 'for', 'size', 'inch'].includes(
            word.toLowerCase()
          )
      )
      .slice(0, 5);
  }

  private extractBrand(title: string): string | undefined {
    const brands = ['apple', 'samsung', 'sony', 'nike', 'adidas', 'rolex'];
    const found = brands.find((brand) => title.toLowerCase().includes(brand));
    return found?.charAt(0).toUpperCase() + found?.slice(1);
  }

  private extractYear(text: string): number | undefined {
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? parseInt(yearMatch[0]) : undefined;
  }

  private detectLot(title: string): boolean {
    return /lot\s+of|bundle|set\s+of|box\s+of|assorted|mixed|multiple/i.test(
      title
    );
  }

  private extractLotSize(text: string): number | undefined {
    const match = text.match(/(\d+)\s+(?:piece|item|set|lot|count)/i);
    return match ? parseInt(match[1]) : undefined;
  }

  private calculateExtractionConfidence(
    itemType: ItemType,
    condition: Condition,
    keywordCount: number
  ): number {
    let confidence = 50;
    if (itemType !== 'unknown') confidence += 20;
    if (condition !== 'unknown') confidence += 15;
    if (keywordCount >= 3) confidence += 15;
    return Math.min(confidence, 100);
  }

  private generateExtractionNotes(
    itemType: ItemType,
    condition: Condition,
    keywords: string[]
  ): string[] {
    const notes: string[] = [];
    if (itemType === 'unknown') notes.push('Item type unclear - generic search');
    if (condition === 'unknown') notes.push('Condition not specified');
    if (keywords.length < 2) notes.push('Few keywords extracted');
    return notes;
  }

  private itemTypeToCategory(itemType: ItemType): string {
    const categoryMap: Record<ItemType, string> = {
      electronics: 'Electronics',
      jewelry: 'Jewelry',
      furniture: 'Furniture',
      collectibles: 'Collectibles',
      sports: 'Sports',
      books: 'Books',
      fashion: 'Fashion',
      lot: 'Lot/Bundle',
      unknown: 'General',
    };
    return categoryMap[itemType];
  }
}

