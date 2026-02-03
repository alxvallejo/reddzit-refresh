import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faQuoteLeft, faLink, faPlus, faCheck, faChevronDown, faBook } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import StoryService, { Story } from '../helpers/StoryService';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: string, tags: string[], storyId?: string) => Promise<void>;
  selectedText: string;
  sourceUrl: string;
  postTitle: string;
  accessToken?: string;
}

export default function QuoteModal({
  isOpen,
  onClose,
  onSave,
  selectedText,
  sourceUrl,
  postTitle,
  accessToken
}: QuoteModalProps) {
  const { isLight } = useTheme();
  const [note, setNote] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [creatingStory, setCreatingStory] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const [newStorySaving, setNewStorySaving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !accessToken) return;
    setStoriesLoading(true);
    StoryService.listStories(accessToken)
      .then(({ stories }) => setStories(stories))
      .catch(() => {})
      .finally(() => setStoriesLoading(false));
  }, [isOpen, accessToken]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  if (!isOpen) return null;

  const handleCreateStory = async () => {
    if (!accessToken || !newStoryTitle.trim()) return;
    setNewStorySaving(true);
    try {
      const { story } = await StoryService.createStory(accessToken, { title: newStoryTitle.trim() });
      setStories(prev => [...prev, story]);
      setSelectedStoryId(story.id);
      setNewStoryTitle('');
      setCreatingStory(false);
    } catch {
      setError('Failed to create story.');
    } finally {
      setNewStorySaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      await onSave(note, tags, selectedStoryId || undefined);
      setNote('');
      setTagsInput('');
      setSelectedStoryId('');
      setCreatingStory(false);
      setNewStoryTitle('');
      setDropdownOpen(false);
      onClose();
    } catch (err) {
      setError('Failed to save quote. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setNote('');
    setTagsInput('');
    setSelectedStoryId('');
    setCreatingStory(false);
    setNewStoryTitle('');
    setDropdownOpen(false);
    setError(null);
    onClose();
  };

  const truncatedUrl = sourceUrl.length > 50
    ? sourceUrl.substring(0, 50) + '...'
    : sourceUrl;

  const displayText = selectedText.length > 500
    ? selectedText.substring(0, 500) + '...'
    : selectedText;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className={`relative w-full sm:max-w-lg rounded-t-xl sm:rounded-xl shadow-2xl max-h-[90vh] flex flex-col bg-[var(--theme-bgSecondary)] border border-[var(--theme-border)]`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0 border-[var(--theme-border)]">
          <h2 className="text-lg font-semibold text-[var(--theme-text)]">
            Save Quote
          </h2>
          <button
            onClick={handleClose}
            className={`p-1 rounded-lg transition-colors border-none cursor-pointer ${
              isLight
                ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                : 'text-gray-400 hover:bg-white/10 bg-transparent'
            }`}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          {/* Story — moved to top */}
          {accessToken && (
            <div ref={dropdownRef} className="relative">
              <label className="block text-sm font-medium mb-2 text-[var(--theme-text)]">
                Assign to Story (optional)
              </label>
              {/* Trigger */}
              <button
                type="button"
                onClick={() => setDropdownOpen(prev => !prev)}
                disabled={storiesLoading}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors border cursor-pointer ${
                  isLight
                    ? 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
                    : 'bg-white/5 border-white/20 text-white hover:border-white/40'
                } ${dropdownOpen
                    ? isLight ? 'ring-2 ring-orange-500/50' : 'ring-2 ring-[var(--theme-border)]'
                    : ''
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  {selectedStoryId ? (
                    <>
                      <FontAwesomeIcon icon={faBook} className="text-xs opacity-50" />
                      {stories.find(s => s.id === selectedStoryId)?.title}
                    </>
                  ) : (
                    <span className={isLight ? 'text-gray-400' : 'text-gray-500'}>
                      No story
                    </span>
                  )}
                </span>
                <FontAwesomeIcon
                  icon={faChevronDown}
                  className={`text-xs opacity-50 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="absolute z-10 left-0 right-0 mt-1 rounded-lg shadow-xl overflow-hidden border bg-[var(--theme-bgSecondary)] border-[var(--theme-border)]">
                  <div className="max-h-48 overflow-y-auto">
                    {/* No story option */}
                    <button
                      type="button"
                      onClick={() => { setSelectedStoryId(''); setDropdownOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left border-none cursor-pointer transition-colors ${
                        isLight
                          ? `bg-transparent hover:bg-gray-50 ${!selectedStoryId ? 'text-orange-600 font-medium' : 'text-gray-600'}`
                          : `bg-transparent hover:bg-white/5 ${!selectedStoryId ? 'text-[var(--theme-primary)] font-medium' : 'text-gray-300'}`
                      }`}
                    >
                      <span>No story</span>
                      {!selectedStoryId && <FontAwesomeIcon icon={faCheck} className="text-xs" />}
                    </button>

                    {/* Story items */}
                    {stories.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => { setSelectedStoryId(s.id); setDropdownOpen(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left border-none cursor-pointer transition-colors ${
                          isLight
                            ? `bg-transparent hover:bg-gray-50 ${selectedStoryId === s.id ? 'text-orange-600 font-medium' : 'text-gray-900'}`
                            : `bg-transparent hover:bg-white/5 ${selectedStoryId === s.id ? 'text-[var(--theme-primary)] font-medium' : 'text-gray-200'}`
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <FontAwesomeIcon icon={faBook} className="text-xs opacity-40" />
                          {s.title}
                          {s._count?.quotes != null && (
                            <span className={`text-xs ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                              ({s._count.quotes})
                            </span>
                          )}
                        </span>
                        {selectedStoryId === s.id && <FontAwesomeIcon icon={faCheck} className="text-xs" />}
                      </button>
                    ))}
                  </div>

                  {/* New story section */}
                  <div className="border-t border-[var(--theme-border)]">
                    {creatingStory ? (
                      <div className="flex items-center gap-2 p-2">
                        <input
                          type="text"
                          value={newStoryTitle}
                          onChange={(e) => setNewStoryTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateStory();
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
                          type="button"
                          onClick={handleCreateStory}
                          disabled={newStorySaving || !newStoryTitle.trim()}
                          className={`p-1.5 rounded text-xs transition-colors border-none cursor-pointer disabled:opacity-40 ${
                            isLight
                              ? 'bg-orange-600 text-white hover:bg-orange-700'
                              : 'bg-[var(--theme-primary)] text-[var(--theme-bgSecondary)] hover:opacity-90'
                          }`}
                        >
                          <FontAwesomeIcon icon={faCheck} />
                        </button>
                        <button
                          type="button"
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
                        type="button"
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
          )}

          {/* Quoted Text */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--theme-text)]">
              <FontAwesomeIcon icon={faQuoteLeft} className="mr-2 opacity-60" />
              Selected Text
            </label>
            <div className="p-3 rounded-lg text-sm max-h-32 overflow-y-auto bg-[var(--theme-bgSecondary)] text-[var(--theme-text)] border border-[var(--theme-border)]">
              {displayText}
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--theme-text)]">
              <FontAwesomeIcon icon={faLink} className="mr-2 opacity-60" />
              Source
            </label>
            <div className="text-sm text-[var(--theme-textMuted)]">
              <div className="font-medium truncate">{postTitle}</div>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline"
              >
                {truncatedUrl}
              </a>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--theme-text)]">
              Your Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add your thoughts..."
              rows={3}
              className={`w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 ${
                isLight
                  ? 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-orange-500/50'
                  : 'bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:ring-[var(--theme-border)]'
              }`}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--theme-text)]">
              Tags (optional, comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g., programming, inspiration, todo"
              className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 ${
                isLight
                  ? 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-orange-500/50'
                  : 'bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:ring-[var(--theme-border)]'
              }`}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t flex-shrink-0 border-[var(--theme-border)]">
          <button
            onClick={handleClose}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border-none cursor-pointer ${
              isLight
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border-none cursor-pointer disabled:opacity-50 ${
              isLight
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-[var(--theme-primary)] text-[var(--theme-bgSecondary)] hover:opacity-90'
            }`}
          >
            {saving ? 'Saving...' : 'Save Quote'}
          </button>
        </div>
      </div>
    </div>
  );
}
