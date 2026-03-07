import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuoteLeft, faExternalLinkAlt, faLink, faHighlighter, faPuzzlePiece, faBookOpen, faShareAlt } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useReddit } from '../context/RedditContext';
import QuoteService, { PublicQuote } from '../helpers/QuoteService';

export default function QuoteSharePage() {
  const { id } = useParams<{ id: string }>();
  const { isLight } = useTheme();
  const { signedIn } = useReddit();
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    QuoteService.getPublicQuote(id)
      .then(({ quote }) => setQuote(quote))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const formattedDate = quote
    ? new Date(quote.sourceDate || quote.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    : '';

  return (
    <div className={`min-h-screen flex flex-col ${isLight ? 'bg-white' : 'bg-[var(--theme-bg)]'}`}>
      {/* Simple header */}
      <header className={`px-6 py-4 border-b ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
        <Link
          to="/"
          className={`text-lg font-bold no-underline ${
            isLight ? 'text-orange-600' : 'text-[var(--theme-primary)]'
          }`}
        >
          reddzit
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        {loading ? (
          <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin opacity-50" />
        ) : error || !quote ? (
          <div className="text-center">
            <p className={`text-lg mb-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Quote not found
            </p>
            <Link
              to="/"
              className={`text-sm font-medium no-underline ${
                isLight ? 'text-orange-600 hover:text-orange-700' : 'text-[var(--theme-primary)] hover:opacity-80'
              }`}
            >
              Go to Reddzit
            </Link>
          </div>
        ) : (
          <div className="max-w-2xl w-full">
            <FontAwesomeIcon
              icon={faQuoteLeft}
              className={`text-4xl mb-6 ${isLight ? 'text-gray-200' : 'text-white/10'}`}
            />

            <p className={`text-xl sm:text-2xl leading-relaxed whitespace-pre-wrap ${
              isLight ? 'text-gray-900' : 'text-white'
            }`}>
              {quote.text}
            </p>

            {/* Attribution */}
            <div className={`mt-8 pt-6 border-t ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
              {quote.postTitle && (
                <a
                  href={quote.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 text-sm font-medium no-underline mb-2 ${
                    isLight ? 'text-orange-600 hover:text-orange-700' : 'text-[var(--theme-primary)] hover:opacity-80'
                  }`}
                >
                  <FontAwesomeIcon icon={faExternalLinkAlt} className="text-xs" />
                  {quote.postTitle}
                </a>
              )}
              <div className={`flex items-center gap-2 text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                {quote.subreddit && <span>r/{quote.subreddit}</span>}
                {quote.subreddit && <span>·</span>}
                <span>{formattedDate}</span>
              </div>
            </div>

            {/* Share + CTA */}
            <div className={`mt-8 pt-6 border-t flex items-center gap-3 ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    const input = document.createElement('input');
                    input.value = window.location.href;
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand('copy');
                    document.body.removeChild(input);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors border-none cursor-pointer ${
                  copied
                    ? isLight
                      ? 'bg-green-100 text-green-700'
                      : 'bg-green-500/20 text-green-400'
                    : isLight
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-white/10 text-gray-300 hover:bg-white/15'
                }`}
              >
                <FontAwesomeIcon icon={faLink} className="text-xs" />
                {copied ? 'Link copied!' : 'Share'}
              </button>
              <Link
                to="/"
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium no-underline transition-colors ${
                  isLight
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
                }`}
              >
                Explore Reddzit
              </Link>
            </div>

            {/* Promo for logged-out visitors */}
            {!signedIn && (
              <div className={`mt-10 rounded-2xl p-6 ${
                isLight ? 'bg-gray-50 border border-gray-200' : 'bg-white/5 border border-white/10'
              }`}>
                <h3 className={`text-lg font-semibold mb-3 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  Save the best of what you read
                </h3>
                <p className={`text-sm leading-relaxed mb-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  Reddzit helps you capture and organize quotes from articles, Reddit threads, and the web.
                </p>
                <div className="flex flex-col gap-3 mb-5">
                  {[
                    { icon: faHighlighter, text: 'Highlight any text on the web to save it as a quote' },
                    { icon: faBookOpen, text: 'Organize quotes into stories and reports' },
                    { icon: faShareAlt, text: 'Share your favorite quotes with a beautiful link' },
                    { icon: faPuzzlePiece, text: 'Chrome extension for one-click saving from any page' },
                  ].map(({ icon, text }, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <FontAwesomeIcon icon={icon} className={`text-sm mt-0.5 ${
                        isLight ? 'text-orange-500' : 'text-[var(--theme-primary)]'
                      }`} />
                      <span className={`text-sm ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>{text}</span>
                    </div>
                  ))}
                </div>
                <Link
                  to="/"
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold no-underline transition-colors ${
                    isLight
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
                  }`}
                >
                  Get started with Reddzit
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
