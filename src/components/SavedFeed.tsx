import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSync, faList, faTableCellsLarge, faRectangleList } from '@fortawesome/free-solid-svg-icons';
import { getPreviewImage, getDisplayTitle, isComment, getCommentSnippet, getImageUrlFromText, getArticlePreviewImage } from '../helpers/RedditUtils';
import { adaptSavedPostToTrending } from '../helpers/savedPostAdapter';
import { fetchSavedPreview, type SavedPreview } from '../helpers/savedPreviewService';
import type { TrendingPost } from '../helpers/DailyService';
import MagazineGrid from './MagazineGrid';
import NewsCarousel from './NewsCarousel';
import NoContent from './NoContent';

type PreviewEntry =
  | { status: 'loading' }
  | { status: 'loaded'; preview: SavedPreview }
  | { status: 'error' };

type ViewMode = 'list' | 'grid' | 'carousel';
const VIEW_MODE_STORAGE_KEY = 'rdz_saved_view_mode';

const loadViewMode = (): ViewMode => {
  try {
    const v = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (v === 'list' || v === 'grid' || v === 'carousel') return v;
    return 'carousel';
  } catch {
    return 'carousel';
  }
};

// Demo data for Chrome Web Store screenshots — activate with ?demo=true
const DEMO_POSTS = [
  { id: 'd1', name: 't3_d1', subreddit: 'ExperiencedDevs', author: 'senior_eng', title: 'After 15 years of coding, these are the mass and principles I wish I learned earlier', thumbnail: 'self' },
  { id: 'd2', name: 't3_d2', subreddit: 'science', author: 'astro_prof', title: 'James Webb telescope confirms high-redshift galaxy that challenges dark matter models', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Hubble_ultra_deep_field.jpg/300px-Hubble_ultra_deep_field.jpg' },
  { id: 'd3', name: 't1_d3', subreddit: 'AskHistorians', author: 'medieval_nerd', title: 'Why did the Roman Empire really fall?', body: 'The short answer is that it didn\'t "fall" in the way most people imagine. The western half gradually transformed over centuries through a combination of economic pressures, administrative fragmentation, and shifting identities...' },
  { id: 'd4', name: 't3_d4', subreddit: 'Cooking', author: 'chef_maria', title: 'The single technique that leveled up every dish I make: how to properly build fond', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Saut%C3%A9ing_onions.jpg/300px-Saut%C3%A9ing_onions.jpg' },
  { id: 'd5', name: 't3_d5', subreddit: 'spacex', author: 'rocket_watcher', title: 'Starship Flight 8 successfully lands booster on first attempt — full mission breakdown', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/SpaceX_Starship_2019_prototype.jpg/300px-SpaceX_Starship_2019_prototype.jpg' },
  { id: 'd6', name: 't1_d6', subreddit: 'personalfinance', author: 'fire_coach', title: 'At what age should you start investing?', body: 'The best time to start is now. Even $50/month into a broad index fund at 22 will outperform someone who starts putting $500/month away at 35. Compound interest is the most powerful force in personal finance...' },
  { id: 'd7', name: 't3_d7', subreddit: 'MachineLearning', author: 'dl_researcher', title: 'New paper: Attention-free transformers achieve comparable performance with 40% less compute', thumbnail: 'self' },
  { id: 'd8', name: 't3_d8', subreddit: 'photography', author: 'street_shooter', title: 'I spent a year shooting only on a 35mm prime lens. Here\'s what it taught me about composition', thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Everest_North_Face_toward_Base_Camp_Tibet_Luca_Galuzzi_2006.jpg/300px-Everest_North_Face_toward_Base_Camp_Tibet_Luca_Galuzzi_2006.jpg' },
  { id: 'd9', name: 't3_d9', subreddit: 'books', author: 'avid_reader', title: 'Just finished "Project Hail Mary" and I haven\'t felt this way about a book since I was a kid', thumbnail: 'self' },
  { id: 'd10', name: 't3_d10', subreddit: 'fitness', author: 'strength_coach', title: 'The research is clear: you only need 3 exercises to build a strong, functional body', thumbnail: 'self' },
];

const SavedFeed = () => {
  const { loading, saved, after, fetchSaved, redditHelper } = useReddit();
  const { isLight } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const [now, setNow] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [commentParentImages, setCommentParentImages] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadViewMode());
  const [previewsMap, setPreviewsMap] = useState<Record<string, PreviewEntry>>({});
  const previewsRef = useRef(previewsMap);
  previewsRef.current = previewsMap;

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {
      // ignore
    }
  }, [viewMode]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetchSaved();
    } finally {
      setRefreshing(false);
    }
  }, [fetchSaved, refreshing]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isDemo || !redditHelper || saved.length === 0) return;

    let cancelled = false;

    const loadParentImages = async () => {
      const commentsNeedingImages = saved.filter((post) => {
        if (!isComment(post)) return false;
        const commentImage = getImageUrlFromText(post.body);
        const directImage = commentImage || getImageUrlFromText(post.link_url) || getImageUrlFromText(post.url) || getPreviewImage(post);
        return !directImage && !!post.link_id && !commentParentImages[post.link_id];
      });

      const linkIds = Array.from(new Set(commentsNeedingImages.map((post) => post.link_id)));
      if (linkIds.length === 0) return;

      const entries = await Promise.all(
        linkIds.map(async (linkId) => {
          try {
            const parentPost = await redditHelper.getById(linkId);
            const parentImage = getArticlePreviewImage(parentPost)
              || getPreviewImage(parentPost)
              || getImageUrlFromText(parentPost?.url);
            return parentImage ? [linkId, parentImage] : null;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;

      const updates = entries.filter((entry): entry is [string, string] => Array.isArray(entry));
      if (updates.length > 0) {
        setCommentParentImages((prev) => ({ ...prev, ...Object.fromEntries(updates) }));
      }
    };

    loadParentImages();
    return () => { cancelled = true; };
  }, [saved, redditHelper, isDemo, commentParentImages]);

  const handlePostClick = (post: any) => {
    const title = getDisplayTitle(post) || post.title || '';
    const slug = (title || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/, '');

    navigate(`/p/${post.name}/${slug}`, { state: { post } });
  };

  const handlePageUp = () => {
    if (after) {
      fetchSaved({ after });
      window.scrollTo(0, 0);
    }
  };

  const handlePageDown = () => {
    if (saved.length > 0) {
      const first = saved[0].name;
      fetchSaved({ before: first });
      window.scrollTo(0, 0);
    }
  };

  const posts = isDemo ? DEMO_POSTS : saved;

  const adaptedPosts = useMemo<TrendingPost[]>(
    () => posts.map((p: any) => {
      const entry = previewsMap[String(p.id)];
      const preview = entry?.status === 'loaded' ? entry.preview : undefined;
      return adaptSavedPostToTrending(p, commentParentImages, preview);
    }),
    [posts, commentParentImages, previewsMap]
  );
  const originalById = useMemo(
    () => new Map(posts.map((p: any) => [String(p.id), p])),
    [posts]
  );
  const handleAdaptedClick = (adapted: TrendingPost) => {
    const original = originalById.get(adapted.id);
    if (!original) return;
    const entry = previewsMap[adapted.id];
    const content = entry?.status === 'loaded' ? entry.preview.content : undefined;
    if (content) {
      const title = getDisplayTitle(original) || original.title || '';
      const slug = title
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/, '');
      navigate(`/p/${original.name}/${slug}`, { state: { post: original, content } });
      return;
    }
    handlePostClick(original);
  };

  const handleVisibleRangeChange = useCallback(
    (indices: number[]) => {
      if (!redditHelper) return;
      const known = previewsRef.current;
      const pending: any[] = [];
      for (const i of indices) {
        const p = posts[i];
        if (!p) continue;
        // Skip if a Reddit image is already known synchronously (no async help needed)
        const hasImage =
          !!(isComment(p) ? getImageUrlFromText(p.body) : null) ||
          !!getImageUrlFromText(p.link_url) ||
          !!getImageUrlFromText(p.url) ||
          !!getPreviewImage(p) ||
          !!(isComment(p) && p.link_id && commentParentImages[p.link_id]);
        if (hasImage) continue;
        const id = String(p.id);
        if (known[id]) continue;
        pending.push(p);
      }
      if (pending.length === 0) return;

      setPreviewsMap(prev => {
        const next = { ...prev };
        for (const p of pending) next[String(p.id)] = { status: 'loading' };
        return next;
      });

      for (const p of pending) {
        const id = String(p.id);
        fetchSavedPreview(p, redditHelper)
          .then(preview => {
            setPreviewsMap(prev => ({ ...prev, [id]: { status: 'loaded', preview } }));
          })
          .catch(() => {
            setPreviewsMap(prev => ({ ...prev, [id]: { status: 'error' } }));
          });
      }
    },
    [posts, commentParentImages, redditHelper]
  );

  if (!isDemo && loading && !refreshing) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin border-[var(--theme-primary)]"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <NoContent />
      </div>
    );
  }

  return (
    <div className="font-sans">
      {/* Header */}
      <header id="page-header" className="px-4 pb-2 sticky top-[6.25rem] z-30 bg-[var(--theme-bg)]">
        <div className="max-w-screen-2xl mx-auto border-b-2 border-[var(--theme-border)]">
          <div className="flex items-center justify-between py-4 pl-4">
            <h1 className="text-2xl font-bold text-[var(--theme-text)]">
              Saved Posts
            </h1>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div
                role="group"
                aria-label="View mode"
                className="inline-flex rounded-md overflow-hidden border border-[var(--theme-border)]"
              >
                {([
                  { mode: 'list' as const, icon: faList, label: 'List view' },
                  { mode: 'grid' as const, icon: faTableCellsLarge, label: 'Grid view' },
                  { mode: 'carousel' as const, icon: faRectangleList, label: 'Carousel view' },
                ]).map(({ mode, icon, label }) => (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={viewMode === mode}
                    onClick={() => setViewMode(mode)}
                    title={label}
                    className={`px-2 py-1 text-xs cursor-pointer border-none transition ${
                      viewMode === mode
                        ? isLight
                          ? 'bg-orange-600 text-white'
                          : 'bg-[var(--theme-primary)] text-[#262129]'
                        : 'bg-[var(--theme-cardBg)] text-[var(--theme-textMuted)] hover:text-[var(--theme-text)]'
                    }`}
                  >
                    <FontAwesomeIcon icon={icon} className="w-3 h-3" />
                  </button>
                ))}
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh saved posts"
                className={`text-sm px-2.5 py-1.5 rounded-lg transition-colors border-none cursor-pointer disabled:opacity-50 ${
                  isLight
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-white/10 text-gray-300 hover:bg-white/15'
                }`}
              >
                <FontAwesomeIcon icon={faSync} className={refreshing ? 'animate-spin' : ''} />
              </button>
              <span className="text-xs whitespace-nowrap text-[var(--theme-textMuted)]">
                {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                {' '}
                {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {viewMode === 'carousel' ? (
        <NewsCarousel
          posts={adaptedPosts}
          onPostClick={handleAdaptedClick}
          onVisibleRangeChange={handleVisibleRangeChange}
        />
      ) : viewMode === 'grid' ? (
        <MagazineGrid posts={adaptedPosts} onPostClick={handleAdaptedClick} />
      ) : (
        <div className="max-w-screen-2xl mx-auto px-4 pt-4 pb-24 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {posts.map((post) => {
            const commentImageUrl = isComment(post) ? getImageUrlFromText(post.body) : null;
            const fallbackImageFromPost = getImageUrlFromText(post.link_url) || getImageUrlFromText(post.url) || getPreviewImage(post);
            const parentPostImage = isComment(post) && post.link_id ? commentParentImages[post.link_id] : null;
            const cardImageUrl = commentImageUrl || fallbackImageFromPost || parentPostImage;

            return (
              <article
                key={post.id}
                onClick={() => handlePostClick(post)}
                className={`group relative p-4 rounded-xl transition cursor-pointer border border-[var(--theme-border)] ${
                  isLight ? 'bg-[var(--theme-cardBg)] hover:border-orange-600' : 'bg-transparent hover:border-[var(--theme-primary)]'
                }`}
              >
                <div className="flex gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xs font-normal text-[var(--theme-primary)]">
                        r/{post.subreddit}
                      </span>
                    </div>

                    <h2 className="font-light text-base my-2 leading-tight text-[var(--theme-text)]">
                      {getDisplayTitle(post)}
                    </h2>

                    {isComment(post) && !commentImageUrl && (
                      <div className="text-sm line-clamp-2 italic p-2 rounded text-[var(--theme-textMuted)] bg-[var(--theme-bgSecondary)]">
                        "{getCommentSnippet(post, 100)}"
                      </div>
                    )}

                    {post.author && (
                      <div className="text-xs text-[var(--theme-textMuted)]">
                        u/{post.author}
                      </div>
                    )}
                  </div>

                  {cardImageUrl && (
                    <div className={`flex-shrink-0 rounded-lg overflow-hidden self-center ${
                      commentImageUrl ? 'bg-[var(--theme-bgSecondary)] p-1' : ''
                    }`}>
                      <img
                        src={cardImageUrl}
                        alt=""
                        className={`w-24 h-24 rounded-lg ${
                          commentImageUrl ? 'object-contain' : 'object-cover'
                        }`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center gap-4 pb-6">
        <button
          onClick={handlePageDown}
          className={`px-6 py-3 rounded-full font-medium transition-colors cursor-pointer border-none ${
            isLight
              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              : 'bg-white/10 hover:bg-white/20 text-[var(--theme-text)]'
          }`}
        >
          Previous
        </button>
        <button
          onClick={handlePageUp}
          disabled={!after}
          className={`px-6 py-3 rounded-full font-medium shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-none ${
            isLight
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default SavedFeed;
