import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DailyService, { DailyReport } from '../helpers/DailyService';
import { useReddit } from '../context/RedditContext';

interface DailyPulseProps {
  embedded?: boolean;
}

const DailyPulse = ({ embedded = false }: DailyPulseProps) => {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const { redirectForAuth } = useReddit();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

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

  const handleStoryClick = (storyId: string) => {
    DailyService.trackEngagement('STORY_CLICK', {}, report?.id, storyId);
  };

  const handleInterest = (storyId: string) => {
    DailyService.trackEngagement('REACT_INTERESTING', {}, report?.id, storyId);
    // Could open modal here
    alert('Thanks for feedback! (Interaction Demo)');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-xl text-gray-500">Loading Daily Pulse...</div>
      </div>
    );
  }

  if (!report) {
    // Fallback if no report available
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-serif mb-4">Daily Pulse</h1>
        <p className="text-gray-600 mb-8">No report available for today yet.</p>
        <button onClick={redirectForAuth} className="bg-orange-600 text-white px-6 py-3 rounded-full font-bold">
          Log in with Reddit
        </button>
      </div>
    );
  }

  return (
    <div className={`${embedded ? '' : 'min-h-screen'} bg-[#fcfcfc] text-gray-900 font-sans`}>
      {/* Header / Hero - only show when not embedded */}
      {!embedded && (
        <header className="bg-white border-b border-gray-200 py-12 px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src="/favicon.png" alt="Logo" className="w-10 h-10" />
              <span className="font-serif text-2xl font-bold tracking-tight text-orange-600">Reddzit Daily</span>
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              {report.title || 'Today on Reddit'}
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
      <main className="max-w-3xl mx-auto px-4 py-12 space-y-12">
        {report.stories.map((story) => (
          <article key={story.id} className="group relative bg-white p-0 sm:p-6 sm:rounded-2xl sm:shadow-sm sm:border sm:border-gray-100 transition hover:shadow-md">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wide">
                r/{story.subreddit}
              </span>
              <div className="text-xs text-gray-400">
                {story.score > 1000 ? `${(story.score/1000).toFixed(1)}k` : story.score} pts • {story.numComments} comments
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-3 text-gray-900 leading-tight group-hover:text-orange-600 transition-colors">
              <a 
                href={`https://www.reddit.com${story.redditPermalink}`} 
                target="_blank" 
                rel="noreferrer"
                onClick={() => handleStoryClick(story.id)}
              >
                {story.title}
              </a>
            </h2>

            {/* AI Summary */}
            <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Analysis</span>
                {story.sentimentLabel && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    story.sentimentLabel === 'DIVIDED' ? 'bg-red-100 text-red-700' : 
                    story.sentimentLabel === 'CONSENSUS' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {story.sentimentLabel}
                  </span>
                )}
              </div>
              <p className="text-gray-700 text-sm leading-relaxed mb-3">
                {story.summary}
              </p>
              {story.takeaways && Array.isArray(story.takeaways) && (
                <ul className="list-disc list-inside text-xs text-gray-600 space-y-1 pl-1">
                  {story.takeaways.map((point: string, i: number) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Highlight Comments */}
            {story.comments && story.comments.length > 0 && (
              <div className="space-y-3 pl-4 border-l-2 border-orange-100">
                {story.comments.map(comment => (
                  <div key={comment.id}>
                    <p className="text-sm text-gray-600 italic mb-1">"{comment.body.slice(0, 140)}{comment.body.length > 140 ? '...' : ''}"</p>
                    <div className="text-xs text-gray-400">— u/{comment.author}</div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 flex gap-4 pt-4 border-t border-gray-50">
               <button 
                onClick={() => handleInterest(story.id)}
                className="text-sm font-medium text-gray-500 hover:text-orange-600 flex items-center gap-1"
               >
                 👍 Interesting
               </button>
               <button 
                onClick={() => handleInterest(story.id)} // Reuse for MVP
                className="text-sm font-medium text-gray-500 hover:text-orange-600 flex items-center gap-1"
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
