import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useReddit } from '../context/RedditContext';
import ForYouService, { Persona, SubredditWeight } from '../helpers/ForYouService';

const SUBREDDITS_DISPLAY_LIMIT = 20;
const RECOMMENDED_SUBREDDITS_LIMIT = 10;

const ForYouSettings = () => {
  const { themeName } = useTheme();
  const { signedIn, redirectForAuth, accessToken } = useReddit();

  const token = accessToken || '';

  // Ref to track component mount state for async cleanup
  const isMounted = useRef(true);
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // State
  const [persona, setPersona] = useState<Persona | null>(null);
  const [personaRefreshedAt, setPersonaRefreshedAt] = useState<string | null>(null);
  const [subreddits, setSubreddits] = useState<SubredditWeight[]>([]);
  const [recommendedSubreddits, setRecommendedSubreddits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingPersona, setRefreshingPersona] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data: persona and settings in parallel
  const loadData = useCallback(async () => {
    if (!token) {
      if (isMounted.current) setLoading(false);
      return;
    }

    if (isMounted.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const [personaResult, settingsResult] = await Promise.all([
        ForYouService.getPersona(token),
        ForYouService.getSettings(token),
      ]);

      if (isMounted.current) {
        setPersona(personaResult.persona);
        setPersonaRefreshedAt(personaResult.lastRefreshedAt);
        setSubreddits(settingsResult.subreddits);
        setRecommendedSubreddits(settingsResult.recommendedSubreddits);
      }
    } catch (err) {
      console.error('Failed to load settings data:', err);
      if (isMounted.current) {
        setError('Failed to load settings. Please try again.');
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [token]);

  // Load data on mount
  useEffect(() => {
    if (signedIn) {
      loadData();
    } else {
      if (isMounted.current) setLoading(false);
    }
  }, [signedIn, loadData]);

  // Refresh persona
  const handleRefreshPersona = async () => {
    if (!token) return;

    if (isMounted.current) {
      setRefreshingPersona(true);
      setError(null);
    }

    try {
      const result = await ForYouService.refreshPersona(token);
      if (isMounted.current) {
        setPersona(result.persona);
        setPersonaRefreshedAt(result.lastRefreshedAt);
      }

      // After setting persona, reload settings but don't fail the whole operation
      try {
        const settingsResult = await ForYouService.getSettings(token);
        if (isMounted.current) {
          setSubreddits(settingsResult.subreddits);
          setRecommendedSubreddits(settingsResult.recommendedSubreddits);
        }
      } catch (settingsErr) {
        console.error('Failed to reload settings after persona refresh:', settingsErr);
        // Don't set error state - persona was successfully refreshed
      }
    } catch (err) {
      console.error('Failed to refresh persona:', err);
      if (isMounted.current) {
        setError('Failed to refresh persona. Please try again.');
      }
    } finally {
      if (isMounted.current) setRefreshingPersona(false);
    }
  };

  // Toggle subreddit star
  const handleToggleStar = async (subreddit: string, currentStarred: boolean) => {
    if (!token) return;

    try {
      await ForYouService.toggleSubredditStar(token, subreddit, !currentStarred);
      if (isMounted.current) {
        setSubreddits(prev =>
          prev.map(sub =>
            sub.name === subreddit ? { ...sub, starred: !currentStarred } : sub
          )
        );
      }
    } catch (err) {
      console.error('Failed to toggle star:', err);
      if (isMounted.current) {
        setError('Failed to update subreddit. Please try again.');
      }
    }
  };

  // Format time ago
  const formatTimeAgo = (utcString: string | null) => {
    if (!utcString) return '';
    const seconds = Math.floor((Date.now() - new Date(utcString).getTime()) / 1000);
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Not signed in
  if (!signedIn) {
    return (
      <div className={`py-24 text-center ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>
        <p className="text-xl mb-4">Sign in to access your settings</p>
        <button
          onClick={() => redirectForAuth()}
          className={`px-6 py-3 rounded-full font-semibold transition ${
            themeName === 'light'
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
          }`}
        >
          Sign In with Reddit
        </button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={`py-24 text-center ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>
        <div className="animate-pulse text-xl">Loading Settings...</div>
      </div>
    );
  }

  return (
    <div className="font-sans">
      {/* Header */}
      <header className="px-4 pb-2">
        <div className={`max-w-4xl mx-auto border-b-2 ${
          themeName === 'light' ? 'border-gray-900' : 'border-white/20'
        }`}>
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <Link
                to="/foryou"
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  themeName === 'light'
                    ? 'text-gray-600 hover:bg-gray-100'
                    : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                &larr; Back
              </Link>
              <h1 className={`text-2xl font-bold ${themeName === 'light' ? 'text-gray-900' : ''}`}>
                For You Settings
              </h1>
            </div>
            <button
              onClick={handleRefreshPersona}
              disabled={refreshingPersona}
              className={`text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                themeName === 'light'
                  ? 'text-orange-600 hover:bg-orange-50'
                  : 'text-[var(--theme-primary)] hover:bg-white/10'
              }`}
            >
              {refreshingPersona ? <span className="animate-spin inline-block">&#8987;</span> : 'Refresh Persona'}
            </button>
          </div>
        </div>
      </header>

      {/* Error display */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="p-4 rounded-lg bg-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Refreshing persona notice */}
      {refreshingPersona && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className={`p-4 rounded-lg ${
            themeName === 'light' ? 'bg-orange-50 text-orange-700' : 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]'
          }`}>
            Refreshing persona... This may take 30-60 seconds.
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Persona Section */}
        {persona && (
          <section className={`p-6 rounded-2xl border ${
            themeName === 'light'
              ? 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200'
              : 'bg-gradient-to-br from-white/5 to-white/10 border-white/10'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-sm font-semibold uppercase tracking-wide ${
                themeName === 'light' ? 'text-orange-600' : 'text-[var(--theme-primary)]'
              }`}>
                Your Persona
              </h2>
              {personaRefreshedAt && (
                <span className={`text-xs ${
                  themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]'
                }`}>
                  Last refreshed: {formatTimeAgo(personaRefreshedAt)}
                </span>
              )}
            </div>

            {/* Keywords */}
            {persona.keywords && persona.keywords.length > 0 && (
              <div className="mb-4">
                <h3 className={`text-xs font-medium mb-2 ${
                  themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'
                }`}>
                  Keywords
                </h3>
                <div className="flex flex-wrap gap-2">
                  {persona.keywords.map((keyword, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-1 rounded-full ${
                        themeName === 'light'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)]'
                      }`}
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Content Preferences */}
            {persona.contentPreferences && persona.contentPreferences.length > 0 && (
              <div>
                <h3 className={`text-xs font-medium mb-2 ${
                  themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'
                }`}>
                  Content Preferences
                </h3>
                <div className="flex flex-wrap gap-2">
                  {persona.contentPreferences.map((pref, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-1 rounded-full ${
                        themeName === 'light'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {pref}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* No Persona State */}
        {!persona && (
          <section className={`p-6 rounded-2xl border text-center ${
            themeName === 'light'
              ? 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200'
              : 'bg-gradient-to-br from-white/5 to-white/10 border-white/10'
          }`}>
            <h2 className={`text-lg font-bold mb-2 ${themeName === 'light' ? 'text-gray-900' : ''}`}>
              No Persona Yet
            </h2>
            <p className={`mb-4 ${themeName === 'light' ? 'text-gray-600' : 'text-[var(--theme-textMuted)]'}`}>
              Build your persona to see your personalized settings.
            </p>
            <button
              onClick={handleRefreshPersona}
              disabled={refreshingPersona}
              className={`px-6 py-3 rounded-full font-semibold transition ${
                refreshingPersona ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                themeName === 'light'
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
              }`}
            >
              {refreshingPersona ? 'Building...' : 'Build Persona'}
            </button>
          </section>
        )}

        {/* Top Subreddits Section */}
        {subreddits.length > 0 && (
          <section className={`p-6 rounded-2xl border ${
            themeName === 'light'
              ? 'bg-white border-slate-200'
              : 'bg-white/5 border-white/10'
          }`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${
              themeName === 'light' ? 'text-orange-600' : 'text-[var(--theme-primary)]'
            }`}>
              Top Subreddits
            </h2>
            <p className={`text-xs mb-4 ${
              themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'
            }`}>
              Star subreddits to boost their priority in your feed.
            </p>
            <div className="space-y-2">
              {subreddits.slice(0, SUBREDDITS_DISPLAY_LIMIT).map((sub) => (
                <div
                  key={sub.name}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    themeName === 'light'
                      ? 'bg-gray-50 hover:bg-gray-100'
                      : 'bg-white/5 hover:bg-white/10'
                  } transition`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleStar(sub.name, sub.starred)}
                      className={`text-xl transition-colors ${
                        sub.starred
                          ? 'text-yellow-500'
                          : themeName === 'light'
                            ? 'text-gray-300 hover:text-yellow-400'
                            : 'text-gray-600 hover:text-yellow-400'
                      }`}
                      title={sub.starred ? 'Remove boost' : 'Boost priority'}
                    >
                      {sub.starred ? '\u2605' : '\u2606'}
                    </button>
                    <span className={`font-medium ${
                      themeName === 'light' ? 'text-gray-900' : ''
                    }`}>
                      r/{sub.name}
                    </span>
                  </div>
                  <span className={`text-xs ${
                    themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]'
                  }`}>
                    {sub.postCount} posts
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* AI Recommended Subreddits Section */}
        {recommendedSubreddits.length > 0 && (
          <section className={`p-6 rounded-2xl border ${
            themeName === 'light'
              ? 'bg-white border-slate-200'
              : 'bg-white/5 border-white/10'
          }`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${
              themeName === 'light' ? 'text-orange-600' : 'text-[var(--theme-primary)]'
            }`}>
              AI Recommended Subreddits
            </h2>
            <p className={`text-xs mb-4 ${
              themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'
            }`}>
              Based on your interests, you might also like these subreddits.
            </p>
            <div className="flex flex-wrap gap-2">
              {recommendedSubreddits.slice(0, RECOMMENDED_SUBREDDITS_LIMIT).map((sub, i) => (
                <span
                  key={i}
                  className={`text-sm px-3 py-1.5 rounded-full ${
                    themeName === 'light'
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  } cursor-pointer transition`}
                >
                  r/{sub}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ForYouSettings;
