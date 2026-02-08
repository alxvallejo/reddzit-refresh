import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import DailyService, { TrendingPost } from '../helpers/DailyService';
import { getDisplayTitle } from '../helpers/RedditUtils';

const DISPLAY_DURATION = 4000; // How long each post is visible (ms)
const FADE_DURATION = 500; // Fade transition duration (ms)
const MOBILE_BREAKPOINT = 640; // Matches sm: breakpoint / CSS media query

const TrendingMarquee = () => {
  const { isLight } = useTheme();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    DailyService.getTrendingRSS().then(setPosts);
  }, []);

  const goToNext = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % posts.length);
      setIsVisible(true);
    }, FADE_DURATION);
  }, [posts.length]);

  const goToPrev = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + posts.length) % posts.length);
      setIsVisible(true);
    }, FADE_DURATION);
  }, [posts.length]);

  useEffect(() => {
    if (posts.length === 0 || isPaused || isMobile) return;

    const interval = setInterval(goToNext, DISPLAY_DURATION);
    return () => clearInterval(interval);
  }, [posts.length, isPaused, isMobile, goToNext]);

  const handlePostClick = (post: TrendingPost) => {
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
      window.open(post.link, '_blank');
    }
  };

  if (posts.length === 0) return null;

  const currentPost = posts[currentIndex];
  const marqueeItems = [...posts, ...posts, ...posts];

  return (
    <div
      className="overflow-hidden border-b sticky top-16 z-40 bg-[var(--theme-bgSecondary)] border-[var(--theme-border)]"
      style={{ backgroundColor: 'var(--theme-headerBg)' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto pr-4 flex items-center">
        <div
          className={`flex-shrink-0 px-4 py-2 pr-6 font-bold text-xs uppercase tracking-wider ${
            isLight ? 'text-white' : 'text-[#262129]'
          }`}
          style={{
            backgroundColor: 'var(--theme-primary)',
            clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 100%, 0 100%)',
          }}
        >
          Trending
        </div>

        {isMobile ? (
          /* Mobile: scrolling marquee */
          <div className="overflow-hidden flex-1 py-2">
            <div className="animate-marquee flex items-center whitespace-nowrap">
              {marqueeItems.map((post, i) => (
                <button
                  key={`${post.id}-${i}`}
                  onClick={() => handlePostClick(post)}
                  className={`inline-flex items-center text-sm cursor-pointer bg-transparent border-none flex-shrink-0 ${
                    isLight ? 'text-gray-700' : 'text-gray-300'
                  }`}
                >
                  <span className="mr-2 text-xs font-bold text-[var(--theme-primary)]">
                    r/{post.subreddit}
                  </span>
                  <span>{getDisplayTitle(post)}</span>
                  <span className="mx-4 text-[var(--theme-primary)] opacity-50">&bull;</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Desktop: fade carousel with arrows */
          <>
            <button
              onClick={goToPrev}
              className={`flex-shrink-0 ml-2 p-1 transition-colors cursor-pointer border-none bg-transparent ${
                isLight ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-300'
              }`}
              title="Previous"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="overflow-hidden flex-1 py-2">
              <button
                onClick={() => handlePostClick(currentPost)}
                className={`flex items-center text-sm hover:underline cursor-pointer bg-transparent border-none transition-opacity duration-500 ${
                  isLight ? 'text-gray-700 hover:text-orange-600' : 'text-gray-300 hover:text-[var(--theme-primary)]'
                }`}
                style={{ opacity: isVisible ? 1 : 0 }}
              >
                <span className="mr-2 text-xs font-bold text-[var(--theme-primary)]">
                  r/{currentPost.subreddit}
                </span>
                <span className="truncate">{getDisplayTitle(currentPost)}</span>
              </button>
            </div>

            <button
              onClick={goToNext}
              className={`flex-shrink-0 p-1 transition-colors cursor-pointer border-none bg-transparent ${
                isLight ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-300'
              }`}
              title="Next"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <span className={`flex-shrink-0 ml-2 text-xs tabular-nums ${
              isLight ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {currentIndex + 1}/{posts.length}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default TrendingMarquee;
