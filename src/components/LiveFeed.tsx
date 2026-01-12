import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import LiveFeedService, { HourlyReport, HourlyStory } from '../helpers/LiveFeedService';

const LiveFeed = () => {
  const { themeName } = useTheme();
  const navigate = useNavigate();
  const [report, setReport] = useState<HourlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportHour, setReportHour] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await LiveFeedService.getLatestHourlyReport();
      if (data) {
        setReport(data);
        setReportHour(data.reportHour);
      } else {
        setError('No hourly report available yet.');
      }
    } catch (err) {
      setError('Failed to load feed. Please try again.');
      console.error('LiveFeed error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Hourly refresh check (separate effect to avoid loop)
  useEffect(() => {
    const interval = setInterval(() => {
      if (reportHour && !LiveFeedService.isReportCurrent(reportHour)) {
        fetchReport();
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [reportHour, fetchReport]);

  const handleStoryClick = (story: HourlyStory) => {
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

  if (loading) {
    return (
      <div className={`py-24 text-center ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>
        <div className="animate-pulse text-xl">Loading Discover feed...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="py-24 text-center">
        <p className={`mb-4 ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>
          {error || 'No report available'}
        </p>
        <button
          onClick={fetchReport}
          className={`px-4 py-2 rounded-lg font-medium ${
            themeName === 'light' 
              ? 'bg-orange-600 text-white' 
              : 'bg-[var(--theme-primary)] text-[#262129]'
          }`}
        >
          Try Again
        </button>
      </div>
    );
  }

  const subreddits = report.sourceSubreddits || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header with refresh info */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-xl font-bold ${themeName === 'light' ? 'text-gray-900' : ''}`}>
            Discover
          </h2>
          <p className={`text-sm ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>
            AI-curated from {subreddits.length} trending subreddits
          </p>
        </div>
        <div className="text-right">
          <button
            onClick={fetchReport}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              themeName === 'light'
                ? 'text-orange-600 hover:bg-orange-50'
                : 'text-[var(--theme-primary)] hover:bg-white/10'
            }`}
          >
            ↻ Refresh
          </button>
          <p className={`text-xs mt-1 ${themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]'}`}>
            Refreshes hourly
          </p>
        </div>
      </div>

      {/* Subreddit chips */}
      {subreddits.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {subreddits.map(sub => (
            <span
              key={sub}
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                themeName === 'light'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)]'
              }`}
            >
              r/{sub}
            </span>
          ))}
        </div>
      )}

      {/* Stories */}
      <div className="space-y-4">
        {report.stories.map((story) => (
          <article
            key={story.id}
            className={`group p-4 rounded-xl cursor-pointer transition ${
              themeName === 'light'
                ? 'bg-white border border-gray-100 hover:shadow-md hover:border-gray-200'
                : 'border hover:bg-white/[0.08]'
            }`}
            style={themeName === 'light' ? undefined : {
              backgroundColor: 'var(--theme-cardBg)',
              borderColor: 'var(--theme-border)'
            }}
            onClick={() => handleStoryClick(story)}
          >
            <div className="flex items-start gap-4">
              {/* Thumbnail */}
              {story.imageUrl && (
                <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={story.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                {/* Meta */}
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className={`text-xs font-bold ${
                    themeName === 'light' ? 'text-orange-600' : 'text-[var(--theme-primary)]'
                  }`}>
                    r/{story.subreddit}
                  </span>
                  <span className={`text-xs ${themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]'}`}>
                    • {formatTimeAgo(story.createdUtc)}
                  </span>
                  {story.sentimentLabel && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      themeName === 'light' ? 'bg-gray-100 text-gray-600' : 'bg-white/10 text-gray-300'
                    }`}>
                      {story.sentimentLabel}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className={`font-semibold leading-snug mb-2 line-clamp-2 group-hover:underline ${
                  themeName === 'light' ? 'text-gray-900' : ''
                }`}>
                  {story.title}
                </h3>

                {/* AI Summary */}
                {story.summary && (
                  <p className={`text-sm line-clamp-3 mb-2 ${
                    themeName === 'light' ? 'text-gray-600' : 'text-[var(--theme-textMuted)]'
                  }`}>
                    {story.summary}
                  </p>
                )}

                {/* Stats */}
                <div className={`flex items-center gap-4 text-xs ${
                  themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'
                }`}>
                  <span>↑ {formatScore(story.score)}</span>
                  <span>💬 {story.numComments}</span>
                  {story.author && <span>u/{story.author}</span>}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default LiveFeed;
