import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useReddit } from '../context/RedditContext';
import DiscoverService, { Category, DiscoverReport, DiscoverStory } from '../helpers/DiscoverService';

const MAX_CATEGORIES = 3;

type ViewState = 'setup' | 'report';

const LiveFeed = () => {
  const { themeName } = useTheme();
  const { user } = useReddit();
  const navigate = useNavigate();
  
  // State
  const [viewState, setViewState] = useState<ViewState>('setup');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
  const [subredditToggles, setSubredditToggles] = useState<Record<string, boolean>>({});
  const [report, setReport] = useState<DiscoverReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.name || DiscoverService.getAnonymousUserId();

  // Load categories and user preferences on mount
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load all categories
      const cats = await DiscoverService.getCategories();
      setCategories(cats);

      // Load user preferences
      const prefs = await DiscoverService.getUserPreferences(userId);
      if (prefs.selectedCategories.length > 0) {
        setSelectedCategoryIds(new Set(prefs.selectedCategories.map(c => c.id)));
        
        // Build toggle map from preferences
        const toggles: Record<string, boolean> = {};
        prefs.selectedCategories.forEach(cat => {
          cat.subreddits.forEach(sub => {
            toggles[sub.id] = sub.enabled ?? sub.isDefault;
          });
        });
        setSubredditToggles(toggles);
      }

      // Try to load latest report
      const latestReport = await DiscoverService.getLatestReport(userId);
      if (latestReport) {
        setReport(latestReport);
        setViewState('report');
      }
    } catch (err) {
      console.error('Failed to load discover data:', err);
      setError('Failed to load. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Toggle category selection
  const toggleCategory = async (categoryId: string) => {
    const newSelected = new Set(selectedCategoryIds);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else if (newSelected.size < MAX_CATEGORIES) {
      newSelected.add(categoryId);
    }
    setSelectedCategoryIds(newSelected);

    // Persist to backend
    try {
      await DiscoverService.setUserCategories(userId, Array.from(newSelected));
    } catch (err) {
      console.error('Failed to save categories:', err);
    }
  };

  // Toggle subreddit
  const toggleSubreddit = async (subredditId: string, enabled: boolean) => {
    setSubredditToggles(prev => ({ ...prev, [subredditId]: enabled }));
    try {
      await DiscoverService.toggleSubreddit(userId, subredditId, enabled);
    } catch (err) {
      console.error('Failed to toggle subreddit:', err);
    }
  };

  // Generate report
  const handleGenerate = async () => {
    if (selectedCategoryIds.size === 0) {
      setError('Please select at least one category.');
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const newReport = await DiscoverService.generateReport(userId);
      setReport(newReport);
      setViewState('report');
    } catch (err: unknown) {
      console.error('Failed to generate report:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || 'Failed to generate report.');
      } else {
        setError('Failed to generate report.');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleStoryClick = (story: DiscoverStory) => {
    const fullname = `t3_${story.redditPostId}`;
    const slug = story.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60);
    navigate(`/p/${fullname}/${slug}`);
  };

  const formatTimeAgo = (utcString: string | null) => {
    if (!utcString) return '';
    const seconds = Math.floor((Date.now() - new Date(utcString).getTime()) / 1000);
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const formatScore = (score: number) => {
    if (score >= 1000) return `${(score / 1000).toFixed(1)}k`;
    return String(score);
  };

  // Get selected categories with their subreddits
  const selectedCategories = categories.filter(c => selectedCategoryIds.has(c.id));

  if (loading) {
    return (
      <div className={`py-24 text-center ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>
        <div className="animate-pulse text-xl">Loading Discover...</div>
      </div>
    );
  }

  // Setup View - Category Selection
  if (viewState === 'setup' || !report) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className={`text-2xl font-bold mb-2 ${themeName === 'light' ? 'text-gray-900' : ''}`}>
            Discover
          </h2>
          <p className={`${themeName === 'light' ? 'text-gray-600' : 'text-[var(--theme-textMuted)]'}`}>
            Select up to {MAX_CATEGORIES} categories to generate a personalized AI-curated report.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Category Selection */}
        <div className="mb-8">
          <h3 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${
            themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'
          }`}>
            Categories ({selectedCategoryIds.size}/{MAX_CATEGORIES})
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {categories.map(cat => {
              const isSelected = selectedCategoryIds.has(cat.id);
              const isDisabled = !isSelected && selectedCategoryIds.size >= MAX_CATEGORIES;
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  disabled={isDisabled}
                  className={`p-4 rounded-xl text-left transition border-2 ${
                    isSelected
                      ? themeName === 'light'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10'
                      : isDisabled
                        ? 'opacity-50 cursor-not-allowed border-transparent'
                        : themeName === 'light'
                          ? 'border-gray-200 hover:border-orange-300 bg-white'
                          : 'border-[var(--theme-border)] hover:border-[var(--theme-primary)]/50 bg-[var(--theme-cardBg)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-semibold ${themeName === 'light' ? 'text-gray-900' : ''}`}>
                      {cat.name}
                    </span>
                    {isSelected && (
                      <span className={`text-lg ${
                        themeName === 'light' ? 'text-orange-500' : 'text-[var(--theme-primary)]'
                      }`}>✓</span>
                    )}
                  </div>
                  <p className={`text-sm ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>
                    {cat.subreddits.length} subreddits
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Subreddit Toggles for Selected Categories */}
        {selectedCategories.length > 0 && (
          <div className="mb-8">
            <h3 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${
              themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'
            }`}>
              Subreddits
            </h3>
            {selectedCategories.map(cat => (
              <div key={cat.id} className="mb-6">
                <h4 className={`font-medium mb-3 ${themeName === 'light' ? 'text-gray-700' : ''}`}>
                  {cat.name}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {cat.subreddits.map(sub => {
                    const isEnabled = subredditToggles[sub.id] ?? sub.isDefault;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => toggleSubreddit(sub.id, !isEnabled)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                          isEnabled
                            ? themeName === 'light'
                              ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                              : 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/30'
                            : themeName === 'light'
                              ? 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              : 'bg-white/5 text-gray-500 hover:bg-white/10'
                        }`}
                      >
                        r/{sub.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Generate Button */}
        <div className="flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={generating || selectedCategoryIds.size === 0}
            className={`px-8 py-3 rounded-full font-semibold text-lg transition shadow-lg ${
              generating || selectedCategoryIds.size === 0
                ? 'opacity-50 cursor-not-allowed'
                : ''
            } ${
              themeName === 'light'
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
            }`}
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Generating...
              </span>
            ) : (
              'Generate Report'
            )}
          </button>
        </div>

        {generating && (
          <p className={`text-center mt-4 text-sm ${
            themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'
          }`}>
            This may take 30-60 seconds...
          </p>
        )}

        {/* Back to Report button if report exists */}
        {report && !generating && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setViewState('report')}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                themeName === 'light'
                  ? 'text-gray-600 hover:bg-gray-100'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              ← Back to Report
            </button>
          </div>
        )}
      </div>
    );
  }

  // Report View
  const sourceCategories = report.sourceCategories || [];

  return (
    <div className="font-sans">
      {/* Header */}
      <header className="px-4 pb-2">
        <div className={`max-w-7xl mx-auto border-b-2 ${
          themeName === 'light' ? 'border-gray-900' : 'border-white/20'
        }`}>
          <div className="flex items-center justify-between py-4">
            <div className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${
              themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'
            }`}>
              {sourceCategories.join(' • ')}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewState('setup')}
                className={`text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  themeName === 'light'
                    ? 'text-gray-600 hover:bg-gray-100'
                    : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                ⚙️ Settings
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className={`text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  themeName === 'light'
                    ? 'text-orange-600 hover:bg-orange-50'
                    : 'text-[var(--theme-primary)] hover:bg-white/10'
                }`}
              >
                {generating ? '⏳' : '↻'} Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="p-4 rounded-lg bg-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Stories Grid - Newspaper Layout */}
      <main className="max-w-7xl mx-auto px-4 pt-8 pb-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {report.stories.map((story, index) => (
          <article
            key={story.id}
            className={`group relative p-4 sm:p-6 rounded-xl sm:rounded-2xl transition cursor-pointer ${
              themeName === 'light'
                ? 'bg-white sm:shadow-sm sm:border sm:border-gray-100 hover:shadow-md'
                : 'sm:backdrop-blur-md sm:border hover:bg-white/[0.12]'
            } ${index === 0 ? 'lg:col-span-2' : ''}`}
            style={themeName === 'light' ? undefined : {
              backgroundColor: 'var(--theme-cardBg)',
              borderColor: 'var(--theme-border)'
            }}
            onClick={() => handleStoryClick(story)}
          >
            <div className="flex items-baseline justify-between mb-2">
              <span className={`text-xs font-bold uppercase tracking-wide ${
                themeName === 'light' ? 'text-orange-600' : 'text-[var(--theme-primary)]'
              }`}>
                r/{story.subreddit}
              </span>
              <div className={`text-xs ${themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]'}`}>
                {formatScore(story.score)} pts • {story.numComments} comments
              </div>
            </div>

            <h2 className={`font-bold mb-3 leading-tight transition-colors ${
              index === 0 ? 'text-3xl md:text-4xl' : 'text-xl'
            } ${
              themeName === 'light'
                ? 'text-gray-900 group-hover:text-orange-600'
                : 'group-hover:text-[var(--theme-primary)]'
            }`}>
              {story.title}
            </h2>

            {/* Featured Image for first two stories */}
            {index <= 1 && story.imageUrl && (
              <div className="mb-4 rounded-xl overflow-hidden">
                <img
                  src={story.imageUrl}
                  alt=""
                  className={`w-full object-cover ${index === 0 ? 'h-48 sm:h-64' : 'h-40 sm:h-48'}`}
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}

            {/* AI Summary */}
            <div
              className={`p-4 rounded-xl mb-4 border ${
                themeName === 'light'
                  ? 'bg-slate-50 border-slate-100'
                  : 'backdrop-blur-sm'
              }`}
              style={themeName === 'light' ? undefined : {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'var(--theme-border)'
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold uppercase ${
                  themeName === 'light' ? 'text-slate-500' : 'text-[var(--theme-textMuted)]'
                }`}>Analysis</span>
                {story.sentimentLabel && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    themeName === 'light' ? 'bg-gray-100 text-gray-700' : 'bg-white/10 text-gray-300'
                  }`}>
                    {story.sentimentLabel}
                  </span>
                )}
              </div>
              <p className={`text-sm leading-relaxed ${
                themeName === 'light' ? 'text-gray-700' : 'text-[var(--theme-text)]'
              }`}>
                {story.summary}
              </p>
            </div>

            {/* Top Comment */}
            {story.topCommentBody && (
              <div className={`space-y-3 pl-4 border-l-2 mb-4 ${
                themeName === 'light' ? 'border-orange-100' : 'border-[var(--theme-primary)]/30'
              }`}>
                <div>
                  <p className={`text-sm italic mb-1 ${
                    themeName === 'light' ? 'text-gray-600' : 'text-[var(--theme-textMuted)]'
                  }`}>
                    "{story.topCommentBody.slice(0, 200)}{story.topCommentBody.length > 200 ? '...' : ''}"
                  </p>
                  <div className={`text-xs ${themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]/70'}`}>
                    — u/{story.topCommentAuthor}
                  </div>
                </div>
              </div>
            )}

            {/* Topic Tags */}
            {story.topicTags && story.topicTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {story.topicTags.map((tag, i) => (
                  <span
                    key={i}
                    className={`text-xs px-2 py-1 rounded-full ${
                      themeName === 'light'
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-white/10 text-gray-400'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </article>
        ))}
      </main>
    </div>
  );
};

export default LiveFeed;
