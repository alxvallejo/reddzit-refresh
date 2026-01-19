# For You - Subreddit Discovery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add subreddit discovery to the For You tab and remove the separate Discover tab.

**Architecture:** Suggested subreddits appear at the top of For You feed. Clicking a subreddit navigates to `/r/:subreddit` which shows posts from that subreddit via RSS. Users train their persona by saving posts (positive) or dismissing subreddits (negative).

**Tech Stack:** React, TypeScript, Express, Prisma, RSS (via existing rssService)

---

## Task 1: Backend - Create Suggestions Endpoint

**Files:**
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/read-api/controllers/forYouController.js`
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/read-api/server.js`

**Step 1: Add getSuggestions function to forYouController.js**

Add this function after the existing `getFeed` function (around line 400):

```javascript
/**
 * GET /api/foryou/suggestions
 * Returns suggested subreddits based on user's persona
 */
async function getSuggestions(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization' });
    }

    const token = authHeader.split(' ')[1];
    const { user } = await getUserFromToken(token);

    // Get user's existing subreddit affinities
    const persona = await prisma.userPersona.findUnique({
      where: { userId: user.id }
    });

    const existingAffinities = persona?.subredditAffinities || [];
    const existingSubreddits = new Set(existingAffinities.map(a => a.name.toLowerCase()));

    // Get NOT_INTERESTED counts to exclude blocked subreddits
    const notInterestedCounts = await prisma.curatedPost.groupBy({
      by: ['subreddit'],
      where: {
        userId: user.id,
        action: 'NOT_INTERESTED'
      },
      _count: { subreddit: true }
    });

    const blockedSubreddits = new Set();
    for (const item of notInterestedCounts) {
      if (item._count.subreddit >= 5) {
        blockedSubreddits.add(item.subreddit.toLowerCase());
      }
    }

    // Get curated subreddits from categories
    const subreddits = await prisma.subreddit.findMany({
      include: { category: true },
      orderBy: { sortOrder: 'asc' }
    });

    // Filter out existing and blocked, limit to 8
    const suggestions = subreddits
      .filter(s => !existingSubreddits.has(s.name.toLowerCase()))
      .filter(s => !blockedSubreddits.has(s.name.toLowerCase()))
      .slice(0, 8)
      .map(s => ({
        name: s.name,
        category: s.category.name
      }));

    res.json({ suggestions });
  } catch (error) {
    console.error('getSuggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
}
```

**Step 2: Export the function**

Add to the `module.exports` at the bottom of forYouController.js:

```javascript
module.exports = {
  // ... existing exports
  getSuggestions,
};
```

**Step 3: Add route to server.js**

Add after line 318 (after the other foryou routes):

```javascript
app.get('/api/foryou/suggestions', forYouController.getSuggestions);
```

**Step 4: Test manually**

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/foryou/suggestions
```

Expected: JSON with `{ suggestions: [{ name: "programming", category: "Tech" }, ...] }`

**Step 5: Commit**

```bash
git add controllers/forYouController.js server.js
git commit -m "feat: add /api/foryou/suggestions endpoint"
```

---

## Task 2: Backend - Create Subreddit Posts Endpoint

**Files:**
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/read-api/controllers/forYouController.js`
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/read-api/server.js`

**Step 1: Add getSubredditPosts function to forYouController.js**

```javascript
/**
 * GET /api/subreddit/:name/posts
 * Returns top posts from a subreddit via RSS
 */
async function getSubredditPosts(req, res) {
  try {
    const { name } = req.params;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Invalid subreddit name' });
    }

    // Sanitize subreddit name
    const subredditName = name.replace(/[^a-zA-Z0-9_]/g, '');

    const posts = await rssService.getTrendingFromRSS(subredditName, 20);

    res.json({
      subreddit: subredditName,
      posts
    });
  } catch (error) {
    console.error('getSubredditPosts error:', error);
    res.status(500).json({ error: 'Failed to fetch subreddit posts' });
  }
}
```

**Step 2: Export the function**

```javascript
module.exports = {
  // ... existing exports
  getSubredditPosts,
};
```

**Step 3: Add route to server.js**

```javascript
app.get('/api/subreddit/:name/posts', forYouController.getSubredditPosts);
```

**Step 4: Test manually**

```bash
curl http://localhost:3000/api/subreddit/programming/posts
```

Expected: JSON with `{ subreddit: "programming", posts: [...] }`

**Step 5: Commit**

```bash
git add controllers/forYouController.js server.js
git commit -m "feat: add /api/subreddit/:name/posts endpoint"
```

---

## Task 3: Backend - Create Subreddit Not-Interested Endpoint

**Files:**
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/read-api/controllers/forYouController.js`
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/read-api/server.js`

**Step 1: Add subredditNotInterested function to forYouController.js**

```javascript
/**
 * POST /api/foryou/subreddit-not-interested
 * Records that user is not interested in a subreddit
 */
async function subredditNotInterested(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization' });
    }

    const token = authHeader.split(' ')[1];
    const { user } = await getUserFromToken(token);

    const { subreddit } = req.body;
    if (!subreddit || typeof subreddit !== 'string') {
      return res.status(400).json({ error: 'Missing subreddit' });
    }

    // Create a placeholder curated post to record the NOT_INTERESTED action
    // This uses the same weighting system as post-level dismissals
    await prisma.curatedPost.create({
      data: {
        userId: user.id,
        redditPostId: `subreddit_dismiss_${subreddit}_${Date.now()}`,
        subreddit: subreddit,
        title: `[Subreddit Dismissed] r/${subreddit}`,
        action: 'NOT_INTERESTED'
      }
    });

    // Count total dismissals for this subreddit
    const count = await prisma.curatedPost.count({
      where: {
        userId: user.id,
        subreddit: subreddit,
        action: 'NOT_INTERESTED'
      }
    });

    console.log(`User ${user.redditUsername} dismissed r/${subreddit} (total: ${count})`);

    res.json({
      success: true,
      subreddit,
      dismissCount: count,
      blocked: count >= 5
    });
  } catch (error) {
    console.error('subredditNotInterested error:', error);
    res.status(500).json({ error: 'Failed to record dismissal' });
  }
}
```

**Step 2: Export the function**

```javascript
module.exports = {
  // ... existing exports
  subredditNotInterested,
};
```

**Step 3: Add route to server.js**

```javascript
app.post('/api/foryou/subreddit-not-interested', forYouController.subredditNotInterested);
```

**Step 4: Commit**

```bash
git add controllers/forYouController.js server.js
git commit -m "feat: add /api/foryou/subreddit-not-interested endpoint"
```

---

## Task 4: Frontend - Add ForYouService Methods

**Files:**
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/helpers/ForYouService.ts`

**Step 1: Add types**

Add after the existing types (around line 45):

```typescript
export interface SubredditSuggestion {
  name: string;
  category: string;
}

export interface SubredditPost {
  id: string;
  title: string;
  subreddit: string;
  link: string;
  author: string;
  pubDate: string;
}
```

**Step 2: Add getSuggestions method**

Add to the ForYouService object:

```typescript
  /**
   * Get suggested subreddits for discovery
   */
  async getSuggestions(token: string): Promise<{ suggestions: SubredditSuggestion[] }> {
    const response = await axios.get<{ suggestions: SubredditSuggestion[] }>(
      `${API_BASE_URL}/api/foryou/suggestions`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Get posts from a specific subreddit
   */
  async getSubredditPosts(subreddit: string): Promise<{ subreddit: string; posts: SubredditPost[] }> {
    const response = await axios.get<{ subreddit: string; posts: SubredditPost[] }>(
      `${API_BASE_URL}/api/subreddit/${subreddit}/posts`
    );
    return response.data;
  },

  /**
   * Mark a subreddit as not interested
   */
  async dismissSubreddit(token: string, subreddit: string): Promise<{ success: boolean; dismissCount: number; blocked: boolean }> {
    const response = await axios.post<{ success: boolean; dismissCount: number; blocked: boolean }>(
      `${API_BASE_URL}/api/foryou/subreddit-not-interested`,
      { subreddit },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },
```

**Step 3: Commit**

```bash
git add src/helpers/ForYouService.ts
git commit -m "feat: add suggestion and subreddit methods to ForYouService"
```

---

## Task 5: Frontend - Remove Discover Tab

**Files:**
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/components/AppShell.tsx`
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/App.tsx`

**Step 1: Update AppShell.tsx - Remove imports**

Remove these imports:

```typescript
import DiscoverFeed from './DiscoverFeed';
```

**Step 2: Update AppShell.tsx - Remove type**

Change the Tab type from:

```typescript
type Tab = 'top' | 'saved' | 'discover' | 'foryou';
```

To:

```typescript
type Tab = 'top' | 'saved' | 'foryou';
```

**Step 3: Update AppShell.tsx - Update getTabFromPath**

Change from:

```typescript
const getTabFromPath = (pathname: string): Tab => {
  if (pathname === '/reddit' || pathname === '/saved') return 'saved';
  if (pathname === '/discover') return 'discover';
  if (pathname === '/foryou') return 'foryou';
  return 'top';
};
```

To:

```typescript
const getTabFromPath = (pathname: string): Tab => {
  if (pathname === '/reddit' || pathname === '/saved') return 'saved';
  if (pathname === '/foryou') return 'foryou';
  return 'top';
};
```

**Step 4: Update AppShell.tsx - Remove Discover tab button**

Remove the entire Discover button block (lines ~116-129):

```typescript
              <button
                onClick={() => navigate('/discover')}
                className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors border-none cursor-pointer whitespace-nowrap ${
                  // ... styles
                }`}
              >
                Discover
              </button>
```

**Step 5: Update AppShell.tsx - Remove Discover content rendering**

Remove this line from the main content section:

```typescript
        {activeTab === 'discover' && <DiscoverFeed />}
```

**Step 6: Update App.tsx - Remove Discover route**

Remove this line:

```typescript
            <Route path='/discover' element={<AppShell defaultTab="discover" />} />
```

Also remove the `defaultTab` prop from AppShell since we derive tab from URL now. Change all AppShell usages to just `<AppShell />`.

**Step 7: Verify build**

```bash
npm run build
```

**Step 8: Commit**

```bash
git add src/components/AppShell.tsx src/App.tsx
git commit -m "feat: remove Discover tab from navigation"
```

---

## Task 6: Frontend - Create SubredditFeed Component

**Files:**
- Create: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/components/SubredditFeed.tsx`

**Step 1: Create the component**

```typescript
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useReddit } from '../context/RedditContext';
import ForYouService, { SubredditPost } from '../helpers/ForYouService';
import TrendingMarquee from './TrendingMarquee';

const SubredditFeed = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { themeName } = useTheme();
  const { accessToken } = useReddit();

  const [posts, setPosts] = useState<SubredditPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!name) return;

    const loadPosts = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await ForYouService.getSubredditPosts(name);
        setPosts(result.posts);
      } catch (err) {
        console.error('Failed to load subreddit:', err);
        setError('Failed to load posts');
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [name]);

  const handleNotInterested = async () => {
    if (!accessToken || !name || dismissing) return;

    setDismissing(true);
    try {
      await ForYouService.dismissSubreddit(accessToken, name);
      navigate('/foryou');
    } catch (err) {
      console.error('Failed to dismiss subreddit:', err);
    } finally {
      setDismissing(false);
    }
  };

  const handlePostClick = (post: SubredditPost) => {
    // Extract Reddit post ID from link
    const match = post.link?.match(/comments\/([a-z0-9]+)/i);
    const postId = match ? match[1] : post.id;
    const slug = post.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60);
    navigate(`/p/t3_${postId}/${slug}`);
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${themeName === 'light' ? 'bg-[#fcfcfc]' : 'bg-[var(--theme-bg)]'}`}>
        <TrendingMarquee />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="animate-pulse text-xl">Loading r/{name}...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeName === 'light' ? 'bg-[#fcfcfc]' : 'bg-[var(--theme-bg)]'}`}>
      <TrendingMarquee />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate('/foryou')}
              className={`text-sm mb-2 ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'} hover:underline bg-transparent border-none cursor-pointer`}
            >
              ← Back to For You
            </button>
            <h1 className={`text-2xl font-bold ${themeName === 'light' ? 'text-gray-900' : ''}`}>
              r/{name}
            </h1>
          </div>

          {accessToken && (
            <button
              onClick={handleNotInterested}
              disabled={dismissing}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                themeName === 'light'
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              } border-none cursor-pointer disabled:opacity-50`}
            >
              {dismissing ? '...' : 'Not Interested'}
            </button>
          )}
        </div>

        {error && (
          <div className="text-red-500 text-center py-8">{error}</div>
        )}

        {/* Posts */}
        <div className="space-y-4">
          {posts.map((post, index) => (
            <div
              key={post.id || index}
              onClick={() => handlePostClick(post)}
              className={`p-4 rounded-xl cursor-pointer transition-all ${
                themeName === 'light'
                  ? 'bg-white hover:shadow-md border border-gray-100'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10'
              }`}
            >
              <h2 className={`font-medium leading-tight ${
                themeName === 'light' ? 'text-gray-900' : ''
              }`}>
                {post.title}
              </h2>
              <div className={`text-xs mt-2 ${
                themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]'
              }`}>
                by {post.author}
              </div>
            </div>
          ))}
        </div>

        {posts.length === 0 && !error && (
          <div className={`text-center py-12 ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>
            No posts found
          </div>
        )}
      </div>
    </div>
  );
};

export default SubredditFeed;
```

**Step 2: Commit**

```bash
git add src/components/SubredditFeed.tsx
git commit -m "feat: create SubredditFeed component"
```

---

## Task 7: Frontend - Add Subreddit Route

**Files:**
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/App.tsx`

**Step 1: Import SubredditFeed**

```typescript
import SubredditFeed from './components/SubredditFeed';
```

**Step 2: Add route**

Add after the `/foryou` routes:

```typescript
            <Route path='/r/:name' element={<SubredditFeed />} />
```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add /r/:name route for subreddit pages"
```

---

## Task 8: Frontend - Add Suggested Subreddits to ForYouFeed

**Files:**
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/components/ForYouFeed.tsx`

**Step 1: Add state for suggestions**

Add to the state section (after line 29):

```typescript
  const [suggestions, setSuggestions] = useState<{ name: string; category: string }[]>([]);
```

**Step 2: Load suggestions in loadData**

Update the `loadData` function to also fetch suggestions. Add to the Promise.all:

```typescript
      const [personaResult, feedResult, curatedResult, suggestionsResult] = await Promise.all([
        ForYouService.getPersona(token),
        ForYouService.getFeed(token),
        ForYouService.getCurated(token),
        ForYouService.getSuggestions(token),
      ]);

      // ... existing setters
      setSuggestions(suggestionsResult.suggestions);
```

**Step 3: Add SuggestedSubreddits section**

Add this section right after the persona section, before the posts grid. Find the comment `{/* Posts */}` and add before it:

```typescript
        {/* Suggested Subreddits */}
        {suggestions.length > 0 && (
          <div className="mb-8">
            <h3 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${
              themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'
            }`}>
              Discover New Subreddits
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {suggestions.map((sub) => (
                <Link
                  key={sub.name}
                  to={`/r/${sub.name}`}
                  className={`p-3 rounded-xl text-center transition-all no-underline ${
                    themeName === 'light'
                      ? 'bg-white hover:shadow-md border border-gray-100 text-gray-900'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  <div className="font-medium">r/{sub.name}</div>
                  <div className={`text-xs mt-1 ${
                    themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]'
                  }`}>
                    {sub.category}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
```

**Step 4: Add Link import if not present**

Make sure `Link` is imported from react-router-dom at the top.

**Step 5: Verify build**

```bash
npm run build
```

**Step 6: Commit**

```bash
git add src/components/ForYouFeed.tsx
git commit -m "feat: add suggested subreddits section to For You feed"
```

---

## Task 9: Manual Testing

**Step 1: Start backend**

```bash
cd /Users/alexvallejo/Sites/personal/reddzit/read-api
node server.js
```

**Step 2: Start frontend**

```bash
cd /Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh
npm run dev
```

**Step 3: Test flow**

1. Navigate to `/foryou` - should see suggested subreddits at top
2. Click a subreddit - should navigate to `/r/subredditname`
3. See posts from that subreddit
4. Click "Not Interested" - should navigate back to For You
5. Refresh - that subreddit should not appear in suggestions (after 5 dismissals it's blocked)
6. Click a post - should open in PostView
7. Save a post - should work normally

**Step 4: Verify Discover tab is gone**

- Navigation should only show: Top, Saved Posts, For You
- `/discover` route should 404

---

## Task 10: Final Commit and Push

```bash
git push
```
