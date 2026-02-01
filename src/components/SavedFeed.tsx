import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { getPreviewImage, getDisplayTitle, isComment, getCommentSnippet } from '../helpers/RedditUtils';
import NoContent from './NoContent';

const SavedFeed = () => {
  const { loading, saved, after, fetchSaved } = useReddit();
  const { themeName } = useTheme();
  const navigate = useNavigate();

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className={`w-10 h-10 border-4 border-t-transparent rounded-full animate-spin ${
          themeName === 'light' ? 'border-orange-500' : 'border-[var(--theme-primary)]'
        }`}></div>
      </div>
    );
  }

  if (saved.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <NoContent />
      </div>
    );
  }

  return (
    <div className="font-sans">
      {/* Header */}
      <header id="page-header" className="px-4 pb-2">
        <div className={`max-w-7xl mx-auto border-b-2 ${
          themeName === 'light' ? 'border-gray-900' : 'border-white/20'
        }`}>
          <div className="flex items-center justify-between py-4 pl-4">
            <div>
              <h1 className={`text-2xl font-bold ${themeName === 'light' ? 'text-gray-900' : ''}`}>
                Saved Posts
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 pt-4 pb-24 grid grid-cols-1 md:grid-cols-2 gap-3">
        {saved.map((post) => (
          <article
            key={post.id}
            onClick={() => handlePostClick(post)}
            className={`group relative p-4 rounded-xl transition cursor-pointer border ${
              themeName === 'light'
                ? 'bg-white border-gray-100 hover:shadow-md'
                : 'bg-transparent border-white/10 hover:bg-white/[0.08]'
            }`}
          >
            <div className="flex items-baseline justify-between mb-1">
              <span className={`text-xs font-normal ${
                themeName === 'light' ? 'text-orange-600' : 'text-[var(--theme-primary)]'
              }`}>
                r/{post.subreddit}
              </span>
            </div>

            <h2 className={`font-light text-base my-2 leading-tight transition-colors ${
              themeName === 'light'
                ? 'text-gray-900 group-hover:text-orange-600'
                : ''
            }`}>
              {getDisplayTitle(post)}
            </h2>

            {getPreviewImage(post) && (
              <div className="my-2 rounded-lg overflow-hidden">
                <img
                  src={getPreviewImage(post)}
                  alt=""
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                  }}
                />
              </div>
            )}

            {isComment(post) && (
              <div className={`text-sm line-clamp-2 italic p-2 rounded ${
                themeName === 'light' ? 'text-gray-500 bg-gray-50' : 'text-[var(--theme-textMuted)] bg-white/5'
              }`}>
                "{getCommentSnippet(post, 100)}"
              </div>
            )}

            {post.author && (
              <div className={`text-xs ${
                themeName === 'light' ? 'text-gray-400' : 'text-[var(--theme-textMuted)]'
              }`}>
                u/{post.author}
              </div>
            )}
          </article>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-4 pb-6">
        <button
          onClick={handlePageDown}
          className={`px-6 py-3 rounded-full font-medium transition-colors cursor-pointer border-none ${
            themeName === 'light'
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
            themeName === 'light'
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
