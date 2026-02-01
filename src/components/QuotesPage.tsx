import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import QuoteService, { Quote } from '../helpers/QuoteService';
import QuoteCard from './QuoteCard';
import MainHeader from './MainHeader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuoteLeft, faPuzzlePiece } from '@fortawesome/free-solid-svg-icons';

export default function QuotesPage() {
  const { signedIn, accessToken, redirectForAuth } = useReddit();
  const { themeName } = useTheme();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn || !accessToken) {
      setLoading(false);
      return;
    }

    async function loadQuotes() {
      try {
        const { quotes } = await QuoteService.listQuotes(accessToken!);
        setQuotes(quotes);
      } catch (err) {
        console.error('Failed to load quotes:', err);
        setError('Failed to load quotes');
      } finally {
        setLoading(false);
      }
    }

    loadQuotes();
  }, [signedIn, accessToken]);

  const handleUpdate = async (id: string, note: string, tags: string[]) => {
    if (!accessToken) return;
    const { quote } = await QuoteService.updateQuote(accessToken, id, { note, tags });
    setQuotes(quotes.map(q => q.id === id ? quote : q));
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    await QuoteService.deleteQuote(accessToken, id);
    setQuotes(quotes.filter(q => q.id !== id));
  };

  // Not signed in
  if (!signedIn) {
    return (
      <div className={`min-h-screen ${
        themeName === 'light' ? 'bg-[#fcfcfc] text-gray-900' : 'bg-[var(--theme-bg)] text-[var(--theme-text)]'
      }`}>
        <MainHeader />
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="text-6xl mb-6">
            <FontAwesomeIcon icon={faQuoteLeft} className="opacity-30" />
          </div>
          <h2 className={`text-2xl font-bold mb-3 ${themeName === 'light' ? 'text-gray-900' : ''}`}>
            Your Quotes
          </h2>
          <p className={`mb-8 max-w-md ${themeName === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
            Sign in to save and view your highlighted quotes from articles.
          </p>
          <button
            onClick={redirectForAuth}
            className={`px-6 py-3 rounded-full font-semibold transition-colors border-none cursor-pointer shadow-lg ${
              themeName === 'light'
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
            }`}
          >
            Connect with Reddit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${
      themeName === 'light' ? 'bg-[#fcfcfc] text-gray-900' : 'bg-[var(--theme-bg)] text-[var(--theme-text)]'
    }`}>
      <MainHeader />

      {/* Page Header */}
      <div className={`border-b ${
        themeName === 'light' ? 'bg-white border-gray-200' : 'bg-[var(--theme-headerBg)] border-[var(--theme-border)]'
      }`}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className={`font-semibold ${themeName === 'light' ? 'text-gray-900' : 'text-white'}`}>
            Your Quotes
            {quotes.length > 0 && (
              <span className={`ml-2 text-sm font-normal ${
                themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
              }`}>
                ({quotes.length})
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin opacity-50" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 opacity-30">
              <FontAwesomeIcon icon={faQuoteLeft} />
            </div>
            <h2 className={`text-xl font-semibold mb-2 ${
              themeName === 'light' ? 'text-gray-800' : 'text-gray-200'
            }`}>
              No quotes yet
            </h2>
            <p className={`mb-6 max-w-md mx-auto ${themeName === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
              Highlight text in any article to save your first quote, or use the Chrome extension to save quotes from any page on the web.
            </p>
            <a
              href="https://chromewebstore.google.com/detail/reddzit"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm no-underline transition-colors ${
                themeName === 'light'
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
              }`}
            >
              <FontAwesomeIcon icon={faPuzzlePiece} />
              Get the Chrome Extension
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {quotes.map(quote => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
