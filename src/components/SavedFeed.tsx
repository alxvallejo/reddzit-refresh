import { useReddit } from '../context/RedditContext';
import { useNavigate } from 'react-router-dom';
import { getPreviewImage, getDisplayTitle, isComment, getCommentSnippet } from '../helpers/RedditUtils';
import NoContent from './NoContent';

const SavedFeed = () => {
  const { loading, saved, after, fetchSaved } = useReddit();
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
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
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
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {saved.map((post) => (
        <div
          key={post.id}
          onClick={() => handlePostClick(post)}
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex gap-4 overflow-hidden border border-gray-100"
        >
          {/* Thumbnail */}
          <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
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
            <div className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-1">
              {post.subreddit}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 leading-tight mb-2 line-clamp-2">
              {getDisplayTitle(post)}
            </h3>
            {isComment(post) && (
              <div className="text-sm text-gray-500 line-clamp-2 italic bg-gray-50 p-2 rounded">
                "{getCommentSnippet(post, 100)}"
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Pagination */}
      <div className="flex justify-center gap-4 pt-6 pb-6">
        <button
          onClick={handlePageDown}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-full font-medium transition-colors cursor-pointer border-none"
        >
          Previous
        </button>
        <button
          onClick={handlePageUp}
          disabled={!after}
          className="bg-orange-600 text-white px-6 py-3 rounded-full font-medium shadow-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-none"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default SavedFeed;
