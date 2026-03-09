import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import { getParsedContent } from '../helpers/RedditUtils';
import LinkService, { SavedLink, LinkContent } from '../helpers/LinkService';
import MainHeader from './MainHeader';
import ReadControls from './ReadControls';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faTrash, faArrowUpRightFromSquare, faShareNodes } from '@fortawesome/free-solid-svg-icons';

export default function LinkView() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const { fontSize, setFontSize, accessToken, signedIn } = useReddit();
  const { isLight, contentFont, setContentFont } = useTheme();

  const [link, setLink] = useState<SavedLink | null>(location.state?.link || null);
  const [content, setContent] = useState<LinkContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const bgColor = 'bg-[var(--theme-bg)] text-[var(--theme-text)]';
  const articleClass = !isLight
    ? 'prose-invert prose-p:text-[var(--theme-text)] prose-p:font-light prose-headings:text-gray-100 prose-headings:font-normal prose-strong:text-white prose-strong:font-medium prose-li:text-[var(--theme-text)] prose-li:font-light prose-ul:text-[var(--theme-text)] prose-ol:text-[var(--theme-text)] prose-a:text-[var(--theme-primary)] prose-a:hover:text-white'
    : 'prose-gray prose-p:font-light prose-headings:font-normal prose-strong:font-medium prose-li:font-light';

  // Scroll to top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // Update title
  useEffect(() => {
    if (link?.title) {
      document.title = link.title;
    }
  }, [link?.title]);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled((window.scrollY || document.documentElement.scrollTop) > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch content
  useEffect(() => {
    if (!accessToken || !id) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await LinkService.getLinkContent(accessToken, id);
        if (cancelled) return;
        setLink(data.link);
        setContent(data.content);
      } catch (err) {
        console.error('Failed to load link content:', err);
        if (!cancelled) setError('Unable to load link');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [accessToken, id]);

  const handleDelete = async () => {
    if (!accessToken || !id) return;
    try {
      await LinkService.deleteLink(accessToken, id);
      showToast('Link deleted');
      setTimeout(() => navigate('/links'), 300);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(link?.url || window.location.href);
      showToast('Link copied!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bgColor}`}>
        <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${bgColor}`}>
        <h2 className="text-2xl font-bold mb-4">Unable to load link</h2>
        <p className="mb-6">{error}</p>
        <Link to="/links" className="bg-[#ff4500] text-white px-6 py-3 rounded-full font-bold shadow-lg no-underline">
          Back to Links
        </Link>
      </div>
    );
  }

  // Content extraction failed — show fallback with "Read Original" link
  const showFallback = !content;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${bgColor} w-full`}>
      <MainHeader />

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 pb-32">
        <div className="mb-8">
          {link.domain && (
            <div className="text-[var(--theme-primary)] font-bold text-sm uppercase tracking-wide mb-2">
              {link.domain}
            </div>
          )}
          <h1 className={`text-3xl sm:text-4xl font-sans leading-tight mb-4 ${!isLight ? 'font-extralight' : 'font-normal'}`}>
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[var(--theme-primary)] transition-colors text-inherit no-underline"
            >
              {link.title || link.url}
            </a>
          </h1>
        </div>

        {/* Read Controls */}
        {signedIn && (
          <div className="flex justify-end mb-4">
            <ReadControls
              fontSize={fontSize}
              setSize={setFontSize}
              contentFont={contentFont}
              setContentFont={setContentFont}
            />
          </div>
        )}

        {/* Saved image */}
        {link.imageUrl && (
          <div className="mb-8">
            <img
              src={link.imageUrl}
              alt={link.title || 'Saved image'}
              className={`w-full rounded-2xl border ${
                isLight ? 'border-gray-200' : 'border-white/10'
              }`}
              style={{ maxHeight: '70vh', objectFit: 'contain' }}
            />
          </div>
        )}

        {showFallback && !link.imageUrl ? (
          /* Fallback: extraction failed and no image */
          <div className={`text-center py-16 px-4 rounded-2xl border ${
            isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'
          }`}>
            <div className="text-4xl mb-4">📄</div>
            <h2 className={`text-xl font-medium mb-3 ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
              Content couldn't be extracted
            </h2>
            <p className={`mb-6 max-w-md mx-auto ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
              This page couldn't be parsed for reading. You can still read it on the original site.
            </p>
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold no-underline transition-colors shadow-lg ${
                isLight
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-[var(--theme-primary)] text-[var(--theme-bg)] hover:opacity-90'
              }`}
            >
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
              Read Original
            </a>
          </div>
        ) : (
          /* Extracted article content */
          <article
            className={`prose prose-lg max-w-none break-words ${articleClass}`}
            style={{ fontSize: `${fontSize}px` }}
            data-content-font={contentFont}
          >
            {getParsedContent(content, false, null, fontSize, false)}
          </article>
        )}
      </main>

      {/* Sticky Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pointer-events-none flex justify-center">
        <div className={`pointer-events-auto flex w-full sm:w-auto justify-evenly sm:justify-center gap-0 sm:gap-3 backdrop-blur-xl border px-2 sm:px-6 py-3 rounded-full shadow-2xl items-center ${
          !isLight
            ? 'bg-white/8 border-white/15 text-white/80'
            : 'bg-gray-900/85 border-gray-700/50 text-gray-200'
        }`}>
          <button
            onClick={() => navigate(-1)}
            title="Back"
            className="p-3 sm:px-0 sm:py-0 text-lg sm:text-sm hover:text-white transition-colors border-none bg-transparent cursor-pointer text-inherit font-normal tracking-wide"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="sm:mr-1.5" />
            <span className="hidden sm:inline">Back</span>
          </button>
          <span className="opacity-20 hidden sm:inline text-xs">·</span>
          <button
            onClick={handleDelete}
            title="Delete"
            className="p-3 sm:px-0 sm:py-0 text-lg sm:text-sm hover:text-red-400 transition-colors border-none bg-transparent cursor-pointer text-inherit font-normal tracking-wide"
          >
            <FontAwesomeIcon icon={faTrash} className="sm:mr-1.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>
          <span className="opacity-20 hidden sm:inline text-xs">·</span>
          <button
            onClick={handleShare}
            title="Copy Link"
            className="p-3 sm:px-0 sm:py-0 text-lg sm:text-sm hover:text-white transition-colors border-none bg-transparent cursor-pointer text-inherit font-normal tracking-wide"
          >
            <FontAwesomeIcon icon={faShareNodes} className="sm:mr-1.5" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <span className="opacity-20 hidden sm:inline text-xs">·</span>
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            title="Open Original"
            className="p-3 sm:px-0 sm:py-0 text-lg sm:text-sm hover:text-white transition-colors text-inherit no-underline font-normal tracking-wide"
          >
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="sm:mr-1.5" />
            <span className="hidden sm:inline">Original</span>
          </a>
        </div>
      </div>

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
