import { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import SavedFeed from './SavedFeed';
import LinksFeed from './LinksFeed';
import TopFeed from './TopFeed';
import ForYouFeed from './ForYouFeed';
import MainHeader from './MainHeader';
import Footer from './Footer';

type Tab = 'top' | 'saved' | 'foryou' | 'stories' | 'quotes' | 'links';

// Derive active tab from URL path
const getTabFromPath = (pathname: string): Tab => {
  if (pathname === '/reddit' || pathname === '/saved') return 'saved';
  if (pathname === '/foryou') return 'foryou';
  if (pathname === '/links') return 'links';
  if (pathname.startsWith('/stories')) return 'stories';
  if (pathname.startsWith('/quotes')) return 'quotes';
  return 'top';
};

const AppShell = () => {
  const { signedIn, redirectForAuth } = useReddit();
  const location = useLocation();
  const activeTab = getTabFromPath(location.pathname);
  const [showPageTitle, setShowPageTitle] = useState(false);

  const feedMatch = location.pathname.match(/^\/feed\/([a-z0-9_]+)$/i);
  const isNewsView = location.pathname === '/news' || location.pathname === '/';
  const pageTitles: Record<Tab, string> = {
    top: isNewsView
      ? 'Top News'
      : feedMatch
        ? `r/${feedMatch[1].toLowerCase()}`
        : 'Top Posts on Reddit',
    saved: 'Saved Posts',
    foryou: 'For You',
    links: 'Links',
    stories: 'Stories',
    quotes: 'Quotes',
  };

  useEffect(() => {
    setShowPageTitle(false);
    const header = document.getElementById('page-header');
    if (!header) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowPageTitle(!entry.isIntersecting),
      { rootMargin: '-100px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(header);
    return () => observer.disconnect();
  }, [activeTab]);

  return (
    <div
      className="min-h-screen flex flex-col bg-[var(--theme-bg)] text-[var(--theme-text)]"
      style={{
        backgroundColor: 'var(--theme-bg)',
        color: 'var(--theme-text)'
      } as React.CSSProperties}
    >
      {/* Header */}
      <MainHeader pageTitle={showPageTitle ? pageTitles[activeTab] : undefined} />

      {/* Content */}
      <main className="flex-1">
        {activeTab === 'saved' && <SavedContent />}
        {activeTab === 'top' && <TopContent />}
        {activeTab === 'foryou' && <ForYouContent />}
        {activeTab === 'links' && <LinksContent />}
      </main>

      {/* Footer with feedback */}
      <Footer />
    </div>
  );
};

// Saved Posts content (requires login)
type SavedSubTab = 'reddit' | 'links';

const SavedContent = () => {
  const { signedIn, redirectForAuth } = useReddit();
  const { isLight } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSubTab: SavedSubTab = searchParams.get('tab') === 'links' ? 'links' : 'reddit';

  const setActiveSubTab = (tab: SavedSubTab) => {
    if (tab === 'reddit') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', tab);
    }
    setSearchParams(searchParams, { replace: true });
  };

  if (!signedIn) {
    return (
      <>
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

  const subTabClass = (tab: SavedSubTab) =>
    `px-4 py-2 text-sm font-medium rounded-full transition-colors border-none cursor-pointer ${
      activeSubTab === tab
        ? isLight
          ? 'bg-orange-600 text-white'
          : 'bg-[var(--theme-primary)] text-[#262129]'
        : isLight
          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          : 'bg-white/10 text-gray-400 hover:bg-white/20'
    }`;

  return (
    <>
      {/* Sub-tab bar */}
      <div className="max-w-screen-2xl mx-auto px-4 pt-2">
        <div className="flex gap-2">
          <button onClick={() => setActiveSubTab('reddit')} className={subTabClass('reddit')}>
            Reddit
          </button>
          <button onClick={() => setActiveSubTab('links')} className={subTabClass('links')}>
            Links
          </button>
        </div>
      </div>
      {activeSubTab === 'reddit' ? <SavedFeed /> : <LinksFeed />}
    </>
  );
};

// Top Posts content (no login required)
const TopContent = () => {
  return (
    <>
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
      <ForYouFeed />
    </>
  );
};

// Links content (requires login)
const LinksContent = () => {
  const { signedIn, redirectForAuth } = useReddit();
  const { isLight } = useTheme();

  if (!signedIn) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="text-6xl mb-6">🔗</div>
          <h2 className="text-2xl font-bold mb-3 text-[var(--theme-text)]">Saved Links</h2>
          <p className="mb-8 max-w-md text-[var(--theme-textMuted)]">
            Connect your Reddit account to save and read links from anywhere.
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
      <LinksFeed />
    </>
  );
};

export default AppShell;
