import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import DailyService, { TrendingPost } from '../helpers/DailyService';

const SPEED_OPTIONS = [
  { label: '1x', duration: 90 },
  { label: '2x', duration: 60 },
  { label: '3x', duration: 30 },
];

const TrendingMarquee = () => {
  const { themeName } = useTheme();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [speedIndex, setSpeedIndex] = useState(() => {
    const saved = localStorage.getItem('rdz_marquee_speed');
    return saved ? Number(saved) : 1;
  });

  const cycleSpeed = () => {
    setSpeedIndex(prev => {
      const next = (prev + 1) % SPEED_OPTIONS.length;
      localStorage.setItem('rdz_marquee_speed', String(next));
      return next;
    });
  };

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
          <div
            className="animate-marquee flex whitespace-nowrap py-2"
            style={{ animationDuration: `${SPEED_OPTIONS[speedIndex].duration}s` }}
          >
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
                <span>{post.title}</span>
                <span className={`mx-4 ${themeName === 'light' ? 'text-gray-300' : 'text-gray-600'}`}>•</span>
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={cycleSpeed}
          title="Marquee speed"
          className={`flex-shrink-0 ml-2 px-2 py-1 text-xs rounded transition-colors cursor-pointer border-none ${
            themeName === 'light'
              ? 'text-gray-400 hover:text-gray-600 bg-transparent'
              : 'text-gray-500 hover:text-gray-300 bg-transparent'
          }`}
        >
          {SPEED_OPTIONS[speedIndex].label}
        </button>
      </div>
    </div>
  );
};

export default TrendingMarquee;
