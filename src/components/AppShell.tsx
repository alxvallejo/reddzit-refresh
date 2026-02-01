import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import SavedFeed from './SavedFeed';
import TopFeed from './TopFeed';
import ForYouFeed from './ForYouFeed';
import TrendingMarquee from './TrendingMarquee';
import DailyService from '../helpers/DailyService';
import ThemeSwitcher from './ThemeSwitcher';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faUser, faCoffee, faSignOutAlt, faTimes, faQuoteLeft, faBookOpen } from '@fortawesome/free-solid-svg-icons';

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
  const { signedIn, user, loading, logout, redirectForAuth } = useReddit();
  const { themeName } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = getTabFromPath(location.pathname);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showBanner, setShowBanner] = useState(() => {
    return localStorage.getItem('hideDailyBanner') !== 'true';
  });

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
      className={`min-h-screen ${
        themeName === 'light' ? 'bg-[#fcfcfc] text-gray-900' : 'bg-[var(--theme-bg)] text-[var(--theme-text)]'
      }`}
      style={themeName === 'light' ? undefined : ({
        // Provide a fallback for older class-based styles
        backgroundColor: 'var(--theme-bg)',
        color: 'var(--theme-text)'
      } as React.CSSProperties)}
    >
      {/* Header */}
      <header
        className={`sticky top-0 z-50 ${
          themeName === 'light'
            ? 'bg-white border-b border-gray-200'
            : 'border-b'
        }`}
        style={themeName === 'light' ? undefined : ({
          backgroundColor: 'var(--theme-headerBg)',
          borderColor: 'var(--theme-border)'
        } as React.CSSProperties)}
      >
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0 no-underline">
              <img src="/favicon.png" alt="Reddzit" className="w-8 h-8" />
              <span className={`font-serif text-xl font-bold hidden sm:block ${themeName === 'light' ? 'text-gray-900' : ''}`}>
                Reddzit
              </span>
            </Link>

            {/* Tabs */}
            <nav className="flex gap-1 overflow-x-auto px-4 sm:px-0 scrollbar-hide">
              <button
                onClick={() => navigate('/top')}
                className={`px-3 sm:px-4 py-2 text-sm font-medium transition-colors border-0 border-b-2 cursor-pointer whitespace-nowrap ${
                  themeName === 'light'
                    ? activeTab === 'top'
                      ? 'border-orange-500 text-orange-700'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900 bg-transparent'
                    : activeTab === 'top'
                      ? 'border-white text-white'
                      : 'border-transparent text-gray-400 hover:border-white/40 hover:text-white bg-transparent'
                }`}
              >
                Top
              </button>
              <button
                onClick={() => navigate('/reddit')}
                className={`px-3 sm:px-4 py-2 text-sm font-medium transition-colors border-0 border-b-2 cursor-pointer whitespace-nowrap ${
                  themeName === 'light'
                    ? activeTab === 'saved'
                      ? 'border-orange-500 text-orange-700'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900 bg-transparent'
                    : activeTab === 'saved'
                      ? 'border-white text-white'
                      : 'border-transparent text-gray-400 hover:border-white/40 hover:text-white bg-transparent'
                }`}
              >
                Saved
              </button>
              <button
                onClick={() => navigate('/foryou')}
                className={`px-3 sm:px-4 py-2 text-sm font-medium transition-colors border-0 border-b-2 cursor-pointer whitespace-nowrap ${
                  themeName === 'light'
                    ? activeTab === 'foryou'
                      ? 'border-orange-500 text-orange-700'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900 bg-transparent'
                    : activeTab === 'foryou'
                      ? 'border-white text-white'
                      : 'border-transparent text-gray-400 hover:border-white/40 hover:text-white bg-transparent'
                }`}
              >
                New
              </button>
              <button
                onClick={() => navigate('/stories')}
                className={`px-3 sm:px-4 py-2 text-sm font-medium transition-colors border-0 border-b-2 cursor-pointer whitespace-nowrap ${
                  themeName === 'light'
                    ? activeTab === 'stories'
                      ? 'border-orange-500 text-orange-700'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900 bg-transparent'
                    : activeTab === 'stories'
                      ? 'border-white text-white'
                      : 'border-transparent text-gray-400 hover:border-white/40 hover:text-white bg-transparent'
                }`}
              >
                Stories
              </button>
              <button
                onClick={() => navigate('/quotes')}
                className={`px-3 sm:px-4 py-2 text-sm font-medium transition-colors border-0 border-b-2 cursor-pointer whitespace-nowrap ${
                  themeName === 'light'
                    ? activeTab === 'quotes'
                      ? 'border-orange-500 text-orange-700'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900 bg-transparent'
                    : activeTab === 'quotes'
                      ? 'border-white text-white'
                      : 'border-transparent text-gray-400 hover:border-white/40 hover:text-white bg-transparent'
                }`}
              >
                <FontAwesomeIcon icon={faQuoteLeft} className="mr-1.5 text-xs" />
                Quotes
              </button>
            </nav>

            {/* Theme Switcher */}
            <ThemeSwitcher />

            {/* User Menu / Login */}
            {signedIn && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border-none cursor-pointer bg-transparent ${
                    themeName === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-200 hover:bg-white/10'
                  }`}
                >
                  <span className="font-medium text-sm max-w-[120px] truncate hidden sm:block">u/{user.name}</span>
                  <span className="font-medium text-sm sm:hidden"><FontAwesomeIcon icon={faUser} /></span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`text-xs transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                  />
                </button>

                {showUserMenu && (
                  <div className={`absolute right-0 top-full mt-2 w-52 rounded-xl shadow-xl py-2 border z-50 ${
                    themeName === 'light'
                      ? 'bg-white border-gray-100'
                      : 'bg-[#3d3466] border-[#7e87ef]/30'
                  }`}>
                    <a
                      href={`https://www.reddit.com/user/${user.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm no-underline ${
                        themeName === 'light' ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/10 text-gray-200'
                      }`}
                    >
                      <FontAwesomeIcon icon={faUser} className={`w-4 ${themeName === 'light' ? 'text-gray-400' : 'text-gray-400'}`} />
                      Reddit Profile
                    </a>
                    <Link
                      to="/quotes"
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm no-underline ${
                        themeName === 'light' ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/10 text-gray-200'
                      }`}
                      onClick={() => setShowUserMenu(false)}
                    >
                      <FontAwesomeIcon icon={faQuoteLeft} className="w-4 text-gray-400" />
                      Your Quotes
                    </Link>
                    <Link
                      to="/stories"
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm no-underline ${
                        themeName === 'light' ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/10 text-gray-200'
                      }`}
                      onClick={() => setShowUserMenu(false)}
                    >
                      <FontAwesomeIcon icon={faBookOpen} className="w-4 text-gray-400" />
                      Your Stories
                    </Link>
                    <a
                      href="https://www.buymeacoffee.com/reddzit"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm no-underline ${
                        themeName === 'light' ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/10 text-gray-200'
                      }`}
                    >
                      <FontAwesomeIcon icon={faCoffee} className="w-4 text-gray-400" />
                      Buy me a coffee
                    </a>
                    <hr className={`my-2 ${themeName === 'light' ? 'border-gray-100' : 'border-white/10'}`} />
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/20 text-red-400 text-sm text-left border-none bg-transparent cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faSignOutAlt} className="w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={redirectForAuth}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border-none cursor-pointer ${
                  themeName === 'light'
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
                }`}
              >
                Log in
              </button>
            )}
          </div>
        </div>
      </header>

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
  const { themeName } = useTheme();

  if (!signedIn) {
    return (
      <>
        <TrendingMarquee />
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="text-6xl mb-6">🔖</div>
          <h2 className={`text-2xl font-bold mb-3 ${themeName === 'light' ? 'text-gray-900' : ''}`}>Your Saved Posts</h2>
          <p className={`mb-8 max-w-md ${themeName === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
            Connect your Reddit account to view and manage your saved posts in a clean, distraction-free interface.
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

export default AppShell;
