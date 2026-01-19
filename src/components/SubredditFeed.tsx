import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useReddit } from '../context/RedditContext';
import ForYouService, { SubredditPost, SubredditSuggestion } from '../helpers/ForYouService';
import TrendingMarquee from './TrendingMarquee';
import ThemeSwitcher from './ThemeSwitcher';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faChevronDown, faUser, faCoffee, faSignOutAlt, faArrowUp, faComment } from '@fortawesome/free-solid-svg-icons';

const SubredditFeed = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { themeName } = useTheme();
  const { signedIn, user, accessToken, logout, redirectForAuth } = useReddit();

  const [posts, setPosts] = useState<SubredditPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [suggestions, setSuggestions] = useState<SubredditSuggestion[]>([]);
  const [nextSuggestion, setNextSuggestion] = useState<SubredditSuggestion | null>(null);
  const [sort, setSort] = useState<'hot' | 'top' | 'new'>('hot');

  useEffect(() => {
    if (!name) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Load posts with sort
        const result = await ForYouService.getSubredditPosts(name, sort);
        setPosts(result.posts);

        // Load suggestions if signed in (only on initial load)
        if (accessToken && suggestions.length === 0) {
          const suggestionsResult = await ForYouService.getSuggestions(accessToken);
          // Filter out current subreddit and pick a random one
          const filtered = suggestionsResult.suggestions.filter(
            s => s.name.toLowerCase() !== name.toLowerCase()
          );
          setSuggestions(filtered);
          if (filtered.length > 0) {
            setNextSuggestion(filtered[Math.floor(Math.random() * filtered.length)]);
          }
        }
      } catch (err) {
        console.error('Failed to load subreddit:', err);
        setError('Failed to load posts');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [name, accessToken, sort]);

  // Format score
  const formatScore = (score: number) => {
    if (score >= 1000) return `${(score / 1000).toFixed(1)}k`;
    return String(score);
  };

  const handleNotInterested = async () => {
    if (!accessToken || !name || dismissing) return;

    setDismissing(true);
    try {
      await ForYouService.dismissSubreddit(accessToken, name);
      navigate('/foryou');
    } catch (err) {
      console.error('Failed to dismiss subreddit:', err);
    } finally {
      setDismissing(false);
    }
  };

  const handlePostClick = (post: SubredditPost) => {
    // Extract Reddit post ID from link
    const match = post.link?.match(/comments\/([a-z0-9]+)/i);
    const postId = match ? match[1] : post.id;
    const slug = post.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60);
    navigate(`/p/t3_${postId}/${slug}`);
  };

  // Render the header (shared between loading and loaded states)
  const renderHeader = () => (
    <header
      className={`sticky top-0 z-50 ${
        themeName === 'light'
          ? 'bg-white border-b border-gray-200'
          : 'border-b'
      }`}
      style={themeName === 'light' ? undefined : ({
        backgroundColor: 'var(--theme-headerBg)',
        borderColor: 'var(--theme-border)'
      } as React.CSSProperties)}
    >
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0 no-underline">
            <img src="/favicon.png" alt="Reddzit" className="w-8 h-8" />
            <span className={`font-serif text-xl font-bold hidden sm:block ${themeName === 'light' ? 'text-gray-900' : ''}`}>
              Reddzit
            </span>
          </Link>

          {/* Tabs */}
          <nav className="flex gap-1 overflow-x-auto px-4 sm:px-0 scrollbar-hide">
            <button
              onClick={() => navigate('/top')}
              className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors border-none cursor-pointer whitespace-nowrap ${
                themeName === 'light'
                  ? 'text-gray-600 hover:bg-gray-100 bg-transparent'
                  : 'text-gray-300 hover:bg-white/10 bg-transparent'
              }`}
            >
              Top
            </button>
            <button
              onClick={() => navigate('/reddit')}
              className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors border-none cursor-pointer whitespace-nowrap ${
                themeName === 'light'
                  ? 'text-gray-600 hover:bg-gray-100 bg-transparent'
                  : 'text-gray-300 hover:bg-white/10 bg-transparent'
              }`}
            >
              <span className="sm:hidden">Saved</span>
              <span className="hidden sm:inline">Saved Posts</span>
            </button>
            <button
              onClick={() => navigate('/foryou')}
              className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-colors border-none cursor-pointer whitespace-nowrap ${
                themeName === 'light'
                  ? 'text-gray-600 hover:bg-gray-100 bg-transparent'
                  : 'text-gray-300 hover:bg-white/10 bg-transparent'
              }`}
            >
              For You
            </button>
          </nav>

          {/* Theme Switcher */}
          <ThemeSwitcher />

          {/* User Menu / Login */}
          {signedIn && user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border-none cursor-pointer bg-transparent ${
                  themeName === 'light' ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-200 hover:bg-white/10'
                }`}
              >
                <span className="font-medium text-sm max-w-[120px] truncate hidden sm:block">u/{user.name}</span>
                <span className="font-medium text-sm sm:hidden"><FontAwesomeIcon icon={faUser} /></span>
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`text-xs transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                />
              </button>

              {showUserMenu && (
                <div className={`absolute right-0 top-full mt-2 w-52 rounded-xl shadow-xl py-2 border z-50 ${
                  themeName === 'light'
                    ? 'bg-white border-gray-100'
                    : 'bg-[#3d3466] border-[#7e87ef]/30'
                }`}>
                  <a
                    href={`https://www.reddit.com/user/${user.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm no-underline ${
                      themeName === 'light' ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/10 text-gray-200'
                    }`}
                  >
                    <FontAwesomeIcon icon={faUser} className="w-4 text-gray-400" />
                    Reddit Profile
                  </a>
                  <a
                    href="https://www.buymeacoffee.com/reddzit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm no-underline ${
                      themeName === 'light' ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/10 text-gray-200'
                    }`}
                  >
                    <FontAwesomeIcon icon={faCoffee} className="w-4 text-gray-400" />
                    Buy me a coffee
                  </a>
                  <hr className={`my-2 ${themeName === 'light' ? 'border-gray-100' : 'border-white/10'}`} />
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/20 text-red-400 text-sm text-left border-none bg-transparent cursor-pointer"
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border-none cursor-pointer ${
                themeName === 'light'
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
              }`}
            >
              Log in
            </button>
          )}
        </div>
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className={`min-h-screen ${themeName === 'light' ? 'bg-[#fcfcfc]' : 'bg-[var(--theme-bg)]'}`}>
        {renderHeader()}
        <TrendingMarquee />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="animate-pulse text-xl">Loading r/{name}...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        themeName === 'light' ? 'bg-[#fcfcfc] text-gray-900' : 'bg-[var(--theme-bg)] text-[var(--theme-text)]'
      }`}
    >
      {renderHeader()}

      <TrendingMarquee />

      {/* Subreddit Header */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Back button */}
            <button
              onClick={() => navigate('/foryou')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border-none cursor-pointer ${
                themeName === 'light'
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              <span className="hidden sm:inline">Back</span>
            </button>

            <h1 className={`text-2xl font-bold ${themeName === 'light' ? 'text-gray-900' : ''}`}>
              r/{name}
            </h1>

            {/* Sort selector */}
            <div className="flex items-center gap-1">
              {(['hot', 'top', 'new'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border-none cursor-pointer capitalize ${
                    sort === s
                      ? themeName === 'light'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-white/20 text-white'
                      : themeName === 'light'
                        ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                        : 'text-gray-400 hover:bg-white/10 bg-transparent'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Next suggestion */}
            {nextSuggestion && (
              <Link
                to={`/r/${nextSuggestion.name}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors no-underline ${
                  themeName === 'light'
                    ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    : 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/30'
                }`}
              >
                Try r/{nextSuggestion.name}
              </Link>
            )}

            {/* Not Interested */}
            {accessToken && (
              <button
                onClick={handleNotInterested}
                disabled={dismissing}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  themeName === 'light'
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                } border-none cursor-pointer disabled:opacity-50`}
              >
                {dismissing ? '...' : 'Not Interested'}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="text-red-500 text-center py-8">{error}</div>
        </div>
      )}

      {/* Posts grid */}
      {posts.length > 0 ? (
        <main className="max-w-7xl mx-auto px-4 pt-4 pb-24 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {posts.map((post, index) => (
            <article
              key={post.id || index}
              onClick={() => handlePostClick(post)}
              className={`group relative p-4 sm:p-6 rounded-xl sm:rounded-2xl cursor-pointer transition border ${
                themeName === 'light'
                  ? 'bg-white sm:shadow-sm sm:border-gray-100 hover:shadow-md'
                  : 'sm:backdrop-blur-md sm:border hover:bg-white/[0.12]'
              } ${index === 0 ? 'lg:col-span-2' : ''}`}
              style={themeName === 'light' ? undefined : {
                backgroundColor: 'var(--theme-cardBg)',
                borderColor: 'var(--theme-border)'
              }}
            >
              {/* Stats row */}
              <div className={`flex items-center gap-3 mb-2 text-xs ${
                themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]'
              }`}>
                <span className="flex items-center gap-1">
                  <FontAwesomeIcon icon={faArrowUp} className="text-[10px]" />
                  {formatScore(post.score)}
                </span>
                <span className="flex items-center gap-1">
                  <FontAwesomeIcon icon={faComment} className="text-[10px]" />
                  {post.numComments}
                </span>
              </div>

              <h2 className={`font-medium mb-3 leading-tight transition-colors ${
                index === 0 ? 'text-2xl md:text-3xl' : 'text-lg'
              } ${
                themeName === 'light'
                  ? 'text-gray-900 group-hover:text-orange-600'
                  : 'group-hover:text-[var(--theme-primary)]'
              }`}>
                {post.title}
              </h2>

              {/* Thumbnail for first post */}
              {index === 0 && post.thumbnail && post.thumbnail !== 'self' && post.thumbnail !== 'default' && (
                <div className="mb-4 rounded-xl overflow-hidden">
                  <img
                    src={post.thumbnail}
                    alt=""
                    loading="lazy"
                    className="w-full h-48 sm:h-64 object-cover"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
              )}

              <div className={`text-xs ${
                themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]'
              }`}>
                by {post.author}
              </div>
            </article>
          ))}
        </main>
      ) : !error && (
        <div className={`text-center py-12 ${themeName === 'light' ? 'text-gray-500' : 'text-[var(--theme-textMuted)]'}`}>
          No posts found
        </div>
      )}
    </div>
  );
};

export default SubredditFeed;
