import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import ThemeSwitcher from './ThemeSwitcher';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faUser, faCoffee, faSignOutAlt, faQuoteLeft, faBookOpen, faPenNib, faArrowUp, faBookmark, faBinoculars } from '@fortawesome/free-solid-svg-icons';

type Tab = 'top' | 'saved' | 'foryou' | 'stories' | 'quotes' | null;

const getTabFromPath = (pathname: string): Tab => {
  if (pathname === '/reddit' || pathname === '/saved') return 'saved';
  if (pathname === '/foryou') return 'foryou';
  if (pathname.startsWith('/stories')) return 'stories';
  if (pathname.startsWith('/quotes')) return 'quotes';
  if (pathname === '/' || pathname === '/top') return 'top';
  return null;
};

interface MainHeaderProps {
  pageTitle?: string;
}

export default function MainHeader({ pageTitle }: MainHeaderProps) {
  const { signedIn, user, logout, redirectForAuth } = useReddit();
  const { themeName } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = getTabFromPath(location.pathname);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const tabClass = (tab: Tab) =>
    `px-3 sm:px-4 py-2 text-sm font-medium transition-colors border-0 border-b-2 cursor-pointer whitespace-nowrap ${
      themeName === 'light'
        ? activeTab === tab
          ? 'border-orange-500 text-orange-700'
          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900 bg-transparent'
        : activeTab === tab
          ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]'
          : 'border-transparent text-gray-400 hover:border-white/40 hover:text-white bg-transparent'
    }`;

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-md ${
        themeName === 'light'
          ? 'bg-white border-b border-gray-200'
          : 'border-b'
      }`}
      style={themeName === 'light' ? undefined : ({
        backgroundColor: 'var(--theme-headerBg)',
        borderColor: 'var(--theme-border)'
      } as React.CSSProperties)}
    >
      {/* Page title (shown when page header scrolls out of view) */}
      {pageTitle && (
        <div className="absolute left-0 right-0 top-0 h-16 hidden md:flex items-center pointer-events-none">
          <div className={`max-w-7xl mx-auto pl-14 pr-4 w-full ${themeName === 'light' ? 'text-gray-900' : ''}`}>
            <span className="text-xl font-thin" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              {pageTitle}
            </span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-1 sm:px-4">
        <div className="flex items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0 no-underline">
            <img src="/favicon.png" alt="Reddzit" className="w-8 h-8" />
            <span className={`font-serif text-xl font-bold hidden sm:block ${pageTitle ? 'md:hidden' : ''} ${themeName === 'light' ? 'text-gray-900' : ''}`}>
              Reddzit
            </span>
          </Link>

          {/* Tabs */}
          <nav className="flex flex-1 justify-evenly sm:justify-end sm:flex-none sm:gap-1 sm:ml-auto sm:mr-48">
            <button onClick={() => navigate('/top')} className={tabClass('top')}>
              <FontAwesomeIcon icon={faArrowUp} />
            </button>
            <button onClick={() => navigate('/reddit')} className={tabClass('saved')}>
              <FontAwesomeIcon icon={faBookmark} />
            </button>
            <button onClick={() => navigate('/foryou')} className={tabClass('foryou')}>
              <FontAwesomeIcon icon={faBinoculars} />
            </button>
            <button onClick={() => navigate('/stories')} className={tabClass('stories')}>
              <FontAwesomeIcon icon={faPenNib} />
            </button>
            <button onClick={() => navigate('/quotes')} className={tabClass('quotes')}>
              <FontAwesomeIcon icon={faQuoteLeft} />
            </button>

            {/* Theme & user inline on mobile, absolute on desktop */}
            <div className="flex items-center sm:hidden">
              <ThemeSwitcher />
            </div>
            <div className="flex items-center sm:hidden">
              {signedIn && user ? (
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center gap-1 px-2 py-2 rounded-lg transition-colors border-none cursor-pointer bg-transparent ${
                    themeName === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-200 hover:bg-white/10'
                  }`}
                >
                  <FontAwesomeIcon icon={faUser} className="text-sm" />
                  <FontAwesomeIcon icon={faChevronDown} className={`text-xs transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <button
                  onClick={redirectForAuth}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border-none cursor-pointer ${
                    themeName === 'light'
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
                  }`}
                >
                  Log in
                </button>
              )}
            </div>
          </nav>
        </div>
      </div>

      {/* Right-side controls - desktop only */}
      <div className="absolute right-0 left-0 top-0 h-16 hidden sm:flex items-center pointer-events-none">
        <div className="max-w-7xl mx-auto px-4 w-full flex justify-end gap-2">
          <div className="pointer-events-auto">
            <ThemeSwitcher />
          </div>

          {/* User Menu / Login - desktop */}
          <div className="pointer-events-auto">
            {signedIn && user ? (
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border-none cursor-pointer bg-transparent ${
                  themeName === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-200 hover:bg-white/10'
                }`}
              >
                <span className="font-medium text-sm max-w-[120px] truncate">u/{user.name}</span>
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`text-xs transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                />
              </button>
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
      </div>

      {/* User dropdown menu - shared between mobile and desktop */}
      {showUserMenu && signedIn && user && (
        <div className={`absolute right-4 top-full mt-0 w-52 rounded-xl shadow-xl py-2 border z-50 ${
          themeName === 'light'
            ? 'bg-white border-gray-100'
            : 'bg-[var(--theme-bgSecondary)] border-[var(--theme-border)]'
        }`}>
          <a
            href={`https://www.reddit.com/user/${user.name}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 px-4 py-2.5 text-sm no-underline ${
              themeName === 'light' ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/10 text-gray-200'
            }`}
          >
            <FontAwesomeIcon icon={faUser} className="w-4 text-gray-400" />
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
    </header>
  );
}
