// src/components/CarouselOnboardingTour.tsx
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
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

    const visibleSteps = useMemo(() => {
      if (typeof document === 'undefined') return ALL_STEPS;
      return ALL_STEPS.filter(s => document.querySelector(`[data-tour="${s.anchor}"]`) !== null);
    }, [active]);

    const close = useCallback(() => {
      setActive(false);
      markSeen();
    }, [markSeen]);

    const open = useCallback(() => {
      if (isCoarsePointer) return;
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
      return () => window.removeEventListener('keydown', onKey, { capture: true } as EventListenerOptions);
    }, [active, visibleSteps.length, close]);

    if (!active || isCoarsePointer || visibleSteps.length === 0 || typeof document === 'undefined') {
      return null;
    }

    const safeIndex = Math.min(stepIndex, visibleSteps.length - 1);
    const step = visibleSteps[safeIndex];
    const isLast = safeIndex === visibleSteps.length - 1;

    return createPortal(
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="carousel-tour-headline"
          className={`relative w-full max-w-[340px] rounded-xl shadow-2xl border ${
            isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-[var(--theme-bgSecondary)] border-[var(--theme-border)] text-[var(--theme-text)]'
          } p-4`}
        >
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
      </div>,
      document.body
    );
  }
);

CarouselOnboardingTour.displayName = 'CarouselOnboardingTour';

export default CarouselOnboardingTour;
