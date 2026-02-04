import { useState, useEffect } from 'react';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getPreviewImage, getDisplayTitle, isComment, getCommentSnippet } from '../helpers/RedditUtils';
import NoContent from './NoContent';

// Demo data for Chrome Web Store screenshots — activate with ?demo=true
const DEMO_POSTS = [
  { id: 'd1', name: 't3_d1', subreddit: 'ExperiencedDevs', author: 'senior_eng', title: 'After 15 years of coding, these are the mass and principles I wish I learned earlier', thumbnail: 'self' },
  { id: 'd2', name: 't3_d2', subreddit: 'science', author: 'astro_prof', title: 'James Webb telescope confirms high-redshift galaxy that challenges dark matter models', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Hubble_ultra_deep_field.jpg/300px-Hubble_ultra_deep_field.jpg' },
  { id: 'd3', name: 't1_d3', subreddit: 'AskHistorians', author: 'medieval_nerd', title: 'Why did the Roman Empire really fall?', body: 'The short answer is that it didn\'t "fall" in the way most people imagine. The western half gradually transformed over centuries through a combination of economic pressures, administrative fragmentation, and shifting identities...' },
  { id: 'd4', name: 't3_d4', subreddit: 'Cooking', author: 'chef_maria', title: 'The single technique that leveled up every dish I make: how to properly build fond', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Saut%C3%A9ing_onions.jpg/300px-Saut%C3%A9ing_onions.jpg' },
  { id: 'd5', name: 't3_d5', subreddit: 'spacex', author: 'rocket_watcher', title: 'Starship Flight 8 successfully lands booster on first attempt — full mission breakdown', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/SpaceX_Starship_2019_prototype.jpg/300px-SpaceX_Starship_2019_prototype.jpg' },
  { id: 'd6', name: 't1_d6', subreddit: 'personalfinance', author: 'fire_coach', title: 'At what age should you start investing?', body: 'The best time to start is now. Even $50/month into a broad index fund at 22 will outperform someone who starts putting $500/month away at 35. Compound interest is the most powerful force in personal finance...' },
  { id: 'd7', name: 't3_d7', subreddit: 'MachineLearning', author: 'dl_researcher', title: 'New paper: Attention-free transformers achieve comparable performance with 40% less compute', thumbnail: 'self' },
  { id: 'd8', name: 't3_d8', subreddit: 'photography', author: 'street_shooter', title: 'I spent a year shooting only on a 35mm prime lens. Here\'s what it taught me about composition', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Everest_North_Face_toward_Base_Camp_Tibet_Luca_Galuzzi_2006.jpg/300px-Everest_North_Face_toward_Base_Camp_Tibet_Luca_Galuzzi_2006.jpg' },
  { id: 'd9', name: 't3_d9', subreddit: 'books', author: 'avid_reader', title: 'Just finished "Project Hail Mary" and I haven\'t felt this way about a book since I was a kid', thumbnail: 'self' },
  { id: 'd10', name: 't3_d10', subreddit: 'fitness', author: 'strength_coach', title: 'The research is clear: you only need 3 exercises to build a strong, functional body', thumbnail: 'self' },
];

const SavedFeed = () => {
  const { loading, saved, after, fetchSaved } = useReddit();
  const { isLight } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const handlePostClick = (post: any) => {
    const title = getDisplayTitle(post) || post.title || '';
    const slug = (title || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/, '');

    navigate(`/p/${post.name}/${slug}`, { state: { post } });
  };

  const handlePageUp = () => {
    if (after) {
      fetchSaved({ after });
      window.scrollTo(0, 0);
    }
  };

  const handlePageDown = () => {
    if (saved.length > 0) {
      const first = saved[0].name;
      fetchSaved({ before: first });
      window.scrollTo(0, 0);
    }
  };

  const posts = isDemo ? DEMO_POSTS : saved;

  if (!isDemo && loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin border-[var(--theme-primary)]"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <NoContent />
      </div>
    );
  }

  return (
    <div className="font-sans">
      {/* Header */}
      <header id="page-header" className="px-4 pb-2 sticky top-16 z-40 bg-[var(--theme-bg)]">
        <div className="max-w-7xl mx-auto border-b-2 border-[var(--theme-border)]">
          <div className="flex items-center justify-between py-4 pl-4">
            <h1 className="text-2xl font-bold text-[var(--theme-text)]">
              Saved Posts
            </h1>
            <span className="text-xs whitespace-nowrap text-[var(--theme-textMuted)]">
              {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              {' '}
              {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 pt-4 pb-24 grid grid-cols-1 md:grid-cols-2 gap-3">
        {posts.map((post) => (
          <article
            key={post.id}
            onClick={() => handlePostClick(post)}
            className={`group relative p-4 rounded-xl transition cursor-pointer border border-[var(--theme-border)] ${
              isLight ? 'bg-[var(--theme-cardBg)] hover:border-orange-600' : 'bg-transparent hover:border-[var(--theme-primary)]'
            }`}
          >
            <div className="flex gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs font-normal text-[var(--theme-primary)]">
                    r/{post.subreddit}
                  </span>
                </div>

                <h2 className="font-light text-base my-2 leading-tight text-[var(--theme-text)]">
                  {getDisplayTitle(post)}
                </h2>

                {isComment(post) && (
                  <div className="text-sm line-clamp-2 italic p-2 rounded text-[var(--theme-textMuted)] bg-[var(--theme-bgSecondary)]">
                    "{getCommentSnippet(post, 100)}"
                  </div>
                )}

                {post.author && (
                  <div className="text-xs text-[var(--theme-textMuted)]">
                    u/{post.author}
                  </div>
                )}
              </div>

              {getPreviewImage(post) && (
                <div className="flex-shrink-0 rounded-lg overflow-hidden self-center">
                  <img
                    src={getPreviewImage(post)}
                    alt=""
                    className="w-24 h-24 object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-4 pb-6">
        <button
          onClick={handlePageDown}
          className={`px-6 py-3 rounded-full font-medium transition-colors cursor-pointer border-none ${
            isLight
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              : 'bg-white/10 hover:bg-white/20 text-[var(--theme-text)]'
          }`}
        >
          Previous
        </button>
        <button
          onClick={handlePageUp}
          disabled={!after}
          className={`px-6 py-3 rounded-full font-medium shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-none ${
            isLight
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default SavedFeed;
