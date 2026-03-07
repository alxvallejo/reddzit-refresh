import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuoteLeft, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import QuoteService, { PublicQuote } from '../helpers/QuoteService';

export default function QuoteSharePage() {
  const { id } = useParams<{ id: string }>();
  const { isLight } = useTheme();
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

            {/* CTA */}
            <div className={`mt-8 pt-6 border-t ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
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
          </div>
        )}
      </main>
    </div>
  );
}
