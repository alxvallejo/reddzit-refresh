// src/components/CarouselOnboardingTour.tsx
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useCoarsePointer } from '../helpers/useCoarsePointer';
import { useFirstVisit } from '../helpers/useFirstVisit';

const STORAGE_KEY = 'rdz_carousel_tour_seen_v1';
const AUTO_DELAY_MS = 600;

type Side = 'top' | 'bottom' | 'left' | 'right';

interface Position {
  top: number;
  left: number;
  side: Side;
  caretOffset: number; // px offset of caret along the popover's edge
}

const GAP = 12; // px between anchor and popover
const POPOVER_W = 340;
const POPOVER_MAX_H = 220; // approximate, used for flip decision
const VIEWPORT_MARGIN = 16;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const computePosition = (anchor: DOMRect, vw: number, vh: number, preferred: Side): Position => {
  const sides: Side[] = [preferred, 'bottom', 'top', 'right', 'left'];
  for (const side of sides) {
    if (side === 'bottom' && anchor.bottom + GAP + POPOVER_MAX_H <= vh - VIEWPORT_MARGIN) {
      const left = clamp(anchor.left + anchor.width / 2 - POPOVER_W / 2, VIEWPORT_MARGIN, vw - POPOVER_W - VIEWPORT_MARGIN);
      const caretOffset = clamp(anchor.left + anchor.width / 2 - left, 16, POPOVER_W - 16);
      return { top: anchor.bottom + GAP, left, side, caretOffset };
    }
    if (side === 'top' && anchor.top - GAP - POPOVER_MAX_H >= VIEWPORT_MARGIN) {
      const left = clamp(anchor.left + anchor.width / 2 - POPOVER_W / 2, VIEWPORT_MARGIN, vw - POPOVER_W - VIEWPORT_MARGIN);
      const caretOffset = clamp(anchor.left + anchor.width / 2 - left, 16, POPOVER_W - 16);
      return { top: anchor.top - GAP - POPOVER_MAX_H, left, side, caretOffset };
    }
    if (side === 'left' && anchor.left - GAP - POPOVER_W >= VIEWPORT_MARGIN) {
      const top = clamp(anchor.top + anchor.height / 2 - POPOVER_MAX_H / 2, VIEWPORT_MARGIN, vh - POPOVER_MAX_H - VIEWPORT_MARGIN);
      const caretOffset = clamp(anchor.top + anchor.height / 2 - top, 16, POPOVER_MAX_H - 16);
      return { top, left: anchor.left - GAP - POPOVER_W, side, caretOffset };
    }
    if (side === 'right' && anchor.right + GAP + POPOVER_W <= vw - VIEWPORT_MARGIN) {
      const top = clamp(anchor.top + anchor.height / 2 - POPOVER_MAX_H / 2, VIEWPORT_MARGIN, vh - POPOVER_MAX_H - VIEWPORT_MARGIN);
      const caretOffset = clamp(anchor.top + anchor.height / 2 - top, 16, POPOVER_MAX_H - 16);
      return { top, left: anchor.right + GAP, side, caretOffset };
    }
  }
  // Fallback: center
  return {
    top: vh / 2 - POPOVER_MAX_H / 2,
    left: vw / 2 - POPOVER_W / 2,
    side: 'bottom',
    caretOffset: POPOVER_W / 2,
  };
};

export interface CarouselOnboardingTourHandle {
  open: () => void;
}

interface Props {
  onActiveChange?: (active: boolean) => void;
}

interface Step {
  anchor: 'hero' | 'comments' | 'pause';
  headline: string;
  body: React.ReactNode;
}

const PREFERRED_SIDE: Record<Step['anchor'], Side> = {
  hero: 'bottom',
  comments: 'left',
  pause: 'top',
};

const ALL_STEPS: Step[] = [
  { anchor: 'hero', headline: 'Browse top posts', body: <>Use <kbd>←</kbd> <kbd>→</kbd> to flip through stories.</> },
  { anchor: 'comments', headline: 'Skim top comments', body: <>Use <kbd>↑</kbd> <kbd>↓</kbd> to cycle through replies.</> },
  { anchor: 'pause', headline: 'Pause anytime', body: <>Hit <kbd>Space</kbd> to pause or resume.</> },
];

const CarouselOnboardingTour = forwardRef<CarouselOnboardingTourHandle, Props>(
  ({ onActiveChange }, ref) => {
    const { isLight } = useTheme();
    const isCoarsePointer = useCoarsePointer();
    const { seen, markSeen } = useFirstVisit(STORAGE_KEY);

    const [active, setActive] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [position, setPosition] = useState<Position | null>(null);

    const triggerElRef = useRef<HTMLElement | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    const visibleSteps =
      typeof document === 'undefined'
        ? ALL_STEPS
        : ALL_STEPS.filter(s => document.querySelector(`[data-tour="${s.anchor}"]`) !== null);

    const close = useCallback(() => {
      setActive(false);
      markSeen();
      const trigger = triggerElRef.current;
      triggerElRef.current = null;
      // Defer to next frame so the popover unmounts first
      window.requestAnimationFrame(() => {
        if (trigger && document.contains(trigger)) trigger.focus();
      });
    }, [markSeen]);

    const open = useCallback(() => {
      if (isCoarsePointer) return;
      triggerElRef.current = (document.activeElement instanceof HTMLElement) ? document.activeElement : null;
      setStepIndex(0);
      setActive(true);
    }, [isCoarsePointer]);

    useImperativeHandle(ref, () => ({ open }), [open]);

    useEffect(() => {
      onActiveChange?.(active);
    }, [active, onActiveChange]);

    // First-visit auto-trigger
    useEffect(() => {
      if (seen || isCoarsePointer) return;
      const timer = window.setTimeout(() => {
        setStepIndex(0);
        setActive(true);
      }, AUTO_DELAY_MS);
      return () => window.clearTimeout(timer);
    }, [seen, isCoarsePointer]);

    // Esc / Enter / Arrow keys while active
    useEffect(() => {
      if (!active) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          close();
        } else if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          setStepIndex(i => {
            if (i + 1 >= visibleSteps.length) {
              close();
              return i;
            }
            return i + 1;
          });
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          e.stopPropagation();
          setStepIndex(i => Math.max(0, i - 1));
        }
      };
      window.addEventListener('keydown', onKey, { capture: true });
      return () => window.removeEventListener('keydown', onKey, { capture: true });
    }, [active, visibleSteps.length, close]);

    useEffect(() => {
      if (!active || visibleSteps.length === 0) {
        setPosition(null);
        return;
      }
      const step = visibleSteps[Math.min(stepIndex, visibleSteps.length - 1)];
      let rafId: number | null = null;
      const recompute = () => {
        const anchor = document.querySelector(`[data-tour="${step.anchor}"]`) as HTMLElement | null;
        if (!anchor) {
          setPosition(null);
          return;
        }
        const rect = anchor.getBoundingClientRect();
        setPosition(computePosition(rect, window.innerWidth, window.innerHeight, PREFERRED_SIDE[step.anchor]));
      };
      const schedule = () => {
        if (rafId !== null) return;
        rafId = window.requestAnimationFrame(() => {
          rafId = null;
          recompute();
        });
      };
      recompute();
      window.addEventListener('resize', schedule, { passive: true });
      window.addEventListener('scroll', schedule, { passive: true, capture: true });
      return () => {
        window.removeEventListener('resize', schedule);
        window.removeEventListener('scroll', schedule, { capture: true } as EventListenerOptions);
        if (rafId !== null) window.cancelAnimationFrame(rafId);
      };
    }, [active, stepIndex, visibleSteps.length]);

    useEffect(() => {
      if (!active || visibleSteps.length === 0) return;
      const step = visibleSteps[Math.min(stepIndex, visibleSteps.length - 1)];
      const anchor = document.querySelector(`[data-tour="${step.anchor}"]`) as HTMLElement | null;
      if (!anchor) return;
      const prevPosition = anchor.style.position;
      const prevZ = anchor.style.zIndex;
      if (!prevPosition) anchor.style.position = 'relative';
      anchor.style.zIndex = '65';
      return () => {
        anchor.style.zIndex = prevZ;
        if (!prevPosition) anchor.style.position = '';
      };
    }, [active, stepIndex, visibleSteps.length]);

    // Focus trap and initial focus management
    useEffect(() => {
      if (!active) return;
      // Move focus into popover after it renders
      const focusFirst = () => {
        const el = popoverRef.current;
        if (!el) return;
        const primary = el.querySelector<HTMLElement>('[data-tour-primary]');
        (primary ?? el).focus();
      };
      const rafId = window.requestAnimationFrame(focusFirst);

      // Trap Tab inside the popover
      const onKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        const el = popoverRef.current;
        if (!el) return;
        const focusable = el.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const activeEl = document.activeElement as HTMLElement | null;
        if (e.shiftKey && activeEl === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && activeEl === last) {
          e.preventDefault();
          first.focus();
        }
      };
      document.addEventListener('keydown', onKey, { capture: true });
      return () => {
        window.cancelAnimationFrame(rafId);
        document.removeEventListener('keydown', onKey, { capture: true });
      };
    }, [active, stepIndex]);

    if (!active || isCoarsePointer || visibleSteps.length === 0 || typeof document === 'undefined' || !position) {
      return null;
    }

    const safeIndex = Math.min(stepIndex, visibleSteps.length - 1);
    const step = visibleSteps[safeIndex];
    const isLast = safeIndex === visibleSteps.length - 1;

    const caretStyle: React.CSSProperties = (() => {
      switch (position.side) {
        case 'bottom': return { top: -6, left: position.caretOffset - 6, borderWidth: '0 6px 6px 6px' };
        case 'top':    return { bottom: -6, left: position.caretOffset - 6, borderWidth: '6px 6px 0 6px' };
        case 'right':  return { left: -6, top: position.caretOffset - 6, borderWidth: '6px 6px 6px 0' };
        case 'left':   return { right: -6, top: position.caretOffset - 6, borderWidth: '6px 0 6px 6px' };
      }
    })();

    const caretColorClass = isLight ? 'border-white' : 'border-[var(--theme-bgSecondary)]';

    return createPortal(
      <>
        <div
          onClick={close}
          style={{ position: 'fixed', inset: 0, zIndex: 60 }}
          className={`carousel-tour-overlay-enter ${isLight ? 'bg-black/35' : 'bg-black/55'} backdrop-blur-sm`}
          aria-hidden
        />
        <div
          ref={popoverRef}
          key={stepIndex}
          role="dialog"
          aria-modal="true"
          aria-labelledby="carousel-tour-headline"
          tabIndex={-1}
          style={{ position: 'fixed', top: position.top, left: position.left, width: POPOVER_W, zIndex: 70 }}
          className={`carousel-tour-popover-enter rounded-xl shadow-2xl border ${
            isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-[var(--theme-bgSecondary)] border-[var(--theme-border)] text-[var(--theme-text)]'
          } p-4`}
        >
          <span
            aria-hidden
            style={caretStyle}
            className={`absolute w-0 h-0 border-solid border-transparent ${caretColorClass}`}
          />
          <button
            type="button"
            onClick={close}
            aria-label="Close tour"
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full border-none cursor-pointer bg-transparent text-[var(--theme-textMuted)] hover:bg-[var(--theme-cardBg)]"
          >
            <FontAwesomeIcon icon={faXmark} className="text-xs" />
          </button>
          <h3 id="carousel-tour-headline" className="text-sm font-semibold mb-1 pr-6">{step.headline}</h3>
          <p className="text-xs text-[var(--theme-textMuted)] leading-relaxed mb-4">{step.body}</p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-[var(--theme-textMuted)] opacity-70">
              {safeIndex + 1} of {visibleSteps.length}
            </span>
            <div className="flex gap-2">
              {safeIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setStepIndex(i => Math.max(0, i - 1))}
                  className="px-3 py-1.5 text-xs rounded-full border border-[var(--theme-border)] bg-transparent text-[var(--theme-text)] cursor-pointer hover:bg-[var(--theme-cardBg)]"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                data-tour-primary
                onClick={() => {
                  if (isLast) close();
                  else setStepIndex(i => i + 1);
                }}
                className="px-3 py-1.5 text-xs rounded-full border-none cursor-pointer bg-[var(--theme-primary)] text-[#262129] font-semibold hover:opacity-90"
              >
                {isLast ? 'Got it' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </>,
      document.body
    );
  }
);

CarouselOnboardingTour.displayName = 'CarouselOnboardingTour';

export default CarouselOnboardingTour;
