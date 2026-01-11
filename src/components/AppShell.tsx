import { useState } from 'react';
import { useReddit } from '../context/RedditContext';
import DailyPulse from './DailyPulse';
import SavedFeed from './SavedFeed';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faUser, faCoffee, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

type Tab = 'daily' | 'saved';

interface AppShellProps {
  defaultTab?: Tab;
}

const AppShell = ({ defaultTab = 'daily' }: AppShellProps) => {
  const { signedIn, user, loading, logout, redirectForAuth } = useReddit();
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <div className="min-h-screen bg-[#fcfcfc]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <img src="/favicon.png" alt="Reddzit" className="w-8 h-8" />
              <span className="font-serif text-xl font-bold text-gray-900">Reddzit</span>
            </div>

            {/* Tabs */}
            <nav className="flex gap-1">
              <button
                onClick={() => setActiveTab('daily')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border-none cursor-pointer ${
                  activeTab === 'daily'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-100 bg-transparent'
                }`}
              >
                Daily Pulse
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border-none cursor-pointer ${
                  activeTab === 'saved'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-100 bg-transparent'
                }`}
              >
                Saved Posts
              </button>
            </nav>

            {/* User Menu / Login */}
            {signedIn && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors border-none cursor-pointer bg-transparent"
                >
                  <span className="font-medium text-sm max-w-[120px] truncate">u/{user.name}</span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`text-xs transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                  />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl py-2 border border-gray-100 z-50">
                    <a
                      href={`https://www.reddit.com/user/${user.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 no-underline"
                    >
                      <FontAwesomeIcon icon={faUser} className="w-4 text-gray-400" />
                      Reddit Profile
                    </a>
                    <a
                      href="https://www.buymeacoffee.com/reddzit"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 no-underline"
                    >
                      <FontAwesomeIcon icon={faCoffee} className="w-4 text-gray-400" />
                      Buy me a coffee
                    </a>
                    <hr className="my-2 border-gray-100" />
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-red-600 text-sm text-left border-none bg-transparent cursor-pointer"
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
                className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors border-none cursor-pointer"
              >
                Log in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main>
        {activeTab === 'daily' ? (
          <DailyPulseContent />
        ) : (
          <SavedContent />
        )}
      </main>
    </div>
  );
};

// Simplified Daily Pulse (without its own header)
const DailyPulseContent = () => {
  return <DailyPulse embedded />;
};

// Saved Posts content (requires login)
const SavedContent = () => {
  const { signedIn, redirectForAuth } = useReddit();

  if (!signedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="text-6xl mb-6">🔖</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Your Saved Posts</h2>
        <p className="text-gray-600 mb-8 max-w-md">
          Connect your Reddit account to view and manage your saved posts in a clean, distraction-free interface.
        </p>
        <button
          onClick={redirectForAuth}
          className="bg-orange-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-orange-700 transition-colors border-none cursor-pointer shadow-lg"
        >
          Connect with Reddit
        </button>
      </div>
    );
  }

  return <SavedFeed />;
};

export default AppShell;
