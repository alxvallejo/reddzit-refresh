import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import SavedFeed from './SavedFeed';
import TopFeed from './TopFeed';
import ForYouFeed from './ForYouFeed';
import TrendingMarquee from './TrendingMarquee';
import DailyService from '../helpers/DailyService';
import MainHeader from './MainHeader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

type Tab = 'top' | 'saved' | 'foryou' | 'stories' | 'quotes';

// Derive active tab from URL path
const getTabFromPath = (pathname: string): Tab => {
  if (pathname === '/reddit' || pathname === '/saved') return 'saved';
  if (pathname === '/foryou') return 'foryou';
  if (pathname.startsWith('/stories')) return 'stories';
  if (pathname.startsWith('/quotes')) return 'quotes';
  return 'top';
};

const AppShell = () => {
  const { signedIn, redirectForAuth } = useReddit();
  const location = useLocation();
  const activeTab = getTabFromPath(location.pathname);
  const [email, setEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showPageTitle, setShowPageTitle] = useState(false);
  const [showBanner, setShowBanner] = useState(() => {
    return localStorage.getItem('hideDailyBanner') !== 'true';
  });

  const pageTitles: Record<Tab, string> = {
    top: 'Top Posts on Reddit',
    saved: 'Saved Posts',
    foryou: 'For You',
    stories: 'Stories',
    quotes: 'Quotes',
  };

  useEffect(() => {
    setShowPageTitle(false);
    const header = document.getElementById('page-header');
    if (!header) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowPageTitle(!entry.isIntersecting),
      { rootMargin: '-64px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(header);
    return () => observer.disconnect();
  }, [activeTab]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || subscribeStatus === 'loading') return;
    
    setSubscribeStatus('loading');
    try {
      await DailyService.subscribe(email, [], 'header_banner');
      setSubscribeStatus('success');
      DailyService.trackEngagement('SUBSCRIBE_CLICK', { placement: 'header_banner' });
    } catch (err) {
      setSubscribeStatus('error');
    }
  };

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('hideDailyBanner', 'true');
  };

  return (
    <div
      className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]"
      style={{
        backgroundColor: 'var(--theme-bg)',
        color: 'var(--theme-text)'
      } as React.CSSProperties}
    >
      {/* Header */}
      <MainHeader pageTitle={showPageTitle ? pageTitles[activeTab] : undefined} />

      {/* Content */}
      <main>
        {activeTab === 'saved' && <SavedContent />}
        {activeTab === 'top' && <TopContent />}
        {activeTab === 'foryou' && <ForYouContent />}
      </main>

      {/* Subscribe Banner - Fixed at bottom */}
      {showBanner && subscribeStatus !== 'success' && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40"
          style={{
            background: 'var(--theme-bannerBg)',
            color: 'var(--theme-bannerText)'
          }}
        >
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm font-medium">
                Get a daily pulse delivered to you every morning
              </p>
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <form onSubmit={handleSubscribe} className="flex gap-2 flex-1">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg text-sm border-none focus:outline-none focus:ring-2 focus:ring-white/50 min-w-0 placeholder:text-[var(--theme-bannerInputPlaceholder)]"
                    style={{
                      backgroundColor: 'var(--theme-bannerInputBg)',
                      color: 'var(--theme-bannerInputText)'
                    }}
                    disabled={subscribeStatus === 'loading'}
                  />
                  <button
                    type="submit"
                    disabled={subscribeStatus === 'loading'}
                    className="px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-colors border-none cursor-pointer disabled:opacity-70 whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--theme-bannerButtonBg)',
                      color: 'var(--theme-bannerButtonText)'
                    }}
                  >
                    {subscribeStatus === 'loading' ? '...' : 'Subscribe'}
                  </button>
                </form>
                <button
                  onClick={dismissBanner}
                  className="opacity-80 hover:opacity-100 p-1 border-none bg-transparent cursor-pointer"
                  style={{ color: 'var(--theme-bannerText)' }}
                  aria-label="Dismiss"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            </div>
            {subscribeStatus === 'error' && (
              <p className="text-xs mt-1" style={{ color: 'var(--theme-bannerErrorText)' }}>Something went wrong. Please try again.</p>
            )}
          </div>
        </div>
      )}

      {/* Success Banner - Fixed at bottom */}
      {subscribeStatus === 'success' && showBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-green-500 text-white">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <p className="text-sm font-medium">✓ You're subscribed! Check your inbox tomorrow morning.</p>
            <button
              onClick={dismissBanner}
              className="text-white/80 hover:text-white p-1 border-none bg-transparent cursor-pointer"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Saved Posts content (requires login)
const SavedContent = () => {
  const { signedIn, redirectForAuth } = useReddit();
  const { isLight } = useTheme();

  if (!signedIn) {
    return (
      <>
        <TrendingMarquee />
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="text-6xl mb-6">🔖</div>
          <h2 className="text-2xl font-bold mb-3 text-[var(--theme-text)]">Your Saved Posts</h2>
          <p className="mb-8 max-w-md text-[var(--theme-textMuted)]">
            Connect your Reddit account to view and manage your saved posts in a clean, distraction-free interface.
          </p>
          <button
            onClick={redirectForAuth}
            className={`px-6 py-3 rounded-full font-semibold transition-colors border-none cursor-pointer shadow-lg bg-[var(--theme-primary)] ${
              isLight
                ? 'text-white hover:bg-orange-700'
                : 'text-[#262129] hover:opacity-90'
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
      <SavedFeed />
    </>
  );
};

// Top Posts content (no login required)
const TopContent = () => {
  return (
    <>
      <TrendingMarquee />
      <TopFeed />
    </>
  );
};

// For You content (requires login)
const ForYouContent = () => {
  const { signedIn, redirectForAuth } = useReddit();
  const { isLight } = useTheme();

  if (!signedIn) {
    return (
      <>
        <TrendingMarquee />
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="text-6xl mb-6">✨</div>
          <h2 className="text-2xl font-bold mb-3 text-[var(--theme-text)]">For You</h2>
          <p className="mb-8 max-w-md text-[var(--theme-textMuted)]">
            Connect your Reddit account to get personalized content recommendations based on your interests.
          </p>
          <button
            onClick={redirectForAuth}
            className={`px-6 py-3 rounded-full font-semibold transition-colors border-none cursor-pointer shadow-lg bg-[var(--theme-primary)] ${
              isLight
                ? 'text-white hover:bg-orange-700'
                : 'text-[#262129] hover:opacity-90'
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

export default AppShell;
