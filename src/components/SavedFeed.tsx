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
    <div className="max-w-7xl mx-auto px-4 pt-6 pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {saved.map((post, index) => (
          <div
            key={post.id}
            onClick={() => handlePostClick(post)}
            className={`group rounded-xl p-4 transition cursor-pointer flex gap-4 overflow-hidden border ${
              themeName === 'light'
                ? 'bg-white shadow-sm hover:shadow-md border-gray-100'
                : 'backdrop-blur-md hover:bg-white/[0.12]'
            } ${index === 0 ? 'lg:col-span-2' : ''}`}
            style={themeName === 'light' ? undefined : ({
              backgroundColor: 'var(--theme-cardBg)',
              borderColor: 'var(--theme-border)'
            } as React.CSSProperties)}
          >
            {/* Thumbnail */}
            <div className={`flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center ${
              themeName === 'light' ? 'bg-gray-100' : 'bg-white/10'
            } ${index === 0 ? 'w-28 h-28 md:w-32 md:h-32' : 'w-20 h-20'}`}>
              {getPreviewImage(post) ? (
                <img
                  src={getPreviewImage(post)}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.innerText = '🔗';
                  }}
                />
              ) : (
                <span className="text-2xl">{post.is_self ? '📝' : '🔗'}</span>
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${
                themeName === 'light' ? 'text-orange-600' : 'text-[var(--theme-primary)]'
              }`}>
                {post.subreddit}
              </div>
              <h3 className={`font-light italic leading-tight mb-2 line-clamp-2 ${
                themeName === 'light' ? 'text-gray-900 group-hover:text-orange-600' : 'text-[#c4b8e8] group-hover:text-[var(--theme-primary)]'
              } ${index === 0 ? 'text-2xl md:text-3xl' : 'text-lg'}`}>
                {getDisplayTitle(post)}
              </h3>
              {isComment(post) && (
                <div className={`text-sm line-clamp-2 italic p-2 rounded ${
                  themeName === 'light' ? 'text-gray-500 bg-gray-50' : 'text-[var(--theme-textMuted)] bg-white/5'
                }`}>
                  "{getCommentSnippet(post, 100)}"
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-4 pt-8 pb-6">
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
