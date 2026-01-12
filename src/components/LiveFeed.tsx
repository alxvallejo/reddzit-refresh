import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import LiveFeedService, { LivePost, RotatingFeedResponse } from '../helpers/LiveFeedService';

interface LiveFeedProps {
  excludePostIds?: string[];
}

const LiveFeed = ({ excludePostIds = [] }: LiveFeedProps) => {
  const { themeName } = useTheme();
  const navigate = useNavigate();
  const [feed, setFeed] = useState<RotatingFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheKey, setCacheKey] = useState<string>('');
  const [nextRefresh, setNextRefresh] = useState<Date | null>(null);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await LiveFeedService.getRotatingFeed({
        rotate: true,
        count: 6,
        limit: 8,
        excludeIds: excludePostIds,
      });
      setFeed(data);
      setCacheKey(LiveFeedService.getCacheKey());
      
      // Calculate next hour refresh
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      setNextRefresh(nextHour);
    } catch (err) {
      setError('Failed to load feed. Please try again.');
      console.error('LiveFeed error:', err);
    } finally {
      setLoading(false);
    }
  }, [excludePostIds]);

  useEffect(() => {
    fetchFeed();
    
    // Check every minute if we need to refresh (new hour)
    const interval = setInterval(() => {
      if (!LiveFeedService.isCacheValid(cacheKey)) {
        fetchFeed();
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [fetchFeed, cacheKey]);

  const handlePostClick = (post: LivePost) => {
    const slug = post.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60);
    navigate(`/p/${post.fullname}/${slug}`);
  };

  const formatTimeAgo = (utc: number) => {
    const seconds = Math.floor(Date.now() / 1000 - utc);
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const formatScore = (score: number) => {
    if (score >= 1000) return `${(score / 1000).toFixed(1)}k`;
    return String(score);
  };

  if (loading) {
    return (
      <div className={`py-24 text-center ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>
        <div className="animate-pulse text-xl">Discovering fresh content...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-24 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchFeed}
          className={`px-4 py-2 rounded-lg font-medium ${
            themeName === 'light' 
              ? 'bg-orange-600 text-white' 
              : 'bg-[var(--theme-primary)] text-[#262129]'
          }`}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!feed || feed.posts.length === 0) {
    return (
      <div className={`py-24 text-center ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>
        <p className="text-xl mb-2">No posts found</p>
        <p className="text-sm">Check back soon for fresh content.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header with refresh info */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-xl font-bold ${themeName === 'light' ? 'text-gray-900' : ''}`}>
            Discover
          </h2>
          <p className={`text-sm ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>
            Trending from {feed.subreddits.length} subreddits
          </p>
        </div>
        <div className="text-right">
          <button
            onClick={fetchFeed}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              themeName === 'light'
                ? 'text-orange-600 hover:bg-orange-50'
                : 'text-[var(--theme-primary)] hover:bg-white/10'
            }`}
          >
            ↻ Refresh
          </button>
          {nextRefresh && (
            <p className={`text-xs mt-1 ${themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]'}`}>
              Auto-refreshes hourly
            </p>
          )}
        </div>
      </div>

      {/* Subreddit chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {feed.subreddits.map(sub => (
          <span
            key={sub}
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              themeName === 'light'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)]'
            }`}
          >
            r/{sub}
          </span>
        ))}
      </div>

      {/* Posts grid */}
      <div className="space-y-4">
        {feed.posts.map((post) => (
          <article
            key={post.fullname}
            className={`group p-4 rounded-xl cursor-pointer transition ${
              themeName === 'light'
                ? 'bg-white border border-gray-100 hover:shadow-md hover:border-gray-200'
                : 'border hover:bg-white/[0.08]'
            }`}
            style={themeName === 'light' ? undefined : {
              backgroundColor: 'var(--theme-cardBg)',
              borderColor: 'var(--theme-border)'
            }}
            onClick={() => handlePostClick(post)}
          >
            <div className="flex items-start gap-4">
              {/* Thumbnail */}
              {post.thumbnail && post.thumbnail.startsWith('http') && (
                <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={post.thumbnail}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                {/* Meta */}
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className={`text-xs font-bold ${
                    themeName === 'light' ? 'text-orange-600' : 'text-[var(--theme-primary)]'
                  }`}>
                    r/{post.subreddit}
                  </span>
                  <span className={`text-xs ${themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]'}`}>
                    • {formatTimeAgo(post.created_utc)}
                  </span>
                  {!post.is_self && (
                    <span className={`text-xs ${themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]'}`}>
                      • {post.domain}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className={`font-semibold leading-snug mb-2 line-clamp-2 group-hover:underline ${
                  themeName === 'light' ? 'text-gray-900' : ''
                }`}>
                  {post.title}
                </h3>

                {/* Preview text */}
                {post.selftext && (
                  <p className={`text-sm line-clamp-2 mb-2 ${
                    themeName === 'light' ? 'text-gray-600' : 'text-[var(--theme-textMuted)]'
                  }`}>
                    {post.selftext}
                  </p>
                )}

                {/* Stats */}
                <div className={`flex items-center gap-4 text-xs ${
                  themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'
                }`}>
                  <span>↑ {formatScore(post.score)}</span>
                  <span>💬 {post.num_comments}</span>
                  <span>u/{post.author}</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default LiveFeed;
