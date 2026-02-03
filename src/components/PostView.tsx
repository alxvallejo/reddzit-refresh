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
  const [copied, setCopied] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ top: number; left: number } | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteSaved, setQuoteSaved] = useState(false);

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

  const { themeName } = useTheme();
  const isLight = themeName === 'light';
  const bgColor = isLight ? 'bg-white text-gray-900' : 'bg-[var(--theme-bg)] text-[var(--theme-text)]';
  const headerBg = isLight ? 'bg-[#b6aaf1]/95' : 'bg-[var(--theme-bg)]/95';
  const articleClass = !isLight
    ? 'prose-invert prose-p:text-[var(--theme-text)] prose-p:font-light prose-headings:text-[var(--theme-text)] prose-headings:font-normal prose-strong:text-[var(--theme-text)] prose-strong:font-medium prose-li:text-[var(--theme-text)] prose-li:font-light prose-ul:text-[var(--theme-text)] prose-ol:text-[var(--theme-text)] prose-a:text-[var(--theme-primary)] prose-a:hover:text-[var(--theme-text)]'
    : 'prose-gray prose-p:font-light prose-headings:font-normal prose-strong:font-medium prose-li:font-light';
  
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
    setQuoteSaved(true);
    setTimeout(() => setQuoteSaved(false), 2000);
  };

  const openQuoteModal = () => {
    setShowQuoteModal(true);
    setSelectionPosition(null);
  };

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
        <div className="fixed bottom-0 left-0 right-0 p-4 pointer-events-none flex justify-center pb-8">
            <div className={`pointer-events-auto flex gap-4 backdrop-blur-xl border px-6 py-3 rounded-full shadow-2xl items-center ${
              !isLight
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-gray-900/90 border-gray-700 text-white'
            }`}>
                 <button
                    onClick={() => navigate(-1)}
                    className="font-bold hover:text-[#ff4500] transition-colors border-none bg-transparent cursor-pointer text-inherit"
                 >
                     ← Back
                 </button>
                 <span className="opacity-30">|</span>
                 {signedIn ? (
                     <button
                        onClick={async () => {
                          if (post.saved) {
                            await unsavePost(post.name);
                            setPost((prev: any) => ({ ...prev, saved: false }));
                          } else {
                            await savePost(post.name);
                            setPost((prev: any) => ({ ...prev, saved: true }));
                          }
                        }}
                        className="font-bold hover:text-[#ff4500] transition-colors border-none bg-transparent cursor-pointer text-inherit"
                     >
                         {post.saved ? 'Unsave' : 'Save'}
                     </button>
                 ) : (
                     <button
                        onClick={redirectForAuth}
                        className="font-bold hover:text-[#ff4500] transition-colors border-none bg-transparent cursor-pointer text-inherit"
                     >
                         Login to Save
                     </button>
                 )}
                 {signedIn && isComment(post) && (
                   <>
                     <span className="opacity-30">|</span>
                     <button
                        onClick={() => {
                          setSelectedText(post.body);
                          openQuoteModal();
                        }}
                        className="font-bold hover:text-[#ff4500] transition-colors border-none bg-transparent cursor-pointer text-inherit"
                     >
                         Save as Quote
                     </button>
                   </>
                 )}
                 {signedIn && getArticlePreviewImage(post) && !getVideoUrl(post) && (
                   <>
                     <span className="opacity-30">|</span>
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
                          setQuoteSaved(true);
                          setTimeout(() => setQuoteSaved(false), 2000);
                        }}
                        className="font-bold hover:text-[#ff4500] transition-colors border-none bg-transparent cursor-pointer text-inherit"
                     >
                         Save Image
                     </button>
                   </>
                 )}
                 <span className="opacity-30">|</span>
                 <button
                    onClick={handleShare}
                    className="font-bold hover:text-[#ff4500] transition-colors border-none bg-transparent cursor-pointer text-inherit"
                 >
                     {copied ? 'Copied!' : 'Share'}
                 </button>
                 <span className="opacity-30">|</span>
                 <a
                    href={`https://www.reddit.com${post.permalink}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold hover:text-[#ff4500] transition-colors text-inherit no-underline"
                 >
                     View on Reddit
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

        {/* Quote Saved Toast */}
        {quoteSaved && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-green-500 text-white text-sm font-medium shadow-lg">
            Quote saved!
          </div>
        )}
    </div>
  );
}
