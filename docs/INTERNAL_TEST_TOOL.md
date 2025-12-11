# Internal Test Tool – Design & Wireframe

**Purpose:** Before touching the real UI, test the comp-matching system with real data.

**Who uses it:** Developer + product owner (you) for verification & debugging.

**Access:** Localhost during dev, then internal URL (not public).

---

## UI Layout (Simple HTML Form + Results)

```
╔════════════════════════════════════════════════════════════════╗
║  ARBITRAIN INTERNAL COMP ANALYZER                              ║
║  (Testing Tool - DO NOT SHIP)                                  ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  SECTION 1: INPUT FORM                                         ║
║  ────────────────────────────────────────────────────────────  ║
║                                                                ║
║  Title (required):                                             ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ Vintage Fender Stratocaster 1985 Sunburst w/ Case     │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  Description (optional):                                       ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ Excellent condition, original paint, all original parts│   ║
║  │ Comes with Fender hard case. Strings fresh.           │   ║
║  │ No cracks or major dings.                             │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
║  Category (optional):                                          ║
║  ┌─────────────────────────┐                                   ║
║  │ Musical Instruments   ▼ │                                   ║
║  └─────────────────────────┘                                   ║
║                                                                ║
║  Condition (optional):                                         ║
║  ○ Excellent  ● Used/Mixed  ○ Poor  ○ New  ○ Unknown          ║
║                                                                ║
║  [ ANALYZE ]  [ CLEAR ]                                        ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  SECTION 2: ITEM PROFILE (Auto-filled after analysis)         ║
║  ────────────────────────────────────────────────────────────  ║
║                                                                ║
║  Detected Type:    GUITAR                                      ║
║  Type Confidence:  98%                                         ║
║                                                                ║
║  Extracted Fields:                                             ║
║  ┌────────────────────────────────────────────────────────┐   ║
║  │ brand:        "Fender"                                 │   ║
║  │ model:        "Stratocaster"                           │   ║
║  │ year:         1985                                     │   ║
║  │ color:        "Sunburst"                               │   ║
║  │ condition:    "Excellent"                              │   ║
║  │ included:     ["case"]                                 │   ║
║  └────────────────────────────────────────────────────────┘   ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  SECTION 3: eBay QUERIES TRIED (Debug info)                   ║
║  ────────────────────────────────────────────────────────────  ║
║                                                                ║
║  [ Query 1: "Fender Stratocaster 1985 Sunburst" ]   ✓ USED   ║
║    Results: 24 found                                           ║
║    Score: 82/100 (GOOD)                                        ║
║    → Selected this one                                         ║
║                                                                ║
║  [ Query 2: "Fender Stratocaster 1985" ]           ✗ skipped  ║
║    (Query 1 was good enough)                                   ║
║                                                                ║
║  [ Query 3: "Fender Stratocaster" ]                ✗ skipped  ║
║  [ Query 4: "Stratocaster guitar" ]                ✗ skipped  ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  SECTION 4: SOLD COMPS FROM eBay                              ║
║  ────────────────────────────────────────────────────────────  ║
║                                                                ║
║  Raw Results (before outlier removal):  24 items              ║
║                                                                ║
║  [ EXPAND ] Price distribution:                                ║
║             $2,200 | $2,400 | $2,700 | $2,900 | $3,100 |     ║
║             $3,200 | $3,400 | $3,600 | $3,800 | $4,000 |     ║
║             ... (24 total)                                    ║
║                                                                ║
║  Statistical Check:                                            ║
║    Median: $2,875                                              ║
║    Std Dev: $520                                               ║
║    CV: 0.18 (tight cluster ✓)                                 ║
║                                                                ║
║  Outliers Removed:  1                                          ║
║    • $500 (z=4.1) — damaged/variant                           ║
║    • $6,200 (z=6.3) — rare custom variant                     ║
║                                                                ║
║  Final Clean Comps:  22 items                                 ║
║                                                                ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  SECTION 5: FINAL PRICING OUTPUT                              ║
║  ────────────────────────────────────────────────────────────  ║
║                                                                ║
║  ✅ COMPS FOUND                                                ║
║  ───────────────────────────────────                           ║
║  Type:      Fender Stratocaster 1985                           ║
║  Comps:     22 sold in last 90 days                            ║
║  Median:    $2,875                                             ║
║  Range:     $2,200 – $3,400                                    ║
║  Spread:    18% (tight cluster)                                ║
║  Confidence: HIGH ✓✓                                           ║
║                                                                ║
║  Query used: "Fender Stratocaster 1985 Sunburst" (Query 1)    ║
║                                                                ║
║  ⚠ Warnings: None                                              ║
║                                                                ║
║  ─────────────────────────────────────────────────            ║
║  Expected eBay resale price:  $2,875                           ║
║  Less eBay fees (12%):        -$345                            ║
║  Less shipping:               -$40                             ║
║  ─────────────────────────────────────────────────            ║
║  Net proceeds:                $2,490                           ║
║                                                                ║
║  For 30% ROI target:                                           ║
║  Safe max bid:                $1,250                           ║
║  Estimated profit:            $1,240                           ║
║                                                                ║
║  [ COPY TO CLIPBOARD ]  [ EXPORT JSON ]                        ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

---

## User Interaction Flow

### Scenario 1: User Tests a Detailed Item
```
1. User pastes: "Vintage Fender Stratocaster 1985 Sunburst w/ Case"
2. Clicks "ANALYZE"
3. System detects type: GUITAR (98% confident)
4. Extracts fields: brand, model, year, color, condition
5. Generates queries: [Query 1, Query 2, Query 3, Query 4]
6. Calls eBay: Query 1 returns 24 results (good!)
7. Scores: 82/100 HIGH confidence
8. Removes outliers: 2 removed, 22 clean comps
9. Shows all 5 sections above
10. User reads: "22 comps found, median $2,875, max bid $1,250"
11. User can [ EXPORT JSON ] to log the result
```

### Scenario 2: User Tests a Vague Item
```
1. User pastes: "Nice wooden desk"
2. Clicks "ANALYZE"
3. System detects type: GENERIC (62% confident) ⚠
4. Extraction: only finds "wooden" + "desk"
5. Query 1: Returns 400+ results (too broad)
6. Query 2: Returns 80 results (better)
7. Scores: 52/100 MEDIUM confidence
8. Prices range $200–$2,000 (CV = 0.45, wide)
9. Shows: "MEDIUM confidence. Vague listing. Try adding dimensions/brand."
10. User can [ EDIT ] and re-run
```

### Scenario 3: User Tests a Lot
```
1. User pastes: "Lot of 20 vintage tools from estate"
2. Detects: "lot of" pattern
3. TYPE DETECTION: UNCERTAIN (multiple types detected)
4. SPECIAL HANDLING: "This appears to be a lot/bundle.
                      Select primary item type for comps:"
   [ Tools ]  [ Electronics ]  [ Mixed - Skip for now ]
5. User selects "Tools"
6. Query: "vintage tool lot" 
7. Results: 8 sold lots averaging $150–$400 per lot
8. Output: "As a lot: ~$250. Per item (÷20): ~$12.50 each"
9. Max bid: $100–$150 (for entire lot)
```

---

## Output Formats

### JSON Export (For Logging)
```json
{
  "analyzed_at": "2025-12-11T18:30:00Z",
  "input": {
    "title": "Vintage Fender Stratocaster 1985 Sunburst w/ Case",
    "description": "...",
    "category": "Musical Instruments",
    "condition": "used"
  },
  "item_profile": {
    "detected_type": "guitar",
    "type_confidence": 98,
    "fields": {
      "brand": "Fender",
      "model": "Stratocaster",
      "year": 1985,
      "color": "Sunburst",
      "condition": "Excellent"
    }
  },
  "queries_tried": [
    {
      "query": "Fender Stratocaster 1985 Sunburst",
      "results_count": 24,
      "quality_score": 82,
      "status": "USED"
    },
    ...
  ],
  "comps": {
    "count": 22,
    "median": 2875,
    "range": [2200, 3400],
    "std_dev": 520,
    "cv": 0.18,
    "confidence": "HIGH",
    "warnings": []
  },
  "pricing": {
    "expected_resale": 2875,
    "ebay_fees": -345,
    "shipping": -40,
    "net_proceeds": 2490,
    "max_bid_30pct_roi": 1250,
    "estimated_profit": 1240
  }
}
```

---

## Debugging Features

The tool also shows developers:

- **Type confidence breakdown:** Why did we pick "guitar"? (keyword match: Fender=100pts, Stratocaster=100pts, category=80pts)
- **Field extraction details:** Which patterns matched, which didn't
- **Query selection logic:** Why Query 1 won (score 82 > threshold)
- **Outlier stats:** Min, max, removed count, reasoning
- **eBay API calls:** How many calls made, rate limit status

---

## Implementation (Phase 2)

**Build as:** Single-page React component  
**Location:** `/apps/web/src/pages/internal-test.tsx` (password-protected later)  
**Backend:** Uses same `/analyze` endpoint as production  
**No new code:** Just displays existing API responses beautifully  

**Dev flow:**
1. Run `npm run dev`
2. Go to http://localhost:5173/test
3. Paste test cases
4. See full pipeline in real-time

---

**This tool is your confidence machine. You'll run all 5 test cases through it before saying "ship it."**

