# Phase 2 MVP Spec – Minimal Shippable Version

**Goal:** Ship the smallest working comp-matching system that produces reliable sold comps for the most common item types.

**Scope:** 3 item types, 4-query ladder, scoring, outlier removal, clear output.

---

## MVP Checklist

### CORE: 3 Item Types (Not 14)

- [ ] **Type 1: Trading Cards**
  - Detect: "card", "psa", "graded", "sports", "pokemon", "magic", "numbered"
  - Extract: sport/game, player, year, set, card_number, grade, condition
  - Examples: Sports cards, Pokémon, Magic the Gathering

- [ ] **Type 2: Electronics**
  - Detect: "iphone", "laptop", "camera", "console", "phone", "tablet", "watch"
  - Extract: brand, model, storage, color, carrier (for phones), condition
  - Examples: iPhones, MacBooks, cameras, gaming consoles

- [ ] **Type 3: Generic / Everything Else**
  - Detect: Fallback for furniture, tools, shoes, jewelry, collectibles, etc.
  - Extract: brand (if any), model (if any), key_features (from title), condition
  - Examples: Vintage guitar, desk, watch, lot of tools, estate item

**Rationale:** These 3 cover ~70% of typical flipper items. Add more types in Phase 3.

---

### FIELD EXTRACTION: Minimal but Sufficient

**For Cards:**
```
fields = {
  sport_or_game: "basketball"      // from title/description
  player: "Michael Jordan"          // primary keyword
  year: 1986                        // 4-digit number
  set: "Fleer"                      // set name
  card_number: "57"                 // if present
  grade: "PSA 9"                    // grading + score
  condition: "new"                  // graded = new
}
```

**For Electronics:**
```
fields = {
  brand: "Apple"                    // keyword match
  model: "iPhone 14 Pro"            // product name
  storage: "256GB"                  // capacity
  color: "Space Black"              // color name
  carrier: "Verizon"                // if mentioned (phones only)
  condition: "like_new"             // from description
}
```

**For Generic:**
```
fields = {
  brand: "Fender"                   // if found
  model: "Stratocaster"             // if found
  key_features: ["vintage", "sunburst", "1985"]  // list of notable words
  condition: "excellent"            // from description
}
```

---

### QUERY GENERATION: 4-Query Ladder

**Cards Example:**
```
Query 1: "PSA 9 Michael Jordan 1986 Fleer Rookie"
         (all specific fields: grade, player, year, set)

Query 2: "Michael Jordan 1986 Fleer PSA 9"
         (reorder, same specificity)

Query 3: "Michael Jordan 1986 rookie card"
         (drop set name, use "rookie")

Query 4: "Michael Jordan basketball card"
         (fallback: just player + sport)
```

**Electronics Example:**
```
Query 1: "Apple iPhone 14 Pro 256GB Space Black"
         (brand, model, storage, color)

Query 2: "iPhone 14 Pro 256GB"
         (drop color, keep storage)

Query 3: "iPhone 14 Pro"
         (drop all modifiers)

Query 4: "Apple iPhone 14"
         (just brand + base model)
```

**Generic Example (Guitar):**
```
Query 1: "Fender Stratocaster 1985 sunburst"
         (brand, model, year, color)

Query 2: "Fender Stratocaster vintage"
         (brand, model, use "vintage" instead of year)

Query 3: "Stratocaster guitar"
         (just model, no brand)

Query 4: "vintage guitar"
         (fallback: just condition + type)
```

**Algorithm:**
1. Try Query 1
2. If results count is 10–100 AND price CV < 0.4 → **USE IT, STOP**
3. If not, try Query 2 (same logic)
4. If not, try Query 3
5. If nothing works, use Query 4 (but flag as LOW confidence)

---

### QUALITY SCORING: Simple Formula

**Score each result set on 4 dimensions:**

```
score_count:
  if results >= 10: 100 points
  if results >= 5:  80 points
  if results >= 3:  60 points
  if results < 3:   20 points

score_spread:
  CV = std_dev / median
  if CV < 0.20:    100 points (tight cluster)
  if CV < 0.35:    80 points
  if CV < 0.50:    60 points
  else:            30 points

score_recency:
  if all sold in last 30 days: 100 points
  if all sold in last 60 days: 80 points
  if all sold in last 90 days: 60 points
  else:                        30 points

score_token_overlap:
  % of listing fields that appear in the result titles
  if > 80%: 100 points
  if > 60%: 80 points
  if > 40%: 60 points
  else:    30 points

TOTAL = (score_count * 0.30 +
         score_spread * 0.30 +
         score_recency * 0.20 +
         score_token_overlap * 0.20)

confidence_level:
  if TOTAL >= 75:   "HIGH"    (green ✓)
  if TOTAL >= 55:   "MEDIUM"  (yellow ⚠)
  if TOTAL < 55:    "LOW"     (red ✗)
```

---

### OUTLIER REMOVAL: Statistical

```
After selecting best result set:

median_price = median(prices)
std_dev = stdev(prices)

FOR EACH sold item:
  z_score = abs(price - median) / std_dev
  
  IF z_score > 2.0:
    Remove this item (outlier)
    Log: "Removed $XXXX outlier (unusual condition/variant)"

FINAL_COMPS = remaining items
```

**Example:**
- Results: $2500, $2600, $2650, $2800, $2900, $3000, $3100, $3200, $500, $5000
- Median: $2875, StdDev: $1200
- $500: z=2.0 ✓ borderline, keep
- $5000: z=1.8 ✓ borderline, keep
- Hmm, these don't get removed
- BUT score_spread is bad (CV > 0.5) → FLAG as LOW confidence

**Alternative:** Remove top/bottom 10% if count > 20. Simpler. Do this first.

---

### OUTPUT FORMAT: Clear for Non-Engineers

**User receives 3 sections:**

```
┌─────────────────────────────────────────┐
│ 1. WHAT WE THINK YOU HAVE               │
├─────────────────────────────────────────┤
│ Item Type:     Trading Card             │
│ Confidence:    98%                      │
│                                         │
│ Details:                                │
│ • Player: Michael Jordan                │
│ • Year: 1986                            │
│ • Set: Fleer                            │
│ • Grade: PSA 9                          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 2. eBay SOLD COMPS (Real Data)          │
├─────────────────────────────────────────┤
│ Comps found:   4 sold in last 90 days   │
│ (Query used:   "PSA 9 MJ 1986 Fleer")   │
│                                         │
│ Price Range:   $4,800 – $6,200          │
│ Median Price:  $5,500                   │
│                                         │
│ Confidence:    MEDIUM ⚠                 │
│ (Only 4 comps; rare item)               │
│                                         │
│ Warnings:                               │
│ ⚠ Low comp count. Prices may shift.     │
│ ⚠ Graded card market is volatile.       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 3. YOUR MAX BID (Assumes 30% ROI)       │
├─────────────────────────────────────────┤
│ Expected resale:    $5,500              │
│ eBay fees (-12%):   -$660               │
│ Shipping (-$20):    -$20                │
│ ─────────────────────────────────────   │
│ Net proceeds:       $4,820              │
│                                         │
│ Safe max bid:       $3,200              │
│ (leaves $1,620 profit / 33% ROI)        │
└─────────────────────────────────────────┘
```

---

### IMPLEMENTATION CHECKLIST

**Backend (Fastify API):**
- [ ] Endpoint: `POST /analyze`
  - Input: title, description, category, condition (optional)
  - Output: ListingProfile + eBay comps + pricing + confidence
- [ ] Item type detection (keyword matching for 3 types)
- [ ] Field extraction (regex + simple string parsing)
- [ ] Query generation (template substitution)
- [ ] eBay Finding API integration (call with proper filters)
- [ ] Quality scoring (formula above)
- [ ] Outlier removal (statistical)
- [ ] Error handling (API failures, timeouts, no results)

**Frontend (React):**
- [ ] Simple form: title + description + category + condition
- [ ] Submit button ("Analyze")
- [ ] Results page showing 3 sections above
- [ ] Confidence indicator (HIGH/MEDIUM/LOW)
- [ ] Warnings display
- [ ] "Try different fields" link (lets user re-analyze)

**Testing:**
- [ ] 5 test cases (vague furniture, detailed electronics, lot, guitar, random estate item)
- [ ] Run through internal tool (see Step 3 below)
- [ ] Compare outputs to manual eBay searches
- [ ] Verify confidence scores make sense

---

## Success Criteria for MVP

✅ **Phase 2 MVP is done when:**

1. System detects 3 item types correctly (cards, electronics, generic)
2. Extracts key fields from listing data
3. Generates 4-query ladder and tries them in order
4. Returns eBay sold comps with confidence score
5. Output is clear, readable, trustworthy for a human flipper
6. 5 test cases pass (outputs match manual verification)
7. All 3 sections (what we think, comps, max bid) are accurate

**Timeline:** 1 week of dev + testing

---

**Ready to implement once approved.**

