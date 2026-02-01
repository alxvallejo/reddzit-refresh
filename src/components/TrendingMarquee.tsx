import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import DailyService, { TrendingPost } from '../helpers/DailyService';

const TrendingMarquee = () => {
  const { themeName } = useTheme();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<TrendingPost[]>([]);

  useEffect(() => {
    DailyService.getTrendingRSS().then(setPosts);
  }, []);

  const handlePostClick = (post: TrendingPost) => {
    // Extract post ID from Reddit URL (e.g., /r/subreddit/comments/abc123/title/)
    const match = post.link.match(/\/comments\/([a-z0-9]+)\//i);
    if (match) {
      const fullname = `t3_${match[1]}`;
      const slug = post.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 60);
      navigate(`/p/${fullname}/${slug}`);
    } else {
      // Fallback: open Reddit link directly
      window.open(post.link, '_blank');
    }
  };

  if (posts.length === 0) return null;

  // Duplicate posts for seamless loop (2x so -50% translate resets cleanly)
  const duplicatedPosts = [...posts, ...posts];

  return (
    <div className={`overflow-hidden border-b sticky top-16 z-40 ${
      themeName === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'
    }`}
    style={themeName === 'light' ? { backgroundColor: '#fcfcfc' } : { backgroundColor: 'var(--theme-headerBg)' }}
    >
      <div className="max-w-7xl mx-auto pr-4 flex items-center">
        <div
          className={`flex-shrink-0 px-4 py-2 pr-6 font-bold text-xs uppercase tracking-wider ${
            themeName === 'light' ? 'text-white' : 'text-[#262129]'
          }`}
          style={{
            backgroundColor: themeName === 'light' ? '#ea580c' : 'var(--theme-primary)',
            clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 100%, 0 100%)',
          }}
        >
          Trending
        </div>
        <div className="overflow-hidden flex-1">
          <div className="animate-marquee flex whitespace-nowrap py-2">
            {duplicatedPosts.map((post, index) => (
              <button
                key={`${post.id}-${index}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePostClick(post);
                }}
                className={`inline-flex items-center px-4 text-sm hover:underline cursor-pointer bg-transparent border-none ${
                  themeName === 'light' ? 'text-gray-700 hover:text-orange-600' : 'text-gray-300 hover:text-[var(--theme-primary)]'
                }`}
              >
                <span className={`mr-2 text-xs font-bold ${
                  themeName === 'light' ? 'text-orange-600' : 'text-[var(--theme-primary)]'
                }`}>
                  r/{post.subreddit}
                </span>
                <span className="truncate max-w-md">{post.title}</span>
                <span className={`mx-4 ${themeName === 'light' ? 'text-gray-300' : 'text-gray-600'}`}>•</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendingMarquee;
