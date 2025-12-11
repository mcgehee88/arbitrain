# Deployment

## Staging → Production

1. Test in staging: push to `staging` branch
2. Verify at staging.arbitrain.com
3. Merge to `main` branch
4. Vercel auto-deploys to app.arbitrain.com

## Rollback

```bash
git revert <commit-hash>
git push origin main
```

Vercel auto-deploys. Done in 2 minutes.

## Environment Variables

**Local:** `.env.local` (git-ignored)  
**Vercel:** Dashboard environment variables (staging + prod separate)

Never commit secrets.

