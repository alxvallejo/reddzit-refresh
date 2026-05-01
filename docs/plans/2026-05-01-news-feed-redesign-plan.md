# News Feed Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the direct-to-Reddit fetch in the homepage news feed with a backend-proxied, image-rich magazine layout that fixes the iOS Safari regression and adds preview images + top-comment quotes.

**Architecture:** Extend the existing `/api/trending/rss` endpoint to aggregate multiple Reddit sorts, extract preview images, and lazily attach top comments (LRU-cached). Frontend swaps its direct-to-reddit fetch for the backend endpoint and renders a magazine-style mixed-tile grid via a new `MagazineGrid.tsx` component.

**Tech Stack:** Express + Node 20 (read-api) · React + TypeScript + Vite + Tailwind (reddzit-refresh) · `lru-cache` (already a dep) · `axios` (already a dep) · OAuth app-only token via existing `redditProxyController.getAppOnlyAccessToken()`.

**Reference:** Design doc at `reddzit-refresh/docs/plans/2026-05-01-news-feed-redesign-design.md`.

**Conventions:**
- The repo has no Jest/Vitest setup. Verification is manual: `curl` for backend, `yarn dev` + browser for frontend. Do **not** add a test framework.
- All file paths in this plan are absolute from the repo root `/Users/alexvallejo/Sites/personal/reddzit/`.
- Backend lives in `read-api/`, frontend in `reddzit-refresh/`.
- The dev server commands in this plan assume you're starting clean. If a server is already running, restart it after each backend task so changes take effect (`nodemon` does this automatically when running `yarn dev`).

---

## Task 1: Extract `pickPreviewImage` into a shared module

**Files:**
- Create: `read-api/services/redditMediaService.js`
- Modify: `read-api/server.js` (lines 65-75 — replace inline helper with import)

Currently `pickPreviewImage` is defined inline in `server.js:65-75` and used only by the share-preview flow. The new aggregated-feed pipeline needs the same logic. Extract first, refactor later — this is a behavior-preserving change.

- [ ] **Step 1: Create the shared module**

Write `read-api/services/redditMediaService.js`:

```js
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || '';

/**
 * Extract a usable image URL from a Reddit post object.
 * Mirrors the original logic from server.js so share-preview behavior is unchanged.
 *
 * Returns the highest-quality preview if available, falling back to the
 * thumbnail, then to the local hero image. Reddit escapes ampersands in
 * preview URLs (&amp;) — we unescape them so the URL works in <img src>.
 */
function pickPreviewImage(post) {
  try {
    const preview = post && post.preview && post.preview.images && post.preview.images[0];
    if (preview && preview.source && preview.source.url) {
      return preview.source.url.replace(/&amp;/g, '&');
    }
  } catch (_) {}
  const thumb = post && post.thumbnail;
  if (thumb && /^https?:\/\//.test(thumb)) return thumb;
  return PUBLIC_BASE_URL ? PUBLIC_BASE_URL + '/reddzit-hero.png' : '/reddzit-hero.png';
}

/**
 * Like pickPreviewImage but returns null instead of the hero fallback.
 * Used by the news feed where we want to know "does this post actually have a usable image?"
 * so the frontend can render a text-only tile instead of a hero placeholder.
 */
function pickPreviewImageOrNull(post) {
  try {
    const preview = post && post.preview && post.preview.images && post.preview.images[0];
    if (preview && preview.source && preview.source.url) {
      return preview.source.url.replace(/&amp;/g, '&');
    }
  } catch (_) {}
  const thumb = post && post.thumbnail;
  if (thumb && /^https?:\/\//.test(thumb)) return thumb;
  return null;
}

module.exports = { pickPreviewImage, pickPreviewImageOrNull };
```

- [ ] **Step 2: Replace the inline definition in `server.js`**

In `read-api/server.js`, find the existing `pickPreviewImage` function (lines 65-75) and remove it. Add an import near the top of the file (after the other `require` lines, around line 18):

```js
const { pickPreviewImage } = require('./services/redditMediaService');
```

The existing usage of `pickPreviewImage(post)` elsewhere in the file (it's called within the share-preview routes) doesn't need to change.

- [ ] **Step 3: Verify `server.js` still loads**

```bash
cd /Users/alexvallejo/Sites/personal/reddzit/read-api && node -e "require('./server.js')" 2>&1 | head -20
```

Expected: server starts loading (you may see startup log lines like `read-api startup env`). No `SyntaxError`, no `Cannot find module`. Kill it with Ctrl+C if it stays running.

- [ ] **Step 4: Verify share-preview behavior unchanged**

Start the dev server and test a share preview:

```bash
cd /Users/alexvallejo/Sites/personal/reddzit/read-api && yarn dev
```

In another terminal:

```bash
curl -s -A "facebookexternalhit/1.1" 'http://localhost:3000/p/t3_1abc234' | grep -i 'og:image' | head -2
```

Expected: at least one `og:image` meta tag (its `content` attribute may be `/reddzit-hero.png` if the post id doesn't exist — that's fine, we're just checking the helper still runs).

Stop the server (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
cd /Users/alexvallejo/Sites/personal/reddzit
git add read-api/services/redditMediaService.js read-api/server.js
git commit -m "refactor(read-api): extract pickPreviewImage into shared module"
```

---

## Task 2: Add `getTopComment` helper with LRU cache

**Files:**
- Modify: `read-api/services/rssService.js` (add new export, add LRU cache at top of file)

Reddit's app-only OAuth has a 100 req/min budget. Top-comment fetches share the LRU pattern already used by `postCache` in `server.js:21` so popular posts are paid for once per hour, not per user.

- [ ] **Step 1: Add the LRU cache and helper to `rssService.js`**

Open `read-api/services/rssService.js`. Just after the existing `JSON_CACHE_DURATION` constant (around line 29), add:

```js
const { LRUCache } = require('lru-cache');
const redditService = require('./redditService');

// Cache top comments per post fullname. Top comments on hero posts don't
// change much in an hour, and the same post is likely visible to many users.
const topCommentCache = new LRUCache({
  max: 2000,
  ttl: 1000 * 60 * 60, // 1 hour
});
```

Then, near the bottom of the file (just before the `module.exports = { ... }` line), add the helper. **Important:** this helper requires the prisma client to honor the circuit breaker, so it accepts an optional `prisma` arg — if omitted, the breaker check is skipped (used in dev / tests):

```js
const fetch = require('node-fetch');

/**
 * Fetch the top comment for a Reddit post (by fullname like "t3_abc123").
 * Returns { body, author, score } truncated to 180 chars on the body, or null.
 *
 * Cached aggressively (LRU, 1h) since top comments on popular posts are stable.
 * Honors the circuit breaker via redditService.isApiRestricted — returns null
 * (not throws) when Reddit is rate-limiting us, so the caller can degrade.
 */
async function getTopComment(fullname, { prisma, accessToken } = {}) {
  if (!fullname || !fullname.startsWith('t3_')) return null;

  const cached = topCommentCache.get(fullname);
  if (cached !== undefined) return cached;

  if (prisma) {
    const restricted = await redditService.isApiRestricted(prisma);
    if (restricted) {
      // Cache the null result briefly so we don't hammer the breaker check
      topCommentCache.set(fullname, null, { ttl: 1000 * 60 * 5 });
      return null;
    }
  }

  if (!accessToken) {
    // Caller forgot to pass it — treat as soft failure
    return null;
  }

  const id = fullname.replace(/^t3_/, '');
  const url = `https://oauth.reddit.com/comments/${encodeURIComponent(id)}.json?limit=1&depth=1&sort=top`;
  let result = null;
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': process.env.USER_AGENT || 'Reddzit/1.0',
      },
    });
    if (!response.ok) {
      console.warn(`getTopComment: ${fullname} returned ${response.status}`);
      // Cache failures briefly to avoid retry storms
      topCommentCache.set(fullname, null, { ttl: 1000 * 60 * 5 });
      return null;
    }
    const json = await response.json();
    // Reddit returns [postListing, commentListing]; we want the first comment
    const commentListing = Array.isArray(json) ? json[1] : null;
    const top = commentListing && commentListing.data && commentListing.data.children && commentListing.data.children[0];
    const data = top && top.kind === 't1' ? top.data : null;
    if (data && typeof data.body === 'string' && data.body.length > 0) {
      const body = data.body.length > 180 ? data.body.slice(0, 177) + '...' : data.body;
      result = {
        body,
        author: data.author || '[deleted]',
        score: typeof data.score === 'number' ? data.score : 0,
      };
    }
  } catch (error) {
    console.warn(`getTopComment error for ${fullname}:`, error.message);
    result = null;
  }

  topCommentCache.set(fullname, result);
  return result;
}
```

Update the `module.exports` block at the bottom of the file:

```js
module.exports = {
  getTrendingFromRSS,
  getTopPostsFromJSON,
  getTopComment,
  topCommentCache, // exported for testing/inspection only
};
```

- [ ] **Step 2: Verify the file still loads**

```bash
cd /Users/alexvallejo/Sites/personal/reddzit/read-api && node -e "const s = require('./services/rssService'); console.log(typeof s.getTopComment)"
```

Expected output: `function`

- [ ] **Step 3: Smoke-test the helper against a real post**

Start a quick interactive node session that imports the OAuth helper. Replace `t3_REPLACE_ME` with a real Reddit post fullname — pick any current top post from `https://www.reddit.com/r/news/.json` (look at the `name` field of `data.children[0]`).

```bash
cd /Users/alexvallejo/Sites/personal/reddzit/read-api && node -e "
require('dotenv').config();
const rss = require('./services/rssService');
const { getAppOnlyAccessToken } = require('./controllers/redditProxyController');
(async () => {
  const accessToken = await getAppOnlyAccessToken();
  const out = await rss.getTopComment('t3_REPLACE_ME', { accessToken });
  console.log(JSON.stringify(out, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
"
```

Expected: a JSON object with `body`, `author`, `score` fields, OR `null` if the post has no comments. **Not** a thrown error.

If you get a "Missing Reddit credentials" error: the `.env` file in `read-api/` lacks `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET`. Confirm with the user before proceeding — these must already be configured for the rest of the app to work.

- [ ] **Step 4: Commit**

```bash
cd /Users/alexvallejo/Sites/personal/reddzit
git add read-api/services/rssService.js
git commit -m "feat(read-api): add getTopComment helper with LRU cache"
```

---

## Task 3: Refactor `rssService.jsonCache` to multi-key, add `getAggregatedFeed`

**Files:**
- Modify: `read-api/services/rssService.js` (replace single-slot `jsonCache` with `Map`; add `getAggregatedFeed` function)

The current `jsonCache` is a single object with a `key` string — it can only cache one query at a time. The new aggregated feed needs to cache `news`, `top`, and various subreddits independently.

- [ ] **Step 1: Replace the single-slot cache with a Map**

In `read-api/services/rssService.js`, find:

```js
// Separate cache for JSON endpoint
let jsonCache = {
  data: null,
  timestamp: 0,
  key: null
};
const JSON_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
```

Replace with:

```js
// Per-key cache for JSON-endpoint aggregations
const JSON_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const jsonCache = new Map(); // key -> { data, timestamp }
```

- [ ] **Step 2: Update `getTopPostsFromJSON` to use the new Map**

Still in `rssService.js`, find the `getTopPostsFromJSON` function. Replace the cache-read block:

```js
// Return cached data if fresh
if (jsonCache.data && jsonCache.key === cacheKey && (now - jsonCache.timestamp) < JSON_CACHE_DURATION) {
  console.log('Returning cached JSON data');
  return jsonCache.data;
}
```

with:

```js
// Return cached data if fresh
const cached = jsonCache.get(cacheKey);
if (cached && (now - cached.timestamp) < JSON_CACHE_DURATION) {
  console.log('Returning cached JSON data');
  return cached.data;
}
```

Replace the cache-write block:

```js
// Update cache
jsonCache = {
  data: posts,
  key: cacheKey,
  timestamp: now
};
```

with:

```js
jsonCache.set(cacheKey, { data: posts, timestamp: now });
```

Replace the stale-fallback block:

```js
// Return stale cache on error if available
if (jsonCache.data && jsonCache.key === cacheKey) {
  return jsonCache.data;
}
```

with:

```js
// Return stale cache on error if available
const stale = jsonCache.get(cacheKey);
if (stale) {
  return stale.data;
}
```

- [ ] **Step 3: Add `getAggregatedFeed`**

In `read-api/services/rssService.js`, add the new function near the bottom, just before the `module.exports` block:

```js
const { pickPreviewImageOrNull } = require('./redditMediaService');
const { getAppOnlyAccessToken } = require('../controllers/redditProxyController');

const FEED_URL_BASE = 'https://www.reddit.com';

/**
 * Build the list of feed URLs to aggregate based on the requested view.
 *
 * - subreddit === undefined => the "/top" view: r/all + r/popular mix (matches the legacy frontend behavior)
 * - subreddit === any name  => three sorts of that single sub
 */
function buildFeedUrls(subreddit) {
  if (!subreddit) {
    return [
      `${FEED_URL_BASE}/r/all/hot.json?limit=50`,
      `${FEED_URL_BASE}/r/all/rising.json?limit=25`,
      `${FEED_URL_BASE}/r/all/top.json?t=day&limit=25`,
      `${FEED_URL_BASE}/r/popular/hot.json?limit=25`,
      `${FEED_URL_BASE}/r/popular/top.json?t=day&limit=25`,
    ];
  }
  return [
    `${FEED_URL_BASE}/r/${subreddit}/hot.json?limit=50`,
    `${FEED_URL_BASE}/r/${subreddit}/rising.json?limit=25`,
    `${FEED_URL_BASE}/r/${subreddit}/top.json?t=day&limit=25`,
  ];
}

const TOP_COMMENT_TARGET_COUNT = 7;

/**
 * Aggregate multiple Reddit JSON sorts into a deduped feed of posts.
 * Extracts image URLs and (optionally) attaches top comments to the first 7 posts.
 *
 * Returns: { posts: FeedPost[], generatedAt: string, cached: boolean }
 */
async function getAggregatedFeed({ subreddit, withTopComments = true, prisma = null } = {}) {
  const normalizedSub = subreddit ? subreddit.trim().toLowerCase() : null;
  const cacheKey = `agg:${normalizedSub || 'top'}:${withTopComments ? 'tc1' : 'tc0'}`;

  const now = Date.now();
  const cached = jsonCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < JSON_CACHE_DURATION) {
    return { ...cached.data, cached: true };
  }

  const urls = buildFeedUrls(normalizedSub);
  const userAgent = process.env.USER_AGENT || 'Reddzit/1.0';

  const responses = await Promise.allSettled(
    urls.map((url) => fetch(url, { headers: { 'User-Agent': userAgent } }))
  );

  const allChildren = [];
  for (const result of responses) {
    if (result.status === 'fulfilled' && result.value.ok) {
      try {
        const json = await result.value.json();
        const children = (json && json.data && json.data.children) || [];
        allChildren.push(...children);
      } catch (e) {
        console.warn('getAggregatedFeed: failed to parse a feed response:', e.message);
      }
    }
  }

  if (allChildren.length === 0) {
    // If we have a stale cache, return it; otherwise throw so the route returns 500
    if (cached) return { ...cached.data, cached: true };
    throw new Error('No posts from any feed');
  }

  const seen = new Set();
  const posts = [];
  for (const child of allChildren) {
    if (!child || child.kind !== 't3') continue;
    const data = child.data;
    if (!data || data.over_18 || seen.has(data.id)) continue;
    seen.add(data.id);

    const isSelfPost = !!data.is_self;
    const selftextRaw = isSelfPost && typeof data.selftext === 'string' ? data.selftext : '';
    const selftext = selftextRaw.length > 140 ? selftextRaw.slice(0, 137) + '...' : selftextRaw;

    posts.push({
      id: data.id,
      title: data.title,
      subreddit: data.subreddit,
      link: `https://www.reddit.com${data.permalink}`,
      author: data.author,
      pubDate: new Date(data.created_utc * 1000).toISOString(),
      imageUrl: pickPreviewImageOrNull(data),
      selftext: selftext || undefined,
      score: typeof data.score === 'number' ? data.score : undefined,
      numComments: typeof data.num_comments === 'number' ? data.num_comments : undefined,
      postHint: data.post_hint || undefined,
    });
  }

  if (withTopComments && posts.length > 0) {
    let accessToken = null;
    try {
      accessToken = await getAppOnlyAccessToken();
    } catch (e) {
      console.warn('getAggregatedFeed: could not get access token, skipping top comments:', e.message);
    }
    if (accessToken) {
      const targets = posts.slice(0, TOP_COMMENT_TARGET_COUNT);
      const commentResults = await Promise.allSettled(
        targets.map((post) => getTopComment(`t3_${post.id}`, { prisma, accessToken }))
      );
      commentResults.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value) {
          targets[i].topComment = r.value;
        }
      });
    }
  }

  const payload = {
    posts,
    generatedAt: new Date().toISOString(),
  };
  jsonCache.set(cacheKey, { data: payload, timestamp: now });
  return { ...payload, cached: false };
}
```

Update the `module.exports` block to include the new function:

```js
module.exports = {
  getTrendingFromRSS,
  getTopPostsFromJSON,
  getTopComment,
  getAggregatedFeed,
  topCommentCache,
};
```

- [ ] **Step 4: Verify the file loads and exports the new function**

```bash
cd /Users/alexvallejo/Sites/personal/reddzit/read-api && node -e "const s = require('./services/rssService'); console.log(['getAggregatedFeed','getTopComment','getTopPostsFromJSON'].map(k => k+':'+typeof s[k]).join(' '))"
```

Expected: `getAggregatedFeed:function getTopComment:function getTopPostsFromJSON:function`

- [ ] **Step 5: Smoke-test `getAggregatedFeed` end-to-end**

```bash
cd /Users/alexvallejo/Sites/personal/reddzit/read-api && node -e "
require('dotenv').config();
const rss = require('./services/rssService');
(async () => {
  const result = await rss.getAggregatedFeed({ subreddit: 'news', withTopComments: true });
  console.log('posts:', result.posts.length);
  console.log('with images:', result.posts.filter(p => p.imageUrl).length);
  console.log('with top comments:', result.posts.filter(p => p.topComment).length);
  console.log('cached:', result.cached);
  console.log('first post keys:', Object.keys(result.posts[0]).sort().join(','));
})().catch(e => { console.error(e); process.exit(1); });
"
```

Expected output (numbers will vary):
- `posts: 60-150` (depends on how much overlap there is between hot/rising/top)
- `with images: 30-100` (most posts on r/news have preview images)
- `with top comments: 0-7` (0 if Reddit creds not configured, up to 7 otherwise)
- `cached: false` (first run)
- `first post keys: author,id,imageUrl,link,numComments,postHint,pubDate,score,selftext,subreddit,title,topComment` (some keys may be absent if optional fields are undefined; at minimum: `author,id,link,pubDate,subreddit,title`)

Run it twice in succession — the second run should print `cached: true`.

- [ ] **Step 6: Commit**

```bash
cd /Users/alexvallejo/Sites/personal/reddzit
git add read-api/services/rssService.js
git commit -m "feat(read-api): add getAggregatedFeed with image extraction and top-comment attachment"
```

---

## Task 4: Upgrade `/api/trending/rss` route

**Files:**
- Modify: `read-api/server.js` (lines 259-276 — replace existing route handler)

The existing route ignores query params and only fetches 15 hot posts from `r/all`. Replace with a thin wrapper around `getAggregatedFeed`.

- [ ] **Step 1: Replace the route handler**

In `read-api/server.js`, find the existing route (lines 259-276):

```js
app.get('/api/trending/rss', async (req, res) => {
  try {
    const rawPosts = await rssService.getTopPostsFromJSON('all', 15, 'hot');
    // Transform to match expected format
    const posts = rawPosts.map(post => ({
      id: post.id,
      title: post.title,
      subreddit: post.subreddit,
      link: `https://www.reddit.com${post.permalink}`,
      author: post.author,
      pubDate: new Date(post.created_utc * 1000).toISOString(),
    }));
    res.json({ posts });
  } catch (error) {
    console.error('Trending endpoint error:', error.message);
    res.status(500).json({ error: 'Failed to fetch trending posts' });
  }
});
```

Replace with:

```js
app.get('/api/trending/rss', async (req, res) => {
  try {
    const rawSubreddit = typeof req.query.subreddit === 'string' ? req.query.subreddit.trim().toLowerCase() : '';
    const subreddit = /^[a-z0-9_]{1,32}$/.test(rawSubreddit) ? rawSubreddit : undefined;
    const withTopComments = req.query.topComments !== '0';

    const result = await rssService.getAggregatedFeed({
      subreddit,
      withTopComments,
      prisma,
    });
    res.set('Cache-Control', 'public, max-age=60');
    res.json(result);
  } catch (error) {
    console.error('Trending endpoint error:', error.message);
    res.status(500).json({ error: 'Failed to fetch trending posts' });
  }
});
```

The `prisma` reference here uses the existing module-scoped `prisma` instance defined at `server.js:31`. The `Cache-Control` header lets browsers and any CDN absorb a small burst of identical requests (60s).

- [ ] **Step 2: Start the dev server**

```bash
cd /Users/alexvallejo/Sites/personal/reddzit/read-api && yarn dev
```

Wait for the `read-api startup env` log line.

- [ ] **Step 3: Verify with `curl` — default (top) view**

In a separate terminal:

```bash
curl -s 'http://localhost:3000/api/trending/rss' | node -e "
let d = '';
process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
  const r = JSON.parse(d);
  console.log('posts:', r.posts.length);
  console.log('with images:', r.posts.filter(p => p.imageUrl).length);
  console.log('with top comments:', r.posts.filter(p => p.topComment).length);
  console.log('cached:', r.cached);
});
"
```

Expected: `posts: 60+`, `with images: 30+`, `cached: false` on first run.

- [ ] **Step 4: Verify with `curl` — news subreddit**

```bash
curl -s 'http://localhost:3000/api/trending/rss?subreddit=news' | node -e "
let d = '';
process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
  const r = JSON.parse(d);
  console.log('posts:', r.posts.length);
  console.log('all from news?', r.posts.every(p => p.subreddit.toLowerCase() === 'news'));
});
"
```

Expected: `all from news? true`.

- [ ] **Step 5: Verify cache hit on repeated call**

```bash
curl -s 'http://localhost:3000/api/trending/rss?subreddit=news' | node -e "
let d = '';
process.stdin.on('data', c => d += c);
process.stdin.on('end', () => { console.log('cached:', JSON.parse(d).cached); });
"
```

Expected: `cached: true`.

- [ ] **Step 6: Verify `topComments=0` opt-out**

```bash
curl -s 'http://localhost:3000/api/trending/rss?subreddit=technology&topComments=0' | node -e "
let d = '';
process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
  const r = JSON.parse(d);
  console.log('top comments:', r.posts.filter(p => p.topComment).length);
});
"
```

Expected: `top comments: 0`.

- [ ] **Step 7: Verify malformed subreddit input is rejected**

```bash
curl -s 'http://localhost:3000/api/trending/rss?subreddit=../etc/passwd' | node -e "
let d = '';
process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
  const r = JSON.parse(d);
  // Malformed subreddit should fall back to the 'top' view, not be passed to Reddit
  console.log('posts:', r.posts.length, 'all from one sub?', new Set(r.posts.map(p => p.subreddit.toLowerCase())).size === 1);
});
"
```

Expected: `posts: 60+`, `all from one sub? false` (the 'top' view returns posts from many subs).

Stop the dev server (Ctrl+C).

- [ ] **Step 8: Commit**

```bash
cd /Users/alexvallejo/Sites/personal/reddzit
git add read-api/server.js
git commit -m "feat(read-api): upgrade /api/trending/rss to use getAggregatedFeed"
```

---

## Task 5: Update frontend `TrendingPost` interface and rewrite `getTrendingRSS`

**Files:**
- Modify: `reddzit-refresh/src/helpers/DailyService.ts` (lines 44-51 — extend interface; lines 121-210 — replace fetch logic)

This is a behavior-preserving change for the existing `TopFeed` UI: the new fields are all optional, and the old grid won't try to render them yet. Once committed, the existing UI keeps working but is now driven by the backend (which fixes iOS Safari immediately, even before the magazine-grid redesign lands).

- [ ] **Step 1: Extend the `TrendingPost` interface**

Open `reddzit-refresh/src/helpers/DailyService.ts`. Find the existing interface (lines 44-51):

```ts
export interface TrendingPost {
  id: string;
  title: string;
  subreddit: string;
  link: string;
  author?: string;
  pubDate?: string;
}
```

Replace with:

```ts
export interface TrendingPostTopComment {
  body: string;
  author: string;
  score: number;
}

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
  topComment?: TrendingPostTopComment;
}
```

- [ ] **Step 2: Rewrite `getTrendingRSS` to call the backend**

In the same file, find the `getTrendingRSS` method (lines 121-210). Replace the entire method body with:

```ts
  async getTrendingRSS(subreddit?: string): Promise<TrendingPost[]> {
    const normalizedSubreddit = subreddit?.trim().toLowerCase();
    const cacheKey = normalizedSubreddit ? `${RSS_CACHE_KEY}_${normalizedSubreddit}` : RSS_CACHE_KEY;

    // Check cache first
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const hasPosts = data?.length > 0;
        if (Date.now() - timestamp < RSS_CACHE_DURATION && hasPosts) {
          return data;
        }
        if (!hasPosts) {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch {
      localStorage.removeItem(cacheKey);
    }

    try {
      const params = normalizedSubreddit ? { subreddit: normalizedSubreddit } : undefined;
      const response = await axios.get<{ posts: TrendingPost[]; generatedAt: string; cached: boolean }>(
        `${API_BASE_URL}/api/trending/rss`,
        { params }
      );
      const posts = response.data?.posts || [];

      if (posts.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: posts,
          timestamp: Date.now(),
        }));
      }

      return posts;
    } catch (error) {
      console.error('Failed to fetch trending posts', error);
      // Return stale cache on error if not too old
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          const hasPosts = data?.length > 0;
          const cacheAge = typeof timestamp === 'number' ? Date.now() - timestamp : Infinity;
          if (hasPosts && cacheAge < RSS_STALE_FALLBACK_MAX_AGE) {
            return data;
          }
          localStorage.removeItem(cacheKey);
        }
      } catch {
        localStorage.removeItem(cacheKey);
      }
      return [];
    }
  },
```

The existing constants `RSS_CACHE_KEY`, `RSS_CACHE_DURATION`, and `RSS_STALE_FALLBACK_MAX_AGE` already exist at lines 40-42 — don't redeclare them.

- [ ] **Step 3: Type-check the frontend**

```bash
cd /Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh && yarn tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 4: Manual smoke test in browser**

Start both servers in separate terminals:

```bash
# Terminal A
cd /Users/alexvallejo/Sites/personal/reddzit/read-api && yarn dev
```

```bash
# Terminal B
cd /Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh && yarn dev
```

In a browser:
1. Open the dev URL Vite prints (usually `http://localhost:5173`)
2. Navigate to `/news`
3. Open Network tab — there should be a single request to `http://localhost:3000/api/trending/rss?subreddit=news` (or wherever the API is configured), and **no** direct requests to `reddit.com`
4. The current text-only grid should render normally — same UI as before, but now sourced from the backend

If you see a CORS error: the backend's `CORS_ORIGIN` env var may need updating to include the Vite dev origin. The default (no env var set) is permissive (`cors()` with no options), so this should work locally.

Stop both servers.

- [ ] **Step 5: Commit**

```bash
cd /Users/alexvallejo/Sites/personal/reddzit
git add reddzit-refresh/src/helpers/DailyService.ts
git commit -m "feat(reddzit-refresh): route news feed through backend proxy with extended type"
```

After this commit, the iOS Safari bug should already be fixed even though the magazine grid hasn't landed yet. Worth a quick check before continuing if iOS Safari is accessible.

---

## Task 6: Build the `MagazineGrid` component

**Files:**
- Create: `reddzit-refresh/src/components/MagazineGrid.tsx`

The component owns layout. Three internal card variants. Tile-size assignment is deterministic by index so the layout is stable across refreshes.

- [ ] **Step 1: Write `MagazineGrid.tsx`**

Create `reddzit-refresh/src/components/MagazineGrid.tsx` with this complete content:

```tsx
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faForward } from '@fortawesome/free-solid-svg-icons';
import type { TrendingPost } from '../helpers/DailyService';
import { useTheme } from '../context/ThemeContext';
import { getDisplayTitle } from '../helpers/RedditUtils';

type TileSize = 'hero' | 'tall' | 'standard';

const tileSizeForIndex = (index: number): TileSize => {
  if (index === 0) return 'hero';
  if (index > 0 && (index - 1) % 4 === 0) return 'tall';
  return 'standard';
};

const formatTimeAgo = (dateString: string | undefined) => {
  if (!dateString) return '';
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const formatScore = (n: number | undefined) => {
  if (typeof n !== 'number') return '';
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

interface CardProps {
  post: TrendingPost;
  onClick: () => void;
  onSkip: () => void;
}

const SubredditBadge = ({ subreddit }: { subreddit: string }) => (
  <span className="inline-block px-2 py-0.5 rounded text-[0.7rem] font-semibold bg-[var(--theme-primary)]/15 text-[var(--theme-primary)]">
    r/{subreddit}
  </span>
);

const MetaRow = ({ post }: { post: TrendingPost }) => {
  const score = formatScore(post.score);
  const comments = formatScore(post.numComments);
  return (
    <div className="flex items-center gap-3 text-[0.7rem] text-[var(--theme-textMuted)]">
      <span>{formatTimeAgo(post.pubDate)}</span>
      {score && <span>▲ {score}</span>}
      {comments && <span>💬 {comments}</span>}
    </div>
  );
};

const Quote = ({ post }: { post: TrendingPost }) => {
  if (post.topComment) {
    return (
      <p className="text-xs italic text-[var(--theme-textMuted)] line-clamp-3 mt-2">
        “{post.topComment.body}” <span className="not-italic">— u/{post.topComment.author}</span>
      </p>
    );
  }
  if (post.selftext) {
    return (
      <p className="text-xs text-[var(--theme-textMuted)] line-clamp-3 mt-2">
        {post.selftext}
      </p>
    );
  }
  return null;
};

const SkipButton = ({ onSkip }: { onSkip: () => void }) => {
  const { isLight } = useTheme();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onSkip();
      }}
      title="Skip post"
      className={`absolute right-2 top-2 z-10 p-1.5 rounded-md transition ${
        isLight ? 'text-blue-600 bg-white/60 hover:bg-blue-100' : 'text-blue-300 bg-black/40 hover:bg-blue-500/30'
      }`}
    >
      <FontAwesomeIcon icon={faForward} className="w-3 h-3" />
    </button>
  );
};

const ImageArea = ({ post, aspect }: { post: TrendingPost; aspect: string }) => {
  const [errored, setErrored] = useState(false);
  if (!post.imageUrl || errored) {
    return (
      <div
        className={`${aspect} w-full bg-[var(--theme-cardBg)] flex items-center justify-center`}
        aria-hidden="true"
      >
        <span className="text-2xl opacity-40">📝</span>
      </div>
    );
  }
  return (
    <img
      src={post.imageUrl}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
      className={`${aspect} w-full object-cover`}
    />
  );
};

const HeroCard = ({ post, onClick, onSkip }: CardProps) => (
  <article
    onClick={onClick}
    className="relative col-span-full cursor-pointer rounded-xl overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-cardBg)] hover:border-[var(--theme-primary)] transition"
  >
    <SkipButton onSkip={onSkip} />
    <ImageArea post={post} aspect="aspect-[21/9]" />
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <SubredditBadge subreddit={post.subreddit} />
        <MetaRow post={post} />
      </div>
      <h2 className="text-2xl font-semibold leading-tight text-[var(--theme-text)]">
        {getDisplayTitle(post)}
      </h2>
      <Quote post={post} />
    </div>
  </article>
);

const TallCard = ({ post, onClick, onSkip }: CardProps) => (
  <article
    onClick={onClick}
    className="relative md:row-span-2 cursor-pointer rounded-xl overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-cardBg)] hover:border-[var(--theme-primary)] transition flex flex-col"
  >
    <SkipButton onSkip={onSkip} />
    <ImageArea post={post} aspect="aspect-[4/5]" />
    <div className="p-3 flex flex-col gap-1.5 flex-1">
      <div className="flex items-center justify-between">
        <SubredditBadge subreddit={post.subreddit} />
        <span className="text-[0.7rem] text-[var(--theme-textMuted)]">{formatTimeAgo(post.pubDate)}</span>
      </div>
      <h3 className="text-base font-medium leading-tight text-[var(--theme-text)]">
        {getDisplayTitle(post)}
      </h3>
      <Quote post={post} />
    </div>
  </article>
);

const StandardCard = ({ post, onClick, onSkip }: CardProps) => (
  <article
    onClick={onClick}
    className="relative cursor-pointer rounded-xl overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-cardBg)] hover:border-[var(--theme-primary)] transition flex flex-col"
  >
    <SkipButton onSkip={onSkip} />
    <ImageArea post={post} aspect="aspect-video" />
    <div className="p-3 flex flex-col gap-1.5 flex-1">
      <div className="flex items-center justify-between">
        <SubredditBadge subreddit={post.subreddit} />
        <span className="text-[0.7rem] text-[var(--theme-textMuted)]">{formatTimeAgo(post.pubDate)}</span>
      </div>
      <h3 className="text-sm font-medium leading-tight text-[var(--theme-text)]">
        {getDisplayTitle(post)}
      </h3>
      <Quote post={post} />
    </div>
  </article>
);

interface MagazineGridProps {
  posts: TrendingPost[];
  onPostClick: (post: TrendingPost) => void;
  onSkipPost: (postId: string) => void;
}

const MagazineGrid = ({ posts, onPostClick, onSkipPost }: MagazineGridProps) => {
  return (
    <main className="max-w-7xl mx-auto px-4 pt-4 pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 grid-flow-row-dense auto-rows-min">
      {posts.map((post, idx) => {
        const size = tileSizeForIndex(idx);
        const onClick = () => onPostClick(post);
        const onSkip = () => onSkipPost(post.id);
        if (size === 'hero') return <HeroCard key={post.id} post={post} onClick={onClick} onSkip={onSkip} />;
        if (size === 'tall') return <TallCard key={post.id} post={post} onClick={onClick} onSkip={onSkip} />;
        return <StandardCard key={post.id} post={post} onClick={onClick} onSkip={onSkip} />;
      })}
    </main>
  );
};

export default MagazineGrid;
```

- [ ] **Step 2: Confirm the dependencies it uses already exist**

```bash
grep -l "getDisplayTitle" /Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/helpers/RedditUtils.ts && grep -l "useTheme" /Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/context/ThemeContext.tsx
```

Expected: both files print. If `RedditUtils.ts` is missing or `getDisplayTitle` isn't exported there, check the existing import in `TopFeed.tsx:5` to find the correct path.

- [ ] **Step 3: Type-check**

```bash
cd /Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh && yarn tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 4: Verify Tailwind's `line-clamp` plugin is enabled**

```bash
grep -l "line-clamp\|@tailwindcss/line-clamp\|@tailwindcss/typography" /Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/tailwind.config.* /Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/postcss.config.* 2>/dev/null
```

Tailwind v3.3+ has `line-clamp` built in (no plugin needed). If the config explicitly opts in or out, leave it alone — `line-clamp-3` should just work.

If the project uses Tailwind v4 (`@tailwindcss/vite`), no action needed.

- [ ] **Step 5: Commit**

```bash
cd /Users/alexvallejo/Sites/personal/reddzit
git add reddzit-refresh/src/components/MagazineGrid.tsx
git commit -m "feat(reddzit-refresh): add MagazineGrid component with hero/tall/standard cards"
```

---

## Task 7: Wire `MagazineGrid` into `TopFeed`

**Files:**
- Modify: `reddzit-refresh/src/components/TopFeed.tsx` (lines 261-302 — replace the inline grid `<main>` with `<MagazineGrid>`)

`TopFeed` keeps its data, state, dropdown, and stale-check responsibilities. Only the rendering of the post list moves to `MagazineGrid`.

- [ ] **Step 1: Add the import**

In `reddzit-refresh/src/components/TopFeed.tsx`, near the top with the other component imports (after the `RedditUtils` import at line 5), add:

```tsx
import MagazineGrid from './MagazineGrid';
```

- [ ] **Step 2: Replace the inline grid**

Find the existing `<main>` block in `TopFeed.tsx` — it starts at line 263 (`<main className="max-w-7xl mx-auto px-4 pt-4 pb-24 grid grid-cols-1 md:grid-cols-2 gap-3">`) and ends at line 302 (`</main>`).

Replace the entire `<main>...</main>` block with:

```tsx
        <MagazineGrid
          posts={visiblePosts}
          onPostClick={handlePostClick}
          onSkipPost={handleSkipPost}
        />
```

The surrounding `visiblePosts.length > 0 ? ( ... ) : ( ... empty state ... )` ternary stays as-is — the empty state is unchanged.

- [ ] **Step 3: Remove the now-unused FontAwesome and `formatTimeAgo` references that only the inline grid used**

Look at the imports at the top of `TopFeed.tsx`:

```tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faForward } from '@fortawesome/free-solid-svg-icons';
```

These are now used only by the now-removed inline grid AND by the existing header/empty state. Check by searching:

```bash
grep -n "FontAwesomeIcon\|faForward" /Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/components/TopFeed.tsx
```

If the imports are only on the import lines (no other matches), remove them. If they're still referenced (e.g., in the empty-state retry button — they aren't in the current code, but check), leave them alone.

The `formatTimeAgo` helper inside `TopFeed.tsx` is still used by the "Newest post: Xm ago" badge in the header (line 253). Leave it.

- [ ] **Step 4: Type-check**

```bash
cd /Users/alexvallejo/Sites/personal/reddzit && cd reddzit-refresh && yarn tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 5: Visual smoke test in desktop browser**

Start both servers (one per terminal):

```bash
cd /Users/alexvallejo/Sites/personal/reddzit/read-api && yarn dev
```

```bash
cd /Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh && yarn dev
```

In Chrome:
1. Open the Vite URL, navigate to `/news`
2. Confirm: hero card at top with large image and headline; mixed grid below with some tall (4:5) tiles, mostly standard (16:9) tiles
3. Top comment quote visible on the hero card (italic text, "— u/author" suffix)
4. Skip-post button (▶▶) appears in the top-right of every tile and skips that tile when clicked
5. Switch the dropdown to `r/technology` — feed swaps; expect more text-only tiles since technology has more selftext posts
6. Resize the window to a narrow mobile width — grid collapses to a single column; hero card still readable

Stop both servers.

- [ ] **Step 6: Commit**

```bash
cd /Users/alexvallejo/Sites/personal/reddzit
git add reddzit-refresh/src/components/TopFeed.tsx
git commit -m "feat(reddzit-refresh): render TopFeed via MagazineGrid"
```

---

## Task 8: iOS Safari verification + final QA

**Files:** None (verification only)

This is the gate that closes the original bug. The frontend is now same-origin to the backend, with `loading="lazy"` and `decoding="async"` on every image — both ITP and image-decoding regressions should be cleared.

- [ ] **Step 1: Determine the dev machine's LAN IP**

```bash
ipconfig getifaddr en0 || ipconfig getifaddr en1
```

Expected: an IP like `192.168.x.x` or `10.x.x.x`. Save it; you'll need it for the iPhone.

- [ ] **Step 2: Start both dev servers bound to the LAN**

The Vite dev server needs to listen on the LAN, and the backend's CORS must allow that origin.

Backend: in `read-api/.env`, temporarily add (or set):
```
CORS_ORIGIN=*
```
(or be more specific: `CORS_ORIGIN=http://192.168.x.x:5173,http://localhost:5173`)

Then:
```bash
cd /Users/alexvallejo/Sites/personal/reddzit/read-api && yarn dev
```

Frontend: start with `--host` so Vite binds to all interfaces:
```bash
cd /Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh && yarn dev --host
```

Vite will print a "Network:" URL — use that.

If the frontend's `API_BASE_URL` points to a deployed backend rather than `http://localhost:3000`, you may need to either set a local override or test against the deployed backend. Check `reddzit-refresh/src/config/api.ts` first:

```bash
cat /Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/config/api.ts
```

If the API base URL is hardcoded to a deployed origin, deploy the backend changes first (skip Step 2-4 of this task and run them against staging).

- [ ] **Step 3: Test on iOS Safari**

On an iPhone connected to the same Wi-Fi:
1. Open Safari → navigate to the Vite Network URL (e.g., `http://192.168.x.x:5173/news`)
2. **Confirm the feed loads** — this is the original bug. If it loads with images and headlines, the bug is fixed.
3. Confirm hero card image renders, no broken-image icons
4. Tap a tile — confirm post-detail navigation works
5. Pull-to-refresh — confirm content reloads (existing `pageshow` handler should fire)

- [ ] **Step 4: Test offline-fallback**

In Safari: enable airplane mode after the feed has loaded once. Reload the page. Expected: stale localStorage cache renders (the `RSS_STALE_FALLBACK_MAX_AGE` 60-min window).

- [ ] **Step 5: Revert the temporary `CORS_ORIGIN=*`**

If you set `CORS_ORIGIN=*` in `.env` for testing, revert that change to whatever was there before (or remove the line if it wasn't there). Do not commit `.env` changes.

- [ ] **Step 6: Final summary commit (optional, only if there are doc changes)**

If the spec or this plan needs an updated note about the verified-on-iOS state, write that update and commit. Otherwise no action.

---

## Self-review checklist (already done by the planner)

- [x] **Spec coverage:** Every section of the spec maps to a task — image extraction (T1), top comments (T2), aggregated feed (T3), API route (T4), frontend type + fetch (T5), magazine grid (T6), wire-up (T7), iOS Safari verification (T8).
- [x] **Placeholder scan:** No "TBD", no "implement appropriately", no "see Task X" without inline detail.
- [x] **Type consistency:** `TrendingPost` shape matches between `DailyService.ts` (T5) and `MagazineGrid.tsx` (T6); `topComment` field naming consistent across backend (T3) and frontend (T5/T6); `getTopComment` signature consistent between definition (T2) and call site (T3).
- [x] **One requirement per task:** Each task is independently committable. Tasks 1-4 are pure backend (the iOS Safari fix lands at T5). Tasks 6-7 are pure frontend additions.
