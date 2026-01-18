import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useReddit } from '../context/RedditContext';
import ForYouService, { CuratedPost } from '../helpers/ForYouService';

const MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and efficient' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Balanced performance' },
  { id: 'gpt-5.2', name: 'GPT-5.2', description: 'Most capable' },
];

const ForYouReport = () => {
  const { themeName } = useTheme();
  const { signedIn, redirectForAuth, accessToken } = useReddit();
  const navigate = useNavigate();

  const token = accessToken || '';

  // Ref to track component mount state for async cleanup
  const isMounted = useRef(true);
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // State
  const [savedPosts, setSavedPosts] = useState<CuratedPost[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load curated posts on mount
  useEffect(() => {
    const loadCuratedPosts = async () => {
      if (!token) {
        if (isMounted.current) setLoading(false);
        return;
      }

      if (isMounted.current) {
        setLoading(true);
        setError(null);
      }

      try {
        const result = await ForYouService.getCurated(token);
        if (isMounted.current) {
          // Filter to only show posts with action === 'saved'
          const saved = result.posts.filter(post => post.action === 'saved');
          setSavedPosts(saved);
        }
      } catch (err) {
        console.error('Failed to load curated posts:', err);
        if (isMounted.current) {
          setError('Failed to load curated posts. Please try again.');
        }
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    if (signedIn) {
      loadCuratedPosts();
    } else {
      if (isMounted.current) setLoading(false);
    }
  }, [signedIn, token]);

  // Handle generate report
  const handleGenerateReport = async () => {
    if (!token) return;

    if (isMounted.current) {
      setGenerating(true);
      setError(null);
    }

    try {
      await ForYouService.generateReport(token, selectedModel);
      if (isMounted.current) {
        navigate('/foryou', { state: { reportGenerated: true } });
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
      if (isMounted.current) {
        setError('Failed to generate report. Please try again.');
        setGenerating(false);
      }
    }
  };

  // Not signed in
  if (!signedIn) {
    return (
      <div className={`py-24 text-center ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>
        <p className="text-xl mb-4">Sign in to generate reports</p>
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
        <div className="animate-pulse text-xl">Loading...</div>
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
                Generate Report
              </h1>
            </div>
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

      {/* Generating notice */}
      {generating && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className={`p-4 rounded-lg ${
            themeName === 'light' ? 'bg-orange-50 text-orange-700' : 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]'
          }`}>
            <span className="animate-pulse">Generating report... This may take 30-60 seconds.</span>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Curated Posts Count */}
        <section className={`p-6 rounded-2xl border ${
          themeName === 'light'
            ? 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200'
            : 'bg-gradient-to-br from-white/5 to-white/10 border-white/10'
        }`}>
          <h2 className={`text-sm font-semibold uppercase tracking-wide mb-2 ${
            themeName === 'light' ? 'text-orange-600' : 'text-[var(--theme-primary)]'
          }`}>
            Curated Posts
          </h2>
          <p className={`text-3xl font-bold ${themeName === 'light' ? 'text-gray-900' : ''}`}>
            {savedPosts.length} <span className={`text-lg font-normal ${
              themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'
            }`}>saved posts</span>
          </p>
          {savedPosts.length === 0 && (
            <p className={`text-sm mt-2 ${
              themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'
            }`}>
              Save some posts from your For You feed to generate a report.
            </p>
          )}
        </section>

        {/* Model Selection */}
        <section className={`p-6 rounded-2xl border ${
          themeName === 'light'
            ? 'bg-white border-slate-200'
            : 'bg-white/5 border-white/10'
        }`}>
          <h2 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${
            themeName === 'light' ? 'text-orange-600' : 'text-[var(--theme-primary)]'
          }`}>
            Select Model
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                disabled={generating}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedModel === model.id
                    ? themeName === 'light'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10'
                    : themeName === 'light'
                      ? 'border-gray-200 hover:border-gray-300 bg-gray-50'
                      : 'border-white/10 hover:border-white/20 bg-white/5'
                } ${generating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <h3 className={`font-semibold mb-1 ${
                  selectedModel === model.id
                    ? themeName === 'light'
                      ? 'text-orange-700'
                      : 'text-[var(--theme-primary)]'
                    : themeName === 'light'
                      ? 'text-gray-900'
                      : ''
                }`}>
                  {model.name}
                </h3>
                <p className={`text-sm ${
                  themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'
                }`}>
                  {model.description}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Preview of Saved Posts */}
        {savedPosts.length > 0 && (
          <section className={`p-6 rounded-2xl border ${
            themeName === 'light'
              ? 'bg-white border-slate-200'
              : 'bg-white/5 border-white/10'
          }`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${
              themeName === 'light' ? 'text-orange-600' : 'text-[var(--theme-primary)]'
            }`}>
              Preview
            </h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {savedPosts.slice(0, 10).map((post) => (
                <div
                  key={post.id}
                  className={`p-3 rounded-lg ${
                    themeName === 'light'
                      ? 'bg-gray-50'
                      : 'bg-white/5'
                  }`}
                >
                  <p className={`text-sm font-medium line-clamp-2 ${
                    themeName === 'light' ? 'text-gray-900' : ''
                  }`}>
                    {post.title}
                  </p>
                  <p className={`text-xs mt-1 ${
                    themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'
                  }`}>
                    r/{post.subreddit}
                  </p>
                </div>
              ))}
              {savedPosts.length > 10 && (
                <p className={`text-sm text-center py-2 ${
                  themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'
                }`}>
                  ...and {savedPosts.length - 10} more posts
                </p>
              )}
            </div>
          </section>
        )}

        {/* Generate Button */}
        <div className="flex justify-center">
          <button
            onClick={handleGenerateReport}
            disabled={generating || savedPosts.length === 0}
            className={`px-8 py-4 rounded-full font-semibold text-lg transition ${
              generating || savedPosts.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              themeName === 'light'
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
            }`}
          >
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForYouReport;
