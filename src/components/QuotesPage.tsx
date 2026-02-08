import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import QuoteService, { Quote } from '../helpers/QuoteService';
import StoryService, { Story } from '../helpers/StoryService';
import QuoteCard from './QuoteCard';
import MainHeader from './MainHeader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuoteLeft, faPuzzlePiece, faBook, faPlus, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';

export default function QuotesPage() {
  const { signedIn, accessToken, redirectForAuth } = useReddit();
  const { isLight } = useTheme();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Story picker state
  const [showStoryPicker, setShowStoryPicker] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [creatingStory, setCreatingStory] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const [newStorySaving, setNewStorySaving] = useState(false);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

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

  // Outside-click to close story picker
  useEffect(() => {
    if (!showStoryPicker) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowStoryPicker(false);
        setCreatingStory(false);
        setNewStoryTitle('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showStoryPicker]);

  const handleUpdate = async (id: string, note: string, tags: string[]) => {
    if (!accessToken) return;
    const { quote } = await QuoteService.updateQuote(accessToken, id, { note, tags });
    setQuotes(quotes.map(q => q.id === id ? quote : q));
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    await QuoteService.deleteQuote(accessToken, id);
    setQuotes(quotes.filter(q => q.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === quotes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(quotes.map(q => q.id)));
    }
  };

  const openStoryPicker = async () => {
    setShowStoryPicker(true);
    if (!accessToken) return;
    setStoriesLoading(true);
    try {
      const { stories: s } = await StoryService.listStories(accessToken);
      setStories(s);
    } catch {}
    finally { setStoriesLoading(false); }
  };

  const handleBulkAssign = async (storyId: string) => {
    if (!accessToken || selectedIds.size === 0) return;
    setBulkAssigning(true);
    try {
      const results = await Promise.all(
        Array.from(selectedIds).map(id =>
          QuoteService.updateQuote(accessToken, id, { storyId })
        )
      );
      // Update local state with returned quotes
      const updatedMap = new Map(results.map(r => [r.quote.id, r.quote]));
      setQuotes(prev => prev.map(q => updatedMap.get(q.id) || q));
      setSelectedIds(new Set());
      setShowStoryPicker(false);
    } catch (err) {
      console.error('Failed to assign quotes to story:', err);
    } finally {
      setBulkAssigning(false);
    }
  };

  const handleCreateStoryInline = async () => {
    if (!accessToken || !newStoryTitle.trim()) return;
    setNewStorySaving(true);
    try {
      const { story } = await StoryService.createStory(accessToken, { title: newStoryTitle.trim() });
      setStories(prev => [...prev, story]);
      setNewStoryTitle('');
      setCreatingStory(false);
      await handleBulkAssign(story.id);
    } catch {
      console.error('Failed to create story');
    } finally {
      setNewStorySaving(false);
    }
  };

  // Not signed in
  if (!signedIn) {
    return (
      <div className={`min-h-screen ${
        'bg-[var(--theme-bg)] text-[var(--theme-text)]'
      }`}>
        <MainHeader />
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="text-6xl mb-6">
            <FontAwesomeIcon icon={faQuoteLeft} className="opacity-30" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-[var(--theme-text)]">
            Your Quotes
          </h2>
          <p className="mb-8 max-w-md text-[var(--theme-textMuted)]">
            Sign in to save and view your highlighted quotes from articles.
          </p>
          <button
            onClick={redirectForAuth}
            className={`px-6 py-3 rounded-full font-semibold transition-colors border-none cursor-pointer shadow-lg ${
              isLight
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

  const allSelected = quotes.length > 0 && selectedIds.size === quotes.length;

  return (
    <div className={`min-h-screen ${
      'bg-[var(--theme-bg)] text-[var(--theme-text)]'
    }`}>
      <MainHeader />

      {/* Page Header */}
      <div className="border-b bg-[var(--theme-headerBg)] border-[var(--theme-border)]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="font-semibold text-[var(--theme-text)]">
            Your Quotes
            {quotes.length > 0 && (
              <span className="ml-2 text-sm font-normal text-[var(--theme-textMuted)]">
                ({quotes.length})
              </span>
            )}
          </h1>
          {quotes.length > 0 && (
            <button
              onClick={handleSelectAll}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors border-none cursor-pointer ${
                isLight
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-white/10 text-gray-300 hover:bg-white/15'
              }`}
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <main className={`max-w-7xl mx-auto px-4 py-8 ${selectedIds.size > 0 ? 'pb-24' : ''}`}>
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
            <h2 className="text-xl font-semibold mb-2 text-[var(--theme-text)]">
              No quotes yet
            </h2>
            <p className="mb-6 max-w-md mx-auto text-[var(--theme-textMuted)]">
              Highlight text in any article to save your first quote, or use the Chrome extension to save quotes from any page on the web.
            </p>
            <a
              href="https://chromewebstore.google.com/detail/reddzit"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm no-underline transition-colors ${
                isLight
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
              }`}
            >
              <FontAwesomeIcon icon={faPuzzlePiece} />
              Get the Chrome Extension
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quotes.map(quote => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                selected={selectedIds.has(quote.id)}
                onToggleSelect={handleToggleSelect}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div ref={pickerRef} className="relative">
            {/* Story picker dropdown (opens upward) */}
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
                        onClick={() => handleBulkAssign(s.id)}
                        disabled={bulkAssigning}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left border-none cursor-pointer transition-colors ${
                          isLight
                            ? 'bg-transparent text-gray-900 hover:bg-gray-50'
                            : 'bg-transparent text-gray-200 hover:bg-white/5'
                        } disabled:opacity-50`}
                      >
                        <FontAwesomeIcon icon={faBook} className="text-xs opacity-40" />
                        <span className="truncate flex-1">{s.title}</span>
                        {s._count?.quotes != null && (
                          <span className={`text-xs ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                            {s._count.quotes}
                          </span>
                        )}
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

            {/* Action bar */}
            <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border ${
              isLight
                ? 'bg-white border-gray-200'
                : 'bg-[var(--theme-headerBg)] border-white/20'
            }`}>
              <span className="text-sm font-medium text-[var(--theme-text)]">
                {selectedIds.size} selected
              </span>
              <button
                onClick={openStoryPicker}
                disabled={bulkAssigning}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border-none cursor-pointer disabled:opacity-50 ${
                  isLight
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-[var(--theme-primary)] text-[var(--theme-bg)] hover:opacity-90'
                }`}
              >
                <FontAwesomeIcon icon={faBook} className="text-xs" />
                {bulkAssigning ? 'Adding...' : 'Add to Story'}
              </button>
              <button
                onClick={() => {
                  setSelectedIds(new Set());
                  setShowStoryPicker(false);
                }}
                className={`px-3 py-2 rounded-lg text-sm transition-colors border-none cursor-pointer ${
                  isLight
                    ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                    : 'text-gray-400 hover:bg-white/10 bg-transparent'
                }`}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
