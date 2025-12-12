/** Core types for the unified Arbitrain pipeline */

export type Marketplace = 'ebay' | 'ctbids' | 'shopgoodwill' | 'hibid' | 'mercari' | 'facebook' | 'amazon';
export type Condition = 'new' | 'like_new' | 'good' | 'fair' | 'poor' | 'unknown';
export type Category = 'jewelry' | 'electronics' | 'furniture' | 'collectibles' | 'sports' | 'books' | 'fashion' | 'toys' | 'tools' | 'unknown';

/** Input listing from marketplace */
export interface Listing {
  title: string;
  description?: string;
  url?: string;
  current_price: number;
  bid_increment?: number;
  marketplace: Marketplace;
}

/** Extracted item profile (generalized, multi-category) */
export interface ItemProfile {
  raw_title: string;
  category: Category;
  subcategory: string; // e.g., "ring" (jewelry), "laptop" (electronics), "dining chair" (furniture)
  item_type: string; // more specific descriptor
  
  // Core attributes (all categories)
  brand?: string;
  model?: string;
  year?: number;
  material?: string;
  size?: string;
  color?: string;
  condition: Condition;
  
  // Category-specific attributes (optional)
  attributes: Record<string, string | number | boolean | null>;
  
  // Quality metrics
  extraction_confidence: number; // 0-1
  extraction_notes: string[];
  
  // Special flags
  is_lot: boolean;
  lot_size?: number;
}

/** Comparable sold item from eBay */
export interface Comp {
  id: string;
  title: string;
  sold_price: number;
  sold_date: string;
  condition: Condition;
  shipping_cost: number;
  listing_type: 'auction' | 'fixed_price';
  
  // Comparison metrics
  is_outlier: boolean;
  quality_score: number; // 0-1, how well this comp matches the input item
  similarity_score?: number; // 0-1, semantic similarity (from embeddings)
  
  source: 'ebay' | 'other';
}

/** Unified calculation output */
export interface CalculationOutput {
  // Input & extraction
  item_profile: ItemProfile;
  listing_url: string;
  
  // Comp retrieval
  query_ladder: string[];
  comps_found_raw: number;
  comps_after_filtering: number;
  
  // Filtered comps
  comps: Comp[];
  
  // Valuation metrics
  median_price: number | null;
  mean_price: number | null;
  price_range: { low: number; high: number } | null;
  price_volatility: number; // std dev
  iqr: { q1: number; q3: number } | null;
  
  // Bidding recommendation
  max_safe_bid: number | null;
  estimated_resale_price: number | null;
  estimated_profit: number | null;
  estimated_roi_percent: number | null;
  
  // Quality metrics
  confidence_score: number; // 0-100
  confidence_label: 'high' | 'medium' | 'low' | 'insufficient';
  opportunity_score: number; // 0-100
  risk_score: number; // 0-100
  
  // Explanation
  explanation: {
    summary: string;
    resale_reasoning: string;
    max_bid_reasoning: string;
    risk_factors: string[];
    opportunities: string[];
    warnings: string[];
  };
}

