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
