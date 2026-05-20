import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import type { TrendingPost } from '../helpers/DailyService';
import { useTheme } from '../context/ThemeContext';
import { HeroCard } from './MagazineGrid';

const SWIPE_THRESHOLD_PX = 50;
const MAX_DOTS = 9;

interface NewsCarouselProps {
  posts: TrendingPost[];
  onPostClick: (post: TrendingPost) => void;
  onSkipPost: (postId: string) => void;
}

const NewsCarousel = ({ posts, onPostClick, onSkipPost }: NewsCarouselProps) => {
  const { isLight } = useTheme();
  const [index, setIndex] = useState(0);
  const swipeStartX = useRef<number | null>(null);
  const total = posts.length;

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
        setIndex(i => (i - 1 + total) % total);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIndex(i => (i + 1) % total);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [total]);

  if (total === 0) return null;

  const safeIndex = Math.min(index, total - 1);
  const post = posts[safeIndex];

  const goPrev = () => setIndex(i => (i - 1 + total) % total);
  const goNext = () => setIndex(i => (i + 1) % total);

  const onPointerDown = (e: React.PointerEvent) => {
    swipeStartX.current = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (swipeStartX.current === null) return;
    const delta = e.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta < 0) goNext(); else goPrev();
  };

  const dotsToShow = Math.min(total, MAX_DOTS);
  const dotOffset = Math.max(0, Math.min(total - dotsToShow, safeIndex - Math.floor(dotsToShow / 2)));

  const arrowBtnClass = `flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-full border cursor-pointer transition flex items-center justify-center ${
    isLight
      ? 'bg-[var(--theme-cardBg)] border-[var(--theme-border)] text-[var(--theme-text)] hover:border-orange-600 disabled:opacity-40'
      : 'bg-transparent border-[var(--theme-border)] text-[var(--theme-text)] hover:border-[var(--theme-primary)] disabled:opacity-40'
  }`;

  return (
    <main className="max-w-7xl mx-auto px-4 pt-4 pb-24">
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
          className="flex-1 select-none"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <HeroCard
            key={post.id}
            post={post}
            onClick={() => onPostClick(post)}
            onSkip={() => onSkipPost(post.id)}
          />
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
                    onClick={() => setIndex(idx)}
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
          ← → arrows · swipe
        </span>
      </div>
    </main>
  );
};

export default NewsCarousel;
