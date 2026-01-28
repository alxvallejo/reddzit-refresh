import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import StoryService from '../helpers/StoryService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

export default function StoryNewPage() {
  const { signedIn, accessToken, redirectForAuth } = useReddit();
  const { themeName } = useTheme();
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
      themeName === 'light' ? 'bg-[#fcfcfc] text-gray-900' : 'bg-[var(--theme-bg)] text-[var(--theme-text)]'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 ${
        themeName === 'light' ? 'bg-white border-b border-gray-200' : 'bg-[var(--theme-headerBg)] border-b border-[var(--theme-border)]'
      }`}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link
            to="/stories"
            className={`flex items-center gap-2 no-underline ${
              themeName === 'light' ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'
            }`}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </Link>
          <h1 className={`font-semibold ${themeName === 'light' ? 'text-gray-900' : 'text-white'}`}>
            New Story
          </h1>
        </div>
      </header>

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
                themeName === 'light'
                  ? 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-orange-500/50'
                  : 'bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:ring-[#7e87ef]/50'
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
                themeName === 'light'
                  ? 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-orange-500/50'
                  : 'bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:ring-[#7e87ef]/50'
              }`}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          {/* Footer */}
          <div className={`flex justify-end gap-3 pt-4 border-t ${
            themeName === 'light' ? 'border-gray-200' : 'border-white/10'
          }`}>
            <Link
              to="/stories"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors no-underline ${
                themeName === 'light'
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
                themeName === 'light'
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-[#7e87ef] text-white hover:bg-[#6b74e0]'
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
