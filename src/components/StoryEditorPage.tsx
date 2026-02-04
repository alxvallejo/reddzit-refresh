import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import StoryService, { Story } from '../helpers/StoryService';
import QuoteService, { Quote } from '../helpers/QuoteService';
import MainHeader from './MainHeader';
import TiptapEditor, { TiptapEditorHandle } from './TiptapEditor';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faQuoteLeft, faCheck, faChevronRight, faChevronLeft, faXmark, faPlus } from '@fortawesome/free-solid-svg-icons';

export default function StoryEditorPage() {
  const { signedIn, accessToken, redirectForAuth } = useReddit();
  const { isLight } = useTheme();
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
        const rawText = story.content?.text || '';
        // Migrate plain text to HTML paragraphs if not already HTML
        const isHTML = /<[a-z][\s\S]*>/i.test(rawText);
        setBodyText(isHTML ? rawText : rawText.split('\n').filter(Boolean).map(line => `<p>${line}</p>`).join(''));
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

  const titleRef = useRef<HTMLTextAreaElement>(null);

  const resizeTitle = () => {
    const el = titleRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  };

  useEffect(() => {
    resizeTitle();
  }, [title]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setTitle(val);
    debouncedSave(val, description, bodyText);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDescription(val);
    debouncedSave(title, val, bodyText);
  };

  const titleDescRef = useRef({ title, description });
  titleDescRef.current = { title, description };

  const handleBodyUpdate = useCallback((html: string) => {
    setBodyText(html);
    debouncedSave(titleDescRef.current.title, titleDescRef.current.description, html);
  }, [debouncedSave]);

  const bodyRef = useRef<TiptapEditorHandle>(null);

  const handleInsertQuote = (quote: Quote) => {
    const isReddit = /reddit\.com/i.test(quote.sourceUrl);
    bodyRef.current?.insertQuote(quote.text, quote.sourceUrl, isReddit ? `r/${quote.subreddit}` : undefined);
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

  // Auth guard (after all hooks)
  if (!signedIn) {
    redirectForAuth();
    return null;
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${'bg-[var(--theme-bg)] text-[var(--theme-text)]'}`}>
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin opacity-50" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${'bg-[var(--theme-bg)] text-[var(--theme-text)]'}`}>
        <div className="text-center py-24 text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${'bg-[var(--theme-bg)] text-[var(--theme-text)]'}`}>
      <MainHeader />

      {/* Editor Header */}
      <div className="border-b bg-[var(--theme-headerBg)] border-[var(--theme-border)]">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
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
                ? (isLight ? 'text-green-600' : 'text-[var(--theme-primary)]')
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
      </div>

      {/* Body */}
      <div className="flex max-w-6xl mx-auto">
        {/* Main editor */}
        <main className="flex-1 px-8 py-6">
          <textarea
            ref={titleRef}
            value={title}
            onChange={handleTitleChange}
            onInput={resizeTitle}
            rows={1}
            placeholder="Story title"
            className={`w-full text-3xl font-bold bg-transparent border-none outline-none mb-2 resize-none overflow-hidden ${
              isLight ? 'text-gray-900 placeholder-gray-400' : 'text-white placeholder-gray-500'
            }`}
          />
          <input
            type="text"
            value={description}
            onChange={handleDescriptionChange}
            placeholder="Short description (optional)"
            className={`w-full text-sm bg-transparent border-none outline-none mb-6 ${
              isLight ? 'text-gray-600 placeholder-gray-400' : 'text-gray-400 placeholder-gray-500'
            }`}
          />
          <TiptapEditor
            ref={bodyRef}
            content={bodyText}
            onUpdate={handleBodyUpdate}
            placeholder="Start writing your story..."
            className={isLight ? 'text-gray-800' : 'text-gray-200'}
          />
        </main>

        {/* Sidebar */}
        {showSidebar && (
          <aside className="w-80 sticky top-28 h-[calc(100vh-7rem)] overflow-y-auto px-4 py-4 border-l border-[var(--theme-border)]">
            {/* Assigned quotes */}
            <h3 className="text-sm font-semibold mb-3 text-[var(--theme-text)]">
              Research ({assignedQuotes.length})
            </h3>

            {quotesLoading ? (
              <div className="flex justify-center py-4">
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />
              </div>
            ) : assignedQuotes.length === 0 ? (
              <p className="text-xs mb-4 text-[var(--theme-textMuted)]">
                No quotes assigned yet. Assign quotes from below.
              </p>
            ) : (
              <div className="space-y-2 mb-4">
                {assignedQuotes.map(quote => (
                  <div
                    key={quote.id}
                    onClick={() => handleInsertQuote(quote)}
                    className={`p-2 rounded-xl text-xs cursor-pointer border transition-colors bg-transparent border-[var(--theme-border)] ${
                      isLight ? 'hover:border-orange-600' : 'hover:border-[var(--theme-primary)]'
                    }`}
                  >
                    <p className="mb-1 leading-relaxed text-[var(--theme-text)]">
                      "{quote.text.length > 150 ? quote.text.slice(0, 150) + '...' : quote.text}"
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[var(--theme-textMuted)]">
                        r/{quote.subreddit}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUnassignQuote(quote.id); }}
                        title="Remove from story"
                        className={`border-none cursor-pointer bg-transparent p-0 ${
                          isLight ? 'text-gray-400 hover:text-red-500' : 'text-gray-500 hover:text-red-400'
                        }`}
                      >
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* All quotes (collapsed by default) */}
            <button
              onClick={() => setShowAllQuotes(!showAllQuotes)}
              className="w-full flex items-center justify-between text-sm font-semibold py-2 border-none cursor-pointer bg-transparent text-[var(--theme-text)]"
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
                  <p className="text-xs text-[var(--theme-textMuted)]">
                    No other quotes available.
                  </p>
                ) : (
                  allQuotes.map(quote => (
                    <div
                      key={quote.id}
                      onClick={() => handleAssignQuote(quote.id)}
                      className={`p-2 rounded-xl text-xs cursor-pointer border transition-colors bg-transparent border-[var(--theme-border)] ${
                        isLight ? 'hover:border-orange-600' : 'hover:border-[var(--theme-primary)]'
                      }`}
                    >
                      <p className="mb-1 leading-relaxed text-[var(--theme-text)]">
                        "{quote.text.length > 150 ? quote.text.slice(0, 150) + '...' : quote.text}"
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[var(--theme-textMuted)]">
                          r/{quote.subreddit}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAssignQuote(quote.id); }}
                          title="Assign to story"
                          className={`border-none cursor-pointer bg-transparent p-0 ${
                            isLight ? 'text-gray-400 hover:text-orange-600' : 'text-gray-500 hover:text-[var(--theme-primary)]'
                          }`}
                        >
                          <FontAwesomeIcon icon={faPlus} />
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
