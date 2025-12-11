# Arbitrain Output Clarity Guarantee

**For Non-Engineers**

You don't need to understand how the system works. You just need to understand what it's telling you.

---

## THE RULE: 3 SECTIONS, ALWAYS

Every output from Arbitrain contains exactly 3 sections. Nothing more.

### SECTION 1: What We Think You Have

```
Item Type:     Trading Card
Confidence:    98%

Details:
  • Player: Michael Jordan
  • Year: 1986
  • Grade: PSA 9
  • Condition: Mint
```

**Translation:** "We analyzed your item and we're 98% sure it's a graded Michael Jordan rookie card from 1986."

**What confidence means:**
- 90–100% = We're certain. You can trust this.
- 70–89% = Pretty sure. Probably right.
- 50–69% = Decent guess. Might be wrong.
- Below 50% = Too vague. Need more info.

**If confidence is low:** You see a message saying "We need more information to be sure. Here's what to add..."

---

### SECTION 2: eBay Sold Comps (Real Data)

```
Comps found:    4 sold in last 90 days
Price range:    $4,800 – $6,200
Median price:   $5,500
Confidence:     MEDIUM

Warnings:
⚠️ Only 4 comps. Market is thin.
⚠️ Graded cards are volatile.
```

**Translation:** "We searched eBay and found 4 similar items that actually sold. The average was $5,500."

**What each line means:**

- **Comps found:** How many real sales we found. More = better.
  - 10+: Excellent
  - 5–9: Good
  - 3–4: Okay (thin market)
  - <3: Risky

- **Price range:** The cheapest and most expensive comps we found.
  - Tight range (20% spread) = Stable market
  - Wide range (50%+ spread) = Volatile, risky

- **Median price:** The "middle" price. If 4 comps sold for $4800, $5000, $5500, $6200, the median is $5250.
  - Better than average: ignores extremely high/low outliers
  - This is what you should expect to resell for

- **Confidence:** LOW, MEDIUM, or HIGH
  - **HIGH** = Lots of comps, tight prices, recent sales. Trust this.
  - **MEDIUM** = Some comps, moderate spread, or thin market. Probably okay.
  - **LOW** = Few comps, wide prices, or unclear data. Be careful.

- **Warnings:** Red flags if present.
  - "Only 3 comps" = Don't bet the farm on this price
  - "Wide price range" = Market is unpredictable
  - "Rare item" = Few sales ever. Good luck predicting price.

---

### SECTION 3: Your Max Bid (The Money Part)

```
Expected resale price:    $5,500
Less eBay fees (12%):     -$660
Less shipping:            -$20
─────────────────────────────────
Net proceeds:             $4,820

Safe max bid:             $3,200
Estimated profit:         $1,620
```

**Translation:** "Based on what we found on eBay, you can safely bid up to $3,200 and still make $1,600 profit."

**How to read it:**

- **Expected resale price:** What we think you'll sell it for (the median from comps)
- **eBay fees:** Money eBay takes (usually 12% for most categories)
- **Shipping:** Cost to ship it to the buyer
- **Net proceeds:** Money in your pocket after selling it
- **Safe max bid:** The highest we recommend paying
- **Estimated profit:** Money you keep after everything

**The math:**
```
Resale price:         $5,500
Minus eBay fees 12%:  -$660
Minus shipping:       -$40
= Net proceeds:       $4,800

If you bid $3,200:
  $4,800 proceeds - $3,200 cost = $1,600 profit
  ROI: ($1,600 / $3,200) = 50% (excellent)

That 50% ROI assumes you paid $3,200.
If you want 30% ROI (more conservative):
  You'd calculate differently, but same principle.
```

---

## THE CONFIDENCE SPECTRUM

### HIGH ✓✓ (90+)
```
You can bid confidently.
Many comps. Tight prices. Recent sales.
Example: iPhone 14 Pro, current electronics, popular brands.

Max bid: Use the number we give you. You're safe.
```

### MEDIUM ⚠ (60–89)
```
You can bid, but be aware of the risks.
Moderate comps. Some price variation. Niche markets.
Example: Vintage guitar, estate lot, specialty collectible.

Max bid: Use our number, but bid conservatively within that range.
Consider bidding 10–20% lower for safety.
```

### LOW ✗ (Below 60)
```
Be very careful. Or get more information first.
Few comps. Wide prices. Unclear market.
Example: Vague furniture, unknown antique, mixed lots.

Max bid: We'll give you a number, but treat it as a rough guess.
Do extra research. Talk to an expert if it's expensive.
Bid much lower than we suggest (30–50% lower is safer).
```

---

## What You DON'T See (Boring Stuff We Hide)

Arbitrain **doesn't** show you:

- Technical debugging info
- API call logs
- Database queries
- Extraction confidence per field
- Statistical formulas
- Other nerdy stuff

**Why?** You don't care. You want the answer, not the recipe.

---

## The Golden Rules

### Rule 1: Confidence is Your Friend
If we say "LOW confidence," we mean it. Don't ignore it.

### Rule 2: The Number We Give You Is A Recommendation
It's based on real eBay data, not a guess. But it's still just a recommendation.

You have final say. If you think the item is worth more, bid more.
If you think it's risky, bid less.

### Rule 3: Warnings Are Real
If we warn you ("Only 3 comps," "Wide price range," "Rare item"), listen to it.

### Rule 4: More Information = Better Answers
If Arbitrain asks for more details, give them. You'll get a better bid number.

### Rule 5: We Never Hide Bad News
If the market is thin, or prices are volatile, or data is weak, we tell you.

We're not trying to sell you anything. We're trying to help you make a good bid.

---

## Examples: What Good Output Looks Like

### Example 1: Perfect Data
```
Item: iPhone 14 Pro, 256GB, Space Black
Comps: 46 sold in 30 days
Price: $1,150–$1,330 (tight)
Confidence: HIGH ✓✓

Max bid: $700
Profit: $366

→ BID CONFIDENTLY. Data is rock-solid.
```

### Example 2: Okay Data (Use Common Sense)
```
Item: Vintage Fender Jaguar, 1965
Comps: 3 sold in 90 days
Price: $4,200–$5,100 (moderate)
Confidence: MEDIUM ⚠

Max bid: $2,500
Profit: $1,500

→ USE THE DATA, but watch future sales. Market is thin.
   If you love the guitar and think it's special, bid higher.
   If you're unsure, bid lower.
```

### Example 3: Bad Data (Gather More Info)
```
Item: Old wooden desk (brand unknown)
Comps: 50 sold (but widely varying)
Price: $100–$800 (very wide spread)
Confidence: LOW ✗

Max bid: $140
Profit: ???

→ STOP. Get the brand/dimensions/style of the desk.
   Retry the analyzer. Then bid.
```

---

## Questions You Might Ask

**Q: Why is my confidence score 65%, not 64%?**  
A: It's not that precise. 65% just means "pretty decent, not great."

**Q: The median is $500 but one item sold for $1,000. What's up?**  
A: That one might be a rare variant, or in exceptional condition. We're showing you the typical price ($500), not the outliers.

**Q: Should I always bid the max number you suggest?**  
A: No. If confidence is LOW, bid lower. If you see risks (rare, low comp count), bid lower. The max is a ceiling, not a target.

**Q: What if the comps change tomorrow?**  
A: Possible, especially for niche items. If you're bidding on something expensive with LOW confidence, wait a few days and re-check.

**Q: Can I trust this system?**  
A: Yes for popular items (phones, common collectibles). Less for rare/unique items. It's based on real eBay data, not guesses. But it's not magic—garbage input = garbage output.

---

**That's it. Three sections. Clear numbers. Honest confidence levels. Make your bid.**

