export type Marketplace = 'ebay' | 'ctbids' | 'shopgoodwill' | 'hibid' | 'mercari' | 'facebook' | 'amazon';

export interface Listing {
  title: string;
  marketplace: Marketplace;
  current_bid: number;
  buyout_price?: number;
  shipping_cost: number;
  buyer_premium_percent: number;
  listing_url: string;
  condition?: string;
}

export interface Comp {
  title: string;
  sold_price: number;
  shipping_cost_explicit: number;
  platform_fee_paid: number;
}

export interface CalculationOutput {
  expected_resale_price: number;
  max_safe_bid: number;
  estimated_profit: number;
  estimated_roi_percent: number;
  opportunity_score: number;
  risk_score: number;
  confidence_score: number;
  explanation: {
    summary: string;
    resale_reasoning: string;
    max_bid_reasoning: string;
    risk_factors: string[];
    opportunities: string[];
  };
}

