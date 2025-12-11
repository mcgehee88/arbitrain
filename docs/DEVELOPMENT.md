# Development Guide

## Setup

```bash
cd arbitrain
npm install
```

## Running Locally

```bash
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3000

## Testing Calculation Engine

```bash
npx tsx scripts/demo.ts
```

## Branches

- `staging` → Auto-deployed to staging.arbitrain.com
- `main` → Auto-deployed to app.arbitrain.com (production)

Always push to `staging` first, test, then merge to `main`.

## Secrets

Store in `.env.local` (git-ignored):
```
EBAY_API_KEY=xxx
EBAY_API_SECRET=xxx
```

Vercel uses dashboard environment variables for prod.

