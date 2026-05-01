# News Feed Redesign Design

Replace the direct-to-Reddit fetch in the homepage news feed with a backend-proxied, image-rich magazine layout.

## Problem

`TopFeed.tsx` (used by `/news`, `/top`, and `/r/<subreddit>`) calls `https://www.reddit.com/*.json` directly from the browser via `DailyService.getTrendingRSS()`. This produces two visible bugs:

1. **No images render** — the response is mapped into a `TrendingPost` shape that has no image field, so even when posts have preview images they are never displayed.
2. **Feed silently fails on iOS Safari** — Safari's Intelligent Tracking Prevention and stricter cross-origin handling block or drop the third-party request to `reddit.com`. The user sees a perpetual loading state or an empty grid.

The backend already does the right thing for the share-preview flow: `server.js:pickPreviewImage()` extracts `post.preview.images[0].source.url` with an `i.redd.it` thumbnail fallback. That logic just isn't wired into the news feed.

## Goals

- Fix the iOS Safari regression by routing all news-feed traffic through the backend (same-origin, no cross-site cookies / ITP issue).
- Display preview images on every post that has one.
- Make the homepage feel like a homepage, not a list — magazine-style mixed-tile grid with a hero, tall portraits, and standard tiles.
- Show short text previews where they add value — selftext for self-posts, top comment for hero + first six tiles.
- Stay well under Reddit's app-only OAuth budget (100 req/min) by aggressive server-side caching.

## Non-Goals

- No new feed sources (Hacker News, RSS-only sites, etc.).
- No personalization or per-user ranking — that's `forYouController`'s job.
- No LLM summarization — that's the briefing/discover flow.
- No new test framework introduced just for this change.

## Architecture

The change is one third backend (extend an endpoint that already exists), two thirds frontend (data layer swap + new magazine grid component). One third backend, two thirds frontend.

```
Browser (/news, /top, /r/<sub>)
        │
        ├── DailyService.getTrendingRSS(subreddit?)
        │     localStorage cache (5 min, 60 min stale fallback) — unchanged
        │
        ▼
read-api: GET /api/trending/rss?subreddit=<sub>&topComments=1
        │
        ├── server-side cache (10 min, keyed by subreddit)
        │
        ▼
rssService.getAggregatedFeed({ subreddit, withTopComments })
        │
        ├── 3–5 parallel reddit JSON fetches (existing OAuth + circuit breaker)
        │   dedupe + extract imageUrl/selftext/score/numComments
        │
        ├── if withTopComments: rssService.getTopComment(fullname) for first 7 posts
        │   wrapped in LRU cache (max 2000, ttl 1h)
        │
        ▼
Response: { posts: FeedPost[], generatedAt, cached }
```

## API

### `GET /api/trending/rss` (extended)

Currently returns a thin list of 15 hot posts from `r/all`. Upgraded to:

| Query param | Type | Default | Notes |
|---|---|---|---|
| `subreddit` | string \| undefined | undefined | When omitted, aggregates `r/all` + `r/popular` (matches today's frontend behavior). When set to `news`, aggregates `r/news/{hot,rising,top}`. When set to a single subreddit name, aggregates that sub's three sorts. |
| `topComments` | `0` \| `1` | `1` | When `1`, the first 7 posts get a `topComment` attached. Set `0` to opt out (debugging or low-data paths). |

### Response shape

```ts
type FeedPost = {
  id: string;             // Reddit post id, no t3_ prefix
  title: string;
  subreddit: string;
  link: string;           // permalink on reddit.com
  author?: string;
  pubDate?: string;       // ISO timestamp
  imageUrl?: string;      // extracted via pickPreviewImage logic
  selftext?: string;      // first 140 chars, only present for self-posts
  score?: number;
  numComments?: number;
  postHint?: string;      // 'image' | 'link' | 'self' | 'video' (passthrough from Reddit)
  topComment?: {
    body: string;         // truncated to ~180 chars
    author: string;
    score: number;
  };
};

type FeedResponse = {
  posts: FeedPost[];
  generatedAt: string;    // ISO timestamp of when the response was first computed
  cached: boolean;        // true if served from server cache without re-fetching reddit
};
```

### Caching

Two layers, both server-side:

- **Aggregated-feed cache** — 10 min TTL, keyed by `${subreddit ?? 'top'}:${withTopComments}`. Reuses the existing `jsonCache` pattern in `services/rssService.js` but extends the cache to a `Map` keyed on the composite key (the current single-slot cache is too narrow for multiple subreddits).
- **Top-comment LRU** — max 2000 entries, 1h TTL. Mirrors the `postCache` in `server.js:21`. Top comments on popular posts don't change much in an hour, and the same hero post is likely visible to many users — so this is where the API budget is actually saved.

Frontend localStorage cache (5 min + 60 min stale fallback) stays as-is.

### Rate-limit safety

- Reddit app-only budget: **100 req/min = 6,000/hour**.
- Cold path per refresh: 5 feed fetches + 7 top-comment fetches = **12 calls**.
- Warm path (cache hits): typically 0–2 calls per refresh.
- Hot pages share cache across users — first user pays, rest free.
- Existing `redditService.isApiRestricted()` circuit breaker covers Reddit's 429/503 — top-comment fetches return `null` instead of throwing, feed degrades to title-only without breaking.

## Backend Components

### `services/rssService.js` — new `getAggregatedFeed({ subreddit, withTopComments })`

Owns the full pipeline:

1. Choose the feed URL list:
   - `subreddit === undefined` → `r/all/hot`, `r/all/rising`, `r/all/top?t=day`, `r/popular/hot`, `r/popular/top?t=day` (matches today's frontend mix)
   - `subreddit === 'news'` → `r/news/hot`, `r/news/rising`, `r/news/top?t=day`
   - any other value → same three-sort pattern for that sub
2. `Promise.allSettled` the fetches; collect children from successful responses.
3. Filter `kind === 't3'` and `over_18 === false`; dedupe by id.
4. Map each child to `FeedPost` shape — image extraction calls a shared helper (see below).
5. If `withTopComments`, take first 7 deduped posts and `Promise.allSettled` `getTopComment(fullname)` for each, attaching results.
6. Cache the final array under the composite key.

### `services/rssService.js` — new `getTopComment(fullname)`

- Single Reddit OAuth call: `GET https://oauth.reddit.com/comments/{id}.json?limit=1&depth=1&sort=top`
- Returns `{ body, author, score }` truncated to 180 chars on the body, or `null`
- Wrapped in an LRU cache (`require('lru-cache')`, already a dependency)
- Honors `redditService.isApiRestricted(prisma)` — returns `null` when restricted

### Shared `pickPreviewImage(post)` helper

Currently in `server.js:65-75`. Extract into `services/redditMediaService.js` so both `server.js` (share previews) and `rssService.js` (feed aggregation) use the same logic. No behavior change to the share-preview flow.

### `server.js` — upgrade `app.get('/api/trending/rss')`

Becomes a thin wrapper:

```js
app.get('/api/trending/rss', async (req, res) => {
  try {
    const subreddit = (req.query.subreddit || '').trim().toLowerCase() || undefined;
    const withTopComments = req.query.topComments !== '0';
    const result = await rssService.getAggregatedFeed({ subreddit, withTopComments });
    res.json(result);
  } catch (error) {
    console.error('Trending endpoint error:', error.message);
    res.status(500).json({ error: 'Failed to fetch trending posts' });
  }
});
```

## Frontend Components

### `helpers/DailyService.ts` — rewrite `getTrendingRSS()`

- Replace direct `fetch('https://www.reddit.com/...')` with `axios.get('${API_BASE_URL}/api/trending/rss', { params })`
- Pass `{ subreddit }` when caller specifies one
- Keep the existing 5-min localStorage cache + 60-min stale fallback
- Update `TrendingPost` interface to include the new optional fields:

```ts
export interface TrendingPost {
  id: string;
  title: string;
  subreddit: string;
  link: string;
  author?: string;
  pubDate?: string;
  imageUrl?: string;
  selftext?: string;
  score?: number;
  numComments?: number;
  postHint?: string;
  topComment?: { body: string; author: string; score: number };
}
```

### `components/MagazineGrid.tsx` — new

Owns layout. Pure presentation — takes `posts: TrendingPost[]` and a `onSkip` callback, renders.

**Tile-size assignment** (deterministic, by index — does not reshuffle on refresh):

| Index | Size | Card |
|---|---|---|
| 0 | wide / hero | `<HeroCard>` |
| 1, 5, 9 | tall | `<TallCard>` |
| all others | standard | `<StandardCard>` |

Three internal card components, all small and focused. Image area collapses to a text-rich layout when `imageUrl` is missing.

- `<HeroCard>` — full-width, large image, large title, subreddit badge, score/comment metadata, top comment quote.
- `<TallCard>` — 4:5 portrait image, title, subreddit, time, top comment quote when present.
- `<StandardCard>` — 16:9 image, title, subreddit, time, score badge. Top comment quote when present (only the first ~7 posts have one). Selftext shown when image is absent (text-only variant).

**Quote/preview rendering rule** — applies uniformly across all three card types:

1. If `topComment` is present (only on first 7 posts), render it as a single-line italic quote with `— u/{author}` attribution.
2. Else if `selftext` is present (self-posts only), render the truncated selftext.
3. Else render only the title and metadata.

**iOS Safari hardening on `<img>`:**
- `loading="lazy"`, `decoding="async"`
- `onError` handler swaps that single tile to its text-only variant — no broken-image icon, no layout jump (the aspect-ratio space is reserved with CSS `aspect-ratio`)

### `components/TopFeed.tsx` — slim down

Stays the data + state owner (loading state, error state, skip-post tracking, refresh interval, last-updated badge, page header with subreddit dropdown). Replaces the inline `<main>` grid with `<MagazineGrid posts={visiblePosts} onSkip={handleSkipPost} />`.

## Error Handling

| Failure mode | Behavior |
|---|---|
| Backend returns 5xx | Frontend's existing 60-min stale-cache fallback in `DailyService.ts` returns last good payload. No code change. |
| Reddit blocks our OAuth (429 / 503) | `redditService.recordApiStatus(false)` triggers; subsequent calls in cooldown return cached or empty. Frontend shows existing "No posts available right now" state. |
| Single image URL 404s | `<img onError>` swaps that tile to text-only variant. |
| Top-comment fetch fails for one post | `Promise.allSettled` catches; tile renders without quote. |
| Whole top-comment batch fails | Posts return without `topComment` field; frontend simply doesn't render quote sections. |
| Aggregated-feed cache miss + Reddit restricted | Endpoint returns 500 with `{ error }`; frontend stale cache catches it. |

## Verification Plan

The repo has no Jest/Vitest setup; introducing one is out of scope. Verification is manual.

**Backend:**

1. `curl 'http://localhost:3000/api/trending/rss?subreddit=news&topComments=1'` returns JSON with `posts[]`, every `imageUrl` is HTTPS, first 7 posts have `topComment`.
2. Hit twice in succession — second is faster, response shows `cached: true`.
3. `curl '...?topComments=0'` returns posts without `topComment`.
4. With Reddit OAuth env vars removed, endpoint returns 500 with clean JSON error (no crash, no stack trace leak).

**Frontend:**

1. `yarn dev` in `reddzit-refresh`, open `/news` in desktop Chrome — magazine grid renders, hero shows top comment.
2. **Open `/news` on iOS Safari** (the original bug) — feed loads. **This is the primary fix gate.**
3. Resize to mobile width — grid collapses to single column, no horizontal scroll.
4. Switch dropdown to `r/technology` — feed swaps, more text-only tiles visible (selftext-heavy sub).
5. Devtools offline + reload — stale localStorage cache renders.

**Post-deploy sanity check:**

- After 30 min of traffic, `/api/admin/cache-stats` shows healthy hit rate. The trending endpoint won't appear there (different cache instance) — add a parallel counter for `getAggregatedFeed` and `getTopComment` if monitoring is needed long-term, but that's a follow-up not a blocker.

## Risks

- **Hot reload of cache state on `pm2 reload`** — server-side caches are in-memory and reset on restart. First user after deploy pays the full cold-path cost. Acceptable: ~12 API calls is well under per-minute budget.
- **Reddit changes their JSON shape** — already a risk we live with for the share-preview flow; same `pickPreviewImage` helper means same surface area.
- **Mixed-tile grid feels busy on mobile** — mitigated by collapsing to single column under 768px (existing `md:` breakpoint pattern). All tiles become standard size on mobile, regardless of the desktop assignment.

## Out of Scope (Possible Follow-Ups)

- Endless scroll / pagination — current 100-ish post page is plenty.
- Read tracking ("you've seen this post") beyond the existing skip-post local cache.
- Generated placeholder images for text-only tiles — explicitly rejected during brainstorm in favor of honest text-only cards.
- Content moderation beyond Reddit's `over_18` flag.
