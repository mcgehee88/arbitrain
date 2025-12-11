# Arbitrain Pipeline Map – Simple Visual Flow

**For:** Non-engineers, product stakeholders, approvers  
**Goal:** See the entire comp-matching process in one picture

---

## THE COMPLETE FLOW (Top to Bottom)

```
┌──────────────────────────────────────────────────────────────┐
│  USER INPUT (from URL scrape or manual paste)                │
│  ────────────────────────────────────────────────────────────│
│  Title: "Vintage Fender Stratocaster 1985"                   │
│  Description: "Excellent condition, sunburst, comes with case│
│  Site category: "Musical Instruments"                        │
│  Images: [url1, url2, ...]                                   │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: DETECT ITEM TYPE                                    │
│  ────────────────────────────────────────────────────────────│
│  Look for clues:                                             │
│  • Title keywords: "Fender" → guitar maker                   │
│  • Site category: "Musical Instruments"                      │
│  • Description: "Stratocaster" → specific guitar model       │
│                                                              │
│  RESULT: Type = "guitar" (confidence: 98%)                   │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: EXTRACT KEY FIELDS                                  │
│  ────────────────────────────────────────────────────────────│
│  For "guitar" type, we know to look for:                     │
│  • Brand: "Fender"  ✓                                        │
│  • Model: "Stratocaster"  ✓                                  │
│  • Year: "1985"  ✓                                           │
│  • Color: "sunburst"  ✓                                      │
│  • Condition: "excellent"  ✓                                 │
│                                                              │
│  RESULT: Extracted profile (ready for search)                │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: BUILD eBay SEARCH QUERIES                           │
│  ────────────────────────────────────────────────────────────│
│  Start SPECIFIC, get LESS specific as fallback:              │
│                                                              │
│  Query 1: "Fender Stratocaster 1985 sunburst"               │
│           (all key fields)                                   │
│                                                              │
│  Query 2: "Fender Stratocaster 1985"                        │
│           (drop color)                                       │
│                                                              │
│  Query 3: "Fender Stratocaster vintage"                     │
│           (drop year, use "vintage" instead)                │
│                                                              │
│  Query 4: "Stratocaster guitar"                             │
│           (fallback: just model name)                        │
│                                                              │
│  RESULT: 4 query candidates (in priority order)              │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: SEARCH eBay (SOLD ITEMS ONLY)                       │
│  ────────────────────────────────────────────────────────────│
│  Try queries 1, 2, 3, 4 in order until we get good results  │
│                                                              │
│  Query 1: Search eBay for SOLD items matching               │
│           "Fender Stratocaster 1985 sunburst"               │
│           → Found 12 results                                 │
│                                                              │
│  Check: Are these actually Stratocasters? ✓ Yes             │
│         Good price cluster? ✓ Yes ($2500-$3200)             │
│         Recent sales? ✓ Yes (last 90 days)                  │
│                                                              │
│  RESULT: Use Query 1 results. Stop searching.                │
│          (Good data = no need for fallback)                  │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: SCORE THE RESULTS                                   │
│  ────────────────────────────────────────────────────────────│
│  Ask: "How good is this data set?"                           │
│                                                              │
│  Check #1: Do we have enough comps?                         │
│            12 results → GOOD ✓                               │
│                                                              │
│  Check #2: Is the price range tight?                        │
│            $2500-$3200, avg $2850                           │
│            Spread = 28% → ACCEPTABLE (guitars vary) ✓       │
│                                                              │
│  Check #3: Do the items match our listing?                  │
│            All are "Fender Stratocaster 1980s" → EXCELLENT✓ │
│                                                              │
│  Check #4: Are any prices WAY off?                          │
│            Remove $500 outlier (damaged)                    │
│            Remove $5000 outlier (rare variant)              │
│            Left with 10 "normal" sales → CLEAN ✓            │
│                                                              │
│  RESULT: Quality Score = 88% (HIGH CONFIDENCE)               │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: FINAL COMPS SUMMARY                                 │
│  ────────────────────────────────────────────────────────────│
│  10 sold comps found (after outlier removal)                 │
│  Price range: $2650–$3100                                    │
│  Median (middle price): $2875                                │
│  Confidence: 88% (high — good data)                          │
│                                                              │
│  REASONING:                                                  │
│  "12 eBay Stratocasters from 1985 sold in last 90 days.     │
│   Removed 2 outliers (damaged, rare variant).                │
│   Clean data shows median $2875."                            │
│                                                              │
│  ⚠ Warnings: None                                            │
│                                                              │
│  RESULT: Ready for pricing calculation                       │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│  USER SEES (FINAL OUTPUT)                                    │
│  ────────────────────────────────────────────────────────────│
│                                                              │
│  📊 SOLD COMPS                                               │
│  ─────────────────────────────────────────────────────────── │
│  Fender Stratocaster 1985 (sunburst)                         │
│                                                              │
│  Recent eBay Sales:  10 guitars, last 90 days               │
│  Median Price:       $2,875                                  │
│  Price Range:        $2,650 – $3,100                         │
│  Confidence:         HIGH ✓✓                                 │
│                                                              │
│  💰 PRICING ESTIMATE                                         │
│  ───────────────────────────────────────────────────────────│
│  Expected resale price: $2,875                               │
│  After eBay fees (-12%):  -$345                              │
│  After shipping (-$40):   -$40                               │
│  Net proceeds:           $2,490                              │
│                                                              │
│  If your ROI target is 30%:                                  │
│  Max safe bid:          $1,250                               │
│  Estimated profit:      $1,240                               │
│                                                              │
│  ⚠ WARNINGS: None – strong data                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## What Happens at Each Stage

### Input (What User Provides)
- URL from CTBids/HiBid/ShopGoodwill (auto-scraped)
- Or manually: title + description + category

### Step 1: Type Detection
- System reads title, description, category
- Matches against known item types
- **Output:** "guitar" (or "card", "electronics", "furniture", etc.)

### Step 2: Field Extraction
- For guitars, we know to look for: brand, model, year, color, condition
- Pulls these from title/description
- **Output:** Structured data (brand="Fender", model="Stratocaster", etc.)

### Step 3: Query Building
- Creates 4 search queries, from most specific to most generic
- **Output:** List of eBay search strings to try

### Step 4: Search
- Calls eBay API asking: "Show me SOLD guitars matching this description"
- Stops when it finds good results
- **Output:** 10–50 sold listings from eBay

### Step 5: Scoring
- Checks: Are these the right items? Do prices make sense? Is data clean?
- Removes outliers (suspicious prices)
- **Output:** Confidence score (LOW/MEDIUM/HIGH)

### Step 6: Final Output
- **Shows user:** Median sold price, price range, # of comps, confidence, reasoning
- **Powers pricing:** Feeds into max-bid calculation

---

## Visual: The "Query Ladder"

When first query doesn't work well, we try less specific queries:

```
┌─────────────────────────┐
│ Query 1: Most Specific  │  "Fender Stratocaster 1985 sunburst"
│ (All fields)            │  → Found 12 comps? → STOP, use these
└─────────────────────────┘
            ↓
        (if bad data)
            ↓
┌─────────────────────────┐
│ Query 2: More Relaxed   │  "Fender Stratocaster 1985"
│ (drop color)            │  → Found 35 comps? → Check quality
└─────────────────────────┘
            ↓
        (if still bad)
            ↓
┌─────────────────────────┐
│ Query 3: Very Generic   │  "Fender Stratocaster"
│ (drop year)             │  → Found 200 comps? → Wide range
└─────────────────────────┘
            ↓
        (if still bad)
            ↓
┌─────────────────────────┐
│ Query 4: Last Resort    │  "Stratocaster guitar"
│ (just model)            │  → Use, but flag as LOW confidence
└─────────────────────────┘
```

---

## Key Principle: Stop When Data Is Good

- If Query 1 gives us 10–50 comps with tight price clustering → **USE IT**
- If Query 1 gives us 500+ comps (too broad) → **Try Query 2**
- If Query 4 gives us 2 comps → **FLAG AS LOW CONFIDENCE, but still show it**

**Never force data.** If comps are weak, tell the user.

---

**This map is the entire flow. No code. Just clear logic.**

