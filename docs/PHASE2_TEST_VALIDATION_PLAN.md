# Phase 2 Test & Validation Plan

**Objective:** Validate eBay comp matching accuracy before shipping  
**Environment:** Sandbox integration testing → Production comp testing

---

## Test Credentials Strategy

- **Sandbox (eBay Finding API):** Test query logic, pagination, error handling
- **Production (eBay Finding API):** Real comps for 5 test listings
- **Never use Production for code testing** – only for data validation

---

## 5 Test Listings – Extraction & Expected Behavior

### Test 1: Facebook Marketplace (Furniture / Vague)
**Input:** 
https://www.facebook.com/marketplace/item/3754252184708029/?ref=browse_tab&referral_code=marketplace_top_picks&referral_story_type=top_picks

**Challenge:** No direct data in URL – need to extract title + description from page  
**Expected Profile:**
- **Item Type:** Detected as generic/furniture
- **Core Fields:** Category, condition (estimated)
- **Query Strategy:** Broad category + keyword match  
**Expected Confidence:** LOW–MEDIUM (vague listing)  
**Success Criteria:** eBay returns furniture in same category; prices within reasonable range

---

### Test 2: CTBids – Vintage Oak Ice Box
**Input:**
https://ctbids.com/estate-sale/40139/item/4678063/White-Clad-Vintage-Oak-Ice-Box

**Challenge:** Specific antique item – likely low comp volume  
**Expected Profile:**
- **Item Type:** Antique/vintage furniture  
- **Core Fields:** "Vintage oak ice box", condition (estate sale = used)  
- **Query Strategy:** Exact/fuzzy match + "vintage ice box" + condition  
**Expected Confidence:** LOW (rare item)  
**Success Criteria:** System warns "rare/low comps"; returns <4 comps; user understands risk  
**Output Format:**
```json
{
  "median_price": 120,
  "range": [80, 180],
  "comps_count": 2,
  "confidence": "low",
  "warning": "rare item – only 2 comps found",
  "time_window": "last 180 days"
}
```

---

### Test 3: CTBids – 14k Gold Jewelry
**Input:**
https://ctbids.com/estate-sale/40607/item/4676938/14k-Gold-Heart-Earrings-And-14k-AK-Turkey-Byzantine-Band-Ring

**Challenge:** Lot (2 items) – requires lot matching  
**Expected Profile:**
- **Item Type:** Jewelry/lot  
- **Core Fields:** "14k gold heart earrings, 14k gold ring", lot=true  
- **Query Strategy:** Match jewelry lots ONLY; exclude single items  
**Expected Confidence:** MEDIUM (some jewelry comps exist; lots are niche)  
**Success Criteria:** System excludes single earrings/rings; finds jewelry lot comps only  
**Output Format:**
```json
{
  "median_price": 280,
  "range": [220, 350],
  "comps_count": 6,
  "confidence": "medium",
  "warning": "matching lots only – single items excluded",
  "time_window": "last 180 days"
}
```

---

### Test 4: Mercari – Unknown Item (Scrape Title)
**Input:**
https://www.mercari.com/us/item/m98929635815/?ref=category_detail

**Challenge:** No item details in URL – need scraping  
**Expected Profile:**
- **Item Type:** TBD (depends on Mercari title)  
- **Query Strategy:** Extract title → identify type → query eBay  
**Expected Confidence:** TBD  
**Success Criteria:** System extracts title correctly; confidence score reflects data quality  

---

### Test 5: eBay – Direct Listing
**Input:**
https://www.ebay.com/itm/185810487116?...

**Challenge:** Already eBay – but test that system extracts structured data correctly  
**Expected Profile:**
- **Item Type:** From eBay listing (category)  
- **Core Fields:** Title, condition, current bid  
- **Query Strategy:** Similar items + condition match  
**Expected Confidence:** HIGH (eBay itself has rich structured data)  
**Success Criteria:** System extracts all fields; finds accurate comps; confidence ≥ 85%  

---

## Accuracy Validation Checklist

For each test case:

| Check | Pass Criteria | Result |
|-------|---------------|--------|
| **Item Type Detection** | Matches expected profile | ? |
| **Comp Count** | 8+ HIGH, 4–7 MEDIUM, <4 LOW | ? |
| **Price Range** | Median ± 20% rule | ? |
| **Condition Match** | Used→used, no broken, etc. | ? |
| **Lot Handling** | Lots only match lots | ? |
| **Confidence Score** | Aligns with comp count + data quality | ? |
| **Warnings Correct** | Low comps, rare, lot mismatch flagged | ? |
| **Time Window** | Last 180 days, priority 90 | ? |
| **Query Transparency** | Output shows exact eBay query used | ? |
| **No Wrong Category** | Returned comps match item category | ? |

---

## Implementation Flow

1. **Sandbox Testing (1–2 days)**
   - eBay API connection works
   - Query parsing works
   - Response parsing works
   - Pagination works
   - Error handling works

2. **Production Testing (2–3 days)**
   - Run 5 test listings through full pipeline
   - Validate comps against accuracy checklist
   - Document actual eBay results
   - Show you outputs → get approval

3. **Before Shipping**
   - All 5 test cases pass validation
   - No warnings are incorrect
   - Confidence scores match your experience
   - Output JSON is clean

---

## Approval Gate

**You'll see:**
- 5 test runs with full JSON output
- Accuracy checklist filled in
- Any warnings/issues flagged
- Comparison: "What Arbitrain recommends vs. what we'd expect"

**You say:** "Approved" or "Fix X before shipping"

Then Phase 2 ships.

---

**This plan prevents surprises. No code until you approve the test strategy.**

