export type MetalType = 'gold' | 'silver' | 'platinum' | 'mixed' | 'unknown';
export type Fineness = '10K' | '14K' | '18K' | '22K' | '24K' | '925' | '950' | 'plated' | 'unknown';
export type GemstoneType = 'diamond' | 'ruby' | 'sapphire' | 'emerald' | 'pearl' | 'none' | 'unknown';
export type JewelryStyle = 'solitaire' | 'cluster' | 'halo' | 'masonic' | 'signet' | 'band' | 'vintage' | 'modern' | 'unknown';
export type JewelryType = 'ring' | 'earring' | 'necklace' | 'bracelet' | 'pendant' | 'brooch' | 'unknown';
export type Condition = 'new' | 'like-new' | 'good' | 'fair' | 'poor' | 'unknown';

export interface JewelryItem {
  // Extracted attributes
  title: string;
  url: string;
  
  // Metal & material
  metal_type: MetalType;
  fineness: Fineness;
  weight_grams: number | null; // actual weight in grams
  weight_dwt: number | null; // pennyweight
  
  // Gemstones
  primary_stone: GemstoneType;
  stone_carat: number | null; // total carat weight
  stone_count: number | null;
  
  // Style & type
  jewelry_type: JewelryType;
  style: JewelryStyle;
  
  // Condition & era
  condition: Condition;
  era: string | null; // 'vintage', 'antique', 'modern', etc.
  
  // Additional
  hallmark: string | null; // "925", "14K", maker's mark, etc.
  size: string | null; // ring size, etc.
  gender: 'mens' | 'womens' | 'unisex' | 'unknown';
  
  // Extraction confidence
  extraction_confidence: number; // 0-1, how confident we are in the extraction
}

export interface JewelryComp extends JewelryItem {
  sold_price: number;
  sold_date: string;
  comp_id: string;
  attribute_match_score: number; // how well it matches the listing item
}

