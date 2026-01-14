import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import DailyService, { DailyReport, ReportStory } from '../helpers/DailyService';

const TopFeed = () => {
  const { themeName } = useTheme();
  const navigate = useNavigate();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTopPosts();
  }, []);

  const loadTopPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await DailyService.getLatestReport();
      setReport(data);
    } catch (err) {
      setError('Failed to load top posts');
    } finally {
      setLoading(false);
    }
  };

  const handleStoryClick = (story: ReportStory) => {
    const fullname = `t3_${story.redditPostId}`;
    const slug = story.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60);
    navigate(`/p/${fullname}/${slug}`);
  };

  const formatScore = (score: number) => {
    if (score >= 1000000) return `${(score / 1000000).toFixed(1)}M`;
    if (score >= 1000) return `${(score / 1000).toFixed(1)}K`;
    return score.toString();
  };

  // Check if post is image-only (no meaningful text content to summarize)
  const isImageOnlyPost = (story: ReportStory) => {
    if (!story.postUrl) return false;
    const url = story.postUrl.toLowerCase();
    // Check for direct image URLs
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.gifv'];
    const imageHosts = ['i.redd.it', 'i.imgur.com', 'imgur.com/a/', 'preview.redd.it'];

    return imageExtensions.some(ext => url.endsWith(ext)) ||
           imageHosts.some(host => url.includes(host));
  };

  if (loading) {
    return (
      <div className={`py-24 text-center ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>
        <div className="animate-pulse text-xl">Loading Top Posts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className={themeName === 'light' ? 'text-gray-600' : 'text-gray-400'}>{error}</p>
        <button
          onClick={loadTopPosts}
          className={`mt-4 px-4 py-2 rounded-lg border-none cursor-pointer ${
            themeName === 'light'
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
          }`}
        >
          Retry
        </button>
      </div>
    );
  }

  const stories = report?.stories || [];

  return (
    <div className="font-sans">
      {/* Header */}
      <header className="px-4 pb-2">
        <div className={`max-w-7xl mx-auto border-b-2 ${
          themeName === 'light' ? 'border-gray-900' : 'border-white/20'
        }`}>
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className={`text-2xl font-bold ${
                themeName === 'light' ? 'text-gray-900' : ''
              }`}>
                Top Posts on Reddit
              </h1>
              {report && (
                <span className={`text-xs ${
                  themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]'
                }`}>
                  Updated {new Date(report.reportDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Stories Grid */}
      {stories.length > 0 ? (
        <main className="max-w-7xl mx-auto px-4 pt-4 pb-24 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {stories.map((story, index) => (
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
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wide ${
                    themeName === 'light' ? 'text-orange-600' : 'text-[var(--theme-primary)]'
                  }`}>
                    r/{story.subreddit}
                  </span>
                </div>
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

              {/* AI Summary - skip for image-only posts */}
              {story.summary && !isImageOnlyPost(story) && (
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
                  <p className={`text-sm leading-relaxed ${
                    themeName === 'light' ? 'text-gray-700' : 'text-[var(--theme-text)]'
                  }`}>
                    {story.summary}
                  </p>
                </div>
              )}

              {/* Topic Tags */}
              {story.topicTags && story.topicTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {story.topicTags.slice(0, 3).map((tag, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        themeName === 'light'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-white/10 text-gray-300'
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
      ) : (
        <div className={`py-24 text-center ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>
          <p className="text-xl">No top posts available yet.</p>
          <p className="text-sm mt-2">Check back soon!</p>
        </div>
      )}
    </div>
  );
};

export default TopFeed;
