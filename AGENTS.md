# Reddzit AI Agent Context

## Product Vision

Reddzit differentiates itself from standard Reddit feed readers by incorporating AI analysis throughout the experience. The core value proposition is **curated, AI-summarized content** — not just aggregation.

### Key Principles

1. **AI-First, Not Feed-First**: Every piece of content shown to users should have AI analysis (summary, sentiment, takeaways). Raw Reddit feeds without AI context defeat the purpose.

2. **Pre-Generated Reports**: Content is generated via scheduled jobs, stored in the database, and served from cache. This ensures:
   - Consistent experience across users
   - No redundant API calls or LLM costs per user request
   - Ability to track engagement per report/story
   - Historical record of what was surfaced

3. **Hourly Discover + Daily Pulse**: Two complementary feeds:
   - **Daily Pulse**: Deep analysis of top stories, generated once daily at 6 AM
   - **Discover (Hourly)**: Rotating selection from popular subreddits, AI-summarized, refreshed hourly

## Architecture

### Data Flow

```
Cronjob → Reddit API → LLM Analysis → Database → API → Frontend
```

### Database Models

- `DailyReport` / `HourlyReport`: Report metadata with status (DRAFT/PUBLISHED)
- `ReportStory`: Individual stories with AI-generated summary, sentiment, takeaways
- `StoryComment`: Highlighted comments selected by LLM

### Jobs

- `generateDailyReport.js`: Runs daily, fetches from curated subreddits, deep analysis
- `generateHourlyReport.js`: Runs hourly, fetches from popular/trending subreddits, lighter analysis

### Deduplication

- Stories shown in Daily Pulse are excluded from Discover feed
- Use `redditPostId` to track across reports

## LLM Service

Located at `services/llmService.js`. Provides:
- `generateStoryAnalysis(post, comments, articleContent)` → summary, sentiment, takeaways
- `selectHighlightComments(comments)` → notable comments with reasons

Keep LLM prompts focused on insight extraction, not summarization for its own sake.

## Frontend Tabs

1. **Daily Pulse** (`/`): AI-curated daily digest
2. **Discover**: Hourly rotating AI-analyzed posts from popular subreddits  
3. **Saved Posts**: User's saved Reddit posts (requires auth)

## Cost Considerations

- LLM calls are expensive; batch processing via cronjobs amortizes cost
- Track `llmCostCents` per report for monitoring
- Consider caching LLM responses for identical content
