import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import StoryService, { Story } from '../helpers/StoryService';
import MainHeader from './MainHeader';

function getTextColor(bgColor: string): string {
  if (!bgColor) return '';
  // Parse hex to determine luminance
  const hex = bgColor.replace('#', '');
  if (hex.length < 6) return '';
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1a1a1a' : '#f5f5f5';
}

export default function StoryViewPage() {
  const { isLight } = useTheme();
  const { id } = useParams<{ id: string }>();

  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function loadStory() {
      try {
        const { story } = await StoryService.getPublicStory(id!);
        setStory(story);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setError('Story not found');
        } else {
          setError('Failed to load story');
        }
      } finally {
        setLoading(false);
      }
    }

    loadStory();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
        <MainHeader />
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin opacity-50" />
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
        <MainHeader />
        <div className="text-center py-24">
          <h2 className={`text-2xl font-bold mb-3 ${isLight ? 'text-gray-900' : 'text-white'}`}>
            {error || 'Story not found'}
          </h2>
          <Link
            to="/"
            className={`text-sm no-underline ${isLight ? 'text-orange-600' : 'text-[var(--theme-primary)]'}`}
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const bgColor = story.content?.bgColor || '';
  const fontClass = story.content?.fontClass || 'font-sans';
  const bodyHtml = story.content?.text || '';
  const textColor = getTextColor(bgColor);

  const formattedDate = story.publishedAt
    ? new Date(story.publishedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <MainHeader />

      <article
        className={`min-h-[calc(100vh-4rem)] ${fontClass}`}
        style={{
          backgroundColor: bgColor || undefined,
          color: textColor || undefined,
        }}
      >
        <div className="max-w-3xl mx-auto px-6 py-12">
          {/* Title */}
          <h1
            className="text-4xl font-bold mb-3 leading-tight"
            style={{ color: textColor || undefined }}
          >
            {story.title}
          </h1>

          {/* Description */}
          {story.description && (
            <p
              className="text-lg mb-6 opacity-70"
              style={{ color: textColor || undefined }}
            >
              {story.description}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 mb-10 text-sm opacity-60">
            {story.author && <span>by u/{story.author}</span>}
            {formattedDate && (
              <>
                {story.author && <span>·</span>}
                <span>{formattedDate}</span>
              </>
            )}
          </div>

          {/* Body */}
          <div
            className="prose prose-lg max-w-none"
            style={{ color: textColor || undefined }}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </div>
      </article>
    </div>
  );
}
