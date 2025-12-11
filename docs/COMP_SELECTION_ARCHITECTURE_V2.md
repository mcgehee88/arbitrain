# Arbitrain Comp Selection Architecture V2

**Design Principle:** Leverage existing systems (eBay taxonomy, semantic embeddings) + minimal rule patches. No manual word lists.

---

## Three-Layer Architecture

### Layer 1: eBay Taxonomy Matching

**Data pulled for each comp:**
- `categoryId` - eBay's primary category
- `itemSpecifics` - Seller-provided structured attributes (e.g., metal, gemstone, condition, type)
- `condition` - eBay condition code
- `title` + `description` snippet

**Scoring:**
```
taxonomy_score = 0..100

if source_categoryId == comp_categoryId:
  taxonomy_score += 40  # Strong signal

for each (key, value) in source_itemSpecifics:
  if key in comp_itemSpecifics:
    if comp_itemSpecifics[key] == value:
      taxonomy_score += 15  # Exact match on specific
    else if semantically_similar(value, comp_itemSpecifics[key]):
      taxonomy_score += 8   # Fuzzy match (e.g., "14K" vs "14kt")

if source_condition == comp_condition:
  taxonomy_score += 10
```

**Filter:** Require `taxonomy_score >= 50` to proceed to Layer 2.

---

### Layer 2: Semantic Similarity

**Embedding Generation:**
- Embed source item text: `title + " " + key_description_phrases`
- Embed each candidate comp: `title + " " + description_snippet`
- Use lightweight model (distilBERT or MiniLM for speed + quality)

**Scoring:**
```
semantic_score = cosine_similarity(source_embedding, comp_embedding)
Range: 0..1 (0.75+ is strong match)
```

**Filter:** Require `semantic_score >= 0.75` to pass to Layer 3.

---

### Layer 3: Category-Specific Exclusion Rules

**Approach:** Minimal, derived-and-refined patterns. Not hand-authored word lists maintained by the user.

**Jewelry (category 281 + subcats):**
```javascript
JEWELRY_EXCLUDE_PATTERNS = [
  "gold tone", "gold plated", "gold-plated",
  "costume", "fashion jewelry",
  "CZ", "cubic zirconia", "simulated",
  "vermeil",
  "scrap"
];

// Fuzzy match + context: if "gold tone" is in comp title and source is "solid 14k", reject
if (source_itemSpecific.metal === "14k" || "solid gold" in source_title) {
  if (any(JEWELRY_EXCLUDE_PATTERNS.map(p => fuzzy_match(p, comp_title)))) {
    score -= 50  // Severe penalty, or reject outright
  }
}
```

**Electronics (category 20000+ electronics):**
```javascript
ELECTRONICS_EXCLUDE_PATTERNS = [
  "for parts", "untested", "broken",
  "non-functional", "as-is"
];
```

**Collectibles (category 36000+):**
```javascript
// Different rules per subcategory
```

**Derivation Process:**
1. Run comp selection pipeline
2. Flag misclassifications (e.g., "costume jewelry returned as comp for 14k ring")
3. Extract common patterns from mistakes
4. Add to category exclusion list
5. Re-run tests
6. Repeat until false positives < 5%

---

## Output Decision Logic

After all three layers, calculate **final confidence:**

```
confidence_score = (
  (taxonomy_score / 100) * 0.35 +
  (semantic_score) * 0.40 +
  (comp_count_factor) * 0.15 +
  (price_variance_factor) * 0.10
)
Range: 0..100
```

**Decision Tree:**
```
if confidence_score >= 75 AND comp_count >= 10:
  return ANALYSIS with HIGH confidence

if confidence_score >= 60 AND comp_count >= 5:
  return ANALYSIS with MEDIUM confidence

else:
  return {
    status: "INSUFFICIENT_COMPS",
    message: "Unable to find high-quality comps. Manual review required.",
    summary: {
      comps_found: X,
      comps_after_taxonomy_filter: Y,
      comps_after_semantic_filter: Z,
      comps_after_rules_filter: W,
      final_confidence: score,
      reason: "Low semantic match / taxonomy mismatch / few comps available"
    }
  }
```

---

## Implementation Plan

### Phase 2a: eBay Taxonomy Integration
- Enhance EBayClient.searchSoldListings() to return `categoryId` + `itemSpecifics`
- Build `TaxonomyMatcher` class
- Score comps based on Layer 1

### Phase 2b: Semantic Similarity
- Add embedding model (distilBERT or OpenAI embeddings)
- Build `SemanticMatcher` class
- Filter comps based on Layer 2

### Phase 2c: Category Rules Engine
- Build `CategoryRulesEngine` class
- Implement jewelry + electronics rules
- Add derivation process (flag misclassifications, extract patterns)

### Phase 2d: Confidence Decision Engine
- Build `ConfidenceScorer` class
- Implement decision tree
- Return "Manual review required" when appropriate

---

## Example: Before/After

### Test Case: 14K Gold Diamond Ring

**BEFORE (Current):**
```
Source Item: "Vintage Estate 14K Yellow Gold and Diamond Masonic Ring"
Query: "14k 14k masonic"
Comps Found: 25
Comps Kept: 25 (no filtering)
Confidence: HIGH (80/100)

PROBLEM: No validation that comps actually matched 14k gold vs costume
```

**AFTER (V2):**
```
Source Item: "Vintage Estate 14K Yellow Gold and Diamond Masonic Ring"
Category: 281 (jewelry)
Item Specifics: metal=14k, type=ring, gemstone=diamond, condition=pre-owned

Layer 1 - Taxonomy:
  Candidate 1: categoryId=281, metal=14k, type=ring, gemstone=diamond
    Score: 40 + 15 + 15 + 15 + 10 = 95 ✓ PASS
  Candidate 2: categoryId=281, metal="gold tone", type=ring, gemstone=CZ
    Score: 40 + 0 + 0 + 0 + 10 = 50 ✓ PASS (barely)
  Candidate 3: categoryId=15687 (costume jewelry), type=ring, gemstone=CZ
    Score: 0 + 0 + 0 + 0 + 0 = 0 ✗ REJECT (wrong category)

Comps after Layer 1: 23 (removed 2 costume items)

Layer 2 - Semantic Similarity:
  Candidate 1 embedding match: 0.89 ✓ PASS
  Candidate 2 embedding match: 0.72 ✗ REJECT (below 0.75 threshold)

Comps after Layer 2: 22

Layer 3 - Category Rules:
  Candidate X: contains "gold tone" in title, source is "solid 14k"
    Penalty: -50 → rejected
  
Comps after Layer 3: 21

Final Confidence Score:
  Taxonomy avg: 92/100 * 0.35 = 0.322
  Semantic avg: 0.86 * 0.40 = 0.344
  Comp count (21): 100/100 * 0.15 = 0.15
  Price variance: acceptable * 0.10 = 0.10
  Total: 92.6 → rounds to HIGH (92/100)

Output:
  Median: $749.99
  Confidence: HIGH (92/100) — justified by tight taxonomy + semantic match
  Comps: 21 verified matches
```

**Key Difference:** 
- Before: 25 comps (unvalidated mix) → confidence 80/100 (possibly wrong)
- After: 21 comps (verified taxonomy + semantic match) → confidence 92/100 (reliable)

Plus: If filtering had been too aggressive and we ended up with <5 comps, we'd return "Manual review required" instead of guessing.

---

## Category Starting Points

**Jewelry (start here):**
- Use eBay category 281 + subcategories
- itemSpecifics: metal, gemstone, type, condition
- Exclusion patterns: plated, costume, CZ, gold tone, fashion

**Electronics (second category):**
- Use eBay category 20000+ subcats
- itemSpecifics: brand, model, condition, type
- Exclusion patterns: for parts, untested, broken, non-functional

Both share the same three-layer architecture; only the specifics and rules differ.

---

## Derivation Process (How Rules Get Refined)

1. **Run full pipeline** on test set
2. **Flag misclassifications:**
   - "Costume jewelry returned as comp for solid 14k ring" → pattern: "costume" + "gold tone"
   - "Plated ring returned as comp for solid gold" → pattern: "plated"
3. **Extract common keywords** from false positives
4. **Add to exclusion list** for that category
5. **Re-test** on same test set → should eliminate false positives
6. **Measure impact** → if precision improves, commit the rule

This is **iterative and data-driven**, not hand-authored.

---

## Decision for Approval

Is this architecture sound? If yes:

1. Implement Layer 1 (taxonomy) + Layer 2 (semantic) first
2. Run updated test suite with jewelry + one other category
3. Show before/after comparison
4. Deploy rules derivation process (automated flagging of misclassifications)
5. Move to Phase 3 (API/UI)

Proceed?

