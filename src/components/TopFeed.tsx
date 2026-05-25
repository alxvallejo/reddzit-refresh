import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTableCellsLarge, faRectangleList, faShuffle } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import DailyService, {
  isDisplayableComment,
  TrendingPost,
  TrendingPostTopComment,
} from '../helpers/DailyService';
import MagazineGrid from './MagazineGrid';
import NewsCarousel from './NewsCarousel';
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const STALE_DATA_THRESHOLD_SECONDS = 60 * 60;
const SUBREDDIT_OPTIONS = ['worldnews', 'technology', 'science', 'sports'] as const;
const SKIPPED_POSTS_STORAGE_KEY = 'rdz_top_skipped_posts_v1';
const VIEW_MODE_STORAGE_KEY = 'rdz_news_view_mode';
const CAROUSEL_RANDOMIZE_STORAGE_KEY = 'rdz_carousel_randomize_v1';

const loadRandomize = (): boolean => {
  try {
    return localStorage.getItem(CAROUSEL_RANDOMIZE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const postHasDisplayableComments = (p: TrendingPost): boolean =>
  (p.topComments ?? []).some(isDisplayableComment);

type ViewMode = 'grid' | 'carousel';

const loadViewMode = (): ViewMode => {
  try {
    const v = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (v === 'grid') return 'grid';
    return 'carousel';
  } catch {
    return 'carousel';
  }
};

const shuffleArray = <T,>(arr: T[]): T[] => {
  const next = arr.slice();
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const NEWS_TOPICS = ['news', 'less-political'] as const;
type NewsTopic = (typeof NEWS_TOPICS)[number];
const DEFAULT_NEWS_TOPIC: NewsTopic = 'news';
const NEWS_TOPIC_LABELS: Record<NewsTopic, string> = {
  news: 'News',
  'less-political': 'Less Political',
};
const isNewsTopic = (value: string | null | undefined): value is NewsTopic =>
  !!value && (NEWS_TOPICS as readonly string[]).includes(value);

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
  const { subreddit: subredditParam } = useParams<{ subreddit?: string }>();
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [skippedPostIds, setSkippedPostIds] = useState<Set<string>>(() => loadSkippedPosts());
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadViewMode());
  const [randomize, setRandomize] = useState<boolean>(() => loadRandomize());
  const [shuffleSeed, setShuffleSeed] = useState(0);

  const toggleRandomize = useCallback(() => {
    setRandomize(prev => {
      const next = !prev;
      try {
        localStorage.setItem(CAROUSEL_RANDOMIZE_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      if (next) setShuffleSeed(s => s + 1);
      return next;
    });
  }, []);
  const [lazyComments, setLazyComments] = useState<Record<string, TrendingPostTopComment[]>>({});
  const lazyInFlight = useRef<Set<string>>(new Set());
  const lastShuffledRouteRef = useRef<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const isNewsRoute = location.pathname === '/news' || location.pathname === '/';
  const normalizedSubredditParam = subredditParam?.trim().toLowerCase();
  const topicParam = searchParams.get('topic');
  const newsTopic: NewsTopic = isNewsRoute && isNewsTopic(topicParam) ? topicParam : DEFAULT_NEWS_TOPIC;
  const dataSubreddit = isNewsRoute ? undefined : normalizedSubredditParam;
  const dataTopic = isNewsRoute ? newsTopic : undefined;
  const selectedFeed = isNewsRoute
    ? 'news'
    : normalizedSubredditParam ?? 'top';

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
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {
      // ignore
    }
  }, [viewMode]);

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
      const data = await DailyService.getTrendingRSS(dataSubreddit, undefined, dataTopic);
      const routeKey = `${dataSubreddit ?? ''}|${dataTopic ?? ''}`;
      if (lastShuffledRouteRef.current !== routeKey) {
        setPosts(shuffleArray(data));
        lastShuffledRouteRef.current = routeKey;
      } else {
        setPosts(data);
      }
      setLastUpdatedAt(new Date());
    } catch (err) {
      setError('Failed to load top posts');
    } finally {
      setLoading(false);
    }
  }, [dataSubreddit, dataTopic]);

  const handleNewsTopicChange = (topic: NewsTopic) => {
    if (topic === DEFAULT_NEWS_TOPIC) {
      setSearchParams({}, { replace: false });
    } else {
      setSearchParams({ topic }, { replace: false });
    }
  };

  useEffect(() => {
    loadTopPosts();
  }, [loadTopPosts]);

  useEffect(() => {
    setLazyComments({});
    lazyInFlight.current = new Set();
  }, [dataSubreddit, dataTopic]);

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
    navigate(`/p/${fullname}/${slug}`, {
      state: post.topComments?.length ? { topComments: post.topComments } : undefined,
    });
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
    navigate(`/feed/${selectedValue}`);
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
  const pageTitle = isNewsRoute
    ? 'Top News'
    : normalizedSubredditParam
      ? `r/${normalizedSubredditParam}`
      : 'Top Posts on Reddit';
  const visiblePosts = useMemo(
    () => posts.filter(post => !skippedPostIds.has(post.id)),
    [posts, skippedPostIds]
  );

  const postsWithComments = useMemo(() => {
    if (Object.keys(lazyComments).length === 0) return visiblePosts;
    return visiblePosts.map((p) => {
      if (p.topComments && p.topComments.length > 0) return p;
      const lazy = lazyComments[p.id];
      return lazy ? { ...p, topComments: lazy } : p;
    });
  }, [visiblePosts, lazyComments]);

  const carouselPosts = useMemo(() => {
    if (!randomize) return postsWithComments;
    const withComments: TrendingPost[] = [];
    const withoutComments: TrendingPost[] = [];
    for (const p of postsWithComments) {
      if (postHasDisplayableComments(p)) withComments.push(p);
      else withoutComments.push(p);
    }
    return [...shuffleArray(withComments), ...shuffleArray(withoutComments)];
    // shuffleSeed is intentionally in the dep list to re-shuffle on toggle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postsWithComments, randomize, shuffleSeed]);

  const handleVisibleRange = useCallback((indices: number[]) => {
    if (indices.length === 0) return;
    // NewsCarousel calls onVisibleRangeChange with Array.from(new Set([prev, current, next])).
    // JS Set iteration is insertion order, so element [1] is `current` when length >= 2.
    // When total <= 1 the array has 1 element; fall back to [0].
    const current = indices.length >= 2 ? indices[1] : indices[0];

    const targets: number[] = [];
    for (let offset = 0; offset <= 2; offset++) {
      const idx = current + offset;
      if (idx < carouselPosts.length) targets.push(idx);
    }

    for (const idx of targets) {
      const post = carouselPosts[idx];
      if (!post) continue;
      if (post.topComments && post.topComments.length > 0) continue;
      if (lazyComments[post.id]) continue;
      if (lazyInFlight.current.has(post.id)) continue;

      lazyInFlight.current.add(post.id);
      DailyService.getTopCommentsForPost(post.id)
        .then((comments) => {
          setLazyComments((prev) => ({ ...prev, [post.id]: comments ?? [] }));
        })
        .finally(() => {
          lazyInFlight.current.delete(post.id);
        });
    }
  }, [carouselPosts, lazyComments]);

  const isInitialLoad = posts.length === 0;

  if (loading && isInitialLoad) {
    return (
      <div className="py-24 text-center text-[var(--theme-textMuted)]">
        <div className="animate-pulse text-xl">{isNewsRoute ? 'Loading Top News...' : 'Loading Top Posts...'}</div>
      </div>
    );
  }

  if (error && isInitialLoad) {
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
      <header id="page-header" className="px-4 sticky top-[6.25rem] z-30 bg-[var(--theme-bg)]">
        <div className="max-w-screen-2xl mx-auto border-b border-[var(--theme-border)]">
          <div className="flex items-center justify-between py-2 px-4 gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-lg font-bold text-[var(--theme-text)] leading-none">
                {pageTitle}
              </h1>
              {isNewsRoute && (
                <div className="flex items-center gap-1">
                  {NEWS_TOPICS.map((topic) => {
                    const active = topic === newsTopic;
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => handleNewsTopicChange(topic)}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition cursor-pointer ${
                          active
                            ? 'bg-[var(--theme-primary)] text-[#262129] border-[var(--theme-primary)]'
                            : 'bg-transparent text-[var(--theme-textMuted)] border-[var(--theme-border)] hover:text-[var(--theme-text)] hover:border-[var(--theme-primary)]'
                        }`}
                      >
                        {NEWS_TOPIC_LABELS[topic]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {newestPostAgeSeconds !== null && (
                <span
                  className={`text-[11px] ${isStaleData ? 'text-amber-600' : 'text-[var(--theme-textMuted)]'}`}
                  title={lastUpdatedAt ? `Updated ${lastUpdatedAt.toLocaleString()}` : undefined}
                >
                  Newest: {formatTimeAgo(new Date(Date.now() - newestPostAgeSeconds * 1000).toISOString())}
                </span>
              )}
              <div
                role="group"
                aria-label="View mode"
                className="inline-flex rounded-md overflow-hidden border border-[var(--theme-border)]"
              >
                <button
                  type="button"
                  aria-pressed={viewMode === 'grid'}
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                  className={`px-2 py-1 text-xs cursor-pointer border-none transition ${
                    viewMode === 'grid'
                      ? isLight
                        ? 'bg-orange-600 text-white'
                        : 'bg-[var(--theme-primary)] text-[#262129]'
                      : 'bg-[var(--theme-cardBg)] text-[var(--theme-textMuted)] hover:text-[var(--theme-text)]'
                  }`}
                >
                  <FontAwesomeIcon icon={faTableCellsLarge} className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === 'carousel'}
                  onClick={() => setViewMode('carousel')}
                  title="Carousel view"
                  className={`px-2 py-1 text-xs cursor-pointer border-none transition ${
                    viewMode === 'carousel'
                      ? isLight
                        ? 'bg-orange-600 text-white'
                        : 'bg-[var(--theme-primary)] text-[#262129]'
                      : 'bg-[var(--theme-cardBg)] text-[var(--theme-textMuted)] hover:text-[var(--theme-text)]'
                  }`}
                >
                  <FontAwesomeIcon icon={faRectangleList} className="w-3 h-3" />
                </button>
              </div>
              {viewMode === 'carousel' && (
                <button
                  type="button"
                  aria-pressed={randomize}
                  onClick={toggleRandomize}
                  title={randomize ? 'Shuffle: on (click to disable)' : 'Shuffle carousel order'}
                  className={`px-2 py-1 text-xs rounded-md cursor-pointer border transition ${
                    randomize
                      ? isLight
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-[var(--theme-primary)] text-[#262129] border-[var(--theme-primary)]'
                      : 'bg-[var(--theme-cardBg)] text-[var(--theme-textMuted)] border-[var(--theme-border)] hover:text-[var(--theme-text)]'
                  }`}
                >
                  <FontAwesomeIcon icon={faShuffle} className="w-3 h-3" />
                </button>
              )}
              <label htmlFor="subreddit-switcher" className="sr-only">
                Choose subreddit
              </label>
              <select
                id="subreddit-switcher"
                value={selectedFeed}
                onChange={handleSubredditSelect}
                className="px-2 py-1 rounded-md text-xs border border-[var(--theme-border)] bg-[var(--theme-cardBg)] text-[var(--theme-text)] cursor-pointer"
              >
                <option value="top">Top</option>
                <option value="news">News</option>
                {SUBREDDIT_OPTIONS.map((subreddit) => (
                  <option key={subreddit} value={subreddit}>
                    r/{subreddit}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Posts */}
      {visiblePosts.length > 0 ? (
        viewMode === 'grid' ? (
          <MagazineGrid
            posts={visiblePosts}
            onPostClick={handlePostClick}
            onSkipPost={handleSkipPost}
          />
        ) : (
          <NewsCarousel
            posts={carouselPosts}
            onPostClick={handlePostClick}
            onSkipPost={handleSkipPost}
            onVisibleRangeChange={handleVisibleRange}
          />
        )
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
