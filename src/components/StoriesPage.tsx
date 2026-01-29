import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import StoryService, { Story } from '../helpers/StoryService';
import MainHeader from './MainHeader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPen, faTrash, faGlobe, faEyeSlash, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import { faFileAlt } from '@fortawesome/free-regular-svg-icons';

function StoryCard({
  story,
  onDelete,
  onPublishToggle,
}: {
  story: Story;
  onDelete: (id: string) => Promise<void>;
  onPublishToggle: (story: Story) => Promise<void>;
}) {
  const { themeName } = useTheme();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const formattedDate = new Date(story.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete(story.id);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishToggle = async () => {
    setLoading(true);
    try {
      await onPublishToggle(story);
    } finally {
      setLoading(false);
    }
  };

  const quoteCount = story._count?.quotes ?? 0;

  return (
    <div className={`rounded-xl p-4 ${
      themeName === 'light'
        ? 'bg-white border border-gray-200 shadow-sm'
        : 'bg-[#3d3466] border border-[#7e87ef]/20'
    }`}>
      {/* Title + Status */}
      <div className="flex items-center gap-2 mb-2">
        <Link
          to={`/stories/${story.id}/edit`}
          className={`font-semibold text-lg no-underline hover:underline ${
            themeName === 'light' ? 'text-gray-900' : 'text-white'
          }`}
        >
          {story.title}
        </Link>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          story.status === 'PUBLISHED'
            ? themeName === 'light'
              ? 'bg-green-100 text-green-700'
              : 'bg-green-500/20 text-green-400'
            : themeName === 'light'
              ? 'bg-gray-100 text-gray-600'
              : 'bg-white/10 text-gray-300'
        }`}>
          {story.status === 'PUBLISHED' ? 'Published' : 'Draft'}
        </span>
      </div>

      {/* Description */}
      {story.description && (
        <p className={`mb-3 text-sm ${
          themeName === 'light' ? 'text-gray-600' : 'text-gray-400'
        }`}>
          {story.description.length > 150
            ? story.description.substring(0, 150) + '...'
            : story.description}
        </p>
      )}

      {/* Metadata + Actions */}
      <div className={`flex items-center justify-between text-xs ${
        themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
      }`}>
        <div className="flex items-center gap-2">
          <span>Updated {formattedDate}</span>
          <span>·</span>
          <span>{quoteCount} {quoteCount === 1 ? 'quote' : 'quotes'}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {confirmDelete ? (
            <>
              <span className="text-red-500 mr-1">Delete?</span>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="p-1.5 rounded text-red-500 hover:bg-red-500/20 transition-colors border-none cursor-pointer bg-transparent"
              >
                <FontAwesomeIcon icon={faCheck} />
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className={`p-1.5 rounded transition-colors border-none cursor-pointer ${
                  themeName === 'light'
                    ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                    : 'text-gray-400 hover:bg-white/10 bg-transparent'
                }`}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </>
          ) : (
            <>
              <Link
                to={`/stories/${story.id}/edit`}
                className={`p-1.5 rounded transition-colors no-underline ${
                  themeName === 'light'
                    ? 'text-gray-500 hover:bg-gray-100'
                    : 'text-gray-400 hover:bg-white/10'
                }`}
              >
                <FontAwesomeIcon icon={faPen} />
              </Link>
              <button
                onClick={handlePublishToggle}
                disabled={loading}
                className={`p-1.5 rounded transition-colors border-none cursor-pointer ${
                  themeName === 'light'
                    ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                    : 'text-gray-400 hover:bg-white/10 bg-transparent'
                }`}
                title={story.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
              >
                <FontAwesomeIcon icon={story.status === 'PUBLISHED' ? faEyeSlash : faGlobe} />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className={`p-1.5 rounded transition-colors border-none cursor-pointer ${
                  themeName === 'light'
                    ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                    : 'text-gray-400 hover:bg-white/10 bg-transparent'
                }`}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StoriesPage() {
  const { signedIn, accessToken, redirectForAuth } = useReddit();
  const { themeName } = useTheme();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn || !accessToken) {
      setLoading(false);
      return;
    }

    async function loadStories() {
      try {
        const { stories } = await StoryService.listStories(accessToken!);
        setStories(stories);
      } catch (err) {
        console.error('Failed to load stories:', err);
        setError('Failed to load stories');
      } finally {
        setLoading(false);
      }
    }

    loadStories();
  }, [signedIn, accessToken]);

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    await StoryService.deleteStory(accessToken, id);
    setStories(stories.filter(s => s.id !== id));
  };

  const handlePublishToggle = async (story: Story) => {
    if (!accessToken) return;
    if (story.status === 'PUBLISHED') {
      const { story: updated } = await StoryService.unpublishStory(accessToken, story.id);
      setStories(stories.map(s => s.id === story.id ? updated : s));
    } else {
      const { story: updated } = await StoryService.publishStory(accessToken, story.id);
      setStories(stories.map(s => s.id === story.id ? updated : s));
    }
  };

  const drafts = stories.filter(s => s.status === 'DRAFT');
  const published = stories.filter(s => s.status === 'PUBLISHED');

  // Not signed in
  if (!signedIn) {
    return (
      <div className={`min-h-screen ${
        themeName === 'light' ? 'bg-[#fcfcfc] text-gray-900' : 'bg-[var(--theme-bg)] text-[var(--theme-text)]'
      }`}>
        <MainHeader />
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="text-6xl mb-6">
            <FontAwesomeIcon icon={faFileAlt} className="opacity-30" />
          </div>
          <h2 className={`text-2xl font-bold mb-3 ${themeName === 'light' ? 'text-gray-900' : ''}`}>
            Your Stories
          </h2>
          <p className={`mb-8 max-w-md ${themeName === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
            Sign in to create and manage your stories built from saved quotes.
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
            Your Stories
            {stories.length > 0 && (
              <span className={`ml-2 text-sm font-normal ${
                themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
              }`}>
                ({stories.length})
              </span>
            )}
          </h1>
          <Link
            to="/stories/new"
            className={`px-4 py-2 rounded-full font-semibold text-sm no-underline transition-colors ${
              themeName === 'light'
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
            }`}
          >
            <FontAwesomeIcon icon={faPlus} className="mr-1.5" />
            New Story
          </Link>
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
        ) : stories.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 opacity-30">
              <FontAwesomeIcon icon={faFileAlt} />
            </div>
            <h2 className={`text-xl font-semibold mb-2 ${
              themeName === 'light' ? 'text-gray-800' : 'text-gray-200'
            }`}>
              No stories yet
            </h2>
            <p className={themeName === 'light' ? 'text-gray-600' : 'text-gray-400'}>
              Create your first story to curate and share your saved quotes.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Drafts Section */}
            {drafts.length > 0 && (
              <section>
                <h2 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${
                  themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Drafts ({drafts.length})
                </h2>
                <div className="space-y-4">
                  {drafts.map(story => (
                    <StoryCard
                      key={story.id}
                      story={story}
                      onDelete={handleDelete}
                      onPublishToggle={handlePublishToggle}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Published Section */}
            {published.length > 0 && (
              <section>
                <h2 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${
                  themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Published ({published.length})
                </h2>
                <div className="space-y-4">
                  {published.map(story => (
                    <StoryCard
                      key={story.id}
                      story={story}
                      onDelete={handleDelete}
                      onPublishToggle={handlePublishToggle}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
