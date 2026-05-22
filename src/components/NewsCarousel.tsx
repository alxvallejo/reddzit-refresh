import { useEffect, useRef, useState } from 'react';
import { isDisplayableComment, type TrendingPost, type TrendingPostTopComment } from '../helpers/DailyService';
import { decodeHtmlEntities } from '../helpers/htmlEntities';
import { useTheme } from '../context/ThemeContext';
import { HeroCard } from './MagazineGrid';

const SWIPE_THRESHOLD_PX = 50;
const MAX_DOTS = 9;
const AUTOPLAY_INTERVAL_MS = 45000;
const FADE_DURATION_MS = 900;
const COMMENT_MS_PER_WORD = 350;
const COMMENT_MIN_MS = 5000;
const COMMENT_MAX_MS = 30000;

const getCommentDuration = (body: string) => {
  const words = body.trim().split(/\s+/).filter(Boolean).length || 1;
  return Math.max(COMMENT_MIN_MS, Math.min(COMMENT_MAX_MS, words * COMMENT_MS_PER_WORD));
};

interface NewsCarouselProps {
  posts: TrendingPost[];
  onPostClick: (post: TrendingPost) => void;
  onSkipPost?: (postId: string) => void;
  onVisibleRangeChange?: (indices: number[]) => void;
}

const NewsCarousel = ({ posts, onPostClick, onSkipPost, onVisibleRangeChange }: NewsCarouselProps) => {
  const { isLight } = useTheme();
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [tabVisible, setTabVisible] = useState(() =>
    typeof document === 'undefined' ? true : document.visibilityState === 'visible'
  );
  const [autoplayTick, setAutoplayTick] = useState(0);
  const [stack, setStack] = useState<TrendingPost[]>(() => (posts.length > 0 ? [posts[0]] : []));
  const [commentIndex, setCommentIndex] = useState(0);
  const [commentStack, setCommentStack] = useState<TrendingPostTopComment[]>([]);
  const swipeStartX = useRef<number | null>(null);
  const total = posts.length;
  const autoplayActive = total > 1 && !isPaused && tabVisible;
  const rotatorActive = !isPaused && tabVisible;

  useEffect(() => {
    if (total === 0) {
      if (index !== 0) setIndex(0);
      return;
    }
    if (index >= total) setIndex(Math.max(0, total - 1));
  }, [total, index]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (!autoplayActive) return;
    const timer = window.setTimeout(() => {
      setIndex(i => (i + 1) % total);
    }, AUTOPLAY_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [index, total, autoplayActive, autoplayTick]);

  useEffect(() => {
    if (!onVisibleRangeChange || total === 0) return;
    const safe = Math.min(index, total - 1);
    if (total === 1) {
      onVisibleRangeChange([safe]);
      return;
    }
    const prev = (safe - 1 + total) % total;
    const next = (safe + 1) % total;
    const set = new Set<number>([prev, safe, next]);
    onVisibleRangeChange(Array.from(set));
  }, [index, total, onVisibleRangeChange]);

  const safeIndex = total > 0 ? Math.min(index, total - 1) : 0;
  const post = total > 0 ? posts[safeIndex] : null;

  useEffect(() => {
    if (!post) {
      setStack([]);
      return;
    }
    setStack(prev => {
      if (prev.length > 0 && prev[prev.length - 1].id === post.id) return prev;
      return [...prev, post];
    });
  }, [post?.id]);

  useEffect(() => {
    if (stack.length <= 1) return;
    const t = window.setTimeout(() => {
      setStack(prev => prev.slice(-1));
    }, FADE_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [stack]);

  const comments = (post?.topComments ?? []).filter(isDisplayableComment);
  const commentCount = comments.length;
  const safeCommentIndex = commentCount > 0 ? Math.min(commentIndex, commentCount - 1) : 0;
  const currentComment = commentCount > 0 ? comments[safeCommentIndex] : null;

  useEffect(() => {
    setCommentIndex(0);
  }, [post?.id]);

  useEffect(() => {
    if (total === 0) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIndex(i => (i - 1 + total) % total);
        setAutoplayTick(t => t + 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIndex(i => (i + 1) % total);
        setAutoplayTick(t => t + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (commentCount <= 1) return;
        e.preventDefault();
        setCommentIndex(i =>
          e.key === 'ArrowDown' ? (i + 1) % commentCount : (i - 1 + commentCount) % commentCount
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [total, commentCount]);

  useEffect(() => {
    if (!currentComment) {
      setCommentStack([]);
      return;
    }
    setCommentStack(prev => {
      if (prev.length > 0 && prev[prev.length - 1].id === currentComment.id) return prev;
      return [...prev, currentComment];
    });
  }, [currentComment?.id]);

  useEffect(() => {
    if (commentStack.length <= 1) return;
    const t = window.setTimeout(() => {
      setCommentStack(prev => prev.slice(-1));
    }, FADE_DURATION_MS);
    return () => window.clearTimeout(t);
  }, [commentStack]);

  useEffect(() => {
    if (commentCount <= 1 || !rotatorActive || !currentComment) return;
    const timer = window.setTimeout(() => {
      setCommentIndex(i => (i + 1) % commentCount);
    }, getCommentDuration(currentComment.body));
    return () => window.clearTimeout(timer);
  }, [commentIndex, commentCount, rotatorActive, currentComment?.id]);

  if (total === 0 || !post) return null;

  const goPrev = () => {
    setIndex(i => (i - 1 + total) % total);
    setAutoplayTick(t => t + 1);
  };
  const goNext = () => {
    setIndex(i => (i + 1) % total);
    setAutoplayTick(t => t + 1);
  };
  const goTo = (i: number) => {
    setIndex(i);
    setAutoplayTick(t => t + 1);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    swipeStartX.current = e.clientX;
    if (e.pointerType === 'touch') setIsPaused(true);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const touchEnd = e.pointerType === 'touch';
    if (swipeStartX.current === null) {
      if (touchEnd) setIsPaused(false);
      return;
    }
    const delta = e.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) {
      if (delta < 0) goNext(); else goPrev();
    }
    if (touchEnd) setIsPaused(false);
  };

  const dotsToShow = Math.min(total, MAX_DOTS);
  const dotOffset = Math.max(0, Math.min(total - dotsToShow, safeIndex - Math.floor(dotsToShow / 2)));

  return (
    <main
      className="max-w-screen-2xl mx-auto px-4 pt-4 pb-8"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div className={`md:flex md:gap-6 md:items-start ${commentCount === 0 ? 'md:justify-center' : ''}`}>
        <div
          className="relative w-full aspect-[4/5] md:aspect-[16/9] md:basis-3/5 md:flex-shrink-0 overflow-hidden rounded-xl select-none"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <div className="relative h-full w-full">
            {stack.map((p, i) => {
              const isFirst = i === 0;
              const isLast = i === stack.length - 1;
              return (
                <div
                  key={p.id}
                  className={`${isFirst ? 'h-full w-full' : 'absolute inset-0'} ${isLast ? 'carousel-fade-in' : 'carousel-fade-out pointer-events-none'}`}
                >
                  <HeroCard
                    post={p}
                    onClick={() => onPostClick(p)}
                    onSkip={onSkipPost ? () => onSkipPost(p.id) : undefined}
                    fillContainer
                  />
                </div>
              );
            })}
          </div>
          {total > 1 && autoplayActive && (
            <div className="absolute left-0 right-0 bottom-0 h-[2px] pointer-events-none z-20">
              <div
                key={`${safeIndex}-${autoplayTick}`}
                className="carousel-progress-fill h-full bg-[var(--theme-primary)] opacity-60"
                style={{ animationDuration: `${AUTOPLAY_INTERVAL_MS}ms` }}
              />
            </div>
          )}
        </div>
        {commentCount > 0 && (
          <aside className="mt-6 md:mt-0 md:flex-1 md:min-w-0 md:max-h-[calc(100vh-18rem)] md:overflow-y-auto select-none">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] uppercase tracking-wider text-[var(--theme-textMuted)] opacity-70">
                Top comments
              </div>
              {commentCount > 1 && (
                <div className="text-[10px] text-[var(--theme-textMuted)] tabular-nums opacity-70">
                  {safeCommentIndex + 1} / {commentCount} · ↑ ↓
                </div>
              )}
            </div>
            <div className="relative">
              {commentStack.map((c, i) => {
                const isFirst = i === 0;
                const isLast = i === commentStack.length - 1;
                const body = decodeHtmlEntities(c.body);
                const href = c.permalink ? `https://www.reddit.com${c.permalink}` : null;
                const inner = (
                  <>
                    <div className="text-xs text-[var(--theme-textMuted)] mb-1">
                      ▲ {c.score.toLocaleString()} · u/{c.author}
                    </div>
                    <div className="text-sm md:text-lg text-[var(--theme-text)] whitespace-pre-wrap break-words leading-relaxed">
                      {body}
                    </div>
                  </>
                );
                return (
                  <div
                    key={c.id}
                    className={`${isFirst ? '' : 'absolute inset-0'} ${isLast ? 'carousel-fade-in' : 'carousel-fade-out pointer-events-none'}`}
                  >
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="block no-underline text-inherit hover:text-[var(--theme-primary)] transition-colors"
                      >
                        {inner}
                      </a>
                    ) : (
                      inner
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        )}
      </div>
      <div className="flex flex-col items-center gap-2 mt-5">
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--theme-textMuted)] tabular-nums">
            {safeIndex + 1} / {total}
          </span>
          {total > 1 && (
            <div className="flex items-center gap-1">
              {Array.from({ length: dotsToShow }).map((_, i) => {
                const idx = i + dotOffset;
                const active = idx === safeIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => goTo(idx)}
                    aria-label={`Go to post ${idx + 1}`}
                    className={`rounded-full transition border-none cursor-pointer ${
                      active
                        ? 'bg-[var(--theme-primary)]'
                        : isLight ? 'bg-gray-300 hover:bg-gray-400' : 'bg-white/20 hover:bg-white/40'
                    }`}
                    style={{
                      width: active ? '18px' : '6px',
                      height: '6px',
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-wider text-[var(--theme-textMuted)] opacity-70">
          {total > 1
            ? (isPaused ? 'paused · ← → arrows · swipe' : 'auto-advancing · hover to pause')
            : '← → arrows · swipe'}
        </span>
      </div>
    </main>
  );
};

export default NewsCarousel;
