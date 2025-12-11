# Phase 2 MVP – 5 Full Test Cases with Complete Pipeline Output

**Goal:** See the entire system working end-to-end with realistic data.

**How to read:** Each test case shows:
1. Input (raw listing)
2. Item profile (what system detected)
3. Queries tried (and which one won)
4. Comps found (real eBay data simulation)
5. Confidence & warnings
6. Final output (what user sees)

---

## TEST CASE 1: Vague Furniture Listing (Low Confidence)

### Input
```
Title: "Wooden Desk"
Description: "Good condition. Brown wood. Needs a home."
Category: "Furniture"
Condition: Unknown
```

### Item Profile Detection
```
Detected Type: GENERIC (furniture assumed from category)
Type Confidence: 55% (LOW - no specific brand/model keywords)

Extracted Fields:
  - brand: null
  - model: null
  - material: "wood"
  - color: "brown"
  - dimensions: null
  - condition: "good"
  - keywords: ["desk", "wooden"]
```

**Why only 55%?** No brand (no +30pts), no dimensions (no +20pts), only generic material + color.

### Queries Generated
```
Query 1: "wooden desk brown"
Query 2: "wooden desk"
Query 3: "desk furniture"
Query 4: "desk"
```

### eBay Search Results

**Query 1 ("wooden desk brown"):**
- Results: 180+
- Price range: $50–$1,200
- CV: 0.68 (VERY WIDE - bad)
- Quality score: 38/100 ✗ TOO BROAD

**Query 2 ("wooden desk"):**
- Results: 420+
- Price range: $20–$2,500
- CV: 0.85 (TERRIBLE - way too broad)
- Quality score: 20/100 ✗ REJECT

**Query 3 ("desk furniture"):**
- Results: 950+
- Price range: $5–$5,000
- Quality score: 10/100 ✗ GIVE UP

**Query 4 ("desk"):**
- Results: 2,000+
- Forced to use (last resort)
- Quality score: 8/100
- Token overlap: 25% (most results aren't desks)

### Result Selection
```
OUTCOME: Use Query 3 results but with LOW confidence warning
Selected: ~50 random desk sales (filtered to last 90 days)
Price spread: $100–$800 (after removing obvious outliers like antique desks at $5k)
Median: $280
Confidence: LOW ✗
```

### Warnings Displayed
```
⚠ LOW CONFIDENCE ALERT

This is a vague listing. We searched for "desk" and found
50+ results, but the price range is very wide ($100–$800).

Reasons:
• No brand specified (IKEA? Vintage? Custom?)
• No dimensions given
• No specific style (modern? traditional? mid-century?)
• Wooden desks vary wildly by maker and era

RECOMMENDATION:
Try re-listing with more details:
- Brand/maker (if known)
- Dimensions (width x depth x height)
- Style/era (mid-century modern, vintage, IKEA, etc.)
- Any special features (drawers, shelves, original condition?)

Max bid if you MUST sell now:
  ~$140 (assumes lower end, high risk)
```

### Final User Output
```
┌─────────────────────────────────────────────────────┐
│ ⚠️  LOW CONFIDENCE - USE WITH CAUTION              │
├─────────────────────────────────────────────────────┤
│ Item: Wooden Desk (generic)                         │
│ Comps found: 50 (very broad category)               │
│ Price range: $100–$800                              │
│ Median: $280                                        │
│ Confidence: LOW                                     │
│                                                     │
│ Recommendation: Get more info on this item first    │
│ (Brand? Dimensions? Style?)                         │
│                                                     │
│ Rough max bid: $100–$150 (high risk)                │
└─────────────────────────────────────────────────────┘
```

**Lesson:** Vague input = vague output. System doesn't hide this.

---

## TEST CASE 2: Detailed Electronics (High Confidence)

### Input
```
Title: "Apple iPhone 14 Pro Max 256GB Space Black Unlocked"
Description: "Like new condition. Comes in original box with charger.
              Barely used, no scratches or cracks. Full warranty intact.
              Unlocked - works with any carrier."
Category: "Electronics > Cell Phones"
Condition: "Like New"
```

### Item Profile Detection
```
Detected Type: ELECTRONICS
Type Confidence: 99% (VERY HIGH)

Extracted Fields:
  - brand: "Apple"
  - model: "iPhone 14 Pro Max"
  - storage: "256GB"
  - color: "Space Black"
  - condition: "like_new"
  - carrier: "Unlocked"
  - included: ["original_box", "charger", "warranty"]
```

**Why 99%?** Exact brand match (+50pts), specific model (+30pts), storage specified (+10pts), condition clear (+9pts).

### Queries Generated
```
Query 1: "Apple iPhone 14 Pro Max 256GB Space Black unlocked"
Query 2: "iPhone 14 Pro Max 256GB unlocked"
Query 3: "iPhone 14 Pro Max 256GB"
Query 4: "iPhone 14 Pro Max"
```

### eBay Search Results

**Query 1 ("Apple iPhone 14 Pro Max 256GB Space Black unlocked"):**
- Results: 47 sold
- Price range: $1,150–$1,320
- Median: $1,240
- CV: 0.08 (TIGHT CLUSTER ✓)
- Token overlap: 95% (near perfect match)
- Recency: All sold in last 30 days ✓
- Quality score: 94/100 ✓✓ EXCELLENT

**Selection:** Query 1 is perfect. STOP searching.

### Comps Analysis
```
Raw Results: 47 sold iPhones matching spec

Outlier Check (Z-score > 2.0):
  • $950  (z=2.1) — Removed (likely damaged or carrier-locked)
  • $1,400 (z=1.8) — Kept (within range, possibly new box bonus)

Final Clean Comps: 46 items
Median: $1,240
Range: $1,150–$1,330
Std Dev: $38
CV: 0.03 (EXCELLENT - very tight)
```

### Confidence & Warnings
```
✅ HIGH CONFIDENCE

Perfect match found. 46 recent eBay sales of the exact phone.
Tight price clustering ($1,150–$1,330) indicates stable market.
```

### Final User Output
```
┌──────────────────────────────────────────────────────┐
│ ✅ HIGH CONFIDENCE - EXCELLENT DATA                 │
├──────────────────────────────────────────────────────┤
│ Item: iPhone 14 Pro Max, 256GB, Space Black          │
│ Condition: Like New (Unlocked)                       │
│                                                      │
│ Comps found: 46 sold in last 30 days                 │
│ Price range: $1,150 – $1,330                         │
│ Median price: $1,240                                 │
│ Confidence: HIGH ✓✓                                  │
│                                                      │
│ eBay fees (12%): -$149                               │
│ Shipping cost: -$25                                  │
│ ────────────────────────────────────────             │
│ Expected net proceeds: $1,066                        │
│                                                      │
│ For 30% ROI:                                         │
│ Max safe bid: $700                                   │
│ Estimated profit: $366                               │
│                                                      │
│ ⚠️  Warnings: None                                   │
└──────────────────────────────────────────────────────┘
```

**Lesson:** Detailed, specific input = high confidence output. Perfect data.

---

## TEST CASE 3: Mixed Lot of Tools (Bundle Detection)

### Input
```
Title: "Vintage Tool Lot - Estate Auction Box #47"
Description: "Box of assorted hand tools from estate sale.
              Includes: hammer, screwdrivers, wrenches, pliers,
              tape measure, level, and other miscellaneous tools.
              Condition varies - some older, some like new.
              No power tools. All sold as-is, as pictured."
Category: "Tools & Equipment"
Condition: "Mixed / Unknown"
```

### Item Profile Detection
```
Detected Type: GENERIC (with LOT FLAG)
Type Confidence: 70% (detected "lot of" pattern)

Special Detection: BUNDLE DETECTED ⚠
  Pattern match: "Lot of", "assorted", "estate", "box"
  Item count: ~10+ tools (mixed)
  
Extracted Fields:
  - item_type: "tool_lot"
  - includes: ["hammer", "screwdrivers", "wrenches", "pliers", "tape_measure", "level"]
  - condition: "mixed"
  - lot_size: "box" (approx 10+ items)
  - source: "estate"
```

### System Response to Bundle
```
ALERT: This is a LOT, not a single item.

For accurate comps, we need to know:
1. Are you selling as a single lot?
2. Are you breaking it up and selling individually?

OPTION A: "Sell as one lot"
  → Search for "vintage tool lot" sales
  → Estimate total lot value

OPTION B: "Sell individually"
  → Would need to identify each tool
  → Get comps for each separately
  → Sum up totals

Proceeding with OPTION A (lot sales)...
```

### Queries Generated
```
Query 1: "vintage tool lot estate"
Query 2: "vintage tool lot"
Query 3: "hand tool lot"
Query 4: "tools lot"
```

### eBay Search Results

**Query 1 ("vintage tool lot estate"):**
- Results: 23 sold lots
- Price range: $40–$300 per lot
- Median: $85
- CV: 0.55 (moderate spread)
- Quality score: 58/100 MEDIUM

**Selection:** Query 1 is acceptable for a lot.

### Comps Analysis
```
Raw Results: 23 sold tool lots

These are pre-owned, mixed condition lots from 2–10 items.
Prices vary by: count, condition, rarity of tools.

Outlier Removal:
  • $15  (z=1.8) — Kept (small, junk lot)
  • $500 (z=3.2) — Removed (rare vintage lot, not comparable)

Final Clean Comps: 22 lots
Median: $78
Range: $35–$220
CV: 0.48 (moderate, expected for lots)
```

### Confidence & Warnings
```
⚠️  MEDIUM CONFIDENCE

Tool lots are common but highly variable.
Your lot matches 22 recent sales, but prices depend on:
• Exact tool brands
• Quantity
• Rarity (vintage vs modern)
• Condition of each piece

Recommendation:
If you can identify specific tools (brands, models),
you might get higher individual prices by selling separately.
```

### Final User Output
```
┌──────────────────────────────────────────────────────┐
│ ⚠️  MEDIUM CONFIDENCE - LOT PRICING                 │
├──────────────────────────────────────────────────────┤
│ Item: Mixed Vintage Tool Lot (~10 items)             │
│ Source: Estate Sale                                  │
│                                                      │
│ Comps found: 22 similar lots sold in last 90 days    │
│ Price range (per lot): $35 – $220                    │
│ Median: $78                                          │
│ Confidence: MEDIUM ⚠                                 │
│                                                      │
│ Expected eBay proceeds (at median): $68              │
│ (after 12% fees + shipping)                          │
│                                                      │
│ Max bid (for entire lot): $40                        │
│ Estimated profit: $28                                │
│                                                      │
│ 💡 TIP: Individual tool sales typically yield 2-3x   │
│        this price. Consider breaking up if you have  │
│        time to identify and list each tool.          │
│                                                      │
│ ⚠️  Warning: Lot pricing is rough. Per-item          │
│    valuations would be more accurate.                │
└──────────────────────────────────────────────────────┘
```

**Lesson:** Bundle detection works. System flags lots and offers alternatives.

---

## TEST CASE 4: Detailed Vintage Guitar (Niche Item)

### Input
```
Title: "1965 Fender Jaguar Sunburst - Original Case - Collector's Piece"
Description: "Rare 1965 Fender Jaguar in classic sunburst.
              All original: pickups, tuners, bridge, electronics.
              No repairs, no refinish. Some minor wear consistent
              with age, but no structural damage.
              Includes original Fender hard case.
              Clean frets, strong neck.
              Ready to play or collect."
Category: "Musical Instruments > Guitars"
Condition: "Good"
```

### Item Profile Detection
```
Detected Type: GUITAR
Type Confidence: 99%

Extracted Fields:
  - brand: "Fender"
  - model: "Jaguar"
  - year: 1965
  - color: "Sunburst"
  - condition: "good" (original, unrepaired)
  - special_features: ["all_original_parts", "original_case", "collector_piece"]
```

### Queries Generated
```
Query 1: "1965 Fender Jaguar Sunburst All Original"
Query 2: "Fender Jaguar 1965 original"
Query 3: "Fender Jaguar 1965"
Query 4: "Fender Jaguar vintage"
```

### eBay Search Results

**Query 1 ("1965 Fender Jaguar Sunburst All Original"):**
- Results: 3 sold
- Price range: $4,200–$5,100
- Median: $4,650
- CV: 0.095 (tight for such an expensive item)
- Token overlap: 98% (perfect match)
- Recency: Sold 12, 28, 64 days ago
- Quality score: 68/100 MEDIUM (low comp count, but tight prices)

**Selection:** Query 1. Good data despite low count.

### Comps Analysis
```
Raw Results: 3 sold vintage Jaguars

Z-score check:
  All 3 within 1.5 std devs (no outliers)

Final Clean Comps: 3 items
Median: $4,650
Range: $4,200–$5,100
Std Dev: $450
CV: 0.097 (tight)
```

### Confidence & Warnings
```
⚠️  MEDIUM CONFIDENCE (Low Comp Count)

Vintage guitars, especially rare models like the Jaguar,
have limited eBay sales history.

Only 3 recent sales found, but they're closely clustered
($4,200–$5,100), suggesting stable collector market.

Risk: With low comp volume, one sale at an unusual
price could skew next month's average.

Recommendation: Use this data, but watch future sales.
If price drops below $4,000, market may be shifting.
```

### Final User Output
```
┌──────────────────────────────────────────────────────┐
│ ⚠️  MEDIUM CONFIDENCE - RARE ITEM                   │
├──────────────────────────────────────────────────────┤
│ Item: 1965 Fender Jaguar, Sunburst (All Original)    │
│ Condition: Good (unrepaired, with case)              │
│                                                      │
│ Comps found: 3 sold in last 90 days (limited data)   │
│ Price range: $4,200 – $5,100                         │
│ Median price: $4,650                                 │
│ Confidence: MEDIUM ⚠ (rare item, few sales)         │
│                                                      │
│ eBay fees (12%): -$558                               │
│ Shipping cost: -$80                                  │
│ ────────────────────────────────────────             │
│ Expected net proceeds: $4,012                        │
│                                                      │
│ For 30% ROI:                                         │
│ Max safe bid: $2,500                                 │
│ Estimated profit: $1,512                             │
│                                                      │
│ ⚠️  Warnings:                                        │
│ ⚠️  Only 3 comps found. Collector market can shift.  │
│ ⚠️  Consider expert appraisal for this rarity.       │
│ ⚠️  Price volatility is higher than modern guitars.  │
└──────────────────────────────────────────────────────┘
```

**Lesson:** Niche items (low comp count) flagged as MEDIUM. System is honest.

---

## TEST CASE 5: Random Estate Item (Minimal Info)

### Input
```
Title: "Old Camera - Estate Find"
Description: "Found in attic. Works. Vintage."
Category: "Cameras & Photography"
Condition: Unknown
```

### Item Profile Detection
```
Detected Type: ELECTRONICS (generic camera)
Type Confidence: 65% (moderate - camera keyword, but no model)

Extracted Fields:
  - category: "camera"
  - brand: null (no brand identified)
  - model: null (not specified)
  - age: "vintage" (inferred from description)
  - condition: "working" (basic)
  - keywords: ["camera", "vintage", "works"]
```

**Why only 65%?** No brand, no model, only vague age & condition.

### Queries Generated
```
Query 1: "vintage camera working"
Query 2: "old camera"
Query 3: "vintage camera"
Query 4: "camera"
```

### eBay Search Results

**Query 1 ("vintage camera working"):**
- Results: 280+
- Price range: $5–$2,000
- CV: 0.87 (TERRIBLE - all over the place)
- Quality score: 22/100 ✗ TOO BROAD

**Query 2 ("old camera"):**
- Results: 950+
- Too broad

**Query 3 ("vintage camera"):**
- Results: 1,200+
- Too broad

**Query 4 ("camera"):**
- Results: 5,000+
- Forced to use

### Result Selection
```
OUTCOME: Use filtered subset of Query 3
Applied filters: Sold in last 90 days, price $10–$500 range
Selected: ~40 random vintage cameras
Median: $65
CV: 0.62 (wide spread)
Quality score: 35/100 LOW
```

### Warnings Displayed
```
🚨 VERY LOW CONFIDENCE - ALMOST USELESS

Your listing is too vague to get good comps.

We found 40+ vintage cameras ranging from $10 to $500,
but WITHOUT knowing the brand/model, we can't narrow it down.

A vintage Leica: $300–$1,500
A vintage Pentax: $50–$200
A vintage Kodak: $10–$50
A vintage Canon: $30–$150

These are completely different prices!

NEXT STEPS:
1. Look for brand name (Usually printed on camera)
2. Find model number (Often on bottom or back)
3. Search that exact model on eBay
4. Re-run this analyzer

Re-list with: "Vintage [Brand] [Model] Camera"
```

### Final User Output
```
┌──────────────────────────────────────────────────────┐
│ 🚨 VERY LOW CONFIDENCE - NEED MORE INFO             │
├──────────────────────────────────────────────────────┤
│ Item: Unknown Vintage Camera                         │
│                                                      │
│ Comps found: 40 (but way too varied)                 │
│ Price range: $10 – $500                              │
│ Median: $65                                          │
│ Confidence: VERY LOW ✗✗                              │
│                                                      │
│ 💡 SOLUTION:                                         │
│ Identify the camera brand and model, then           │
│ re-run the analyzer. Prices vary 10x depending      │
│ on make/model.                                       │
│                                                      │
│ Example actions:                                     │
│ • Check camera body for brand name                  │
│ • Look for model number (bottom, back, viewfinder) │
│ • Google "[Brand] [Model]" to confirm               │
│                                                      │
│ Once you know the model, max bid could be:          │
│ • Leica? → $600+ (high-end)                         │
│ • Canon? → $100–$300 (mid)                          │
│ • Kodak? → $20–$50 (basic)                          │
│                                                      │
│ DO NOT BID BLIND ON CAMERAS. Get details first.     │
└──────────────────────────────────────────────────────┘
```

**Lesson:** System gracefully degrades. Refuses to guess. Tells user how to fix it.

---

## Summary of Test Case Outcomes

| Test Case | Type | Confidence | Comp Count | Output Quality | User Action |
|-----------|------|------------|-----------|----------------|------------|
| 1. Vague Furniture | Generic | LOW (55%) | ~50 | Unreliable | Get more details |
| 2. iPhone 14 Pro | Electronics | HIGH (99%) | 46 | Perfect | Confident bid |
| 3. Tool Lot | Generic+Bundle | MEDIUM (70%) | 22 | Useful | Accept lot pricing |
| 4. 1965 Jaguar | Guitar | MEDIUM (65%) | 3 | Honest | Use with caution |
| 5. Unknown Camera | Electronics | VERY LOW (30%) | 40 | Unusable | Get model first |

**Key insight:** System confidence correlates with input quality & data availability. No false confidence.

---

**Once you run these 5 through the internal test tool and see outputs match expectations, Phase 2 is approved.**

