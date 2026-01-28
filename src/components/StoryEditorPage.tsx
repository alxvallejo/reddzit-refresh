import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import StoryService, { Story } from '../helpers/StoryService';
import QuoteService, { Quote } from '../helpers/QuoteService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faQuoteLeft, faCheck, faChevronRight, faChevronLeft } from '@fortawesome/free-solid-svg-icons';

export default function StoryEditorPage() {
  const { signedIn, accessToken, redirectForAuth } = useReddit();
  const { themeName } = useTheme();
  const { id } = useParams<{ id: string }>();

  const [story, setStory] = useState<Story | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showSidebar, setShowSidebar] = useState(true);
  const [assignedQuotes, setAssignedQuotes] = useState<Quote[]>([]);
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  const [showAllQuotes, setShowAllQuotes] = useState(false);
  const [quotesLoading, setQuotesLoading] = useState(true);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load story and quotes on mount
  useEffect(() => {
    if (!accessToken || !id) return;

    async function loadStory() {
      try {
        const { story } = await StoryService.getStory(accessToken!, id!);
        setStory(story);
        setTitle(story.title);
        setDescription(story.description || '');
        setBodyText(story.content?.text || '');
      } catch (err) {
        console.error('Failed to load story:', err);
        setError('Failed to load story');
      } finally {
        setLoading(false);
      }
    }

    async function loadQuotes() {
      try {
        const [assignedRes, allRes] = await Promise.all([
          QuoteService.listQuotes(accessToken!, id!),
          QuoteService.listQuotes(accessToken!),
        ]);
        setAssignedQuotes(assignedRes.quotes);
        setAllQuotes(allRes.quotes.filter(q => q.storyId !== id));
      } catch (err) {
        console.error('Failed to load quotes:', err);
      } finally {
        setQuotesLoading(false);
      }
    }

    loadStory();
    loadQuotes();
  }, [accessToken, id]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const debouncedSave = useCallback((newTitle: string, newDescription: string, newBody: string) => {
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!accessToken || !id) return;
      setSaveStatus('saving');
      try {
        await StoryService.updateStory(accessToken, id, {
          title: newTitle,
          description: newDescription,
          content: { text: newBody },
        });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to save story:', err);
        setSaveStatus('unsaved');
      }
    }, 1500);
  }, [accessToken, id]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    debouncedSave(val, description, bodyText);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDescription(val);
    debouncedSave(title, val, bodyText);
  };

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBodyText(val);
    debouncedSave(title, description, val);
  };

  const handleAssignQuote = async (quoteId: string) => {
    if (!accessToken || !id) return;
    try {
      const { quote } = await QuoteService.updateQuote(accessToken, quoteId, { storyId: id });
      setAllQuotes(prev => prev.filter(q => q.id !== quoteId));
      setAssignedQuotes(prev => [...prev, quote]);
    } catch (err) {
      console.error('Failed to assign quote:', err);
    }
  };

  const handleUnassignQuote = async (quoteId: string) => {
    if (!accessToken) return;
    try {
      const { quote } = await QuoteService.updateQuote(accessToken, quoteId, { storyId: null });
      setAssignedQuotes(prev => prev.filter(q => q.id !== quoteId));
      setAllQuotes(prev => [...prev, quote]);
    } catch (err) {
      console.error('Failed to unassign quote:', err);
    }
  };

  const isLight = themeName === 'light';

  // Auth guard (after all hooks)
  if (!signedIn) {
    redirectForAuth();
    return null;
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${isLight ? 'bg-[#fcfcfc] text-gray-900' : 'bg-[var(--theme-bg)] text-[var(--theme-text)]'}`}>
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin opacity-50" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isLight ? 'bg-[#fcfcfc] text-gray-900' : 'bg-[var(--theme-bg)] text-[var(--theme-text)]'}`}>
        <div className="text-center py-24 text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isLight ? 'bg-[#fcfcfc] text-gray-900' : 'bg-[var(--theme-bg)] text-[var(--theme-text)]'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 ${
        isLight ? 'bg-white border-b border-gray-200' : 'bg-[var(--theme-headerBg)] border-b border-[var(--theme-border)]'
      }`}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/stories"
              className={`flex items-center no-underline ${
                isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'
              }`}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </Link>

            {/* Save status */}
            <span className={`text-xs flex items-center gap-1 ${
              saveStatus === 'saved'
                ? 'text-green-500'
                : saveStatus === 'saving'
                ? (isLight ? 'text-gray-500' : 'text-gray-400')
                : 'text-yellow-500'
            }`}>
              {saveStatus === 'saved' && <><FontAwesomeIcon icon={faCheck} /> Saved</>}
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'unsaved' && 'Unsaved changes'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Status badge */}
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              story?.status === 'PUBLISHED'
                ? (isLight ? 'bg-green-100 text-green-700' : 'bg-green-900/30 text-green-400')
                : (isLight ? 'bg-gray-100 text-gray-600' : 'bg-gray-700/50 text-gray-400')
            }`}>
              {story?.status === 'PUBLISHED' ? 'Published' : 'Draft'}
            </span>

            {/* Sidebar toggle */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-sm border-none cursor-pointer transition-colors ${
                isLight
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <FontAwesomeIcon icon={faQuoteLeft} className="text-xs" />
              <FontAwesomeIcon icon={showSidebar ? faChevronRight : faChevronLeft} className="text-xs" />
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex max-w-6xl mx-auto">
        {/* Main editor */}
        <main className="flex-1 px-8 py-6">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Story title"
            className={`w-full text-3xl font-bold bg-transparent border-none outline-none mb-2 ${
              isLight ? 'text-gray-900 placeholder-gray-400' : 'text-white placeholder-gray-600'
            }`}
          />
          <input
            type="text"
            value={description}
            onChange={handleDescriptionChange}
            placeholder="Short description (optional)"
            className={`w-full text-sm bg-transparent border-none outline-none mb-6 ${
              isLight ? 'text-gray-600 placeholder-gray-400' : 'text-gray-400 placeholder-gray-600'
            }`}
          />
          <textarea
            value={bodyText}
            onChange={handleBodyChange}
            placeholder="Start writing your story..."
            className={`w-full min-h-[60vh] bg-transparent border-none outline-none resize-none text-base leading-relaxed ${
              isLight ? 'text-gray-800 placeholder-gray-400' : 'text-gray-200 placeholder-gray-600'
            }`}
          />
        </main>

        {/* Sidebar */}
        {showSidebar && (
          <aside className={`w-80 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto px-4 py-4 ${
            isLight ? 'border-l border-gray-200' : 'border-l border-[var(--theme-border)]'
          }`}>
            {/* Assigned quotes */}
            <h3 className={`text-sm font-semibold mb-3 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
              Research ({assignedQuotes.length})
            </h3>

            {quotesLoading ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />
              </div>
            ) : assignedQuotes.length === 0 ? (
              <p className={`text-xs mb-4 ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                No quotes assigned yet. Assign quotes from below.
              </p>
            ) : (
              <div className="space-y-2 mb-4">
                {assignedQuotes.map(quote => (
                  <div
                    key={quote.id}
                    className={`p-2 rounded text-xs ${
                      isLight ? 'bg-gray-50 border border-gray-200' : 'bg-gray-800/50 border border-[var(--theme-border)]'
                    }`}
                  >
                    <p className={`mb-1 leading-relaxed ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                      "{quote.text.length > 150 ? quote.text.slice(0, 150) + '...' : quote.text}"
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className={isLight ? 'text-gray-400' : 'text-gray-500'}>
                        r/{quote.subreddit}
                      </span>
                      <button
                        onClick={() => handleUnassignQuote(quote.id)}
                        className={`border-none cursor-pointer bg-transparent px-1 ${
                          isLight ? 'text-red-500 hover:text-red-700' : 'text-red-400 hover:text-red-300'
                        }`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* All quotes (collapsed by default) */}
            <button
              onClick={() => setShowAllQuotes(!showAllQuotes)}
              className={`w-full flex items-center justify-between text-sm font-semibold py-2 border-none cursor-pointer bg-transparent ${
                isLight ? 'text-gray-700' : 'text-gray-300'
              }`}
            >
              <span>All Quotes ({allQuotes.length})</span>
              <FontAwesomeIcon
                icon={faChevronRight}
                className={`text-xs transition-transform ${showAllQuotes ? 'rotate-90' : ''}`}
              />
            </button>

            {showAllQuotes && (
              <div className="space-y-2 mt-2">
                {allQuotes.length === 0 ? (
                  <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                    No other quotes available.
                  </p>
                ) : (
                  allQuotes.map(quote => (
                    <div
                      key={quote.id}
                      className={`p-2 rounded text-xs ${
                        isLight ? 'bg-gray-50 border border-gray-200' : 'bg-gray-800/50 border border-[var(--theme-border)]'
                      }`}
                    >
                      <p className={`mb-1 leading-relaxed ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                        "{quote.text.length > 150 ? quote.text.slice(0, 150) + '...' : quote.text}"
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className={isLight ? 'text-gray-400' : 'text-gray-500'}>
                          r/{quote.subreddit}
                        </span>
                        <button
                          onClick={() => handleAssignQuote(quote.id)}
                          className={`border-none cursor-pointer bg-transparent px-1 ${
                            isLight ? 'text-blue-500 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'
                          }`}
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
