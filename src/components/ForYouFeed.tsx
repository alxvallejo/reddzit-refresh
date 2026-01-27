import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useReddit } from '../context/RedditContext';
import ForYouService, { ForYouPost, Persona, TriageAction, SubredditSuggestion, Report } from '../helpers/ForYouService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookmark, faEyeSlash } from '@fortawesome/free-regular-svg-icons';
import { faForward } from '@fortawesome/free-solid-svg-icons';

const CURATED_LIMIT = 20;
const SLUG_MAX_LENGTH = 60;
const SUBREDDITS_DISPLAY_LIMIT = 10;
const MIN_POSTS_THRESHOLD = 5; // Refresh feed when posts drop below this

const ForYouFeed = () => {
  const { themeName } = useTheme();
  const { signedIn, redirectForAuth, accessToken } = useReddit();
  const navigate = useNavigate();

  const token = accessToken || '';

  // State
  const [posts, setPosts] = useState<ForYouPost[]>([]);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [personaRefreshedAt, setPersonaRefreshedAt] = useState<string | null>(null);
  const [curatedCount, setCuratedCount] = useState(0);
  const [suggestions, setSuggestions] = useState<SubredditSuggestion[]>([]);
  const [suggestionPool, setSuggestionPool] = useState<SubredditSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingPersona, setRefreshingPersona] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedReport, setCachedReport] = useState<Report | null>(null);
  const [showPersona, setShowPersona] = useState(false);
  const [showWeightsModal, setShowWeightsModal] = useState(false);

  // Load data: persona, feed, and curated count in parallel
  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Sync subscriptions once per day (so suggestions can filter them out)
      const SYNC_CACHE_KEY = 'rdz_subscriptions_synced';
      const lastSync = localStorage.getItem(SYNC_CACHE_KEY);
      const today = new Date().toDateString();

      if (lastSync !== today) {
        ForYouService.syncSubscriptions(token)
          .then(() => localStorage.setItem(SYNC_CACHE_KEY, today))
          .catch(err => console.warn('Failed to sync subscriptions:', err));
      }

      const [personaResult, feedResult, curatedResult, suggestionsResult, reportResult] = await Promise.all([
        ForYouService.getPersona(token),
        ForYouService.getFeed(token),
        ForYouService.getCurated(token),
        ForYouService.getSuggestions(token),
        ForYouService.getReport(token),
      ]);

      setPersona(personaResult.persona);
      setPersonaRefreshedAt(personaResult.lastRefreshedAt);
      setPosts(feedResult.posts);
      setCuratedCount(curatedResult.count);
      // Store full pool and display first 12
      const allSuggestions = suggestionsResult.suggestions;
      setSuggestionPool(allSuggestions);
      setSuggestions(allSuggestions.slice(0, 12));
      setCachedReport(reportResult.report);
    } catch (err) {
      console.error('Failed to load For You data:', err);
      setError('Failed to load personalized feed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load data on mount
  useEffect(() => {
    if (signedIn) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [signedIn, loadData]);

  // Refresh persona and reload feed
  const handleRefreshPersona = async () => {
    if (!token) return;

    setRefreshingPersona(true);
    setError(null);

    // Clear frontend report cache
    ForYouService.clearReportCache();

    try {
      const result = await ForYouService.refreshPersona(token);
      setPersona(result.persona);
      setPersonaRefreshedAt(new Date().toISOString());

      // Reload feed and report with new persona
      const [feedResult, reportResult] = await Promise.all([
        ForYouService.getFeed(token),
        ForYouService.getReport(token, true), // Force refresh
      ]);
      setPosts(feedResult.posts);
      setCachedReport(reportResult.report);
    } catch (err) {
      console.error('Failed to refresh persona:', err);
      setError('Failed to refresh persona. Please try again.');
    } finally {
      setRefreshingPersona(false);
    }
  };

  // Record triage action and remove post from feed
  const handleAction = async (postId: string, action: TriageAction) => {
    if (!token) return;

    try {
      const result = await ForYouService.recordAction(token, postId, action);
      setCuratedCount(result.curatedCount);

      // Remove post and check if we need to refresh
      setPosts(prev => {
        const remaining = prev.filter(p => p.redditPostId !== postId);

        // Auto-refresh when posts run low
        if (remaining.length < MIN_POSTS_THRESHOLD) {
          ForYouService.getFeed(token).then(feedResult => {
            setPosts(feedResult.posts);
          }).catch(console.error);
        }

        return remaining;
      });
    } catch (err) {
      console.error('Failed to record action:', err);
      setError('Failed to save action. Please try again.');
    }
  };

  // Dismiss a suggested subreddit and replace with another from the pool
  const handleDismissSuggestion = async (subredditName: string) => {
    if (!token) return;

    try {
      await ForYouService.dismissSubreddit(token, subredditName);

      // Find a replacement from the pool that's not currently displayed
      const displayedNames = suggestions.map(s => s.name);
      const replacement = suggestionPool.find(
        s => s.name !== subredditName && !displayedNames.includes(s.name)
      );

      // Update displayed suggestions
      setSuggestions(prev => {
        const updated = prev.filter(s => s.name !== subredditName);
        if (replacement) {
          updated.push(replacement);
        }
        return updated;
      });

      // Remove dismissed subreddit from pool
      setSuggestionPool(prev => prev.filter(s => s.name !== subredditName));
    } catch (err) {
      console.error('Failed to dismiss subreddit:', err);
    }
  };

  // Navigate to post view
  const handlePostClick = (post: ForYouPost) => {
    const slug = post.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, SLUG_MAX_LENGTH);
    navigate(`/p/t3_${post.redditPostId}/${slug}`);
  };

  // Navigate to generate report
  const handleGenerateReport = () => {
    navigate('/foryou/report');
  };

  // Format time ago
  const formatTimeAgo = (utcString: string | null) => {
    if (!utcString) return '';
    const seconds = Math.floor((Date.now() - new Date(utcString).getTime()) / 1000);
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Format score
  const formatScore = (score: number) => {
    if (score >= 1000) return `${(score / 1000).toFixed(1)}k`;
    return String(score);
  };

  // Not signed in
  if (!signedIn) {
    return (
      <div className={`py-24 text-center ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>
        <p className="text-xl mb-4">Sign in to access your personalized feed</p>
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
        <div className="animate-pulse text-xl">Loading For You...</div>
      </div>
    );
  }

  // No persona state
  if (!persona) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className={`text-2xl font-bold mb-4 ${themeName === 'light' ? 'text-gray-900' : ''}`}>
          Build Your Persona
        </h2>
        <p className={`mb-6 ${themeName === 'light' ? 'text-gray-600' : 'text-[var(--theme-textMuted)]'}`}>
          We need to analyze your saved posts to create a personalized feed.
          This will help us understand your interests and preferences.
        </p>
        <button
          onClick={handleRefreshPersona}
          disabled={refreshingPersona}
          className={`px-8 py-3 rounded-full font-semibold text-lg transition shadow-lg ${
            refreshingPersona ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            themeName === 'light'
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
          }`}
        >
          {refreshingPersona ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin inline-block">&#8987;</span>
              Building Persona...
            </span>
          ) : (
            'Refresh Persona'
          )}
        </button>
        {refreshingPersona && (
          <p className={`text-center mt-4 text-sm ${
            themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'
          }`}>
            This may take 30-60 seconds...
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="font-sans">
      {/* Header */}
      <header className="px-4 pb-2">
        <div className={`max-w-7xl mx-auto border-b-2 ${
          themeName === 'light' ? 'border-gray-900' : 'border-white/20'
        }`}>
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className={`text-2xl font-bold ${themeName === 'light' ? 'text-gray-900' : ''}`}>
                For You
              </h1>
              <div className={`text-xs ${
                themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]'
              }`}>
                <span>Curated: {curatedCount}/{CURATED_LIMIT}</span>
                {cachedReport && (
                  <span className="ml-3">
                    Report cached: {new Date(cachedReport.generatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(cachedReport.generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPersona(!showPersona)}
                className={`text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  themeName === 'light'
                    ? 'text-gray-600 hover:bg-gray-100'
                    : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                {showPersona ? 'Hide' : 'Show'} Persona
              </button>
              <button
                onClick={handleRefreshPersona}
                disabled={refreshingPersona}
                className={`text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  themeName === 'light'
                    ? 'text-orange-600 hover:bg-orange-50'
                    : 'text-[var(--theme-primary)] hover:bg-white/10'
                }`}
              >
                {refreshingPersona ? <span className="animate-spin inline-block">&#8987;</span> : 'Refresh'}
              </button>
              <button
                onClick={() => setShowWeightsModal(true)}
                className={`text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  themeName === 'light'
                    ? 'text-gray-600 hover:bg-gray-100'
                    : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                Weights
              </button>
              <Link
                to="/foryou/settings"
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  themeName === 'light'
                    ? 'text-gray-600 hover:bg-gray-100'
                    : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                Settings
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Error display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="p-4 rounded-lg bg-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Collapsible persona display */}
      {showPersona && persona && (
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className={`p-6 rounded-2xl border ${
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

            {/* Subreddit Affinities */}
            {persona.subredditAffinities && persona.subredditAffinities.length > 0 && (
              <div className="mb-4">
                <h3 className={`text-xs font-medium mb-2 ${
                  themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'
                }`}>
                  Top Subreddits
                </h3>
                <div className="flex flex-wrap gap-2">
                  {persona.subredditAffinities.slice(0, SUBREDDITS_DISPLAY_LIMIT).map((sub, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-1 rounded-full ${
                        themeName === 'light'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-white/10 text-gray-300'
                      }`}
                    >
                      r/{sub.name}
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
          </div>
        </div>
      )}

      {/* At-cap warning */}
      {curatedCount >= CURATED_LIMIT && (
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <div className={`p-4 rounded-xl border flex items-center justify-between ${
            themeName === 'light'
              ? 'bg-orange-50 border-orange-200'
              : 'bg-[var(--theme-primary)]/10 border-[var(--theme-primary)]/30'
          }`}>
            <div>
              <p className={`font-medium ${
                themeName === 'light' ? 'text-orange-800' : 'text-[var(--theme-primary)]'
              }`}>
                Curated posts at capacity ({CURATED_LIMIT}/{CURATED_LIMIT})
              </p>
              <p className={`text-sm ${
                themeName === 'light' ? 'text-orange-600' : 'text-gray-400'
              }`}>
                Generate a report to clear your curated posts and continue.
              </p>
            </div>
            <button
              onClick={handleGenerateReport}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                themeName === 'light'
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
              }`}
            >
              Generate Report
            </button>
          </div>
        </div>
      )}

      {/* Suggested Subreddits */}
      {suggestions.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pb-4">
          <div className="flex items-center flex-wrap gap-2">
            <span className={`text-xs font-medium whitespace-nowrap ${
              themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'
            }`}>
              Discover:
            </span>
            {suggestions.map((sub) => (
              <div
                key={sub.name}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                  themeName === 'light'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-white/10 text-gray-400'
                }`}
              >
                <Link
                  to={`/r/${sub.name}`}
                  title={sub.category}
                  className={`no-underline ${
                    themeName === 'light'
                      ? 'text-gray-600 hover:text-gray-900'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  r/{sub.name}
                </Link>
                <button
                  onClick={() => handleDismissSuggestion(sub.name)}
                  className={`ml-1 leading-none ${
                    themeName === 'light'
                      ? 'text-gray-400 hover:text-gray-600'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                  title="Dismiss"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Posts list */}
      {posts.length > 0 ? (
        <main className="max-w-6xl mx-auto px-4 pt-4 pb-24 grid grid-cols-1 md:grid-cols-2 gap-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className={`group relative p-3 rounded-lg transition border flex gap-3 ${
                themeName === 'light'
                  ? 'bg-transparent border-gray-200 hover:bg-gray-50'
                  : 'bg-transparent border-white/10 hover:bg-white/[0.05]'
              }`}
            >
              {/* Post content - clickable */}
              <div
                className="cursor-pointer flex-1 min-w-0"
                onClick={() => handlePostClick(post)}
              >
                <div className="flex items-baseline gap-2 mb-1">
                  <span className={`text-xs font-normal uppercase tracking-wide ${
                    themeName === 'light' ? 'text-orange-600' : 'text-[var(--theme-primary)]'
                  }`}>
                    r/{post.subreddit}
                  </span>
                  <span className={`text-xs ${themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]'}`}>
                    {formatTimeAgo(post.createdUtc)}
                  </span>
                </div>

                <h2 className={`font-light my-2 leading-snug transition-colors text-base ${
                  themeName === 'light'
                    ? 'text-gray-900 group-hover:text-orange-600'
                    : 'group-hover:text-[var(--theme-primary)]'
                }`}>
                  {post.title}
                </h2>

                <div className={`text-xs ${
                  themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]'
                }`}>
                  {formatScore(post.score)} pts | {post.numComments} comments
                </div>
              </div>

              {/* Triage action buttons - vertical on right */}
              <div className="flex flex-col gap-1 justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(post.redditPostId, 'saved');
                  }}
                  title="Save for report"
                  className={`p-1.5 rounded transition ${
                    themeName === 'light'
                      ? 'text-green-600 hover:bg-green-100'
                      : 'text-green-400 hover:bg-green-500/20'
                  }`}
                >
                  <FontAwesomeIcon icon={faBookmark} className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(post.redditPostId, 'already_read');
                  }}
                  title="Skip (already read)"
                  className={`p-1.5 rounded transition ${
                    themeName === 'light'
                      ? 'text-blue-600 hover:bg-blue-100'
                      : 'text-blue-400 hover:bg-blue-500/20'
                  }`}
                >
                  <FontAwesomeIcon icon={faForward} className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAction(post.redditPostId, 'not_interested');
                  }}
                  title="Hide (not interested)"
                  className={`p-1.5 rounded transition ${
                    themeName === 'light'
                      ? 'text-gray-500 hover:bg-gray-100'
                      : 'text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <FontAwesomeIcon icon={faEyeSlash} className="w-3 h-3" />
                </button>
              </div>
            </article>
          ))}
        </main>
      ) : (
        <div className={`py-24 text-center ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>
          <p className="text-xl">No posts available</p>
          <p className="text-sm mt-2">Try refreshing your persona to get new recommendations.</p>
        </div>
      )}

      {/* Weights Modal */}
      {showWeightsModal && persona?.subredditAffinities && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowWeightsModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className={`relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl p-6 ${
              themeName === 'light'
                ? 'bg-white shadow-2xl'
                : 'bg-[#1a1a2e] border border-white/10'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${themeName === 'light' ? 'text-gray-900' : 'text-white'}`}>
                Subreddit Weights
              </h2>
              <button
                onClick={() => setShowWeightsModal(false)}
                className={`p-2 rounded-lg transition ${
                  themeName === 'light'
                    ? 'hover:bg-gray-100 text-gray-500'
                    : 'hover:bg-white/10 text-gray-400'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className={`text-sm mb-4 ${themeName === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
              Higher weights mean more posts from that subreddit in your feed.
            </p>

            <div className="space-y-3">
              {(() => {
                const maxWeight = Math.max(...persona.subredditAffinities.map(s => s.weight));
                return persona.subredditAffinities
                  .sort((a, b) => b.weight - a.weight)
                  .slice(0, 20)
                  .map((sub, i) => {
                    const percentage = maxWeight > 0 ? (sub.weight / maxWeight) * 100 : 0;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={themeName === 'light' ? 'text-gray-700' : 'text-gray-200'}>
                            r/{sub.name}
                          </span>
                          <span className={`text-xs ${themeName === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {sub.weight.toFixed(1)}
                          </span>
                        </div>
                        <div className={`h-2 rounded-full overflow-hidden ${
                          themeName === 'light' ? 'bg-gray-100' : 'bg-white/10'
                        }`}>
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              themeName === 'light'
                                ? 'bg-gradient-to-r from-orange-400 to-orange-600'
                                : 'bg-gradient-to-r from-[var(--theme-primary)] to-purple-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForYouFeed;
