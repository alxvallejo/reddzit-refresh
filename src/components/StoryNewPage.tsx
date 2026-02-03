import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import StoryService from '../helpers/StoryService';
import MainHeader from './MainHeader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

export default function StoryNewPage() {
  const { signedIn, accessToken, redirectForAuth } = useReddit();
  const { isLight } = useTheme();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    redirectForAuth();
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }

    setSaving(true);
    try {
      const { story } = await StoryService.createStory(accessToken!, {
        title: trimmedTitle,
        description: description.trim() || undefined,
      });
      navigate(`/stories/${story.id}/edit`);
    } catch (err) {
      console.error('Failed to create story:', err);
      setError('Failed to create story. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`min-h-screen ${
      'bg-[var(--theme-bg)] text-[var(--theme-text)]'
    }`}>
      <MainHeader />

      {/* Page Header */}
      <div className="border-b bg-[var(--theme-headerBg)] border-[var(--theme-border)]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link
            to="/stories"
            className={`flex items-center no-underline ${
              isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'
            }`}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </Link>
          <h1 className="font-semibold text-[var(--theme-text)]">
            New Story
          </h1>
        </div>
      </div>

      {/* Form */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your story a title..."
              required
              autoFocus
              className={`w-full px-3 py-2 rounded-lg text-lg focus:outline-none focus:ring-2 ${
                isLight
                  ? 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-orange-500/50'
                  : 'bg-black/20 border border-[var(--theme-border)] text-white placeholder-gray-300 focus:ring-[var(--theme-border)]'
              }`}
            />
          </div>

          {/* Description */}
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief summary..."
              rows={3}
              className={`w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 ${
                isLight
                  ? 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-orange-500/50'
                  : 'bg-black/20 border border-[var(--theme-border)] text-white placeholder-gray-300 focus:ring-[var(--theme-border)]'
              }`}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--theme-border)]">
            <Link
              to="/stories"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors no-underline ${
                isLight
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border-none cursor-pointer disabled:opacity-50 ${
                isLight
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-[var(--theme-primary)] text-[var(--theme-bgSecondary)] hover:opacity-90'
              }`}
            >
              {saving ? 'Creating...' : 'Create & Start Writing'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
