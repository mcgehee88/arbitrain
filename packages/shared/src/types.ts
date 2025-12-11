export type Marketplace = 'ebay' | 'ctbids' | 'shopgoodwill' | 'hibid' | 'mercari' | 'facebook' | 'amazon';
export type Condition = 'new' | 'like_new' | 'good' | 'fair' | 'poor' | 'unknown';
export type ItemType = 'electronics' | 'jewelry' | 'furniture' | 'collectibles' | 'sports' | 'books' | 'fashion' | 'lot' | 'unknown';

export interface Listing {
  title: string;
  description?: string;
  url?: string;
  current_price: number;
  bid_increment?: number;
  marketplace: Marketplace;
}

export interface ItemProfile {
  raw_title: string;
  item_type: ItemType;
  category: string;
  keywords: string[];
  condition: Condition;
  brand?: string;
  model?: string;
  year?: number;
  material?: string;
  is_lot: boolean;
  lot_size?: number;
  extraction_confidence: number;
  extraction_notes: string[];
}

export interface Comp {
  id: string;
  title: string;
  sold_price: number;
  sold_date: string;
  condition: Condition;
  shipping_cost: number;
  listing_type: 'auction' | 'fixed_price';
  is_outlier: boolean;
  quality_score: number;
  source: 'ebay' | 'other';
}

export interface CalculationOutput {
  item_profile: ItemProfile;
  ebay_query: string;
  query_ladder: string[];
  comps_found: Comp[];
  comps_after_outlier_removal: Comp[];
  median_price: number;
  price_range: { low: number; high: number };
  num_comps: number;
  confidence_score: number;
  confidence_label: 'high' | 'medium' | 'low';
  estimated_resale_price: number;
  max_safe_bid: number;
  estimated_profit: number;
  estimated_roi_percent: number;
  opportunity_score: number;
  risk_score: number;
  explanation: {
    summary: string;
    resale_reasoning: string;
    max_bid_reasoning: string;
    risk_factors: string[];
    opportunities: string[];
    warnings: string[];
  };
}

