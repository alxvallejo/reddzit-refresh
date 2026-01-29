import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import ThemeSwitcher from './ThemeSwitcher';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faUser, faCoffee, faSignOutAlt, faQuoteLeft, faBookOpen } from '@fortawesome/free-solid-svg-icons';

type Tab = 'top' | 'saved' | 'foryou' | 'stories' | null;

const getTabFromPath = (pathname: string): Tab => {
  if (pathname === '/reddit' || pathname === '/saved') return 'saved';
  if (pathname === '/foryou') return 'foryou';
  if (pathname.startsWith('/stories')) return 'stories';
  if (pathname === '/' || pathname === '/top') return 'top';
  return null;
};

export default function MainHeader() {
  const { signedIn, user, logout, redirectForAuth } = useReddit();
  const { themeName } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = getTabFromPath(location.pathname);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
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
              className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors border-none cursor-pointer whitespace-nowrap ${
                themeName === 'light'
                  ? activeTab === 'top'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-100 bg-transparent'
                  : activeTab === 'top'
                    ? 'bg-white/20 text-white'
                    : 'text-gray-300 hover:bg-white/10 bg-transparent'
              }`}
            >
              Top
            </button>
            <button
              onClick={() => navigate('/reddit')}
              className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors border-none cursor-pointer whitespace-nowrap ${
                themeName === 'light'
                  ? activeTab === 'saved'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-100 bg-transparent'
                  : activeTab === 'saved'
                    ? 'bg-white/20 text-white'
                    : 'text-gray-300 hover:bg-white/10 bg-transparent'
              }`}
            >
              <span className="sm:hidden">Saved</span>
              <span className="hidden sm:inline">Saved Posts</span>
            </button>
            <button
              onClick={() => navigate('/foryou')}
              className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors border-none cursor-pointer whitespace-nowrap ${
                themeName === 'light'
                  ? activeTab === 'foryou'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-100 bg-transparent'
                  : activeTab === 'foryou'
                    ? 'bg-white/20 text-white'
                    : 'text-gray-300 hover:bg-white/10 bg-transparent'
              }`}
            >
              For You
            </button>
            <button
              onClick={() => navigate('/stories')}
              className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors border-none cursor-pointer whitespace-nowrap ${
                themeName === 'light'
                  ? activeTab === 'stories'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-100 bg-transparent'
                  : activeTab === 'stories'
                    ? 'bg-white/20 text-white'
                    : 'text-gray-300 hover:bg-white/10 bg-transparent'
              }`}
            >
              Stories
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
  );
}
