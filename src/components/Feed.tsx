import React, { useState } from 'react';
import { useReddit } from '../context/RedditContext';
import { useNavigate } from 'react-router-dom';
import { getPreviewImage, getDisplayTitle, isComment, getCommentSnippet } from '../helpers/RedditUtils';
import NoContent from './NoContent';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faUser, faCoffee, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

const Feed = () => {
  const { 
    signedIn, user, loading, logout, 
    saved, after, fetchSaved
  } = useReddit();
  
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handlePostClick = (post: any) => {
    // Generate slug
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
       window.scrollTo(0,0);
     }
  };

  const handlePageDown = () => {
      if (saved.length > 0) {
          const first = saved[0].name;
          fetchSaved({ before: first });
          window.scrollTo(0,0);
      }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!signedIn) {
      return (
         <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center flex-col p-4 text-center">
             <h2 className="text-white text-2xl mb-4">Please log in to view your feed</h2>
             <a href="/" className="bg-[#ff4500] text-white px-6 py-3 rounded-full font-bold shadow-lg no-underline">Go Home</a>
         </div>
      );
  }

  return (
    <div className="min-h-screen bg-[var(--color-primary)] pb-12">
      {/* Header */}
      <header className="bg-[var(--color-primary)] p-4 shadow-sm sticky top-0 z-10 flex justify-between items-center max-w-4xl mx-auto w-full backdrop-blur-md bg-opacity-95">
        <div className="flex items-center gap-3">
             <img src="/favicon.png" alt="Reddzit" className="w-10 h-10 drop-shadow-sm" />
             <div className="text-white">
                 <h1 className="text-2xl font-serif font-bold leading-none m-0">Reddzit</h1>
                 <p className="text-xs opacity-80 m-0 hidden sm:block">Review your Saved Reddit Posts</p>
             </div>
        </div>
        
        {user && (
            <div className="relative">
                <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 text-white bg-black/10 hover:bg-black/20 px-3 py-2 rounded-lg transition-colors border-none cursor-pointer"
                >
                    <span className="font-medium max-w-[150px] truncate block">u/{user.name}</span>
                    <FontAwesomeIcon icon={faChevronDown} className={`text-xs transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>
                
                {showUserMenu && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl py-2 overflow-hidden text-gray-800 z-50">
                        <a 
                            href={`https://www.reddit.com/user/${user.name}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-700 no-underline"
                        >
                            <FontAwesomeIcon icon={faUser} className="w-4 text-gray-400" /> 
                            View Reddit Profile
                        </a>
                        <a 
                            href="https://www.buymeacoffee.com/reddzit" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-sm text-gray-700 no-underline"
                        >
                            <FontAwesomeIcon icon={faCoffee} className="w-4 text-gray-400" /> 
                            Buy me a coffee
                        </a>
                        <button 
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 transition-colors text-sm text-left border-none bg-transparent cursor-pointer"
                        >
                            <FontAwesomeIcon icon={faSignOutAlt} className="w-4" /> 
                            Logout
                        </button>
                    </div>
                )}
            </div>
        )}
      </header>
      
      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {saved.length === 0 ? (
            <NoContent />
        ) : (
            saved.map((post) => (
                <div 
                    key={post.id} 
                    onClick={() => handlePostClick(post)}
                    className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex gap-4 overflow-hidden"
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
                        <div className="text-xs font-bold text-[#ff4500] uppercase tracking-wide mb-1">
                            {post.subreddit}
                        </div>
                        <h3 className="text-lg font-light text-gray-900 leading-tight mb-2 line-clamp-2">
                            {getDisplayTitle(post)}
                        </h3>
                         {isComment(post) && (
                            <div className="text-sm text-gray-500 line-clamp-2 italic bg-gray-50 p-2 rounded">
                                "{getCommentSnippet(post, 100)}"
                            </div>
                        )}
                    </div>
                </div>
            ))
        )}
        
        {/* Pagination */}
        {saved.length > 0 && (
            <div className="flex justify-center gap-4 pt-6 pb-6">
                <button 
                    onClick={handlePageDown}
                    className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-full font-bold backdrop-blur-sm transition-colors cursor-pointer border-none"
                >
                    Previous
                </button>
                <button 
                    onClick={handlePageUp}
                    disabled={!after}
                    className="bg-white text-[var(--color-primary-dark)] px-6 py-3 rounded-full font-bold shadow-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-none"
                >
                    Next
                </button>
            </div>
        )}
      </main>
    </div>
  );
};

export default Feed;
