import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import type { TrendingPost } from '../helpers/DailyService';
import { useTheme } from '../context/ThemeContext';
import { HeroCard } from './MagazineGrid';

const SWIPE_THRESHOLD_PX = 50;
const MAX_DOTS = 9;
const AUTOPLAY_INTERVAL_MS = 7000;

interface NewsCarouselProps {
  posts: TrendingPost[];
  onPostClick: (post: TrendingPost) => void;
  onSkipPost: (postId: string) => void;
}

type Direction = 'right' | 'left';

const NewsCarousel = ({ posts, onPostClick, onSkipPost }: NewsCarouselProps) => {
  const { isLight } = useTheme();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>('right');
  const [isPaused, setIsPaused] = useState(false);
  const [tabVisible, setTabVisible] = useState(() =>
    typeof document === 'undefined' ? true : document.visibilityState === 'visible'
  );
  const [autoplayTick, setAutoplayTick] = useState(0);
  const swipeStartX = useRef<number | null>(null);
  const total = posts.length;
  const autoplayActive = total > 1 && !isPaused && tabVisible;

  useEffect(() => {
    if (total === 0) {
      if (index !== 0) setIndex(0);
      return;
    }
    if (index >= total) setIndex(Math.max(0, total - 1));
  }, [total, index]);

  useEffect(() => {
    if (total === 0) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setDirection('left');
        setIndex(i => (i - 1 + total) % total);
        setAutoplayTick(t => t + 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setDirection('right');
        setIndex(i => (i + 1) % total);
        setAutoplayTick(t => t + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [total]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (!autoplayActive) return;
    const timer = window.setTimeout(() => {
      setDirection('right');
      setIndex(i => (i + 1) % total);
    }, AUTOPLAY_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [index, total, autoplayActive, autoplayTick]);

  if (total === 0) return null;

  const safeIndex = Math.min(index, total - 1);
  const post = posts[safeIndex];

  const goPrev = () => {
    setDirection('left');
    setIndex(i => (i - 1 + total) % total);
    setAutoplayTick(t => t + 1);
  };
  const goNext = () => {
    setDirection('right');
    setIndex(i => (i + 1) % total);
    setAutoplayTick(t => t + 1);
  };
  const goTo = (i: number) => {
    setDirection(i >= safeIndex ? 'right' : 'left');
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

  const arrowBtnClass = `flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full border cursor-pointer transition flex items-center justify-center ${
    isLight
      ? 'bg-[var(--theme-cardBg)] border-[var(--theme-border)] text-[var(--theme-text)] hover:border-orange-600 disabled:opacity-40'
      : 'bg-transparent border-[var(--theme-border)] text-[var(--theme-text)] hover:border-[var(--theme-primary)] disabled:opacity-40'
  }`;

  return (
    <main
      className="max-w-7xl mx-auto px-4 pt-4 pb-24"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div className="flex items-center gap-3 md:gap-4">
        <button
          type="button"
          onClick={goPrev}
          aria-label="Previous post"
          disabled={total <= 1}
          className={arrowBtnClass}
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <div
          className="flex-1 select-none relative overflow-hidden rounded-xl"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <div
            key={post.id}
            className={direction === 'right' ? 'carousel-slide-in-right' : 'carousel-slide-in-left'}
          >
            <HeroCard
              post={post}
              onClick={() => onPostClick(post)}
              onSkip={() => onSkipPost(post.id)}
            />
          </div>
          {total > 1 && autoplayActive && (
            <div className="absolute left-0 right-0 bottom-0 h-[2px] pointer-events-none">
              <div
                key={`${safeIndex}-${autoplayTick}`}
                className="carousel-progress-fill h-full bg-[var(--theme-primary)] opacity-60"
                style={{ animationDuration: `${AUTOPLAY_INTERVAL_MS}ms` }}
              />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={goNext}
          aria-label="Next post"
          disabled={total <= 1}
          className={arrowBtnClass}
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
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
