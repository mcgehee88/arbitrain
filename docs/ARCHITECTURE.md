# ARBITRAIN - MASTER REFERENCE

**Updated:** 2025-12-11  
**Owner:** mcgehee88  
**Phase:** 2 (eBay API Integration)  
**Repo:** https://github.com/mcgehee88/arbitrain

---

## THE PRODUCT

**Arbitrain** = Arbitrage analyzer for resellers.

Paste listing URL → Get max safe bid, profit estimate, ROI, explanation.

**Three surfaces:**
1. Homepage URL analyzer (single listing)
2. Best price search (meta-search across markets)
3. Pro dashboard (batch uploads, freemium gating) — Phase 4+

---

## TECH STACK

| Layer | Tool | Why |
|-------|------|-----|
| Backend | Node.js Fastify | Lightweight, maintainable |
| Frontend | React + Vite | Fast, component reuse |
| Database | Supabase | User accounts (Phase 3+), none for MVP |
| Deployment | Vercel | GitHub integration, auto CI/CD |
| API | eBay Official | Rate limits fine, reliable |
| Language | TypeScript | Type safety throughout |

**No overengineering.** Each tool chosen for simplicity + maintainability by solo founder.

---

## PROJECT STRUCTURE

```
arbitrain/
├── apps/
│   ├── web/           React frontend
│   └── api/           Fastify backend
├── packages/
│   ├── shared/        Types + CalculationEngine (THE CORE)
│   ├── adapters/      Marketplace integrations
│   └── config/        Environment management
├── docs/              Documentation (you're reading it)
├── scripts/           Utilities (demo.ts)
└── package.json       Monorepo root
```

---

## CORE LOGIC

**CalculationEngine** (`packages/shared/src/calculator.ts`):

Input:
- Listing (URL, current bid, marketplace, shipping)
- Comps (5-10 recent sales of similar items)

Output:
- Expected resale price (median of comps)
- Max safe bid (hits 30% ROI target)
- Estimated profit, ROI, opportunity/risk scores
- Human explanation of reasoning

**Status:** Working. Proven in `scripts/demo.ts`.

---

## DEPLOYMENT PIPELINE

```
Staging Branch (staging)
    ↓
GitHub Actions (test)
    ↓
Vercel → staging.arbitrain.com
    ↓
Owner validates
    ↓
Merge to Main (main)
    ↓
GitHub Actions (test)
    ↓
Vercel → app.arbitrain.com (production)
```

**Key:** Always test in staging before shipping to production.

---

## PHASES & TIMELINE

| Phase | Work | Timeline | Status |
|-------|------|----------|--------|
| 1 | Monorepo setup, types, calc engine | ✅ Done | Complete |
| 2 | eBay API integration, analyzer UI | 4-5 days | 🟡 Starting |
| 3 | Deploy, monitor, polish | 1-2 days | ⏳ After Phase 2 |
| 4 | User accounts, saved analyses | 1 week | ⏳ Phase 3+ |
| 5 | Batch uploads, best price search | 1-2 weeks | ⏳ Phase 4+ |

**MVP (Phases 1-3):** 1-1.5 weeks from now.

---

## BLOCKERS & DEPENDENCIES

**To start Phase 2, we need:**
1. eBay API credentials (owner provides)
2. Research eBay API docs (Zo does, ~2 hours)
3. Build Phase 2 (Zo does, ~4-5 days)

**To deploy:**
4. Vercel projects (owner creates)
5. Deploy to staging (Zo does, ~30 min)
6. Deploy to production (Zo does, ~30 min)

---

## COSTS

| Phase | Cost |
|-------|------|
| Development (staging) | $0 |
| MVP Production | $20-30/month (Vercel, eBay API free) |
| Scaled | $50-150/month (if we hit API limits) |

Scales as needed. Start free.

---

## KEY FILES

| Path | Purpose |
|------|---------|
| `packages/shared/src/calculator.ts` | Core calculation logic |
| `apps/api/src/server.ts` | Backend entry |
| `apps/web/src/App.tsx` | Frontend entry |
| `scripts/demo.ts` | Working proof |
| `docs/DATABASE_SCHEMA_PHASE3.sql` | DB schema (future) |

---

## DEVELOPMENT

**Local setup:**
```bash
cd arbitrain
npm install
npm run dev
```

**Test calculation engine:**
```bash
npx tsx scripts/demo.ts
```

**Branches:**
- `staging` → test deployments here
- `main` → production only

See `docs/DEVELOPMENT.md` and `docs/DEPLOYMENT.md` for details.

---

## WHAT'S NEXT

1. **Owner:** Provide eBay API credentials
2. **Zo:** Research eBay API, create integration plan
3. **Zo:** Build Phase 2 (eBay integration + analyzer)
4. **Owner:** Create Vercel projects (staging + prod)
5. **Zo:** Deploy to staging, test
6. **Zo:** Deploy to production, monitor

Simple. Linear. No surprises.

---

## CREDENTIALS LOCATION

Keep outside repo (git-ignored):
- `../github/pat-token.txt` — GitHub Personal Access Token
- `../github/ebay-api-key.txt` — eBay API credentials (you provide)
- `.env.local` — Local development (git-ignored)

Never commit credentials. Use Vercel dashboard for prod secrets.

---

## FOR ZO (AI ASSISTANT)

**Start of every session:**
1. Read this doc
2. Check Phase status above
3. Ask owner: "Any changes since last session?"
4. Continue from last checkpoint

**Update this doc when:**
- Phase completes → mark ✅
- Blocker resolved → remove from above
- Decision changes → update tech stack or timeline
- New info → add to relevant section

**Single source of truth.** Not Slack, not email. One doc, always current.

