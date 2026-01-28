import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faQuoteLeft, faLink } from '@fortawesome/free-solid-svg-icons';
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
  const { themeName } = useTheme();
  const [note, setNote] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');
  const [storiesLoading, setStoriesLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !accessToken) return;
    setStoriesLoading(true);
    StoryService.listStories(accessToken)
      .then(({ stories }) => setStories(stories))
      .catch(() => {})
      .finally(() => setStoriesLoading(false));
  }, [isOpen, accessToken]);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-lg rounded-xl shadow-2xl ${
        themeName === 'light'
          ? 'bg-white'
          : 'bg-[#3d3466] border border-[#7e87ef]/30'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${
          themeName === 'light' ? 'border-gray-200' : 'border-white/10'
        }`}>
          <h2 className={`text-lg font-semibold ${
            themeName === 'light' ? 'text-gray-900' : 'text-white'
          }`}>
            Save Quote
          </h2>
          <button
            onClick={handleClose}
            className={`p-1 rounded-lg transition-colors border-none cursor-pointer ${
              themeName === 'light'
                ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                : 'text-gray-400 hover:bg-white/10 bg-transparent'
            }`}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Quoted Text */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              themeName === 'light' ? 'text-gray-700' : 'text-gray-300'
            }`}>
              <FontAwesomeIcon icon={faQuoteLeft} className="mr-2 opacity-60" />
              Selected Text
            </label>
            <div className={`p-3 rounded-lg text-sm max-h-32 overflow-y-auto ${
              themeName === 'light'
                ? 'bg-gray-50 text-gray-700 border border-gray-200'
                : 'bg-white/5 text-gray-300 border border-white/10'
            }`}>
              {displayText}
            </div>
          </div>

          {/* Source */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              themeName === 'light' ? 'text-gray-700' : 'text-gray-300'
            }`}>
              <FontAwesomeIcon icon={faLink} className="mr-2 opacity-60" />
              Source
            </label>
            <div className={`text-sm ${
              themeName === 'light' ? 'text-gray-600' : 'text-gray-400'
            }`}>
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
            <label className={`block text-sm font-medium mb-2 ${
              themeName === 'light' ? 'text-gray-700' : 'text-gray-300'
            }`}>
              Your Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add your thoughts..."
              rows={3}
              className={`w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 ${
                themeName === 'light'
                  ? 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-orange-500/50'
                  : 'bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:ring-[#7e87ef]/50'
              }`}
            />
          </div>

          {/* Tags */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              themeName === 'light' ? 'text-gray-700' : 'text-gray-300'
            }`}>
              Tags (optional, comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g., programming, inspiration, todo"
              className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 ${
                themeName === 'light'
                  ? 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-orange-500/50'
                  : 'bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:ring-[#7e87ef]/50'
              }`}
            />
          </div>

          {/* Story */}
          {accessToken && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                themeName === 'light' ? 'text-gray-700' : 'text-gray-300'
              }`}>
                Assign to Story (optional)
              </label>
              <select
                value={selectedStoryId}
                onChange={(e) => setSelectedStoryId(e.target.value)}
                disabled={storiesLoading}
                className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 ${
                  themeName === 'light'
                    ? 'bg-white border border-gray-300 text-gray-900 focus:ring-orange-500/50'
                    : 'bg-white/5 border border-white/20 text-white focus:ring-[#7e87ef]/50'
                }`}
              >
                <option value="">No story</option>
                {stories.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex justify-end gap-3 px-5 py-4 border-t ${
          themeName === 'light' ? 'border-gray-200' : 'border-white/10'
        }`}>
          <button
            onClick={handleClose}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border-none cursor-pointer ${
              themeName === 'light'
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
              themeName === 'light'
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-[#7e87ef] text-white hover:bg-[#6b74e0]'
            }`}
          >
            {saving ? 'Saving...' : 'Save Quote'}
          </button>
        </div>
      </div>
    </div>
  );
}
