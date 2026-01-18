# Discover Tab Feature Ideas

*Captured: 2026-01-18*

## Goals
- Make the Reddit app stand out with unique features
- Utilize OpenAI API for content analysis
- Leverage Reddit OAuth to surface personalized content
- Show users content they wouldn't normally find browsing Reddit

---

## Feature 1: Newsletter Generator (PARKED)

### Overview
Admin (and later power users) can generate enhanced reports with deeper AI analysis, saved to database for review and future distribution.

### Route
`/admin/newsletter`

### Generation Options
| Option | Type | Description |
|--------|------|-------------|
| Categories | Multi-select (max 3) | Reuses existing category picker |
| Model | Dropdown | GPT-4o-mini, GPT-4o, GPT-5.2 |
| Date Range | Dropdown | 1 day, 1 week, 1 month |
| Web Search | Toggle (off by default) | Enable OpenAI web search to enrich analysis |

### Enhanced Summaries
- Adaptive length based on source content
- Deeper analysis of why stories matter
- Optional web search context (sourced external info)

### Report Storage
- `userId` (FK to Users table) - who generated it
- Categories, model, date range, web search settings
- Generated timestamp
- Stories with enhanced summaries
- Status (draft, reviewed, published)

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/newsletter/generate` | POST | Generate newsletter with options |
| `/api/newsletter/list` | GET | Get user's newsletters (paginated) |
| `/api/newsletter/:id` | GET | Get single newsletter |
| `/api/newsletter/:id` | PATCH | Update title or status |
| `/api/newsletter/:id` | DELETE | Delete newsletter |

### Open Question: Data Pipeline
Three options discussed for content storage:
- **Option A:** Stateless - fetch, extract, analyze, save final only
- **Option B:** Full caching - store posts, store extracted content, then analyze
- **Option C:** Hybrid - store post metadata, extract on-demand, save newsletter with baked-in summaries

*Decision deferred.*

### Future Enhancements
- BYOK (Bring Your Own Key) - users supply their own OpenAI key
- Export to HTML/Markdown
- Direct integration with email services (Substack, Buttondown, etc.)

---

## Feature 2: Subscribed Subreddits Feed (IDEA)

### Overview
Pull content from subreddits the user already follows on Reddit, using their OAuth token (not the app's personal token).

### Key Points
- Uses user's OAuth for API calls (avoids rate limit issues)
- AI curates/summarizes content from their subscriptions
- Different from Reddit's default algorithm

---

## Feature 3: Persona-Based Discovery (IDEA)

### Overview
Analyze user's saved posts (~30) to build a "taste profile" and discover content outside their usual subreddits.

### Goals
- **Expand horizons** - "You like X, check out these communities you've never seen"
- **Serendipity engine** - Surface surprising content AI predicts they'd enjoy

### Approach
- Extract keywords from saved posts
- Use persona to find new subreddits/content
- Potentially use OpenAI to find complementary web content

---

## Feature 4: Post-Level Related Content (IDEA)

### Overview
For a specific post, use OpenAI to find related web content (articles, videos, etc.).

### Considerations
- Needs token management to avoid exceeding thresholds
- Could be a toggle per-post

---

## Feature 5: Curation Feed (NEXT UP)

*See separate design doc - this is the next feature to implement.*
