import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DailyService, { DailyReport, ReportStory } from '../helpers/DailyService';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';

interface DailyPulseProps {
  embedded?: boolean;
}

const DailyPulse = ({ embedded = false }: DailyPulseProps) => {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const { redirectForAuth } = useReddit();
  const { themeName } = useTheme();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    DailyService.getLatestReport().then(data => {
      setReport(data);
      setLoading(false);
    });
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      await DailyService.subscribe(email, [], 'daily_pulse_hero');
      setSubscribed(true);
      DailyService.trackEngagement('SUBSCRIBE_CLICK', { placement: 'hero' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleStoryClick = (storyId: string, story: ReportStory) => {
    DailyService.trackEngagement('STORY_CLICK', {}, report?.id, storyId);
    // Navigate to reader view with the Reddit post ID
    const fullname = `t3_${story.redditPostId}`;
    const slug = story.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60);
    navigate(`/p/${fullname}/${slug}`);
  };

  const handleInterest = (storyId: string) => {
    DailyService.trackEngagement('REACT_INTERESTING', {}, report?.id, storyId);
    // Could open modal here
    alert('Thanks for feedback! (Interaction Demo)');
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${themeName === 'light' ? 'bg-gray-50' : ''}`}>
        <div className={`animate-pulse text-xl ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>Loading Hourly Pulse...</div>
      </div>
    );
  }

  if (!report) {
    // Fallback if no report available
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${themeName === 'light' ? 'bg-gray-50' : ''}`}>
        <h1 className="text-3xl font-serif mb-4">Hourly Pulse</h1>
        <p className={`mb-8 ${themeName === 'light' ? 'text-gray-600' : 'text-[var(--theme-textMuted)]'}`}>No report available for today yet.</p>
        <button  
          onClick={redirectForAuth} 
          className={`px-6 py-3 rounded-full font-bold ${
            themeName === 'light' ? 'bg-orange-600 text-white' : 'bg-[var(--theme-primary)] text-[#262129]'
          }`}
        >
          Log in with Reddit
        </button>
      </div>
    );
  }

  return (
    <div className={`${embedded ? '' : 'min-h-screen'} font-sans ${
      themeName === 'light' ? 'bg-[#fcfcfc] text-gray-900' : ''
    }`}>
      {/* Header / Hero - only show when not embedded */}
      {!embedded && (
        <header className="bg-white border-b border-gray-200 py-12 px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-center justify-center mb-4">
              <div className="flex items-center gap-3">
                <img src="/favicon.png" alt="Logo" className="w-10 h-10" />
                <span className="font-serif text-2xl font-bold tracking-tight text-orange-600">Reddzit Hourly</span>
              </div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 hidden sm:block">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Top articles for {new Date(report.reportDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              The most important conversations happening on Reddit today, curated and summarized.
            </p>

            {!subscribed ? (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <button type="submit" className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition">
                  Subscribe
                </button>
              </form>
            ) : (
              <div className="text-green-600 font-medium bg-green-50 inline-block px-4 py-2 rounded-full">
                ✓ Subscribed! See you tomorrow.
              </div>
            )}
            
            <div className="mt-6 text-sm text-gray-500">
              <button onClick={redirectForAuth} className="underline hover:text-orange-600">
                Already have an account? Log in
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Stories List */}
      <main className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {report.stories.map((story, index) => (
          <article 
            key={story.id} 
            className={`group relative p-0 sm:p-6 sm:rounded-2xl transition ${
              themeName === 'light' 
                ? 'bg-white sm:shadow-sm sm:border sm:border-gray-100 hover:shadow-md' 
                : 'sm:backdrop-blur-md sm:border hover:bg-white/[0.12]'
            } ${index === 0 ? 'lg:col-span-2' : ''}`}
            style={themeName === 'light' ? undefined : ({
              backgroundColor: 'var(--theme-cardBg)',
              borderColor: 'var(--theme-border)'
            } as React.CSSProperties)}
          >
            <div className="flex items-baseline justify-between mb-2">
              <span className={`text-xs font-bold uppercase tracking-wide ${
                themeName === 'light' ? 'text-orange-600' : 'text-[var(--theme-primary)]'
              }`}>
                r/{story.subreddit}
              </span>
              <div className={`text-xs ${themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]'}`}>
                {story.score > 1000 ? `${(story.score/1000).toFixed(1)}k` : story.score} pts • {story.numComments} comments
              </div>
            </div>

            <h2 className={`font-bold mb-3 leading-tight transition-colors ${
              index === 0 ? 'text-3xl md:text-4xl' : 'text-xl'
            } ${
              themeName === 'light' 
                ? 'text-gray-900 group-hover:text-orange-600' 
                : 'group-hover:text-[var(--theme-primary)]'
            }`}>
              <button 
                className="text-left w-full bg-transparent border-none cursor-pointer p-0 m-0 font-inherit text-inherit"
                onClick={() => handleStoryClick(story.id, story)}
              >
                {story.title}
              </button>
            </h2>

            {/* AI Summary */}
            <div 
              className={`p-4 rounded-xl mb-4 border ${
                themeName === 'light' 
                  ? 'bg-slate-50 border-slate-100' 
                  : 'backdrop-blur-sm'
              }`}
              style={themeName === 'light' ? undefined : ({
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'var(--theme-border)'
              } as React.CSSProperties)}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold uppercase ${
                  themeName === 'light' ? 'text-slate-500' : 'text-[var(--theme-textMuted)]'
                }`}>Analysis</span>
                {story.sentimentLabel && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    story.sentimentLabel === 'DIVIDED' 
                      ? themeName === 'light' ? 'bg-red-100 text-red-700' : 'bg-red-500/20 text-red-300'
                      : story.sentimentLabel === 'CONSENSUS' 
                        ? themeName === 'light' ? 'bg-green-100 text-green-700' : 'bg-green-500/20 text-green-300'
                        : themeName === 'light' ? 'bg-gray-100 text-gray-700' : 'bg-white/10 text-gray-300'
                  }`}>
                    {story.sentimentLabel}
                  </span>
                )}
              </div>
              <p className={`text-sm leading-relaxed mb-3 ${
                themeName === 'light' ? 'text-gray-700' : 'text-[var(--theme-text)]'
              }`}>
                {story.summary}
              </p>
              {index === 0 && story.takeaways && Array.isArray(story.takeaways) && (
                <ul className={`list-disc list-inside text-xs space-y-1 pl-1 ${
                  themeName === 'light' ? 'text-gray-600' : 'text-[var(--theme-textMuted)]'
                }`}>
                  {story.takeaways.map((point: string, i: number) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Highlight Comments */}
            {story.comments && story.comments.length > 0 && (
              <div className={`space-y-3 pl-4 border-l-2 ${
                themeName === 'light' ? 'border-orange-100' : 'border-[var(--theme-primary)]/30'
              }`}>
                {story.comments.slice(0, index === 0 ? 3 : 1).map(comment => (
                  <div key={comment.id}>
                    <p className={`text-sm italic mb-1 ${
                      themeName === 'light' ? 'text-gray-600' : 'text-[var(--theme-textMuted)]'
                    }`}>"{comment.body.slice(0, 140)}{comment.body.length > 140 ? '...' : ''}"</p>
                    <div className={`text-xs ${themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]/70'}`}>— u/{comment.author}</div>
                  </div>
                ))}
              </div>
            )}
            
            <div className={`mt-4 flex gap-4 pt-4 border-t ${
              themeName === 'light' ? 'border-gray-50' : 'border-white/10'
            }`}>
               <button 
                onClick={() => handleInterest(story.id)}
                className={`text-sm font-medium flex items-center gap-1 ${
                  themeName === 'light' ? 'text-gray-500 hover:text-orange-600' : 'text-[var(--theme-textMuted)] hover:text-[var(--theme-primary)]'
                }`}
               >
                 👍 Interesting
               </button>
               <button 
                onClick={() => handleInterest(story.id)} // Reuse for MVP
                className={`text-sm font-medium flex items-center gap-1 ${
                  themeName === 'light' ? 'text-gray-500 hover:text-orange-600' : 'text-[var(--theme-textMuted)] hover:text-[var(--theme-primary)]'
                }`}
               >
                 🔖 Save
               </button>
            </div>

          </article>
        ))}
      </main>

      {!embedded && (
        <footer className="py-12 text-center text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} Reddzit. Not affiliated with Reddit Inc.</p>
        </footer>
      )}
    </div>
  );
};

export default DailyPulse;
