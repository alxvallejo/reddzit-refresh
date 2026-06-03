import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPause, faPlay, faCircleQuestion } from '@fortawesome/free-solid-svg-icons';
import { isDisplayableComment, type TrendingPost, type TrendingPostTopComment } from '../helpers/DailyService';
import { useTheme } from '../context/ThemeContext';
import { useCoarsePointer } from '../helpers/useCoarsePointer';
import { usePortraitCoarse } from '../helpers/usePortraitCoarse';
import { useReddit } from '../context/RedditContext';
import { HeroCard } from './MagazineGrid';
import CommentQuote from './CommentQuote';
import ActionBar from './ActionBar';
import { faBookmark as faBookmarkSolid, faShareNodes, faExpand, faXmark, faEyeSlash, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { faBookmark as faBookmarkRegular } from '@fortawesome/free-regular-svg-icons';

const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="inline-flex items-center justify-center min-w-[1.25rem] h-[1.25rem] px-1 rounded border border-[var(--theme-border)] bg-[var(--theme-bgSecondary)] text-[var(--theme-text)] font-mono text-[10px] leading-none normal-case">
    {children}
  </kbd>
);

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

interface SlideActionsProps {
  isSaved: boolean;
  onToggleSave: (e: React.MouseEvent) => void;
  onShare: (e: React.MouseEvent) => void;
  variant: 'stack' | 'row';
}

const SlideActions = ({ isSaved, onToggleSave, onShare, variant }: SlideActionsProps) => {
  const { isLight } = useTheme();

  const isStack = variant === 'stack';
  const containerClass = isStack
    ? 'hidden md:flex absolute right-2 bottom-1/3 flex-col gap-2 z-30 pointer-events-auto'
    : 'flex md:hidden gap-3 mt-2 pointer-events-auto relative z-30';

  const idleClass = isStack
    ? (isLight ? 'text-gray-700 bg-white/80 hover:bg-gray-200' : 'text-gray-200 bg-black/60 hover:bg-white/20')
    : 'text-white bg-white/12 hover:bg-white/25';

  const savedActiveClass = 'bg-[var(--theme-primary)]/70 text-[#262129] hover:bg-[var(--theme-primary)]/80';
  const buttonBase = 'w-9 h-9 rounded-full backdrop-blur-sm transition border-none cursor-pointer flex items-center justify-center';

  // Stop pointer events on the buttons so the swipe container doesn't capture
  // the pointer (setPointerCapture on the parent can swallow the synthesized
  // click on touch devices, leaving the handler silent).
  const stopPointer = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <div className={containerClass}>
      <button
        type="button"
        onClick={onToggleSave}
        onPointerDown={stopPointer}
        onPointerUp={stopPointer}
        title={isSaved ? 'Unsave' : 'Save'}
        aria-label={isSaved ? 'Unsave post' : 'Save post'}
        aria-pressed={isSaved}
        className={`${buttonBase} ${isSaved ? savedActiveClass : idleClass}`}
      >
        <FontAwesomeIcon icon={isSaved ? faBookmarkSolid : faBookmarkRegular} className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onShare}
        onPointerDown={stopPointer}
        onPointerUp={stopPointer}
        title="Share"
        aria-label="Share post"
        className={`${buttonBase} ${idleClass}`}
      >
        <FontAwesomeIcon icon={faShareNodes} className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

interface FullscreenEnterButtonProps {
  onEnter: () => void;
}

const FullscreenEnterButton = ({ onEnter }: FullscreenEnterButtonProps) => {
  const { isLight } = useTheme();
  const stopPointer = (e: React.PointerEvent) => e.stopPropagation();
  const idleClass = isLight
    ? 'text-gray-700 bg-white/80 hover:bg-gray-200'
    : 'text-gray-200 bg-black/60 hover:bg-white/20';
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onEnter();
      }}
      onPointerDown={stopPointer}
      onPointerUp={stopPointer}
      title="Enter fullscreen"
      aria-label="Enter fullscreen"
      className={`absolute right-12 top-2 z-20 w-9 h-9 rounded-full backdrop-blur-sm transition border-none cursor-pointer flex items-center justify-center ${idleClass}`}
    >
      <FontAwesomeIcon icon={faExpand} className="w-3.5 h-3.5" />
    </button>
  );
};

interface FullscreenShellProps {
  onClose: () => void;
  children: React.ReactNode;
}

const FullscreenShell = ({ onClose, children }: FullscreenShellProps) => {
  const { isLight } = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const showRotateHint = usePortraitCoarse();
  const onCloseRef = useRef(onClose);

  // Keep the ref pointed at the latest onClose without re-running the effect.
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    document.documentElement.classList.add('fullscreen-open');

    const el = rootRef.current;
    // Fullscreen API — best effort. iPhone Safari rejects; we ignore.
    if (el?.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
    // Orientation lock — best effort. iPad/iPhone reject; we ignore.
    // `screen.orientation.lock` is not in the standard `Screen` lib types
    // for all TS configs, so we narrow through `unknown`.
    const orientation = (screen as unknown as { orientation?: { lock?: (o: string) => Promise<void>; unlock?: () => void } }).orientation;
    if (orientation?.lock) {
      orientation.lock('landscape').catch(() => {});
    }

    const onFsChange = () => {
      if (!document.fullscreenElement) {
        // The browser exited fullscreen on us (Esc, back gesture, etc.).
        // Mirror that to our state so the overlay closes.
        onCloseRef.current();
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);

    return () => {
      document.documentElement.classList.remove('fullscreen-open');
      document.removeEventListener('fullscreenchange', onFsChange);
      if (orientation?.unlock) {
        try { orientation.unlock(); } catch { /* not always allowed; ignore */ }
      }
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  const closeButtonClass = isLight
    ? 'text-gray-700 bg-white/80 hover:bg-gray-200'
    : 'text-gray-200 bg-black/60 hover:bg-white/20';

  return createPortal(
    <div
      ref={rootRef}
      className="fixed inset-0 z-[9999] flex flex-col bg-[var(--theme-bg)]"
      style={{
        width: '100dvw',
        height: '100dvh',
        paddingTop: 'max(env(safe-area-inset-top), 0.5rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 0.75rem)',
        paddingRight: 'max(env(safe-area-inset-right), 0.75rem)',
      }}
    >
      <button
        type="button"
        onClick={onClose}
        title="Exit fullscreen"
        aria-label="Exit fullscreen"
        className={`absolute z-30 w-9 h-9 rounded-full backdrop-blur-sm transition border-none cursor-pointer flex items-center justify-center ${closeButtonClass}`}
        style={{
          top: 'max(env(safe-area-inset-top), 0.5rem)',
          left: 'max(env(safe-area-inset-left), 0.5rem)',
        }}
      >
        <FontAwesomeIcon icon={faXmark} className="w-3.5 h-3.5" />
      </button>
      {showRotateHint && (
        <div
          role="status"
          aria-live="polite"
          className="absolute left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full text-xs font-medium shadow-lg pointer-events-none bg-black/70 text-white"
          style={{ top: 'max(env(safe-area-inset-top), 0.5rem)' }}
        >
          Rotate for a wider view
        </div>
      )}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {children}
      </div>
    </div>,
    document.body
  );
};

interface NewsCarouselProps {
  posts: TrendingPost[];
  onPostClick: (post: TrendingPost) => void;
  onSkipPost?: (postId: string) => void;
  onVisibleRangeChange?: (indices: number[]) => void;
  enableFullscreen?: boolean;
  /** When true, the carousel's keyboard handler is suspended so an overlay can own input. */
  tourActive?: boolean;
  /** Optional callback wired to the footer "?" button; when omitted, the button is not rendered. */
  onReplayTour?: () => void;
}

const NewsCarousel = ({ posts, onPostClick, onSkipPost, onVisibleRangeChange, enableFullscreen, tourActive = false, onReplayTour }: NewsCarouselProps) => {
  const { isLight } = useTheme();
  const isCoarsePointer = useCoarsePointer();
  const isPortraitCoarse = usePortraitCoarse();
  const { saved, signedIn, savePost, unsavePost, redirectForAuth } = useReddit();
  const [index, setIndex] = useState(0);
  const [isHoverPaused, setIsHoverPaused] = useState(false);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);
  const [tabVisible, setTabVisible] = useState(() =>
    typeof document === 'undefined' ? true : document.visibilityState === 'visible'
  );
  const [autoplayTick, setAutoplayTick] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Tracks optimistic adds that haven't propagated to RedditContext.saved yet.
  // RedditContext.savePost only flips `saved: true` on existing entries — it does
  // not append new ones — so without this side-channel a freshly-saved post would
  // disappear from savedIds whenever the saved array refreshes.
  const optimisticAddsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const next = new Set<string>();
    for (const item of saved as Array<{ id?: string; name?: string }>) {
      if (item?.id) next.add(item.id);
      else if (item?.name?.startsWith('t3_')) next.add(item.name.slice(3));
    }
    for (const id of optimisticAddsRef.current) next.add(id);
    setSavedIds(next);
  }, [saved]);

  const toastTimerRef = useRef<number | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2000);
  };
  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);
  const [stack, setStack] = useState<TrendingPost[]>(() => (posts.length > 0 ? [posts[0]] : []));
  const [commentIndex, setCommentIndex] = useState(0);
  const [commentStack, setCommentStack] = useState<TrendingPostTopComment[]>([]);
  const [commentPinHeight, setCommentPinHeight] = useState<number | null>(null);
  const commentStackRef = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef<number | null>(null);
  const wasSwipingRef = useRef(false);
  const commentSwipeStartX = useRef<number | null>(null);
  const commentWasSwipingRef = useRef(false);
  const tourActiveRef = useRef(tourActive);
  const isHoverPausedRef = useRef(isHoverPaused);
  const isManuallyPausedRef = useRef(isManuallyPaused);
  const total = posts.length;
  const effectivelyPaused = isHoverPaused || isManuallyPaused;
  const autoplayActive = total > 1 && !effectivelyPaused && tabVisible;
  const rotatorActive = !effectivelyPaused && tabVisible;

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
    tourActiveRef.current = tourActive;
    isHoverPausedRef.current = isHoverPaused;
    isManuallyPausedRef.current = isManuallyPaused;
  });

  useEffect(() => {
    if (total === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (tourActiveRef.current) return;
      // Ignore OS key auto-repeat so a slightly-long press advances one slide, not several.
      if (e.repeat) return;
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
      } else if (e.key === ' ' || e.code === 'Space') {
        if (total <= 1) return;
        e.preventDefault();
        if (isHoverPausedRef.current || isManuallyPausedRef.current) {
          setIsManuallyPaused(false);
          setIsHoverPaused(false);
        } else {
          setIsManuallyPaused(true);
        }
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
      // Capture pre-collapse height (the grid-max of both items) so we can pin
      // it and ease the height back down to the surviving comment's natural size
      // — otherwise removing the outgoing comment snaps the container height.
      const heldHeight = commentStackRef.current?.offsetHeight ?? 0;
      setCommentStack(prev => prev.slice(-1));
      if (heldHeight > 0) {
        setCommentPinHeight(heldHeight);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setCommentPinHeight(0);
            window.setTimeout(() => setCommentPinHeight(null), 450);
          });
        });
      }
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

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post) return;
    const slug = (post.title || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/, '');
    const path = slug ? `/p/t3_${post.id}/${slug}` : `/p/t3_${post.id}`;
    const url = `${window.location.origin}${path}`;
    const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
    if (isTouch && typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ url, title: post.title });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied!');
    } catch {
      // Insecure context / permission denied — fallback to legacy execCommand
      try {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Link copied!');
      } catch {
        showToast('Copy failed');
      }
    }
  };

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post) return;
    if (!signedIn) {
      redirectForAuth();
      return;
    }
    const fullname = `t3_${post.id}`;
    const wasSaved = savedIds.has(post.id);
    setSavedIds(prev => {
      const next = new Set(prev);
      if (wasSaved) next.delete(post.id); else next.add(post.id);
      return next;
    });
    if (wasSaved) optimisticAddsRef.current.delete(post.id);
    else optimisticAddsRef.current.add(post.id);
    try {
      if (wasSaved) {
        await unsavePost(fullname);
        showToast('Post unsaved');
      } else {
        await savePost(fullname);
        showToast('Post saved!');
      }
    } catch {
      setSavedIds(prev => {
        const next = new Set(prev);
        if (wasSaved) next.add(post.id); else next.delete(post.id);
        return next;
      });
      if (wasSaved) optimisticAddsRef.current.add(post.id);
      else optimisticAddsRef.current.delete(post.id);
      showToast("Couldn't save — try again");
    }
  };

  const isCurrentSaved = post ? savedIds.has(post.id) : false;

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

  const goPrevComment = () => {
    if (commentCount <= 1) return;
    setCommentIndex(i => (i - 1 + commentCount) % commentCount);
  };
  const goNextComment = () => {
    if (commentCount <= 1) return;
    setCommentIndex(i => (i + 1) % commentCount);
  };

  const onCommentPointerDown = (e: React.PointerEvent) => {
    if (commentCount <= 1) return;
    commentSwipeStartX.current = e.clientX;
    commentWasSwipingRef.current = false;
    if (e.pointerType === 'touch') setIsHoverPaused(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // see hero onPointerDown — capture is best-effort.
    }
  };

  const onCommentPointerUp = (e: React.PointerEvent) => {
    const touchEnd = e.pointerType === 'touch';
    if (commentSwipeStartX.current === null) {
      if (touchEnd) setIsHoverPaused(false);
      return;
    }
    const delta = e.clientX - commentSwipeStartX.current;
    commentSwipeStartX.current = null;
    if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) {
      commentWasSwipingRef.current = true;
      if (delta < 0) goNextComment(); else goPrevComment();
    }
    if (touchEnd) setIsHoverPaused(false);
  };

  const onCommentPointerCancel = (e: React.PointerEvent) => {
    commentSwipeStartX.current = null;
    if (e.pointerType === 'touch') setIsHoverPaused(false);
  };

  const onCommentClickCapture = (e: React.MouseEvent) => {
    if (commentWasSwipingRef.current) {
      e.stopPropagation();
      e.preventDefault();
      commentWasSwipingRef.current = false;
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    swipeStartX.current = e.clientX;
    wasSwipingRef.current = false;
    if (e.pointerType === 'touch') setIsHoverPaused(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // setPointerCapture can throw in non-real-pointer environments; swipe still works without capture.
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const touchEnd = e.pointerType === 'touch';
    if (swipeStartX.current === null) {
      if (touchEnd) setIsHoverPaused(false);
      return;
    }
    const delta = e.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) {
      wasSwipingRef.current = true;
      if (delta < 0) goNext(); else goPrev();
    } else if (post) {
      // setPointerCapture on this wrapper retargets the synthesized click to the
      // wrapper itself, so HeroCard's onClick never fires. Treat a non-swipe
      // pointerup as a tap and navigate directly.
      onPostClick(post);
    }
    if (touchEnd) setIsHoverPaused(false);
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    swipeStartX.current = null;
    if (e.pointerType === 'touch') setIsHoverPaused(false);
  };

  const onClickCaptureHero = (e: React.MouseEvent) => {
    if (wasSwipingRef.current) {
      e.stopPropagation();
      e.preventDefault();
      wasSwipingRef.current = false;
    }
  };

  const togglePlayback = () => {
    if (effectivelyPaused) {
      setIsManuallyPaused(false);
      setIsHoverPaused(false);
    } else {
      setIsManuallyPaused(true);
    }
  };

  const dotsToShow = Math.min(total, MAX_DOTS);
  const dotOffset = Math.max(0, Math.min(total - dotsToShow, safeIndex - Math.floor(dotsToShow / 2)));

  // Touch devices in portrait can't fit the side-by-side fullscreen layout, so
  // stack hero-over-comments instead of forcing a rotation.
  const stackedFullscreen = isFullscreen && isPortraitCoarse;

  const heroWrapperClass = stackedFullscreen
    ? 'relative basis-[55%] flex-shrink-0 min-h-0 overflow-hidden rounded-xl select-none'
    : isFullscreen
      ? 'relative basis-[62%] flex-shrink-0 min-h-0 overflow-hidden rounded-xl select-none'
      : 'relative w-full aspect-[4/5] md:aspect-[16/9] md:basis-3/4 md:flex-shrink-0 overflow-hidden rounded-xl select-none';

  const asideClass = stackedFullscreen
    ? `flex-1 min-w-0 min-h-0 overflow-y-auto scrollbar-hide select-none ${
        isLight ? 'rounded-2xl bg-[rgba(249,115,22,0.08)] p-3' : ''
      }`
    : isFullscreen
      ? `flex-1 min-w-0 max-h-full overflow-y-auto scrollbar-hide select-none ${
          isLight ? 'rounded-2xl bg-[rgba(249,115,22,0.08)] p-3' : ''
        }`
      : `mt-6 md:mt-0 md:flex-1 md:min-w-0 md:max-h-[calc(100vh-16rem)] md:overflow-y-auto scrollbar-hide select-none ${
          isLight ? 'rounded-2xl bg-[rgba(249,115,22,0.08)] p-5 md:p-6' : ''
        }`;

  const rowClass = stackedFullscreen
    ? `flex flex-col gap-3 flex-1 min-h-0 ${commentCount === 0 ? 'justify-center' : ''}`
    : isFullscreen
      ? `flex flex-row gap-3 items-stretch flex-1 min-h-0 ${commentCount === 0 ? 'justify-center' : ''}`
      : `md:flex md:gap-6 md:items-start ${commentCount === 0 ? 'md:justify-center' : ''}`;

  const footerClass =
    isFullscreen
      ? 'flex flex-col items-center gap-2 mt-2 flex-shrink-0'
      : 'flex flex-col items-center gap-2 mt-5';

  const pauseHandlers = {
    onMouseEnter: () => setIsHoverPaused(true),
    onMouseLeave: () => setIsHoverPaused(false),
    onFocusCapture: () => setIsHoverPaused(true),
    onBlurCapture: () => setIsHoverPaused(false),
  };

  const carouselBody = (
    <>
      <div className={rowClass}>
        <div
          data-tour="hero"
          aria-keyshortcuts="ArrowLeft ArrowRight"
          className={heroWrapperClass}
          style={{ touchAction: 'pan-y' }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onClickCapture={onClickCaptureHero}
        >
          <div className="relative h-full w-full">
            {stack.map((p, i) => {
              const isFirst = i === 0;
              const isLast = i === stack.length - 1;
              return (
                <div
                  key={p.id}
                  className={`${isFirst ? 'h-full w-full' : 'absolute inset-0'} ${isLast ? 'carousel-fade-in' : 'pointer-events-none'}`}
                >
                  <HeroCard
                    post={p}
                    onClick={() => onPostClick(p)}
                    onSkip={onSkipPost ? () => onSkipPost(p.id) : undefined}
                    skipClassName="hidden md:flex"
                    fillContainer
                    headerSlot={enableFullscreen && isCoarsePointer && isLast && !isFullscreen ? (
                      <FullscreenEnterButton onEnter={() => setIsFullscreen(true)} />
                    ) : undefined}
                    actionsSlot={isLast ? (
                      <ActionBar
                        className="md:hidden mt-2"
                        actions={[
                          {
                            key: 'save',
                            icon: isCurrentSaved ? faBookmarkSolid : faBookmarkRegular,
                            label: isCurrentSaved ? 'Saved' : 'Save',
                            title: isCurrentSaved ? 'Unsave' : 'Save',
                            onClick: handleToggleSave,
                            active: isCurrentSaved,
                          },
                          {
                            key: 'share',
                            icon: faShareNodes,
                            label: 'Share',
                            title: 'Share',
                            onClick: handleShare,
                          },
                          ...(onSkipPost
                            ? [{
                                key: 'hide',
                                icon: faEyeSlash,
                                label: 'Hide',
                                title: 'Hide post',
                                onClick: (e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  onSkipPost(p.id);
                                },
                              }]
                            : []),
                        ]}
                      />
                    ) : undefined}
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
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                aria-label="Previous post"
                title="Previous post"
                className="md:hidden absolute left-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full backdrop-blur-sm transition border-none cursor-pointer flex items-center justify-center text-white bg-black/50 hover:bg-black/70"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                aria-label="Next post"
                title="Next post"
                className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 z-30 w-9 h-9 rounded-full backdrop-blur-sm transition border-none cursor-pointer flex items-center justify-center text-white bg-black/50 hover:bg-black/70"
              >
                <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <SlideActions
            isSaved={isCurrentSaved}
            onToggleSave={handleToggleSave}
            onShare={handleShare}
            variant="stack"
          />
        </div>
        {commentCount > 0 && (
          <aside
            data-tour="comments"
            aria-keyshortcuts="ArrowUp ArrowDown"
            className={asideClass}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] uppercase tracking-wider text-[var(--theme-textMuted)] opacity-70">
                Top comments
              </div>
              {commentCount > 1 && (
                <div className="text-[10px] text-[var(--theme-textMuted)] tabular-nums opacity-70">
                  {safeCommentIndex + 1} / {commentCount}
                  {!isCoarsePointer && ' · ↑ ↓'}
                </div>
              )}
            </div>
            <div
              ref={commentStackRef}
              className="relative grid select-none"
              style={{
                touchAction: 'pan-y',
                minHeight: commentPinHeight !== null ? `${commentPinHeight}px` : undefined,
                transition: commentPinHeight !== null ? 'min-height 400ms ease' : undefined,
              }}
              onPointerDown={onCommentPointerDown}
              onPointerUp={onCommentPointerUp}
              onPointerCancel={onCommentPointerCancel}
              onClickCapture={onCommentClickCapture}
            >
              {commentStack.map((c, i) => {
                const isLast = i === commentStack.length - 1;
                return (
                  <div
                    key={c.id}
                    className={`col-start-1 row-start-1 ${isLast ? 'carousel-fade-in' : 'carousel-fade-out pointer-events-none'}`}
                  >
                    <CommentQuote comment={c} size="sm" />
                  </div>
                );
              })}
            </div>
          </aside>
        )}
      </div>
      <div className={footerClass}>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--theme-textMuted)] tabular-nums">
            {safeIndex + 1} / {total}
          </span>
          {total > 1 && (
            <>
              <button
                type="button"
                data-tour="pause"
                aria-keyshortcuts="Space"
                onClick={togglePlayback}
                aria-label={effectivelyPaused ? 'Play' : 'Pause'}
                title={effectivelyPaused ? 'Play' : 'Pause'}
                className={`w-6 h-6 flex items-center justify-center rounded-full border-none cursor-pointer transition-colors text-[var(--theme-textMuted)] bg-transparent ${
                  isLight ? 'hover:bg-gray-100 hover:text-gray-700' : 'hover:bg-white/10 hover:text-white'
                }`}
              >
                <FontAwesomeIcon icon={effectivelyPaused ? faPlay : faPause} className="text-[10px]" />
              </button>
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
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--theme-textMuted)] opacity-70">
          {(() => {
            if (total > 1) {
              if (effectivelyPaused) {
                if (isCoarsePointer) return <span>paused · swipe</span>;
                return (
                  <span className="inline-flex items-center gap-1.5">
                    paused · <Kbd>←</Kbd><Kbd>→</Kbd> arrows · swipe
                  </span>
                );
              }
              return <span>auto-advancing · hover to pause</span>;
            }
            if (isCoarsePointer) return <span>swipe</span>;
            return (
              <span className="inline-flex items-center gap-1.5">
                <Kbd>←</Kbd><Kbd>→</Kbd> arrows · swipe
              </span>
            );
          })()}
          {onReplayTour && !isCoarsePointer && (
            <button
              type="button"
              onClick={onReplayTour}
              aria-label="Show keyboard shortcuts tour"
              title="Show keyboard shortcuts"
              className="ml-1 w-5 h-5 flex items-center justify-center rounded-full border-none cursor-pointer bg-transparent text-[var(--theme-textMuted)] hover:text-[var(--theme-text)] transition-colors"
            >
              <FontAwesomeIcon icon={faCircleQuestion} className="text-[10px]" />
            </button>
          )}
        </div>
      </div>
      {toast && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[10000] px-5 py-2.5 rounded-full text-sm font-medium shadow-lg text-[var(--theme-bg)]"
          style={{ backgroundColor: 'var(--theme-primary)' }}
        >
          {toast}
        </div>
      )}
    </>
  );

  if (isFullscreen) {
    return (
      <FullscreenShell onClose={() => setIsFullscreen(false)}>
        <main
          className="flex flex-col h-full w-full"
          {...pauseHandlers}
        >
          {carouselBody}
        </main>
      </FullscreenShell>
    );
  }

  return (
    <main
      className="max-w-screen-2xl mx-auto px-4 pt-4 pb-8"
      {...pauseHandlers}
    >
      {carouselBody}
    </main>
  );
};

export default NewsCarousel;
