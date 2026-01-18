# For You Feed Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a personalized curation feed that analyzes user's saved posts to build a persona, surfaces content from subscriptions and AI-recommended subreddits, and lets users curate posts before generating reports.

**Architecture:** New "For You" tab with grid layout. ForYouService handles API calls to backend. Backend builds persona from saved posts, recommends content, tracks triage actions (save/read/not-interested), enforces 20-post cap before report generation.

**Tech Stack:** React + TypeScript, Vite, Tailwind CSS, Axios for API calls. Backend is separate (read-api).

---

## Prerequisites

The backend (read-api) needs the following endpoints. These are documented here for reference - implement backend first or use mocks.

### Backend API Contract

```
POST /api/foryou/persona/refresh
  Body: { userId: string }
  Response: { persona: Persona }

GET /api/foryou/persona
  Headers: Authorization: bearer <token>
  Response: { persona: Persona, lastRefreshedAt: string }

GET /api/foryou/feed
  Headers: Authorization: bearer <token>
  Query: ?limit=20
  Response: { posts: Post[], recommendedSubreddits: string[] }

POST /api/foryou/action
  Headers: Authorization: bearer <token>
  Body: { redditPostId: string, action: 'saved' | 'already_read' | 'not_interested' }
  Response: { success: true, curatedCount: number }

GET /api/foryou/curated
  Headers: Authorization: bearer <token>
  Response: { posts: CuratedPost[], count: number, limit: 20 }

GET /api/foryou/settings
  Headers: Authorization: bearer <token>
  Response: { subreddits: SubredditWeight[], recommendedSubreddits: string[] }

POST /api/foryou/settings/star
  Headers: Authorization: bearer <token>
  Body: { subreddit: string, starred: boolean }
  Response: { success: true }

POST /api/foryou/report/generate
  Headers: Authorization: bearer <token>
  Body: { model: string }
  Response: { report: Report }
```

### Types

```typescript
interface Persona {
  keywords: string[];
  topics: string[];
  subredditAffinities: { name: string; weight: number }[];
  contentPreferences: string[];
}

interface Post {
  id: string;
  redditPostId: string;
  subreddit: string;
  title: string;
  url: string | null;
  thumbnail: string | null;
  score: number;
  numComments: number;
  author: string;
  createdUtc: string;
  isSelf: boolean;
}

interface CuratedPost extends Post {
  action: 'saved' | 'already_read' | 'not_interested';
  savedVia: 'reddzit' | 'reddit';
  curatedAt: string;
}

interface SubredditWeight {
  name: string;
  starred: boolean;
  postCount: number;
}
```

---

## Task 1: Create ForYouService

**Files:**
- Create: `src/helpers/ForYouService.ts`

**Step 1: Create the service file with types**

```typescript
// src/helpers/ForYouService.ts
import axios from 'axios';
import API_BASE_URL from '../config/api';

// Types
export interface Persona {
  keywords: string[];
  topics: string[];
  subredditAffinities: { name: string; weight: number }[];
  contentPreferences: string[];
}

export interface ForYouPost {
  id: string;
  redditPostId: string;
  subreddit: string;
  title: string;
  url: string | null;
  thumbnail: string | null;
  score: number;
  numComments: number;
  author: string;
  createdUtc: string;
  isSelf: boolean;
}

export interface CuratedPost extends ForYouPost {
  action: 'saved' | 'already_read' | 'not_interested';
  savedVia: 'reddzit' | 'reddit';
  curatedAt: string;
}

export interface SubredditWeight {
  name: string;
  starred: boolean;
  postCount: number;
}

export type TriageAction = 'saved' | 'already_read' | 'not_interested';

const ForYouService = {
  /**
   * Refresh user persona based on saved posts
   */
  async refreshPersona(token: string): Promise<{ persona: Persona }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/foryou/persona/refresh`,
      {},
      { headers: { Authorization: `bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Get current user persona
   */
  async getPersona(token: string): Promise<{ persona: Persona | null; lastRefreshedAt: string | null }> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/foryou/persona`,
        { headers: { Authorization: `bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return { persona: null, lastRefreshedAt: null };
      }
      throw error;
    }
  },

  /**
   * Get personalized feed
   */
  async getFeed(token: string, limit = 20): Promise<{ posts: ForYouPost[]; recommendedSubreddits: string[] }> {
    const response = await axios.get(
      `${API_BASE_URL}/api/foryou/feed?limit=${limit}`,
      { headers: { Authorization: `bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Record triage action on a post
   */
  async recordAction(
    token: string,
    redditPostId: string,
    action: TriageAction
  ): Promise<{ success: boolean; curatedCount: number }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/foryou/action`,
      { redditPostId, action },
      { headers: { Authorization: `bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Get curated posts (saved via For You)
   */
  async getCurated(token: string): Promise<{ posts: CuratedPost[]; count: number; limit: number }> {
    const response = await axios.get(
      `${API_BASE_URL}/api/foryou/curated`,
      { headers: { Authorization: `bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Get subreddit settings/weights
   */
  async getSettings(token: string): Promise<{ subreddits: SubredditWeight[]; recommendedSubreddits: string[] }> {
    const response = await axios.get(
      `${API_BASE_URL}/api/foryou/settings`,
      { headers: { Authorization: `bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Star/unstar a subreddit to boost its weight
   */
  async toggleSubredditStar(token: string, subreddit: string, starred: boolean): Promise<{ success: boolean }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/foryou/settings/star`,
      { subreddit, starred },
      { headers: { Authorization: `bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Generate report from curated posts
   */
  async generateReport(token: string, model: string): Promise<{ report: any }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/foryou/report/generate`,
      { model },
      { headers: { Authorization: `bearer ${token}` } }
    );
    return response.data;
  },
};

export default ForYouService;
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/helpers/ForYouService.ts
git commit -m "feat: add ForYouService with API methods"
```

---

## Task 2: Add "For You" Tab to AppShell

**Files:**
- Modify: `src/components/AppShell.tsx`

**Step 1: Update Tab type and add new tab button**

In `src/components/AppShell.tsx`, update the Tab type:

```typescript
type Tab = 'top' | 'saved' | 'discover' | 'foryou';
```

**Step 2: Add the For You tab button in the nav**

After the "Discover" button (around line 127), add:

```typescript
<button
  onClick={() => setActiveTab('foryou')}
  className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors border-none cursor-pointer whitespace-nowrap ${
    themeName === 'light'
      ? activeTab === 'foryou'
        ? 'bg-orange-100 text-orange-700'
        : 'text-gray-600 hover:bg-gray-100 bg-transparent'
      : activeTab === 'foryou'
        ? 'bg-white/20 text-white'
        : 'text-gray-300 hover:bg-white/10 bg-transparent'
  }`}
>
  For You
</button>
```

**Step 3: Add the content rendering**

In the main content section (around line 209), add:

```typescript
{activeTab === 'foryou' && <ForYouContent />}
```

**Step 4: Create ForYouContent component stub**

Add at the bottom of the file before `export default AppShell`:

```typescript
// For You content (requires login)
const ForYouContent = () => {
  const { signedIn, redirectForAuth } = useReddit();
  const { themeName } = useTheme();

  if (!signedIn) {
    return (
      <>
        <TrendingMarquee />
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="text-6xl mb-6">✨</div>
          <h2 className={`text-2xl font-bold mb-3 ${themeName === 'light' ? 'text-gray-900' : ''}`}>For You</h2>
          <p className={`mb-8 max-w-md ${themeName === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
            Connect your Reddit account to get personalized content recommendations based on your interests.
          </p>
          <button
            onClick={redirectForAuth}
            className={`px-6 py-3 rounded-full font-semibold transition-colors border-none cursor-pointer shadow-lg ${
              themeName === 'light'
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
            }`}
          >
            Connect with Reddit
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <TrendingMarquee />
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-500">For You feed coming soon...</p>
      </div>
    </>
  );
};
```

**Step 5: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/components/AppShell.tsx
git commit -m "feat: add For You tab to AppShell"
```

---

## Task 3: Add /foryou Route

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add the route**

Add after the `/discover` route:

```typescript
<Route path='/foryou' element={<AppShell defaultTab="foryou" />} />
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add /foryou route"
```

---

## Task 4: Create ForYouFeed Component - Basic Structure

**Files:**
- Create: `src/components/ForYouFeed.tsx`

**Step 1: Create the component with state management**

```typescript
// src/components/ForYouFeed.tsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useReddit } from '../context/RedditContext';
import ForYouService, { ForYouPost, Persona, TriageAction } from '../helpers/ForYouService';

const CURATED_LIMIT = 20;

const ForYouFeed = () => {
  const { themeName } = useTheme();
  const { redditHelper } = useReddit();
  const navigate = useNavigate();

  // State
  const [posts, setPosts] = useState<ForYouPost[]>([]);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [personaRefreshedAt, setPersonaRefreshedAt] = useState<string | null>(null);
  const [curatedCount, setCuratedCount] = useState(0);
  const [recommendedSubreddits, setRecommendedSubreddits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingPersona, setRefreshingPersona] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPersona, setShowPersona] = useState(false);

  const token = redditHelper?.apiGetHeaders?.Authorization?.replace('bearer ', '') || '';

  // Load initial data
  const loadData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      // Load persona and feed in parallel
      const [personaResult, feedResult, curatedResult] = await Promise.all([
        ForYouService.getPersona(token),
        ForYouService.getFeed(token),
        ForYouService.getCurated(token),
      ]);

      setPersona(personaResult.persona);
      setPersonaRefreshedAt(personaResult.lastRefreshedAt);
      setPosts(feedResult.posts);
      setRecommendedSubreddits(feedResult.recommendedSubreddits);
      setCuratedCount(curatedResult.count);
    } catch (err) {
      console.error('Failed to load For You data:', err);
      setError('Failed to load feed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh persona
  const handleRefreshPersona = async () => {
    if (!token || refreshingPersona) return;

    setRefreshingPersona(true);
    setError(null);

    try {
      const result = await ForYouService.refreshPersona(token);
      setPersona(result.persona);
      setPersonaRefreshedAt(new Date().toISOString());
      // Reload feed with new persona
      const feedResult = await ForYouService.getFeed(token);
      setPosts(feedResult.posts);
      setRecommendedSubreddits(feedResult.recommendedSubreddits);
    } catch (err) {
      console.error('Failed to refresh persona:', err);
      setError('Failed to refresh persona. Please try again.');
    } finally {
      setRefreshingPersona(false);
    }
  };

  // Handle triage action
  const handleAction = async (post: ForYouPost, action: TriageAction) => {
    if (!token) return;

    try {
      const result = await ForYouService.recordAction(token, post.redditPostId, action);
      setCuratedCount(result.curatedCount);
      // Remove post from feed
      setPosts(prev => prev.filter(p => p.id !== post.id));
    } catch (err) {
      console.error('Failed to record action:', err);
      setError('Failed to save action. Please try again.');
    }
  };

  // Handle post click
  const handlePostClick = (post: ForYouPost) => {
    const slug = post.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60);
    navigate(`/p/t3_${post.redditPostId}/${slug}`);
  };

  // Check if at cap
  const isAtCap = curatedCount >= CURATED_LIMIT;

  if (loading) {
    return (
      <div className={`py-24 text-center ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>
        <div className="animate-pulse text-xl">Loading For You...</div>
      </div>
    );
  }

  // No persona yet
  if (!persona) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="text-6xl mb-6">🎯</div>
        <h2 className={`text-2xl font-bold mb-3 ${themeName === 'light' ? 'text-gray-900' : ''}`}>
          Build Your Persona
        </h2>
        <p className={`mb-8 max-w-md mx-auto ${themeName === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
          Analyze your saved posts to create a personalized feed tailored to your interests.
        </p>
        <button
          onClick={handleRefreshPersona}
          disabled={refreshingPersona}
          className={`px-6 py-3 rounded-full font-semibold transition-colors border-none cursor-pointer shadow-lg ${
            refreshingPersona ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            themeName === 'light'
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
          }`}
        >
          {refreshingPersona ? 'Analyzing...' : 'Refresh Persona'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-2xl font-bold ${themeName === 'light' ? 'text-gray-900' : ''}`}>
            For You
          </h2>
          <p className={`text-sm ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>
            {curatedCount}/{CURATED_LIMIT} posts curated
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPersona(!showPersona)}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              themeName === 'light'
                ? 'text-gray-600 hover:bg-gray-100'
                : 'text-gray-300 hover:bg-white/10'
            }`}
          >
            {showPersona ? 'Hide' : 'View'} Persona
          </button>
          <button
            onClick={handleRefreshPersona}
            disabled={refreshingPersona}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              themeName === 'light'
                ? 'text-orange-600 hover:bg-orange-50'
                : 'text-[var(--theme-primary)] hover:bg-white/10'
            }`}
          >
            {refreshingPersona ? '⏳' : '↻'} Refresh Persona
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Persona Display */}
      {showPersona && persona && (
        <div className={`mb-6 p-6 rounded-xl border ${
          themeName === 'light'
            ? 'bg-slate-50 border-slate-200'
            : 'bg-white/5 border-white/10'
        }`}>
          <h3 className={`font-semibold mb-4 ${themeName === 'light' ? 'text-gray-900' : ''}`}>
            Your Persona
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className={`text-xs font-semibold uppercase mb-2 ${themeName === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                Interests
              </p>
              <p className={`text-sm ${themeName === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                {persona.keywords.join(', ') || 'None detected yet'}
              </p>
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase mb-2 ${themeName === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                Top Subreddits
              </p>
              <p className={`text-sm ${themeName === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                {persona.subredditAffinities.slice(0, 5).map(s => `r/${s.name}`).join(', ') || 'None detected yet'}
              </p>
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase mb-2 ${themeName === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                Content Preferences
              </p>
              <p className={`text-sm ${themeName === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                {persona.contentPreferences.join(', ') || 'None detected yet'}
              </p>
            </div>
            {personaRefreshedAt && (
              <div>
                <p className={`text-xs font-semibold uppercase mb-2 ${themeName === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                  Last Refreshed
                </p>
                <p className={`text-sm ${themeName === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  {new Date(personaRefreshedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* At Cap Warning */}
      {isAtCap && (
        <div className={`mb-6 p-4 rounded-xl border ${
          themeName === 'light'
            ? 'bg-orange-50 border-orange-200'
            : 'bg-[var(--theme-primary)]/10 border-[var(--theme-primary)]/30'
        }`}>
          <p className={`font-medium ${themeName === 'light' ? 'text-orange-800' : 'text-[var(--theme-primary)]'}`}>
            You've curated {CURATED_LIMIT} posts!
          </p>
          <p className={`text-sm mt-1 ${themeName === 'light' ? 'text-orange-600' : 'text-gray-400'}`}>
            Generate your report to continue curating.
          </p>
          <button
            className={`mt-3 px-4 py-2 rounded-lg font-medium text-sm transition ${
              themeName === 'light'
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
            }`}
            onClick={() => navigate('/foryou/report')}
          >
            Generate Report
          </button>
        </div>
      )}

      {/* Posts Grid */}
      {posts.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24">
          {posts.map((post, index) => (
            <div
              key={post.id}
              className={`group relative rounded-xl p-4 transition border ${
                themeName === 'light'
                  ? 'bg-white shadow-sm hover:shadow-md border-gray-100'
                  : 'backdrop-blur-md hover:bg-white/[0.12]'
              } ${index === 0 ? 'lg:col-span-2' : ''}`}
              style={themeName === 'light' ? undefined : {
                backgroundColor: 'var(--theme-cardBg)',
                borderColor: 'var(--theme-border)'
              }}
            >
              {/* Post Content */}
              <div
                className="cursor-pointer"
                onClick={() => handlePostClick(post)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wide ${
                    themeName === 'light' ? 'text-orange-600' : 'text-[var(--theme-primary)]'
                  }`}>
                    r/{post.subreddit}
                  </span>
                  <span className={`text-xs ${themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]'}`}>
                    {post.score} pts • {post.numComments} comments
                  </span>
                </div>
                <h3 className={`font-semibold leading-tight mb-3 ${
                  index === 0 ? 'text-2xl' : 'text-lg'
                } ${
                  themeName === 'light'
                    ? 'text-gray-900 group-hover:text-orange-600'
                    : 'group-hover:text-[var(--theme-primary)]'
                }`}>
                  {post.title}
                </h3>
                {post.thumbnail && post.thumbnail !== 'self' && post.thumbnail !== 'default' && (
                  <div className="mb-3 rounded-lg overflow-hidden">
                    <img
                      src={post.thumbnail}
                      alt=""
                      className="w-full h-32 object-cover"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
              </div>

              {/* Triage Actions */}
              <div className={`flex gap-2 pt-3 border-t ${
                themeName === 'light' ? 'border-gray-100' : 'border-white/10'
              }`}>
                <button
                  onClick={() => handleAction(post, 'saved')}
                  disabled={isAtCap}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                    isAtCap
                      ? 'opacity-50 cursor-not-allowed'
                      : themeName === 'light'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  }`}
                >
                  Save
                </button>
                <button
                  onClick={() => handleAction(post, 'already_read')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                    themeName === 'light'
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-white/10 text-gray-400 hover:bg-white/20'
                  }`}
                >
                  Read
                </button>
                <button
                  onClick={() => handleAction(post, 'not_interested')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                    themeName === 'light'
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  }`}
                >
                  Not Interested
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`py-24 text-center ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>
          <p className="text-xl">No posts available</p>
          <p className="text-sm mt-2">Try refreshing your persona or check back later.</p>
        </div>
      )}
    </div>
  );
};

export default ForYouFeed;
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/ForYouFeed.tsx
git commit -m "feat: add ForYouFeed component with persona and triage actions"
```

---

## Task 5: Integrate ForYouFeed into AppShell

**Files:**
- Modify: `src/components/AppShell.tsx`

**Step 1: Import ForYouFeed**

Add import at top:

```typescript
import ForYouFeed from './ForYouFeed';
```

**Step 2: Update ForYouContent to use ForYouFeed**

Replace the placeholder in `ForYouContent`:

```typescript
const ForYouContent = () => {
  const { signedIn, redirectForAuth } = useReddit();
  const { themeName } = useTheme();

  if (!signedIn) {
    return (
      <>
        <TrendingMarquee />
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="text-6xl mb-6">✨</div>
          <h2 className={`text-2xl font-bold mb-3 ${themeName === 'light' ? 'text-gray-900' : ''}`}>For You</h2>
          <p className={`mb-8 max-w-md ${themeName === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
            Connect your Reddit account to get personalized content recommendations based on your interests.
          </p>
          <button
            onClick={redirectForAuth}
            className={`px-6 py-3 rounded-full font-semibold transition-colors border-none cursor-pointer shadow-lg ${
              themeName === 'light'
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
            }`}
          >
            Connect with Reddit
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <TrendingMarquee />
      <ForYouFeed />
    </>
  );
};
```

**Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/AppShell.tsx
git commit -m "feat: integrate ForYouFeed into AppShell"
```

---

## Task 6: Extend RedditContext with Access Token

**Files:**
- Modify: `src/context/RedditContext.tsx`

**Step 1: Add accessToken to context interface**

Add to `RedditContextType`:

```typescript
accessToken: string | null;
```

**Step 2: Add state and expose in provider**

Add state:

```typescript
const [accessToken, setAccessToken] = useState<string | null>(null);
```

In `initAuth`, after getting token:

```typescript
if (token) {
  setAccessToken(token);
  // ... rest of code
}
```

Add to provider value:

```typescript
accessToken,
```

**Step 3: Update ForYouFeed to use accessToken**

In `ForYouFeed.tsx`, change:

```typescript
const { accessToken } = useReddit();
// ...
const token = accessToken || '';
```

And remove the complex token extraction:

```typescript
// Remove this line:
const token = redditHelper?.apiGetHeaders?.Authorization?.replace('bearer ', '') || '';
```

**Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/context/RedditContext.tsx src/components/ForYouFeed.tsx
git commit -m "feat: expose accessToken in RedditContext"
```

---

## Task 7: Create ForYou Settings Page

**Files:**
- Create: `src/components/ForYouSettings.tsx`
- Modify: `src/App.tsx`

**Step 1: Create ForYouSettings component**

```typescript
// src/components/ForYouSettings.tsx
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useReddit } from '../context/RedditContext';
import ForYouService, { Persona, SubredditWeight } from '../helpers/ForYouService';

const ForYouSettings = () => {
  const { themeName } = useTheme();
  const { accessToken, signedIn, redirectForAuth } = useReddit();

  const [persona, setPersona] = useState<Persona | null>(null);
  const [personaRefreshedAt, setPersonaRefreshedAt] = useState<string | null>(null);
  const [subreddits, setSubreddits] = useState<SubredditWeight[]>([]);
  const [recommendedSubreddits, setRecommendedSubreddits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingPersona, setRefreshingPersona] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = accessToken || '';

  const loadData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const [personaResult, settingsResult] = await Promise.all([
        ForYouService.getPersona(token),
        ForYouService.getSettings(token),
      ]);

      setPersona(personaResult.persona);
      setPersonaRefreshedAt(personaResult.lastRefreshedAt);
      setSubreddits(settingsResult.subreddits);
      setRecommendedSubreddits(settingsResult.recommendedSubreddits);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefreshPersona = async () => {
    if (!token || refreshingPersona) return;

    setRefreshingPersona(true);
    setError(null);

    try {
      const result = await ForYouService.refreshPersona(token);
      setPersona(result.persona);
      setPersonaRefreshedAt(new Date().toISOString());
    } catch (err) {
      console.error('Failed to refresh persona:', err);
      setError('Failed to refresh persona. Please try again.');
    } finally {
      setRefreshingPersona(false);
    }
  };

  const handleToggleStar = async (subreddit: string, currentlyStarred: boolean) => {
    if (!token) return;

    try {
      await ForYouService.toggleSubredditStar(token, subreddit, !currentlyStarred);
      setSubreddits(prev =>
        prev.map(s => (s.name === subreddit ? { ...s, starred: !currentlyStarred } : s))
      );
    } catch (err) {
      console.error('Failed to toggle star:', err);
      setError('Failed to update subreddit. Please try again.');
    }
  };

  if (!signedIn) {
    return (
      <div className={`min-h-screen ${themeName === 'light' ? 'bg-[#fcfcfc]' : 'bg-[var(--theme-bg)]'}`}>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className={themeName === 'light' ? 'text-gray-600' : 'text-gray-400'}>
            Please log in to access settings.
          </p>
          <button
            onClick={redirectForAuth}
            className={`mt-4 px-6 py-3 rounded-full font-semibold ${
              themeName === 'light'
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-[var(--theme-primary)] text-[#262129]'
            }`}
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${themeName === 'light' ? 'bg-[#fcfcfc]' : 'bg-[var(--theme-bg)]'}`}>
        <div className="py-24 text-center">
          <div className="animate-pulse text-xl">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeName === 'light' ? 'bg-[#fcfcfc] text-gray-900' : 'bg-[var(--theme-bg)] text-[var(--theme-text)]'}`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              to="/foryou"
              className={`text-sm mb-2 inline-block ${themeName === 'light' ? 'text-gray-500' : 'text-gray-400'}`}
            >
              ← Back to For You
            </Link>
            <h1 className="text-2xl font-bold">For You Settings</h1>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Persona Section */}
        <section className={`mb-8 p-6 rounded-xl border ${
          themeName === 'light' ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Persona</h2>
            <button
              onClick={handleRefreshPersona}
              disabled={refreshingPersona}
              className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                refreshingPersona ? 'opacity-50' : ''
              } ${
                themeName === 'light'
                  ? 'text-orange-600 hover:bg-orange-50'
                  : 'text-[var(--theme-primary)] hover:bg-white/10'
              }`}
            >
              {refreshingPersona ? 'Refreshing...' : '↻ Refresh Persona'}
            </button>
          </div>

          {persona ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className={`text-xs font-semibold uppercase mb-2 ${themeName === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                  Interests
                </p>
                <p className={`text-sm ${themeName === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  {persona.keywords.join(', ') || 'None detected yet'}
                </p>
              </div>
              <div>
                <p className={`text-xs font-semibold uppercase mb-2 ${themeName === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                  Content Preferences
                </p>
                <p className={`text-sm ${themeName === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
                  {persona.contentPreferences.join(', ') || 'None detected yet'}
                </p>
              </div>
              {personaRefreshedAt && (
                <div className="sm:col-span-2">
                  <p className={`text-xs ${themeName === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Last refreshed: {new Date(personaRefreshedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className={`text-sm ${themeName === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
              No persona yet. Click "Refresh Persona" to analyze your saved posts.
            </p>
          )}
        </section>

        {/* Subreddits Section */}
        <section className={`mb-8 p-6 rounded-xl border ${
          themeName === 'light' ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'
        }`}>
          <h2 className="text-lg font-semibold mb-4">Your Top Subreddits</h2>
          <p className={`text-sm mb-4 ${themeName === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
            Star subreddits to boost their priority in your feed.
          </p>

          {subreddits.length > 0 ? (
            <div className="space-y-2">
              {subreddits.map(sub => (
                <div
                  key={sub.name}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    themeName === 'light' ? 'bg-gray-50' : 'bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleStar(sub.name, sub.starred)}
                      className={`text-xl ${
                        sub.starred
                          ? 'text-yellow-500'
                          : themeName === 'light' ? 'text-gray-300' : 'text-gray-600'
                      }`}
                    >
                      {sub.starred ? '★' : '☆'}
                    </button>
                    <span className="font-medium">r/{sub.name}</span>
                  </div>
                  <span className={`text-sm ${themeName === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {sub.postCount} posts
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${themeName === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
              No subreddits detected yet. Refresh your persona to analyze your saved posts.
            </p>
          )}
        </section>

        {/* Recommended Subreddits */}
        {recommendedSubreddits.length > 0 && (
          <section className={`p-6 rounded-xl border ${
            themeName === 'light' ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'
          }`}>
            <h2 className="text-lg font-semibold mb-4">AI Recommended</h2>
            <p className={`text-sm mb-4 ${themeName === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
              Subreddits we think you'd like based on your persona.
            </p>
            <div className="flex flex-wrap gap-2">
              {recommendedSubreddits.map(sub => (
                <span
                  key={sub}
                  className={`px-3 py-1.5 rounded-full text-sm ${
                    themeName === 'light'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)]'
                  }`}
                >
                  r/{sub}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ForYouSettings;
```

**Step 2: Add route in App.tsx**

```typescript
import ForYouSettings from './components/ForYouSettings';

// Add route:
<Route path='/foryou/settings' element={<ForYouSettings />} />
```

**Step 3: Add settings link to ForYouFeed header**

In ForYouFeed.tsx, add a settings link button in the header:

```typescript
<Link
  to="/foryou/settings"
  className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
    themeName === 'light'
      ? 'text-gray-600 hover:bg-gray-100'
      : 'text-gray-300 hover:bg-white/10'
  }`}
>
  ⚙️ Settings
</Link>
```

Don't forget to import Link:

```typescript
import { useNavigate, Link } from 'react-router-dom';
```

**Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/components/ForYouSettings.tsx src/App.tsx src/components/ForYouFeed.tsx
git commit -m "feat: add ForYou settings page with subreddit starring"
```

---

## Task 8: Create Report Generation Page

**Files:**
- Create: `src/components/ForYouReport.tsx`
- Modify: `src/App.tsx`

**Step 1: Create ForYouReport component**

```typescript
// src/components/ForYouReport.tsx
import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useReddit } from '../context/RedditContext';
import ForYouService, { CuratedPost } from '../helpers/ForYouService';

const MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and efficient' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Balanced performance' },
  { id: 'gpt-5.2', name: 'GPT-5.2', description: 'Most capable' },
];

const ForYouReport = () => {
  const { themeName } = useTheme();
  const { accessToken, signedIn, redirectForAuth } = useReddit();
  const navigate = useNavigate();

  const [curatedPosts, setCuratedPosts] = useState<CuratedPost[]>([]);
  const [curatedCount, setCuratedCount] = useState(0);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = accessToken || '';

  const loadData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const result = await ForYouService.getCurated(token);
      setCuratedPosts(result.posts.filter(p => p.action === 'saved'));
      setCuratedCount(result.count);
    } catch (err) {
      console.error('Failed to load curated posts:', err);
      setError('Failed to load curated posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async () => {
    if (!token || generating) return;

    setGenerating(true);
    setError(null);

    try {
      const result = await ForYouService.generateReport(token, selectedModel);
      // Navigate to report view (future task)
      navigate('/foryou', { state: { reportGenerated: true } });
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (!signedIn) {
    return (
      <div className={`min-h-screen ${themeName === 'light' ? 'bg-[#fcfcfc]' : 'bg-[var(--theme-bg)]'}`}>
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className={themeName === 'light' ? 'text-gray-600' : 'text-gray-400'}>
            Please log in to generate reports.
          </p>
          <button
            onClick={redirectForAuth}
            className={`mt-4 px-6 py-3 rounded-full font-semibold ${
              themeName === 'light'
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-[var(--theme-primary)] text-[#262129]'
            }`}
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${themeName === 'light' ? 'bg-[#fcfcfc]' : 'bg-[var(--theme-bg)]'}`}>
        <div className="py-24 text-center">
          <div className="animate-pulse text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeName === 'light' ? 'bg-[#fcfcfc] text-gray-900' : 'bg-[var(--theme-bg)] text-[var(--theme-text)]'}`}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/foryou"
            className={`text-sm mb-2 inline-block ${themeName === 'light' ? 'text-gray-500' : 'text-gray-400'}`}
          >
            ← Back to For You
          </Link>
          <h1 className="text-2xl font-bold">Generate Report</h1>
          <p className={`mt-2 ${themeName === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
            Create an AI-enhanced report from your {curatedCount} curated posts.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {curatedPosts.length === 0 ? (
          <div className={`text-center py-12 ${themeName === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
            <p className="text-xl mb-4">No curated posts yet</p>
            <p className="text-sm">Save posts from your For You feed to generate a report.</p>
            <Link
              to="/foryou"
              className={`inline-block mt-4 px-6 py-3 rounded-full font-semibold ${
                themeName === 'light'
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-[var(--theme-primary)] text-[#262129]'
              }`}
            >
              Go to For You
            </Link>
          </div>
        ) : (
          <>
            {/* Model Selection */}
            <section className={`mb-8 p-6 rounded-xl border ${
              themeName === 'light' ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'
            }`}>
              <h2 className="text-lg font-semibold mb-4">Select Model</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {MODELS.map(model => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className={`p-4 rounded-lg text-left transition border-2 ${
                      selectedModel === model.id
                        ? themeName === 'light'
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10'
                        : themeName === 'light'
                          ? 'border-gray-200 hover:border-orange-300 bg-white'
                          : 'border-white/10 hover:border-white/30 bg-transparent'
                    }`}
                  >
                    <p className="font-medium">{model.name}</p>
                    <p className={`text-sm ${themeName === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {model.description}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            {/* Curated Posts Preview */}
            <section className={`mb-8 p-6 rounded-xl border ${
              themeName === 'light' ? 'bg-white border-gray-200' : 'bg-white/5 border-white/10'
            }`}>
              <h2 className="text-lg font-semibold mb-4">Posts to Include ({curatedPosts.length})</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {curatedPosts.map(post => (
                  <div
                    key={post.id}
                    className={`p-3 rounded-lg ${themeName === 'light' ? 'bg-gray-50' : 'bg-white/5'}`}
                  >
                    <p className={`text-xs font-bold uppercase mb-1 ${
                      themeName === 'light' ? 'text-orange-600' : 'text-[var(--theme-primary)]'
                    }`}>
                      r/{post.subreddit}
                    </p>
                    <p className={`text-sm font-medium line-clamp-2 ${themeName === 'light' ? 'text-gray-900' : ''}`}>
                      {post.title}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Generate Button */}
            <div className="text-center">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className={`px-8 py-3 rounded-full font-semibold text-lg transition shadow-lg ${
                  generating ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  themeName === 'light'
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
                }`}
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Generating...
                  </span>
                ) : (
                  'Generate Report'
                )}
              </button>
              {generating && (
                <p className={`mt-4 text-sm ${themeName === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                  This may take 30-60 seconds...
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForYouReport;
```

**Step 2: Add route in App.tsx**

```typescript
import ForYouReport from './components/ForYouReport';

// Add route:
<Route path='/foryou/report' element={<ForYouReport />} />
```

**Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/ForYouReport.tsx src/App.tsx
git commit -m "feat: add ForYou report generation page"
```

---

## Task 9: Final Integration & Testing

**Files:**
- Various integration fixes

**Step 1: Verify all routes work**

Run: `npm run dev`
Navigate to:
- `/foryou` - Should show For You tab
- `/foryou/settings` - Should show settings page
- `/foryou/report` - Should show report generation page

**Step 2: Fix any TypeScript errors**

Run: `npm run build`
Fix any errors that appear.

**Step 3: Final commit**

```bash
git add .
git commit -m "chore: final integration and cleanup for For You feature"
```

---

## Summary

This plan implements the frontend for the For You feed feature:

1. **ForYouService** - API client for all For You endpoints
2. **ForYouFeed** - Main feed with persona display, post grid, triage actions
3. **ForYouSettings** - Persona view, subreddit starring
4. **ForYouReport** - Report generation with model selection
5. **AppShell updates** - New tab and routing

**Backend required:** The read-api needs corresponding endpoints implemented before this frontend will be functional. See the API contract at the top of this document.

**Next steps after frontend:**
1. Implement backend endpoints in read-api
2. Add two-way Reddit sync (save to Reddit when saving in Reddzit)
3. Add report viewing/history page
4. Add "Show more subreddit suggestions" functionality
