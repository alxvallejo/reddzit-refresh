import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import DailyService, { TrendingPost } from '../helpers/DailyService';
import { getDisplayTitle } from '../helpers/RedditUtils';

const TopFeed = () => {
  const { isLight } = useTheme();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadTopPosts();
  }, []);

  const loadTopPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await DailyService.getTrendingRSS();
      setPosts(data);
    } catch (err) {
      setError('Failed to load top posts');
    } finally {
      setLoading(false);
    }
  };

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

  const formatTimeAgo = (dateString: string | undefined) => {
    if (!dateString) return '';
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-[var(--theme-textMuted)]">
        <div className="animate-pulse text-xl">Loading Top Posts...</div>
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
          <div className="flex items-center justify-between py-4 pl-4 pr-4">
            <h1 className="text-2xl font-bold text-[var(--theme-text)]">
              Top Posts on Reddit
            </h1>
            <span className="text-xs whitespace-nowrap text-[var(--theme-textMuted)]">
              {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              {' '}
              {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </header>

      {/* Posts Grid */}
      {posts.length > 0 ? (
        <main className="max-w-7xl mx-auto px-4 pt-4 pb-24 grid grid-cols-1 md:grid-cols-2 gap-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className={`group relative p-4 rounded-xl transition cursor-pointer border bg-[var(--theme-cardBg)] border-[var(--theme-border)] ${
                isLight ? 'hover:border-orange-600' : 'hover:border-[var(--theme-primary)]'
              }`}
              onClick={() => handlePostClick(post)}
            >
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-normal text-[var(--theme-primary)]">
                  r/{post.subreddit}
                </span>
                <span className="text-xs text-[var(--theme-textMuted)]">
                  {formatTimeAgo(post.pubDate)}
                </span>
              </div>

              <h2 className="font-light text-base my-2 leading-tight text-[var(--theme-text)]">
                {getDisplayTitle(post)}
              </h2>

              {post.author && (
                <div className="text-xs text-[var(--theme-textMuted)]">
                  u/{post.author}
                </div>
              )}
            </article>
          ))}
        </main>
      ) : (
        <div className="py-24 text-center text-[var(--theme-textMuted)]">
          <p className="text-xl">No top posts available yet.</p>
          <p className="text-sm mt-2">Check back soon!</p>
        </div>
      )}
    </div>
  );
};

export default TopFeed;
