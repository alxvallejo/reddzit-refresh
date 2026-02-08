import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import { getPostType, handlePostType, getParsedContent, getArticlePreviewImage, getDisplayTitle, isComment } from '../helpers/RedditUtils';
import { getVideoUrl } from '../helpers/UrlCrawler';
import MainHeader from './MainHeader';
import ReadControls from './ReadControls';
import TrendingMarquee from './TrendingMarquee';
import API_BASE_URL from '../config/api';
import QuoteSelectionButton from './QuoteSelectionButton';
import QuoteModal from './QuoteModal';
import QuoteService from '../helpers/QuoteService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faBookmark as faBookmarkSolid, faShareNodes, faQuoteLeft, faImage, faArrowUpRightFromSquare, faSignInAlt, faBook, faPlus, faCheck, faTimes, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import StoryService, { Story } from '../helpers/StoryService';
import { faBookmark as faBookmarkRegular } from '@fortawesome/free-regular-svg-icons';

export default function PostView() {
  const { fullname } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Use context for preferences.
  const {
    fontSize, setFontSize,
    darkMode, toggleDarkMode,
    savePost, unsavePost,
    signedIn, redirectForAuth,
    accessToken
  } = useReddit();

  const [post, setPost] = useState<any>(location.state?.post || null);
  const [content, setContent] = useState<any>(location.state?.content || null);
  const [loading, setLoading] = useState(!location.state?.post);
  const [error, setError] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ top: number; left: number } | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showStoryPicker, setShowStoryPicker] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [creatingStory, setCreatingStory] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const [newStorySaving, setNewStorySaving] = useState(false);
  const storyPickerRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  // Scroll to top on mount/navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [fullname]);

  // Update document title
  useEffect(() => {
    if (post?.title) {
      document.title = post.title;
    }
  }, [post?.title]);

  // Handle scroll for sticky header
  useEffect(() => {
      const handleScroll = () => {
          const scrollTop = window.scrollY || document.documentElement.scrollTop;
          setIsScrolled(scrollTop > 50);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle text selection for quote feature
  useEffect(() => {
    if (!signedIn) return;

    const handleSelectionChange = () => {
      // Don't touch selectedText while the quote modal is open —
      // focusing the textarea clears the browser selection which would wipe the quote.
      if (showQuoteModal) return;

      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 0) {
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();

        if (rect) {
          setSelectedText(text);
          setSelectionPosition({
            top: rect.top - 45,
            left: rect.left + rect.width / 2
          });
        }
      } else {
        setSelectedText('');
        setSelectionPosition(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [signedIn, showQuoteModal]);

  // Fetch Logic
  useEffect(() => {
    if (location.state?.post && location.state?.content) {
        return;
    }
    
    let cancelled = false;

    async function load() {
      try {
        let p = post;
        
        // If we don't have the post object, fetch it via backend proxy to avoid CORS
        if (!p) {
             const r = await fetch(`${API_BASE_URL}/api/reddit/public/by_id/${fullname}`);
             if (r.ok) {
                 const json = await r.json();
                 p = json?.data?.children?.[0]?.data;
             }
        }

        if (!p) {
          if (!cancelled) setError('Post not found');
          return;
        }
        if (!cancelled) setPost(p);

        // Extract content if not already present
        if (!content) {
             const postType = getPostType(p);
             const extractedContent = await handlePostType(postType);
             if (!cancelled) setContent(extractedContent);
        }
      } catch (err) {
        console.error('Error loading post:', err);
        if (!cancelled) setError('Unable to load post');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [fullname, location.state]);

  const { isLight } = useTheme();
  const bgColor = 'bg-[var(--theme-bg)] text-[var(--theme-text)]';
  const headerBg = isLight ? 'bg-[#b6aaf1]/95' : 'bg-[var(--theme-bg)]/95';
  const articleClass = !isLight
    ? 'prose-invert prose-p:text-[var(--theme-text)] prose-p:font-light prose-headings:text-gray-100 prose-headings:font-normal prose-strong:text-white prose-strong:font-medium prose-li:text-[var(--theme-text)] prose-li:font-light prose-ul:text-[var(--theme-text)] prose-ol:text-[var(--theme-text)] prose-a:text-[var(--theme-primary)] prose-a:hover:text-white'
    : 'prose-gray prose-p:font-light prose-headings:font-normal prose-strong:font-medium prose-li:font-light';
  
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSaveQuote = async (note: string, tags: string[], storyId?: string) => {
    if (!accessToken || !post) return;

    await QuoteService.createQuote(accessToken, {
      postId: post.name || `t3_${post.id}`,
      text: selectedText,
      note: note || undefined,
      tags: tags.length > 0 ? tags : undefined,
      sourceUrl: post.url || `https://www.reddit.com${post.permalink}`,
      subreddit: post.subreddit,
      postTitle: post.link_title || post.title,
      author: post.author,
      storyId
    });

    setSelectedText('');
    setSelectionPosition(null);
    showToast('Quote saved!');
  };

  const openQuoteModal = () => {
    setShowQuoteModal(true);
    setSelectionPosition(null);
  };

  // Story picker logic
  const openStoryPicker = async () => {
    setShowStoryPicker(true);
    if (!accessToken || stories.length > 0) return;
    setStoriesLoading(true);
    try {
      const { stories: s } = await StoryService.listStories(accessToken);
      setStories(s);
    } catch {}
    finally { setStoriesLoading(false); }
  };

  const handleAddToStory = async (storyId: string) => {
    if (!accessToken || !post) return;
    const postTitle = post.link_title || post.title;
    const sourceUrl = post.url || `https://www.reddit.com${post.permalink}`;
    const bodyText = isComment(post) ? post.body : (post.selftext || postTitle);
    await QuoteService.createQuote(accessToken, {
      postId: post.name || `t3_${post.id}`,
      text: bodyText,
      sourceUrl,
      subreddit: post.subreddit,
      postTitle,
      author: post.author,
      storyId,
    });
    setShowStoryPicker(false);
    showToast('Added to story!');
  };

  const handleCreateStoryInline = async () => {
    if (!accessToken || !newStoryTitle.trim()) return;
    setNewStorySaving(true);
    try {
      const { story } = await StoryService.createStory(accessToken, { title: newStoryTitle.trim() });
      setStories(prev => [...prev, story]);
      setNewStoryTitle('');
      setCreatingStory(false);
      await handleAddToStory(story.id);
    } catch {
      showToast('Failed to create story');
    } finally {
      setNewStorySaving(false);
    }
  };

  // Close story picker on outside click
  useEffect(() => {
    if (!showStoryPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (storyPickerRef.current && !storyPickerRef.current.contains(e.target as Node)) {
        setShowStoryPicker(false);
        setCreatingStory(false);
        setNewStoryTitle('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showStoryPicker]);

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${bgColor}`}>
      <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (error || !post) return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${bgColor}`}>
        <h2 className="text-2xl font-bold mb-4">Unable to load post</h2>
        <p className="mb-6">{error}</p>
        <Link to="/" className="bg-[#ff4500] text-white px-6 py-3 rounded-full font-bold shadow-lg no-underline">Back to Feed</Link>
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${bgColor} w-full`}>
        {/* Header */}
        {signedIn ? (
          <MainHeader />
        ) : (
          <header className={`sticky top-0 z-50 transition-all duration-300 backdrop-blur-md shadow-sm px-4 py-3 flex items-center justify-between ${headerBg}`}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Link to="/" className="flex-shrink-0">
                      <img src="/favicon.png" alt="Reddzit" className="w-8 h-8 drop-shadow-sm" />
                  </Link>

                  <div className={`transition-opacity duration-300 ${isScrolled ? 'opacity-100' : 'opacity-0 hidden sm:block'}`}>
                       <h2 className="text-sm font-medium truncate max-w-[200px] sm:max-w-md text-white">
                          {getDisplayTitle(post)}
                       </h2>
                  </div>

                  {!isScrolled && (
                       <div className="text-white">
                          <Link to="/" className="text-white font-serif font-bold text-xl no-underline hover:opacity-80">Reddzit</Link>
                       </div>
                  )}
              </div>

              <div className="flex-shrink-0">
                  <ReadControls
                      fontSize={fontSize}
                      setSize={setFontSize}
                      darkMode={darkMode}
                      toggleDarkMode={toggleDarkMode}
                  />
              </div>
          </header>
        )}

        {/* Trending Marquee */}
        <TrendingMarquee />

        {/* Content */}
        <main className="max-w-3xl mx-auto px-4 py-8 pb-32">
             <div className="mb-8">
                 <div className="text-[#ff4500] font-bold text-sm uppercase tracking-wide mb-2">
                     {post.subreddit}
                 </div>
                 <h1 className={`text-3xl sm:text-4xl font-sans leading-tight mb-4 ${!isLight ? 'font-extralight' : 'font-normal'}`}>
                     <a href={`https://www.reddit.com${post.permalink}`} target="_blank" rel="noreferrer" className="hover:text-[#ff4500] transition-colors text-inherit no-underline">
                        {getDisplayTitle(post)}
                     </a>
                 </h1>
                 
                 {/* Preview Image - skip for video posts since video has its own thumbnail */}
                 {getArticlePreviewImage(post) && !getVideoUrl(post) && (
                     <div className="rounded-xl overflow-hidden my-6 shadow-md">
                         <img
                            src={getArticlePreviewImage(post)}
                            alt=""
                            className="w-full h-auto object-cover"
                         />
                     </div>
                 )}
             </div>
             
             {/* Article Content */}
             <article className={`prose prose-lg max-w-none break-words ${articleClass}`} style={{ fontSize: `${fontSize}px` }}>
                 {getParsedContent(content, false, post, fontSize, !!getArticlePreviewImage(post))}
             </article>
        </main>
        
        {/* Sticky Footer Actions */}
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pointer-events-none flex justify-center">
            <div className={`pointer-events-auto flex w-full sm:w-auto justify-evenly sm:justify-center gap-0 sm:gap-4 backdrop-blur-xl border px-2 sm:px-6 py-3 rounded-full shadow-2xl items-center ${
              !isLight
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-gray-900/90 border-gray-700 text-white'
            }`}>
                 <button
                    onClick={() => navigate(-1)}
                    title="Back"
                    className="p-3 sm:px-0 sm:py-0 text-lg sm:text-base hover:text-[#ff4500] transition-colors border-none bg-transparent cursor-pointer text-inherit font-bold"
                 >
                     <FontAwesomeIcon icon={faArrowLeft} className="sm:mr-1.5" />
                     <span className="hidden sm:inline">Back</span>
                 </button>
                 <span className="opacity-30 hidden sm:inline">|</span>
                 {signedIn ? (
                     <button
                        onClick={async () => {
                          if (post.saved) {
                            await unsavePost(post.name);
                            setPost((prev: any) => ({ ...prev, saved: false }));
                            showToast('Post unsaved');
                          } else {
                            await savePost(post.name);
                            setPost((prev: any) => ({ ...prev, saved: true }));
                            showToast('Post saved!');
                          }
                        }}
                        title={post.saved ? 'Unsave' : 'Save'}
                        className="p-3 sm:px-0 sm:py-0 text-lg sm:text-base hover:text-[#ff4500] transition-colors border-none bg-transparent cursor-pointer text-inherit font-bold"
                     >
                         <FontAwesomeIcon icon={post.saved ? faBookmarkSolid : faBookmarkRegular} className="sm:mr-1.5" />
                         <span className="hidden sm:inline">{post.saved ? 'Unsave' : 'Save'}</span>
                     </button>
                 ) : (
                     <button
                        onClick={redirectForAuth}
                        title="Login to Save"
                        className="p-3 sm:px-0 sm:py-0 text-lg sm:text-base hover:text-[#ff4500] transition-colors border-none bg-transparent cursor-pointer text-inherit font-bold"
                     >
                         <FontAwesomeIcon icon={faSignInAlt} className="sm:mr-1.5" />
                         <span className="hidden sm:inline">Login to Save</span>
                     </button>
                 )}
                 {signedIn && (
                   <>
                     <span className="opacity-30 hidden sm:inline">|</span>
                     <div className="relative" ref={storyPickerRef}>
                       <button
                          onClick={openStoryPicker}
                          title="Add to Story"
                          className="p-3 sm:px-0 sm:py-0 text-lg sm:text-base hover:text-[#ff4500] transition-colors border-none bg-transparent cursor-pointer text-inherit font-bold"
                       >
                           <FontAwesomeIcon icon={faBook} className="sm:mr-1.5" />
                           <span className="hidden sm:inline">Add to Story</span>
                       </button>

                       {/* Story picker dropdown */}
                       {showStoryPicker && (
                         <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 rounded-xl shadow-2xl overflow-hidden border ${
                           !isLight
                             ? 'bg-[var(--theme-bg)] border-white/20'
                             : 'bg-white border-gray-200'
                         }`}>
                           <div className="px-3 py-2 border-b border-[var(--theme-border)]">
                             <span className={`text-xs font-semibold ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                               Add to Story
                             </span>
                           </div>
                           <div className="max-h-48 overflow-y-auto">
                             {storiesLoading ? (
                               <div className="flex justify-center py-4">
                                 <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />
                               </div>
                             ) : stories.length === 0 ? (
                               <div className={`px-3 py-3 text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                                 No stories yet. Create one below.
                               </div>
                             ) : (
                               stories.map(s => (
                                 <button
                                   key={s.id}
                                   onClick={() => handleAddToStory(s.id)}
                                   className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left border-none cursor-pointer transition-colors ${
                                     isLight
                                       ? 'bg-transparent text-gray-900 hover:bg-gray-50'
                                       : 'bg-transparent text-gray-200 hover:bg-white/5'
                                   }`}
                                 >
                                   <FontAwesomeIcon icon={faBook} className="text-xs opacity-40" />
                                   <span className="truncate">{s.title}</span>
                                 </button>
                               ))
                             )}
                           </div>
                           <div className="border-t border-[var(--theme-border)]">
                             {creatingStory ? (
                               <div className="flex items-center gap-2 p-2">
                                 <input
                                   type="text"
                                   value={newStoryTitle}
                                   onChange={(e) => setNewStoryTitle(e.target.value)}
                                   onKeyDown={(e) => {
                                     if (e.key === 'Enter') handleCreateStoryInline();
                                     if (e.key === 'Escape') { setCreatingStory(false); setNewStoryTitle(''); }
                                   }}
                                   placeholder="Story title..."
                                   autoFocus
                                   className={`flex-1 px-2.5 py-1.5 rounded text-sm focus:outline-none focus:ring-1 ${
                                     isLight
                                       ? 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-orange-500/50'
                                       : 'bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:ring-[var(--theme-border)]'
                                   }`}
                                 />
                                 <button
                                   onClick={handleCreateStoryInline}
                                   disabled={newStorySaving || !newStoryTitle.trim()}
                                   className={`p-1.5 rounded text-xs transition-colors border-none cursor-pointer disabled:opacity-40 ${
                                     isLight
                                       ? 'bg-orange-600 text-white hover:bg-orange-700'
                                       : 'bg-[var(--theme-primary)] text-[var(--theme-bg)] hover:opacity-90'
                                   }`}
                                 >
                                   <FontAwesomeIcon icon={faCheck} />
                                 </button>
                                 <button
                                   onClick={() => { setCreatingStory(false); setNewStoryTitle(''); }}
                                   className={`p-1.5 rounded text-xs transition-colors border-none cursor-pointer ${
                                     isLight
                                       ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                       : 'bg-white/10 text-gray-400 hover:bg-white/20'
                                   }`}
                                 >
                                   <FontAwesomeIcon icon={faTimes} />
                                 </button>
                               </div>
                             ) : (
                               <button
                                 onClick={() => setCreatingStory(true)}
                                 className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left border-none cursor-pointer transition-colors ${
                                   isLight
                                     ? 'bg-transparent text-orange-600 hover:bg-orange-50'
                                     : 'bg-transparent text-[var(--theme-primary)] hover:bg-white/5'
                                 }`}
                               >
                                 <FontAwesomeIcon icon={faPlus} className="text-xs" />
                                 New Story
                               </button>
                             )}
                           </div>
                         </div>
                       )}
                     </div>
                   </>
                 )}
                 {signedIn && isComment(post) && (
                   <>
                     <span className="opacity-30 hidden sm:inline">|</span>
                     <button
                        onClick={() => {
                          setSelectedText(post.body);
                          openQuoteModal();
                        }}
                        title="Save as Quote"
                        className="p-3 sm:px-0 sm:py-0 text-lg sm:text-base hover:text-[#ff4500] transition-colors border-none bg-transparent cursor-pointer text-inherit font-bold"
                     >
                         <FontAwesomeIcon icon={faQuoteLeft} className="sm:mr-1.5" />
                         <span className="hidden sm:inline">Save as Quote</span>
                     </button>
                   </>
                 )}
                 {signedIn && getArticlePreviewImage(post) && !getVideoUrl(post) && (
                   <>
                     <span className="opacity-30 hidden sm:inline">|</span>
                     <button
                        onClick={async () => {
                          if (!accessToken) return;
                          await QuoteService.createQuote(accessToken, {
                            postId: post.name || `t3_${post.id}`,
                            text: getArticlePreviewImage(post)!,
                            sourceUrl: post.url || `https://www.reddit.com${post.permalink}`,
                            subreddit: post.subreddit,
                            postTitle: post.link_title || post.title,
                            author: post.author,
                          });
                          showToast('Image saved!');
                        }}
                        title="Save Image"
                        className="p-3 sm:px-0 sm:py-0 text-lg sm:text-base hover:text-[#ff4500] transition-colors border-none bg-transparent cursor-pointer text-inherit font-bold"
                     >
                         <FontAwesomeIcon icon={faImage} className="sm:mr-1.5" />
                         <span className="hidden sm:inline">Save Image</span>
                     </button>
                   </>
                 )}
                 <span className="opacity-30 hidden sm:inline">|</span>
                 <button
                    onClick={handleShare}
                    title="Share"
                    className="p-3 sm:px-0 sm:py-0 text-lg sm:text-base hover:text-[#ff4500] transition-colors border-none bg-transparent cursor-pointer text-inherit font-bold"
                 >
                     <FontAwesomeIcon icon={faShareNodes} className="sm:mr-1.5" />
                     <span className="hidden sm:inline">Share</span>
                 </button>
                 <span className="opacity-30 hidden sm:inline">|</span>
                 <a
                    href={`https://www.reddit.com${post.permalink}`}
                    target="_blank"
                    rel="noreferrer"
                    title="View on Reddit"
                    className="p-3 sm:px-0 sm:py-0 text-lg sm:text-base hover:text-[#ff4500] transition-colors text-inherit no-underline font-bold"
                 >
                     <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="sm:mr-1.5" />
                     <span className="hidden sm:inline">View on Reddit</span>
                 </a>
            </div>
        </div>

        {/* Quote Selection Button */}
        {signedIn && selectionPosition && selectedText && (
          <QuoteSelectionButton
            position={selectionPosition}
            onClick={openQuoteModal}
          />
        )}

        {/* Quote Modal */}
        <QuoteModal
          isOpen={showQuoteModal}
          onClose={() => setShowQuoteModal(false)}
          onSave={handleSaveQuote}
          selectedText={selectedText}
          sourceUrl={post?.url || `https://www.reddit.com${post?.permalink}`}
          postTitle={post?.link_title || post?.title || ''}
          accessToken={accessToken || undefined}
        />

        {/* Toast */}
        {toast && (
          <div
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-medium shadow-lg text-[var(--theme-bg)]"
            style={{ backgroundColor: 'var(--theme-primary)' }}
          >
            {toast}
          </div>
        )}
    </div>
  );
}
