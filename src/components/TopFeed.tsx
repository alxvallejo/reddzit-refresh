import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import DailyService, { TrendingPost } from '../helpers/DailyService';
import MagazineGrid from './MagazineGrid';
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const STALE_DATA_THRESHOLD_SECONDS = 60 * 60;
const SUBREDDIT_OPTIONS = ['worldnews', 'technology', 'science', 'sports'] as const;
const SKIPPED_POSTS_STORAGE_KEY = 'rdz_top_skipped_posts_v1';

type SkippedPostsCache = {
  resetDate: string;
  postIds: string[];
};

const getTodayKey = () => new Date().toDateString();

const loadSkippedPosts = (): Set<string> => {
  try {
    const raw = localStorage.getItem(SKIPPED_POSTS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as SkippedPostsCache;
    if (parsed.resetDate !== getTodayKey()) {
      localStorage.removeItem(SKIPPED_POSTS_STORAGE_KEY);
      return new Set();
    }
    return new Set(parsed.postIds || []);
  } catch {
    localStorage.removeItem(SKIPPED_POSTS_STORAGE_KEY);
    return new Set();
  }
};

const TopFeed = () => {
  const { isLight } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [skippedPostIds, setSkippedPostIds] = useState<Set<string>>(() => loadSkippedPosts());
  const isNewsRoute = location.pathname === '/news';
  const selectedFeed = isNewsRoute ? 'news' : 'top';

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setSkippedPostIds(loadSkippedPosts());
  }, []);

  useEffect(() => {
    localStorage.setItem(SKIPPED_POSTS_STORAGE_KEY, JSON.stringify({
      resetDate: getTodayKey(),
      postIds: Array.from(skippedPostIds),
    } as SkippedPostsCache));
  }, [skippedPostIds]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SKIPPED_POSTS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SkippedPostsCache;
      if (parsed.resetDate !== getTodayKey()) {
        localStorage.removeItem(SKIPPED_POSTS_STORAGE_KEY);
        setSkippedPostIds(new Set());
      }
    } catch {
      localStorage.removeItem(SKIPPED_POSTS_STORAGE_KEY);
      setSkippedPostIds(new Set());
    }
  }, [now]);

  const loadTopPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await DailyService.getTrendingRSS(isNewsRoute ? 'news' : undefined);
      setPosts(data);
      setLastUpdatedAt(new Date());
    } catch (err) {
      setError('Failed to load top posts');
    } finally {
      setLoading(false);
    }
  }, [isNewsRoute]);

  useEffect(() => {
    loadTopPosts();
  }, [loadTopPosts]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadTopPosts();
      }
    };
    const handlePageShow = () => {
      loadTopPosts();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [loadTopPosts]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadTopPosts();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadTopPosts]);

  const handlePostClick = (post: TrendingPost) => {
    // Extract post ID from link (e.g., /comments/abc123/)
    const match = post.link.match(/\/comments\/([a-z0-9]+)/i);
    const postId = match ? match[1] : post.id;
    const fullname = `t3_${postId}`;
    const slug = post.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60);
    navigate(`/p/${fullname}/${slug}`);
  };

  const handleSubredditSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    if (selectedValue === 'top') {
      navigate('/top');
      return;
    }
    if (selectedValue === 'news') {
      navigate('/news');
      return;
    }
    navigate(`/r/${selectedValue}`);
  };

  const handleSkipPost = (postId: string) => {
    setSkippedPostIds(prev => {
      const updated = new Set(prev);
      updated.add(postId);
      return updated;
    });
  };

  const formatTimeAgo = (dateString: string | undefined) => {
    if (!dateString) return '';
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getNewestPostAgeSeconds = () => {
    const validTimestamps = posts
      .map(post => post.pubDate)
      .filter((pubDate): pubDate is string => Boolean(pubDate))
      .map(pubDate => new Date(pubDate).getTime())
      .filter(ms => !Number.isNaN(ms));

    if (validTimestamps.length === 0) return null;
    const newestPostMs = Math.max(...validTimestamps);
    return Math.floor((Date.now() - newestPostMs) / 1000);
  };

  const newestPostAgeSeconds = getNewestPostAgeSeconds();
  const isStaleData = newestPostAgeSeconds !== null && newestPostAgeSeconds > STALE_DATA_THRESHOLD_SECONDS;
  const pageTitle = location.pathname === '/news' ? 'Top News' : 'Top Posts on Reddit';
  const visiblePosts = posts.filter(post => !skippedPostIds.has(post.id));

  if (loading) {
    return (
      <div className="py-24 text-center text-[var(--theme-textMuted)]">
        <div className="animate-pulse text-xl">{isNewsRoute ? 'Loading Top News...' : 'Loading Top Posts...'}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-[var(--theme-textMuted)]">{error}</p>
        <button
          onClick={loadTopPosts}
          className={`mt-4 px-4 py-2 rounded-lg border-none cursor-pointer ${
            isLight
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
          }`}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="font-sans">
      {/* Header */}
      <header id="page-header" className="px-4 pb-2 sticky top-16 z-40 bg-[var(--theme-bg)]">
        <div className="max-w-7xl mx-auto border-b-2 border-[var(--theme-border)]">
          <div className="flex items-center justify-between py-4 pl-4 pr-4 gap-3">
            <h1 className="text-2xl font-bold text-[var(--theme-text)]">
              {pageTitle}
            </h1>
            <div className="flex items-center gap-2">
              <label htmlFor="subreddit-switcher" className="sr-only">
                Choose subreddit
              </label>
              <select
                id="subreddit-switcher"
                value={selectedFeed}
                onChange={handleSubredditSelect}
                className="px-2 py-1.5 rounded-md text-xs border border-[var(--theme-border)] bg-[var(--theme-cardBg)] text-[var(--theme-text)] cursor-pointer"
              >
                <option value="top">Top</option>
                <option value="news">News</option>
                {SUBREDDIT_OPTIONS.map((subreddit) => (
                  <option key={subreddit} value={subreddit}>
                    r/{subreddit}
                  </option>
                ))}
              </select>
              <span className="text-xs whitespace-nowrap text-[var(--theme-textMuted)]">
                {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                {' '}
                {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          </div>
          {newestPostAgeSeconds !== null && (
            <div className="flex items-center justify-end px-4 pb-3">
              <div className="flex items-center gap-3 flex-wrap justify-end">
                {lastUpdatedAt && (
                  <span className="text-xs text-[var(--theme-textMuted)]">
                    Updated on {lastUpdatedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                    {lastUpdatedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  </span>
                )}
                <span className={`text-xs ${isStaleData ? 'text-amber-600' : 'text-[var(--theme-textMuted)]'}`}>
                  Newest post: {formatTimeAgo(new Date(Date.now() - newestPostAgeSeconds * 1000).toISOString())}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Posts Grid */}
      {visiblePosts.length > 0 ? (
        <MagazineGrid
          posts={visiblePosts}
          onPostClick={handlePostClick}
          onSkipPost={handleSkipPost}
        />
      ) : (
        <div className="py-24 text-center text-[var(--theme-textMuted)]">
          <p className="text-xl">No posts available right now.</p>
          <p className="text-sm mt-2">
            {posts.length > 0 ? 'You skipped all visible posts.' : 'Check back soon!'}
          </p>
          {posts.length > 0 && (
            <button
              onClick={() => setSkippedPostIds(new Set())}
              className={`mt-4 px-4 py-2 rounded-lg border-none cursor-pointer ${
                isLight
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
              }`}
            >
              Reset skipped posts
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TopFeed;
