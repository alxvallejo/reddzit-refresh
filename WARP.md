# Warp AI Rules for reddzit-refresh

## Git Workflow
- Push commits directly to the `main` branch
- Do not create feature branches unless explicitly requested

## Product Vision

Reddzit differentiates itself from standard Reddit feed readers by incorporating **AI analysis throughout the experience**. The core value is curated, AI-summarized content — not just aggregation.

### Key Principles

1. **AI-First, Not Feed-First**: Every piece of content shown should have AI analysis (summary, sentiment, takeaways). Raw Reddit feeds without AI context defeat the purpose.

2. **Pre-Generated Reports**: Content is generated via scheduled cronjobs, stored in the database, and served from cache:
   - Consistent experience across users
   - No redundant API/LLM calls per user request
   - Engagement tracking per report/story
   - Historical record of surfaced content

3. **Two Complementary Feeds**:
   - **Daily Pulse**: Deep analysis of top stories from curated subreddits, generated once daily
   - **Discover (Hourly)**: Rotating selection from popular subreddits, AI-summarized, refreshed hourly

## Architecture

### Data Flow
```
Cronjob → Reddit API → LLM Analysis → Database → API → Frontend
```

### Database Models (Prisma)
- `DailyReport` / `HourlyReport`: Report metadata with status (DRAFT/PUBLISHED)
- `ReportStory`: Stories with AI summary, sentiment, takeaways
- `StoryComment`: LLM-selected highlighted comments

### Scheduled Jobs (`read-api/jobs/`)
- `generateDailyReport.js`: Daily at 6 AM, curated subreddits, deep analysis
- `generateHourlyReport.js`: Every hour, popular subreddits, lighter analysis

### Deduplication
- Stories in Daily Pulse are excluded from Discover feed via `redditPostId`

### SSR and Development Setup
- The backend (`read-api` on port 3000) handles server-side rendering (SSR) for `/p/*` routes to inject Open Graph and Twitter Card meta tags for social media sharing
- In **development**: Do NOT proxy `/p/*` routes in `vite.config.ts` - the frontend React app handles these routes directly
- In **production**: The backend serves both the static frontend files AND handles SSR for bot requests to `/p/*` routes
- The frontend `PostView.tsx` component fetches post data client-side from Reddit's public JSON API
- SSR metadata will only appear when sharing links in production, not during local development

## Frontend Tabs

1. **Daily Pulse** (`/`): AI-curated daily digest
2. **Discover**: Hourly rotating AI-analyzed posts
3. **Saved Posts**: User's saved Reddit posts (requires auth)

## Deployment & Environment

### Environment Variables
- **Do NOT use `.env` files** — environment variables are managed via PM2's `ecosystem.config.js`
- When running jobs manually, extract env from PM2: `eval $(pm2 env 0 | sed 's/: /=/g') && node jobs/generateHourlyReport.js`

### Cronjobs
- Cronjobs must source PM2 env before running jobs
- Schedule aligned with US timezones (skip 2-5 AM ET dead hours)

## Cost Considerations

- LLM calls are batched via cronjobs to amortize cost
- Track `llmCostCents` per report
- Never call LLM on user request path
