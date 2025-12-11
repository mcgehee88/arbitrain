# Arbitrain Smart eBay Comp Matching – Design Document

**Phase:** 1 (Design Only)  
**Purpose:** Define a pluggable, extensible system for matching items across any category to realistic eBay sold comps.  
**Audience:** Product, Dev, Approvers (before Phase 2 implementation)

---

## 1. ARCHITECTURE: Generic Item → eBay Comps Pipeline

### Core Data Structure: ListingProfile

Every item—regardless of category—gets normalized into a single data structure:

```
ListingProfile {
  // Raw inputs
  source_title: string
  source_description: string
  source_category: string (site category from CTBids/HiBid/etc.)
  source_images: string[] (URLs or base64 in Phase 2+)
  condition: string ("new", "like_new", "used", "poor", "unknown")
  
  // Detected type
  detected_type: string ("card", "electronics", "guitar", "shoe", "furniture", etc.)
  type_confidence: number (0-100: how sure are we?)
  
  // Extracted fields (type-specific)
  fields: Record<string, any> {
    // Examples:
    // Cards: { player, year, set, card_number, grading_company, grade }
    // Electronics: { brand, model, storage, color, carrier }
    // Shoes: { brand, model_line, size, colorway, gender }
    // Generic: { brand, model, color }
  }
  
  // Metadata
  extracted_at: ISO8601
  item_confidence: number (0-100: overall confidence in this profile)
}
```

### Pipeline: 8-Step Flow

```
INPUT: Raw listing (title, description, category, images)
  ↓
[STEP 1] ITEM TYPE DETECTION
  • Signals: title keywords, category breadcrumb, description patterns
  • Output: detected_type + type_confidence
  • Fallback: "generic" type if ambiguous
  ↓
[STEP 2] FIELD EXTRACTION
  • Load type schema (e.g., if card → card extractor)
  • Extract entities: brand, model, year, condition, etc.
  • Output: fields dict + extraction confidence per field
  ↓
[STEP 3] QUERY GENERATION
  • Build 3-4 query variants (specific → relaxed → generic)
  • Variants use different field combinations
  • Output: [query1, query2, query3, ...] with metadata (specificity rank)
  ↓
[STEP 4] eBay API CALLS
  • Call eBay Finding API findCompletedItems (SoldItemsOnly=true)
  • For each query variant (in order), fetch results
  • Respect rate limits (5 req/sec, 100k/day)
  • Output: raw eBay results per query
  ↓
[STEP 5] RESULT FILTERING & DEDUPING
  • Remove duplicates by eBay item ID
  • Filter by category match (optional stricter filter)
  • Time window: sold in last 90–180 days (configurable)
  • Output: deduplicated result set per query
  ↓
[STEP 6] QUALITY SCORING
  • Score each result set (comps count, price spread, token overlap, category match)
  • Detect if results are clearly wrong item type
  • Output: best_result_set + quality_score + diagnostics
  ↓
[STEP 7] OUTLIER REMOVAL
  • Remove statistical outliers (>2 std devs from median price)
  • Flag high-variance sets as low-confidence
  • Output: final clean comps list
  ↓
[STEP 8] RETURN FINAL COMPS
  • Return comps + metrics (median price, price range, count, confidence)
  • Include reasoning (which query worked, confidence level, caveats)
  • Output: CalculationInput (ready for profit analysis)
```

**Key Design Principle:** *Each step is modular. Steps 1–2 feed into step 3, and step 6 picks the best variant. No step is blocked by others. Early return if a query is "good enough."*

---

## 2. ITEM TYPE DETECTION

### Signals (Priority Order)

1. **Source Category Breadcrumb** (strongest)
   - CTBids, HiBid, ShopGoodwill, etc. provide category info
   - Parse and map to Arbitrain type (e.g., "Trading Cards & Sports" → "card")

2. **Title Keywords** (strong)
   - Card: "card", "psa", "graded", "pokemon", "magic", "sports"
   - Electronics: "iphone", "laptop", "camera", "console", "phone"
   - Shoes: "nike", "jordan", "adidas", "sneaker", "size"
   - Furniture: "table", "chair", "couch", "desk", "vintage"
   - Guitars: "guitar", "bass", "fender", "gibson", "amp"
   - etc.

3. **Description Patterns** (moderate)
   - Condition descriptors: "mint", "like new", "sealed", "used", "poor"
   - Technical specs: "64GB", "2020 model", "size 10", "wooden"
   - Collections: "lot of", "bundle", "multiple"

4. **Image Analysis** (Phase 2+, not MVP)
   - Computer vision to confirm type

### Type Fallback

If no strong signal or ambiguous:
- Classify as **"generic"** type (most fields optional)
- Use broad keyword matching in eBay query
- Will match lower-quality comps but still functional

### Detection Algorithm

```
IF source_category exists:
  map_category_to_type(source_category)
  type_confidence = 85

ELSE IF title_matches_strong_keyword_set:
  detected_type = keyword_set_type
  type_confidence = 75

ELSE IF description_contains_pattern:
  detected_type = inferred_type
  type_confidence = 60

ELSE:
  detected_type = "generic"
  type_confidence = 30
```

**Result:** Confidence score allows the system to be cautious downstream. Low-confidence types trigger more conservative queries.

---

## 3. FIELD EXTRACTION PER TYPE

### Type Schema Registry (Data-Driven, Not Code-Driven)

Each item type has a **schema** that defines extractable fields:

```
TYPE: card
FIELDS:
  - player (string, optional)
  - year (int, 4-digit, optional)
  - set (string, optional)
  - card_number (string, optional)
  - grading_company (enum: PSA, BGS, SGC, CGC, etc., optional)
  - grade (int or string, 1-10 scale, optional)
  - lot_size (int, default 1)
PATTERNS:
  - player: extract from title or description
  - year: look for 4-digit year
  - grading: "PSA", "BGS", "10", "9.5"
  - lot_size: "lot of 5", "5 cards", etc.

TYPE: electronics
FIELDS:
  - brand (string, optional)
  - model (string, optional)
  - storage (string, optional: "64GB", "256GB", "1TB")
  - color (string, optional)
  - carrier (string, optional: for phones)
  - condition (override generic)
PATTERNS:
  - brand: Apple, Samsung, Sony, etc.
  - model: "iPhone 14", "Galaxy S23", etc.
  - storage: regex \d+(GB|TB)
  - color: text after model or in title

TYPE: shoe
FIELDS:
  - brand (string)
  - model_line (string, optional: "Air Jordan 1", "Yeezy 500")
  - size (string, US size typically)
  - colorway (string, optional)
  - gender (enum: mens, womens, youth, unisex, optional)
PATTERNS:
  - brand: Nike, Adidas, Jordan, Yeezy, etc.
  - size: look for "size 10", "US 10.5", etc.
  - colorway: colors or "Black/Red", "Chicago" (common names)
  
TYPE: guitar
FIELDS:
  - brand (string)
  - model (string)
  - series (string, optional: "Custom Shop", "Player")
  - year (int, optional)
  - finish (string, optional: "Sunburst", "Black")
  - amp_wattage (int, if amp, optional)
PATTERNS:
  - brand: Fender, Gibson, PRS, Ibanez, etc.
  - model: "Stratocaster", "Les Paul", "Telecaster", etc.
  - finish: color names

TYPE: furniture
FIELDS:
  - brand (string, optional: IKEA, etc.)
  - style (string, optional: "Mid-Century Modern", "Victorian")
  - dimensions (string, optional: "60x30x20")
  - material (string, optional: "oak", "leather", "metal")
  - era (string, optional: "1970s", "modern")
PATTERNS:
  - dimensions: regex for inches/cm
  - materials: wood types, leather, fabric names
  - era: century/decade references

TYPE: generic
FIELDS:
  - brand (string, optional)
  - model (string, optional)
  - color (string, optional)
  - material (string, optional)
PATTERNS:
  - brand: common brand names
  - minimal structure
```

### Extraction Methods (Pluggable)

1. **Keyword Matching & Regex** (MVP)
   - Fast, no dependencies
   - Works for common fields (brand, model, storage, size)
   - 80% coverage for common items

2. **NLP Entity Extraction** (Phase 2+)
   - Use spaCy or similar to extract named entities
   - Better for messy descriptions

3. **LLM Extraction** (Phase 3+, if cost-justifiable)
   - Fallback for vague/messy listings
   - "Extract brand, model, condition from this: [text]"
   - More expensive, use only if rule-based fails

### Adding a New Type (Zero Code Changes)

1. Define schema in `packages/config/src/types/item-schemas.json` (new entry)
2. Add extraction patterns (regex, keyword lists)
3. Pipeline auto-discovers and loads it
4. **Done.** No code changes to core pipeline.

---

## 4. QUERY GENERATION ALGORITHM

### Principle: Specificity Ladder

Generate 3–4 queries, ranked from **most specific → most relaxed → fallback generic**.

The system tries them in order. If a query returns "good enough" results, stop. Otherwise, relax and retry.

### Query Template (Per-Type Example)

For **electronics** (smartphone):

```
QUERY VARIANT 1 (Most Specific)
  Keywords: "[brand] [model] [storage] [color]"
  Example: "iPhone 14 256GB Black"
  Category: Electronics > Mobile Phones
  Condition: Match source condition
  Price floor: [20% below median_if_known, or 0]

QUERY VARIANT 2 (Relaxed 1)
  Keywords: "[brand] [model] [storage]"
  Example: "iPhone 14 256GB"
  Category: Electronics > Mobile Phones
  Condition: Match source condition
  Price floor: 0

QUERY VARIANT 3 (Relaxed 2)
  Keywords: "[brand] [model]"
  Example: "iPhone 14"
  Category: Electronics > Mobile Phones
  Condition: (any)
  Price floor: 0

QUERY VARIANT 4 (Generic Fallback)
  Keywords: "[brand] phone"
  Example: "iPhone phone"
  Category: Electronics
  Condition: (any)
  Price floor: 0
```

### Query Generation Algorithm

```
INPUT: ListingProfile (type + extracted fields)

FOR EACH type schema:
  IF type == detected_type:
    LOAD schema.query_templates (predefined in config)
    
    FOR EACH template IN schema.query_templates (ordered: specific → relaxed):
      keywords = []
      
      FOR EACH field IN template.required_fields:
        IF profile.fields[field] exists:
          keywords.append(profile.fields[field])
      
      FOR EACH field IN template.optional_fields:
        IF profile.fields[field] exists AND specificity_rank < threshold:
          keywords.append(profile.fields[field])
      
      query = {
        keywords: join(keywords, " "),
        category: template.ebay_category,
        condition: source_condition OR template.default_condition,
        price_floor: template.price_floor,
        specificity_rank: template.rank
      }
      
      queries.append(query)
    
    RETURN queries

ELSE IF type == "generic" OR type_confidence < threshold:
  // Fallback
  brand = profile.fields.get("brand", "")
  keywords = trim([brand, profile.source_title].filter(non_empty))
  
  RETURN [{
    keywords: keywords,
    category: source_category OR "Everything Else",
    condition: source_condition,
    price_floor: 0,
    specificity_rank: 0
  }]
```

### Missing Fields: Graceful Degradation

- **No brand, no model:** Use title as keywords (generic)
- **No storage (phones):** Still works (iPhone 14 = all storages)
- **No size (shoes):** Query broader, filter by size later OR ask user
- **No year (vintage):** Use era keywords ("1960s guitar")

**Design principle:** Never fail. Degrade gracefully to broader query.

### Lots / Bundles

If `lot_size > 1` OR `bundle_detected`:
- Generate query for **each type of item** mentioned
- OR generate a generic "lot" query
- **In comps, note:** "This is a bundle; comps are for individual items within it"
- Adjust max bid calculation: `max_bid_per_item = final_max_bid / lot_size`

---

## 5. QUALITY SCORING FOR COMPS

### Scoring Criteria

For each result set returned from an eBay query:

#### A. Comps Count (result_count)
```
score_count:
  if count >= 10: 100 points
  if count >= 5: 80 points
  if count >= 3: 60 points
  if count == 2: 40 points
  if count == 1: 20 points
  if count == 0: 0 points (invalid)
```
**Rationale:** 10+ comps = statistically robust. 3+ = usable. 1 = risky.

#### B. Price Distribution (spread & variance)
```
median_price = median(result_prices)
std_dev = stdev(result_prices)
coefficient_of_variation = std_dev / median_price

score_spread:
  if CV < 0.20: 100 points (tight cluster, confident)
  if CV < 0.40: 80 points (reasonable spread)
  if CV < 0.60: 50 points (high variance, less confident)
  if CV >= 0.60: 20 points (all over the place, garbage)
```
**Rationale:** Tight cluster = truly comparable items. Wide spread = mixed results (different conditions, models, etc.).

#### C. Token Overlap (field match)
```
tokens_in_profile = [brand, model, year, storage, color, ...]
tokens_in_results = [titles + descriptions]

overlap_score = (matching_tokens / total_tokens_in_profile) * 100

score_overlap:
  if overlap >= 80%: 100 points
  if overlap >= 60%: 80 points
  if overlap >= 40%: 60 points
  if overlap < 40%: 30 points
```
**Rationale:** If comps mention your brand/model/year, they're likely the right item.

#### D. eBay Category Match
```
source_category = detected item type
result_categories = eBay categories of returned items

category_match = (items_in_correct_category / total_items) * 100

score_category:
  if match >= 90%: 100 points
  if match >= 75%: 80 points
  if match >= 50%: 50 points
  if match < 50%: 20 points (probably wrong type)
```

#### E. Recency (time window)
```
age_of_result = days_since_sold

score_recency:
  if age <= 30 days: 100 points
  if age <= 90 days: 90 points
  if age <= 180 days: 70 points
  if age > 180 days: 40 points
```
**Rationale:** Recent sales = current market. Older sales = market may have shifted.

#### F. Condition Match (when applicable)
```
IF source has condition (new, used, etc.):
  condition_match = (items_matching_condition / total_items) * 100
  score_condition = condition_match * 100
ELSE:
  score_condition = 100 (not penalized)
```

### Final Quality Score

```
total_score = (
  score_count * 0.30 +
  score_spread * 0.25 +
  score_overlap * 0.20 +
  score_category * 0.15 +
  score_recency * 0.10
)

confidence_level:
  if total_score >= 80: HIGH (use as-is)
  if total_score >= 60: MEDIUM (usable, note caveats)
  if total_score >= 40: LOW (very limited data, flag as risky)
  if total_score < 40: REJECT (try next query variant)
```

### Wrong Item Type Detection

```
IF score_category < 50 AND score_overlap < 40:
  VERDICT: "Results appear to be wrong item type"
  ACTION: Discard, try next query variant
```

### Outlier Removal (Statistical)

```
AFTER selecting best result set:

median_price = median(prices)
std_dev = stdev(prices)

FOR EACH result:
  z_score = (price - median) / std_dev
  
  IF abs(z_score) > 2.0:
    Mark as outlier
    (Remove UNLESS count is very small, i.e., < 5 results)

FINAL comps = results without outliers
```

**Rationale:** A $5000 phone in a set of $500 iPhones is an outlier (different model, damaged, etc.).

---

## 6. EDGE CASE HANDLING

### Case 1: Vague Titles ("nice stuff", "estate sale lot")

**Strategy:**
- Type detection will fail or return "generic" + low confidence
- Extraction will only get description + condition (if lucky)
- Query generation falls back to source title as keywords
- Result set will be low-quality but functional
- **Output:** CalculationInput with LOW confidence flag + warning

**Action:** Suggest user provide more detail, or accept lower confidence in pricing.

### Case 2: Lots / Bundles (10+ items mixed)

**Strategy:**
- Detect via keyword ("lot of", "bundle", "assorted") or explicitly
- Ask: "This is a 12-item bundle. Which item do you want comps for?"
- User selects one item type (or we auto-detect primary category)
- Generate query for that type only
- Adjust max bid: `max_bid_per_item = final_max_bid / 12`
- **Caveat:** "Pricing assumes you can sell items individually; bundled comps may not apply"

**Future:** Per-item analysis (list all 12, get comps for each separately).

### Case 3: Misspellings or Incorrect Info

**Strategy:**
- Extraction rules are fuzzy (keyword matching, not exact)
- eBay search is also fuzzy (handles typos)
- If a field is clearly wrong (e.g., "Pokemone" vs "Pokemon"):
  - Attempt correction (common typo dict)
  - OR search without that field
- **Graceful degradation:** If brand is misspelled, omit brand from query

**Action:** Log warnings. System continues, quality score will reflect any issue.

### Case 4: Brand-New Items with No Sold History

**Strategy:**
- eBay search will return 0 or very few results
- Quality score will reflect: count = 0–2, score << 60
- **Fallback options:**
  - Use listing price on retail sites (if available) as proxy
  - Search for "new" listings (asking price) instead of sold comps
  - Flag: "No sold data; using list price estimates"
  - Conservative max bid: 50% of MSRP (if known)
- **Future:** Integrate retail APIs (Amazon, Best Buy) for new items

### Case 5: Hyper-Rare Items (1–2 comps over 6 months)

**Strategy:**
- Search with wider time window (6–12 months instead of 90 days)
- Extend to all conditions (don't filter by condition)
- Accept lower quality score (20–40) and flag risk
- **Output:** "Only 1–2 comps found; market may be illiquid. Bid conservatively."

**Future:** Add rarity detection; recommend lower bid % for rare items.

### Case 6: Items Spanning Categories (vintage camera = collectible + electronics)

**Strategy:**
- Type detection may be ambiguous
- Low type_confidence (50–60)
- Query generation uses relaxed template (drops specificity requirements)
- Consider searching BOTH categories:
  - Electronics > Cameras
  - Collectibles > Vintage Tech
- Return merged comps from both, note source
- **Quality:** Will be mixed; flag as lower-confidence

**Action:** If results are contradictory, ask user: "Is this a collectible or a usable camera?"

### Case 7: Condition is Unclear or Contradictory

**Strategy:**
- If description says "mint" but photos show wear:
  - Low extraction confidence on condition
  - Query without strict condition filtering
  - Results will be mixed conditions
  - **Caveats:** "Condition unclear; comps span multiple conditions"
- User can override extracted condition

---

## 7. eBay API SPECIFICS

### Endpoints & Methods

#### Finding API (Legacy, but reliable for sold comps)

**Endpoint:** `GET https://svcs.ebay.com/services/search/FindingService/v1`

**Parameters for sold comps:**
```
findCompletedItems:
  - keywords: [generated query string]
  - categoryId: [optional eBay category]
  - itemFilter.name=SoldItemsOnly, itemFilter.value=true
  - itemFilter.name=EndTimeNewest (sort by recently sold)
  - itemFilter.name=LocatedIn, itemFilter.value=US (optional, region)
  - outputSelector=SellerInfo (to show seller feedback, optional)
  - paginationInput.entriesPerPage=100
  - paginationInput.pageNumber=[for pagination]
  - responseDataFormat=JSON
```

**Rate Limits:**
- 5 requests per second per app ID
- 100,000 requests per day per app ID
- Each listing analysis: 1–4 eBay calls (one per query variant)
- **Headroom:** At 5 req/sec, easily handle 100+ analyses/hour

#### Browse API (Modern alternative)

**Endpoint:** `GET https://api.ebay.com/buy/browse/v1/item_summary/search`

**Filters:**
- `q`: search query
- `category_ids`: filter by eBay category
- `filter=conditions:[USED|NEW]`
- `filter=price:[min..max]`
- `sort`: -end_date (most recent)

**Note:** Browse API is for *buy*, less ideal for *sold* comps. Finding API preferred for this use case.

### Error Handling

```
IF eBay API call fails:
  - Timeout (> 5 sec): Retry once after 2 sec backoff
  - Rate limit (HTTP 429): Back off exponentially, warn user
  - No results (HTTP 200, empty): Return quality_score=0, try next query
  - API error (HTTP 5xx): Log, retry with exponential backoff
  - Auth failure (HTTP 401): Alert operator; check credentials

MAX_RETRIES = 2
BACKOFF = exponential (1 sec, 2 sec)

IF all queries fail:
  Return error: "Unable to fetch eBay comps. Try again in a few minutes."
```

### Expected Call Volume Per Listing

- **Best case:** 1 query, good results → 1 eBay call
- **Typical case:** 2–3 queries (first is okay, stop) → 2–3 eBay calls
- **Worst case:** 4 queries (vague item, ambiguous type) → 4 eBay calls

**Average:** ~2 eBay calls per analysis.

**Daily capacity:** At 100k calls/day limit, supports ~50k analyses/day (well above MVP needs).

### Pagination

- Most queries return 20–100 results
- If needed, request page 2 (add `pageNumber=2` param)
- **Typically not needed:** First 100 results are enough to assess quality

### Credentials & Security

**Store via environment variables:**
```
EBAY_APP_ID=your_app_id_here
EBAY_CERT_ID=your_cert_id_here
EBAY_OAUTH_TOKEN=your_oauth_token_here (if using OAuth)
```

**Never:**
- Hardcode in code
- Commit to Git
- Log in errors/output

**Retrieval in code:**
```javascript
const appId = process.env.EBAY_APP_ID;
if (!appId) throw new Error("Missing EBAY_APP_ID");
```

**In Vercel (production):**
- Set env vars in Vercel Dashboard → Settings → Environment Variables
- Select `staging` or `production` environment
- Separate creds for each (optional but recommended)

---

## 8. TESTABILITY & EXAMPLES

### Test Case 1: Detailed iPhone (High Confidence)

**Listing:** "Apple iPhone 14 Pro Max 256GB Space Black – Like New, Mint Condition"

**Expected ListingProfile:**
```json
{
  "detected_type": "electronics",
  "type_confidence": 95,
  "fields": {
    "brand": "Apple",
    "model": "iPhone 14 Pro Max",
    "storage": "256GB",
    "color": "Space Black",
    "condition": "like_new"
  }
}
```

**Expected Query Variants:**
1. "Apple iPhone 14 Pro Max 256GB Space Black" (specific)
2. "Apple iPhone 14 Pro Max 256GB" (medium)
3. "Apple iPhone 14 Pro Max" (relaxed)
4. "Apple iPhone" (fallback)

**Expected eBay Results:**
- ~40–60 results for variant 1–2
- Tight price cluster (~$800–900, CV < 0.20)
- 95%+ category match (Electronics > Phones)
- 85%+ token overlap
- **Quality Score:** 85–95 (HIGH confidence)

**Good Outcome:** Use variant 1 or 2 results, confident pricing.

**Bad Outcome:** If CV > 0.60, likely mixed models (14 vs 14 Pro), lower confidence; use variant 3.

---

### Test Case 2: Vague Furniture ("Nice Vintage Desk")

**Listing:** "Nice vintage desk, needs refinish. Wood. Good bones."

**Expected ListingProfile:**
```json
{
  "detected_type": "furniture",
  "type_confidence": 60,
  "fields": {
    "style": "vintage",
    "material": "wood",
    "condition": "used"
  }
  // No brand, no dimensions, no era
}
```

**Expected Query Variants:**
1. "vintage wood desk" (specific with available fields)
2. "vintage desk" (less specific)
3. "desk furniture" (very broad)

**Expected eBay Results:**
- Variant 1: ~10–20 results, wide price range ($100–$800, CV > 0.50)
- Variant 2: ~50+ results, even wider range (many styles)
- **Quality Score:** 50–60 (MEDIUM, risky)

**Action:** Use variant 1 with caveat: "Limited specific data; pricing confidence is medium. Wide range indicates mixed styles."

**User Prompt:** "To refine pricing, provide: dimensions, era (1970s?), brand if any, or photos."

---

### Test Case 3: Mixed Lot ("Estate Sale Box – Tools + Misc")

**Listing:** "Box of assorted tools and stuff. Drill, wrench set, misc hardware, some vintage items."

**Expected ListingProfile:**
```json
{
  "detected_type": "generic",
  "type_confidence": 20,
  "fields": {
    "lot_size": 15,  // estimated from "box of"
    "categories": ["tools", "misc"]  // multiple types detected
  }
}
```

**Expected Query Variants:**
- Cannot generate specific query (unknown items)
- Fallback: "tools lot", "vintage tools", "mixed estate lot"

**Expected eBay Results:**
- Variant 1: ~20 results (tool lots of various sizes)
- Price range: $20–$200, CV > 0.70 (garbage)
- Token overlap: 10% (keywords don't match individual items)
- **Quality Score:** 30–40 (LOW, reject)

**Action:** 
- System returns error or warning: "Bundle is too vague. Cannot estimate individual item pricing."
- **Suggestion to user:** "List items individually or describe the primary category (mostly tools? mostly vintage?)"

**Future:** Allow user to manually break down lot → analyze each item.

---

### Test Case 4: Vintage Guitar ("1970s Fender Stratocaster – Sunburst")

**Listing:** "Vintage Fender Stratocaster, Sunburst finish, plays great. 1970s. Original case."

**Expected ListingProfile:**
```json
{
  "detected_type": "guitar",
  "type_confidence": 90,
  "fields": {
    "brand": "Fender",
    "model": "Stratocaster",
    "year": 1970,
    "era": "1970s",
    "finish": "Sunburst",
    "condition": "used"  // "plays great" → good used condition
  }
}
```

**Expected Query Variants:**
1. "1970s Fender Stratocaster Sunburst" (very specific, vintage is hot)
2. "Fender Stratocaster Sunburst" (drop year)
3. "Fender Stratocaster" (drop finish)
4. "vintage guitar" (fallback)

**Expected eBay Results:**
- Variant 1: ~5–15 results (1970s Strats are specific)
- Price: $1200–$2000, CV = 0.30 (moderate; condition/specifics vary)
- Token overlap: 95% (exact brand, model, year match)
- **Quality Score:** 75–85 (GOOD, medium-high confidence)

**Good Outcome:** Confident pricing in $1200–$1800 range. Note: "Vintage guitars vary by year, condition, and original parts; prices may shift ±10%."

---

### Test Case 5: Rare Trading Cards ("PSA 9 Michael Jordan Rookie 1986 Fleer")

**Listing:** "1986 Fleer Michael Jordan Rookie Card, PSA 9. Pristine condition."

**Expected ListingProfile:**
```json
{
  "detected_type": "card",
  "type_confidence": 98,
  "fields": {
    "sport": "basketball",
    "player": "Michael Jordan",
    "card_number": "57",  // if extracted
    "year": 1986,
    "set": "Fleer",
    "grading_company": "PSA",
    "grade": 9,
    "condition": "new"  // PSA graded = new/mint
  }
}
```

**Expected Query Variants:**
1. "PSA 9 Michael Jordan 1986 Fleer Rookie" (hyper-specific)
2. "Michael Jordan 1986 Fleer PSA 9"
3. "Michael Jordan 1986 Fleer" (drop grade specificity)
4. "Michael Jordan rookie card" (fallback)

**Expected eBay Results:**
- Variant 1: ~1–3 results (ultra-rare, only a few sell per year)
- Price: $5000–$7000 (volatile, collectible market)
- CV = 0.40–0.60 (moderate spread; time, condition affect price)
- Token overlap: 100% (exact match)
- **Quality Score:** 45–60 (MEDIUM-LOW, risky for such an expensive item)

**Action:** 
- "Only 2–3 comps found. Collectible card market is illiquid. Bid conservatively (10–15% margin).
- Consider waiting for more recent sales or getting expert opinion."

**User:** Informed that this is high-risk; needs human judgment.

---

### Test Case 6: Cheap Common Item ("New Stainless Steel Mixing Bowl")

**Listing:** "New, sealed – Stainless steel 5-quart mixing bowl, kitchen."

**Expected ListingProfile:**
```json
{
  "detected_type": "kitchen",
  "type_confidence": 85,
  "fields": {
    "category": "mixing bowl",
    "material": "stainless steel",
    "capacity": "5 quart",
    "condition": "new"
  }
}
```

**Expected Query Variants:**
1. "5 quart stainless steel mixing bowl new" (specific)
2. "stainless steel mixing bowl" (drop size)
3. "mixing bowl new" (broad)

**Expected eBay Results:**
- Variant 1: ~80+ results (common item, many sellers)
- Price: $12–$25, CV = 0.15 (tight cluster)
- Dozens of identical listings
- **Quality Score:** 90+ (EXCELLENT, high confidence)

**Good Outcome:** Confident pricing $15–$20. Comps are numerous and consistent. **Max bid:** $8–$10 (assuming 40% margin on resale).

---

## Design Validation Checklist

- [ ] **Pluggable:** Adding a new item type = config + patterns (no code rewrite)
- [ ] **Extensible:** Multi-query fallback handles edge cases gracefully
- [ ] **Generic:** No hardcoded if/else rules; data-driven via schemas
- [ ] **Testable:** 6 diverse test cases span categories, edge cases
- [ ] **Safe:** Error handling, outlier removal, low-confidence flagging
- [ ] **eBay-aligned:** Uses official Finding API, respects rate limits, handles errors
- [ ] **User-centric:** Clear warnings, graceful degradation, actionable feedback

---

## Next Steps (Phase 2 Implementation)

Once approved:

1. **Build type schema registry** (`packages/config/src/item-schemas.json`)
2. **Implement extraction engine** (regex + NLP fallback)
3. **Implement query generator** (plugs into type schema)
4. **Integrate eBay API** (Finding API with error handling)
5. **Implement quality scoring** (formula + outlier detection)
6. **Build Fastify endpoints:**
   - `POST /analyze` → takes listing → returns comps + confidence
7. **Build React UI** (form for listing data, results display)
8. **Test with 6 test cases** above

**Estimated effort:** 1–2 weeks (Phase 2) assuming no major redesigns.

---

## Questions Raised in This Design

**Q1: Should we use Browse API or Finding API?**  
**A:** Finding API. It has explicit SoldItemsOnly filter. Browse API is newer but less ideal for historical sold data.

**Q2: What if a user's listing is in a category eBay doesn't have?**  
**A:** Fall back to generic query. No catastrophe; just lower quality. Rare in practice (CTBids, HiBid categorize items).

**Q3: Should we cache eBay comps results?**  
**A:** Not MVP. Later: cache for 7–30 days. Same item type + keywords → reuse old comps if fresh eBay data unavailable.

**Q4: What if a user manually corrects our extracted fields?**  
**A:** Regenerate queries with corrected fields. Design supports it. Just re-run query generation + eBay calls.

**Q5: How do we handle multi-condition items (bundle of 5 used + 1 new)?**  
**A:** Phase 2: Ask user to split or specify primary condition. Phase 3+: per-item analysis.

---

**Design complete. Ready for Phase 2 implementation approval.**

