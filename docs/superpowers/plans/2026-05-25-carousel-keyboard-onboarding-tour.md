# Carousel Keyboard Onboarding Tour — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3-step coachmark tour on the home page that teaches `← →` (posts), `↑ ↓` (comments), and a new `Space` (pause/play) keyboard shortcuts. First-visit auto-shows on desktop only, with a `?` button to replay.

**Architecture:** A new sibling component `CarouselOnboardingTour` portals a dim overlay and an anchored popover. It finds anchors via `data-tour` attributes on `NewsCarousel`, locates them with `getBoundingClientRect`, and exposes an imperative `open()` handle so the carousel's footer `?` button can replay. `useFirstVisit` (a tiny localStorage-backed hook) controls auto-trigger. The host (`TopFeed`) tracks `tourActive` and forwards it to the carousel so its own keyboard handler stays out of the way while the tour is open.

**Tech Stack:** React 18, TypeScript, Tailwind v4 (utility classes), FontAwesome icons (`@fortawesome/react-fontawesome`), Vite. **No test runner exists in this project** (package.json scripts: `dev`, `build`, `lint`, `preview`). All "verify" steps are manual browser checks via `npm run dev` at http://localhost:5173/.

**Spec:** `docs/superpowers/specs/2026-05-25-carousel-keyboard-onboarding-tour-design.md`

---

## File map

- **Create:** `src/helpers/useFirstVisit.ts` — localStorage-backed first-visit hook with in-memory fallback.
- **Create:** `src/components/CarouselOnboardingTour.tsx` — the tour overlay, popover, step orchestration; exposes an imperative `open()` handle.
- **Modify:** `src/components/NewsCarousel.tsx` — add `Space` keyboard pause, `tourActive` + `onReplayTour` props, `data-tour` anchors, `aria-keyshortcuts`, kbd-chip footer hint with `?` button.
- **Modify:** `src/components/TopFeed.tsx` — mount the tour, wire ref + `tourActive` state, pass props to `NewsCarousel`.

---

## Task 1: Create `useFirstVisit` hook

**Files:**
- Create: `src/helpers/useFirstVisit.ts`

Establish persistent first-visit detection that gracefully degrades when `localStorage` throws (e.g., older Safari private browsing). The hook is intentionally minimal — one key in, `{ seen, markSeen }` out.

- [ ] **Step 1: Specify expected behavior (manual test plan)**

The hook must satisfy these manual checks:
1. On first render with no prior key: `seen === false`.
2. After calling `markSeen()`: re-renders the component with `seen === true`, AND `localStorage.getItem(key)` returns `"1"`.
3. After page reload (with the key already set): initial `seen === true`.
4. If `localStorage.setItem` throws (simulate via DevTools → Application → Storage → Block site data): no error reaches the component; `seen` still flips to `true` in-memory for the session; reload returns to `false` (no persistence).

- [ ] **Step 2: Write the hook**

```ts
// src/helpers/useFirstVisit.ts
import { useCallback, useState } from 'react';

const isBrowser = typeof window !== 'undefined';

const readSeen = (key: string): boolean => {
  if (!isBrowser) return false;
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

const writeSeen = (key: string) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // storage unavailable — in-memory state still flips for the session
  }
};

export const useFirstVisit = (key: string) => {
  const [seen, setSeen] = useState<boolean>(() => readSeen(key));

  const markSeen = useCallback(() => {
    setSeen(true);
    writeSeen(key);
  }, [key]);

  return { seen, markSeen };
};
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors. (If TS reports unused — it's not imported anywhere yet, that's fine, the build only complains about unused locals inside files, not exported symbols.)

- [ ] **Step 4: Commit**

```bash
git add src/helpers/useFirstVisit.ts
git commit -m "Add useFirstVisit hook for localStorage-backed first-visit flag"
```

---

## Task 2: Add `Space` key, `tourActive` prop, and `data-tour` anchors to `NewsCarousel`

**Files:**
- Modify: `src/components/NewsCarousel.tsx`

Add the infrastructure the tour will need on the carousel side, with no visible UI changes yet. Three additions:
1. `tourActive` prop — when `true`, the carousel's own `keydown` handler returns early so the tour's handler isn't fighting it.
2. New `Space` key case in the existing `keydown` handler that mirrors the pause/play button.
3. `data-tour` attributes and `aria-keyshortcuts` on the three elements the tour will anchor to.

- [ ] **Step 1: Specify expected behavior**

After this task:
1. Pressing `Space` while focus is on `<body>` toggles the carousel between paused and playing (same behavior as clicking the pause button — clears both `isHoverPaused` and `isManuallyPaused` when re-playing).
2. Pressing `Space` while focus is in an input/textarea/select on the page does **nothing** (no pause toggle, no scroll-jacking the page).
3. Inspecting the DOM shows `data-tour="hero"` on the hero container, `data-tour="comments"` on the comments aside, `data-tour="pause"` on the pause button.
4. With no tour mounted yet, behavior is otherwise identical to current.

- [ ] **Step 2: Extend `NewsCarouselProps`**

In `src/components/NewsCarousel.tsx` around line 82, update the interface:

```tsx
interface NewsCarouselProps {
  posts: TrendingPost[];
  onPostClick: (post: TrendingPost) => void;
  onSkipPost?: (postId: string) => void;
  onVisibleRangeChange?: (indices: number[]) => void;
  /** When true, the carousel's keyboard handler is suspended so an overlay can own input. */
  tourActive?: boolean;
  /** Optional callback wired to the footer "?" button; when omitted, the button is not rendered. */
  onReplayTour?: () => void;
}
```

Update the destructure on line 89:

```tsx
const NewsCarousel = ({ posts, onPostClick, onSkipPost, onVisibleRangeChange, tourActive = false, onReplayTour }: NewsCarouselProps) => {
```

- [ ] **Step 3: Modify the keyboard handler**

Replace the entire `useEffect` block at lines 208–231 with:

```tsx
useEffect(() => {
  if (total === 0) return;
  const onKey = (e: KeyboardEvent) => {
    if (tourActive) return;
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
      if (isHoverPaused || isManuallyPaused) {
        setIsManuallyPaused(false);
        setIsHoverPaused(false);
      } else {
        setIsManuallyPaused(true);
      }
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [total, commentCount, tourActive, isHoverPaused, isManuallyPaused]);
```

Note: dep array now includes `tourActive`, `isHoverPaused`, `isManuallyPaused`. The Space key inspects current pause flags and clears or sets them in the same shape as the existing `togglePlayback` button (lines 462–469).

- [ ] **Step 4: Add `data-tour` and `aria-keyshortcuts` to the hero container**

At the hero container div (currently lines 483–490), add the two attributes:

```tsx
<div
  data-tour="hero"
  aria-keyshortcuts="ArrowLeft ArrowRight"
  className="relative w-full aspect-[4/5] md:aspect-[16/9] md:basis-3/4 md:flex-shrink-0 overflow-hidden rounded-xl select-none"
  style={{ touchAction: 'pan-y' }}
  onPointerDown={onPointerDown}
  onPointerUp={onPointerUp}
  onPointerCancel={onPointerCancel}
  onClickCapture={onClickCaptureHero}
>
```

- [ ] **Step 5: Add `data-tour` and `aria-keyshortcuts` to the comments aside**

At the `<aside>` element (currently lines 535–539), add:

```tsx
<aside
  data-tour="comments"
  aria-keyshortcuts="ArrowUp ArrowDown"
  className={`mt-6 md:mt-0 md:flex-1 md:min-w-0 md:max-h-[calc(100vh-16rem)] md:overflow-y-auto select-none ${
    isLight ? 'rounded-2xl bg-[rgba(249,115,22,0.08)] p-5 md:p-6' : ''
  }`}
>
```

- [ ] **Step 6: Add `data-tour` and `aria-keyshortcuts` to the pause/play button**

At the pause/play button (currently lines 586–596), add:

```tsx
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
```

- [ ] **Step 7: Manual verify in browser**

Run: `npm run dev`

Open http://localhost:5173/ (signed out) and:
1. Focus the page (click anywhere on the carousel hero area outside any button). Press `Space`. The carousel should toggle to paused (footer reads `paused · ← → arrows · swipe`). Press `Space` again — it resumes.
2. Click into a search input if one is present (e.g., in the header). Press `Space`. Nothing should happen to the carousel; the space character should appear in the input.
3. Open DevTools → Elements. Search for `data-tour`. Confirm exactly three matches: `hero`, `comments` (only when current post has comments), `pause`.
4. Arrow keys still work as before.

- [ ] **Step 8: Verify TypeScript still compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/NewsCarousel.tsx
git commit -m "Add Space key pause, tourActive prop, and data-tour anchors to NewsCarousel"
```

---

## Task 3: Replace carousel footer hint with kbd chips and optional `?` button

**Files:**
- Modify: `src/components/NewsCarousel.tsx`

Swap the plain-text footer hint for a flex row containing styled `<kbd>` chips for `←`/`→` and an optional `?` icon button that calls `onReplayTour`. Coarse-pointer users get the old plain-text hint with no chips and no `?` button.

- [ ] **Step 1: Specify expected behavior**

After this task:
1. Desktop / fine pointer, multi-post, auto-advancing: footer reads `auto-advancing · hover to pause` with a `?` icon at the far end.
2. Desktop, multi-post, paused: footer reads `paused ·` then kbd chips for `←` and `→`, then `arrows · swipe`, then `?` icon.
3. Desktop, single post: footer reads kbd chips for `←` and `→`, then `arrows · swipe`, then `?` icon.
4. Touch device (Chrome DevTools mobile emulation activates coarse pointer): footer reads `swipe` or `paused · swipe`. No chips, no `?` icon.
5. Clicking the `?` icon calls `onReplayTour`. (Real wiring lands in Task 4 — until then we verify by passing a temporary `console.log` callback to confirm the button renders and the click handler fires.)

- [ ] **Step 2: Add the icon import**

Near the top of `src/components/NewsCarousel.tsx` (around line 3), extend the FontAwesome import:

```tsx
import { faPause, faPlay, faCircleQuestion } from '@fortawesome/free-solid-svg-icons';
```

- [ ] **Step 3: Define an inline `Kbd` helper component**

Add this near the top of the file after the imports, before the `SWIPE_THRESHOLD_PX` constant (so above line 13):

```tsx
const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-flex items-center justify-center min-w-[1.25rem] h-[1.25rem] px-1 rounded border border-[var(--theme-border)] bg-[var(--theme-bgSecondary)] text-[var(--theme-text)] font-mono text-[10px] leading-none normal-case">
    {children}
  </kbd>
);
```

The `normal-case` keeps the chip glyph readable since the surrounding span uses `uppercase`.

- [ ] **Step 4: Replace the footer hint span**

Replace lines 623–629 in `NewsCarousel.tsx` (the `<span>` rendering `{total > 1 ? ... : ...}`) with:

```tsx
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
```

- [ ] **Step 5: Manually wire a dummy `onReplayTour` callback for testing**

Temporarily, in `src/components/TopFeed.tsx` around line 502 (where `<NewsCarousel ... />` is), add a `onReplayTour={() => console.log('tour replay clicked')}` prop. **This is throwaway** — Task 4 replaces it with the real wiring to the tour ref.

```tsx
<NewsCarousel
  posts={carouselPosts}
  onPostClick={handlePostClick}
  onSkipPost={handleSkipPost}
  onVisibleRangeChange={handleVisibleRange}
  onReplayTour={() => console.log('tour replay clicked')}
/>
```

- [ ] **Step 6: Manual verify in browser**

Run: `npm run dev`

1. Open http://localhost:5173/ on desktop. Footer hint shows kbd chips and a `?` icon at the right end. Hover the `?` — cursor turns to a pointer, color shifts. Click it — DevTools console logs `"tour replay clicked"`.
2. Hover the carousel so it pauses. Footer changes to `paused · [←][→] arrows · swipe   [?]` (with chips). Move mouse away — footer goes back to `auto-advancing · hover to pause   [?]`.
3. DevTools → Toggle device toolbar → iPhone. Reload. Footer shows plain `swipe` or `paused · swipe` text. No chips, no `?` icon.
4. Toggle theme (if there's a theme switcher in the UI). Chips restyle correctly in both light and dark modes — visible borders, readable text.

- [ ] **Step 7: Verify TypeScript still compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/NewsCarousel.tsx src/components/TopFeed.tsx
git commit -m "Replace carousel footer hint with kbd chips and replay button"
```

---

## Task 4: Scaffold `CarouselOnboardingTour` component with a centered placeholder

**Files:**
- Create: `src/components/CarouselOnboardingTour.tsx`

Build the tour component's skeleton: imperative ref handle, active state, first-visit auto-trigger, coarse-pointer bail-out, and a single centered fixed-position popover (no anchor math yet). Wire it into `TopFeed` so the auto-trigger and `?` replay both work end-to-end.

- [ ] **Step 1: Specify expected behavior**

After this task:
1. On a fresh browser (clear `localStorage` first), loading the home page on desktop shows a centered popover after ~600ms with placeholder text "Tour step 1" and Next/Skip controls.
2. Clicking Skip dismisses the popover. Reloading the page does NOT re-show it (the `seen` flag is set).
3. Clicking the `?` button re-opens the popover even after the flag is set.
4. On a touch / coarse-pointer device, the popover never auto-opens, AND clicking the `?` button (which shouldn't be visible there anyway) is a no-op.
5. While the tour is active, the carousel's arrow keys are silent (because `tourActive` is true).

- [ ] **Step 2: Create the file**

```tsx
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
```

Notes for the implementer:
- The popover is positioned fixed-center for now. Real anchor positioning lands in Task 5.
- There is no dim overlay yet — also Task 5.
- Step skipping (missing anchors) already works via the `visibleSteps` filter, but at this stage all three `data-tour` anchors exist on the home page so all 3 steps will show.
- `useImperativeHandle` exposes `open()` to the parent ref.

- [ ] **Step 3: Wire into `TopFeed`**

In `src/components/TopFeed.tsx`:

Add imports at the top:

```tsx
import { useRef, useState } from 'react';
import CarouselOnboardingTour, { type CarouselOnboardingTourHandle } from './CarouselOnboardingTour';
```

(If `useRef`/`useState` are already imported, just extend the existing import.)

Inside the `TopFeed` component, before the `return`, add:

```tsx
const tourRef = useRef<CarouselOnboardingTourHandle>(null);
const [tourActive, setTourActive] = useState(false);
```

Replace the temporary `onReplayTour={() => console.log(...)}` from Task 3 with the real wiring. Update the `<NewsCarousel ... />` JSX:

```tsx
<NewsCarousel
  posts={carouselPosts}
  onPostClick={handlePostClick}
  onSkipPost={handleSkipPost}
  onVisibleRangeChange={handleVisibleRange}
  tourActive={tourActive}
  onReplayTour={() => tourRef.current?.open()}
/>
```

Then mount the tour as a sibling. Find a spot inside the same JSX tree (just after the carousel render, before the closing tag of the parent that holds it) and add:

```tsx
<CarouselOnboardingTour ref={tourRef} onActiveChange={setTourActive} />
```

The tour mounts unconditionally; it renders nothing when inactive or on coarse pointer.

- [ ] **Step 4: Manual verify in browser**

Run: `npm run dev`

1. Open DevTools → Application → Storage → clear `rdz_carousel_tour_seen_v1` (or clear all site data). Reload http://localhost:5173/.
2. After ~600ms, a centered popover appears with "Tour step 1" headline. Counter reads "1 of 3".
3. Click "Next" twice → step 3 shows "Got it" button. Click it → popover closes. Reload → popover does NOT re-appear (flag set).
4. Click the `?` icon in the carousel footer → popover re-opens.
5. Click "X" → closes. Press Esc while open → closes.
6. While popover is open, press `←/→` on the keyboard — the carousel does NOT advance (it should stay frozen because `tourActive` is true, and arrow keys go to the tour). The tour itself advances/back on arrows.
7. DevTools → Toggle device toolbar → iPhone. Reload (with the flag cleared). Popover does NOT appear. `?` icon is not visible (handled in Task 3). If you manually call `tourRef.current.open()` from console — the tour stays closed because `useCoarsePointer()` short-circuits.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/CarouselOnboardingTour.tsx src/components/TopFeed.tsx
git commit -m "Scaffold CarouselOnboardingTour with first-visit trigger and ? replay"
```

---

## Task 5: Anchor positioning — popover snaps to `data-tour` element

**Files:**
- Modify: `src/components/CarouselOnboardingTour.tsx`

Replace the center-positioned popover with one anchored to the current step's `data-tour` element. Implement side selection (prefer below; flip above on overflow) and a caret pointing at the anchor. Recompute on resize and scroll.

- [ ] **Step 1: Specify expected behavior**

After this task:
1. Step 1: popover is anchored to the hero image, appearing below it (or above if not enough space below). A small caret points at the hero.
2. Step 2: popover is anchored to the comments aside on desktop (right-hand column), positioned to its left (since the aside is on the right edge).
3. Step 3: popover is anchored to the pause/play button below the carousel, positioned above the button (since there's little space below).
4. Scrolling the page or resizing the window keeps the popover stuck to its anchor.

- [ ] **Step 2: Add a positioning helper inside the file**

Add this helper above the `CarouselOnboardingTour` component definition:

```tsx
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

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const PREFERRED_SIDE: Record<Step['anchor'], Side> = {
  hero: 'bottom',
  comments: 'left',
  pause: 'top',
};
```

- [ ] **Step 3: Add positioning state and recompute logic to the component**

Inside `CarouselOnboardingTour`, after the existing `useState(0)` for `stepIndex`, add:

```tsx
const [position, setPosition] = useState<Position | null>(null);
```

Add this effect after the existing key-handler effect:

```tsx
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
}, [active, stepIndex, visibleSteps]);
```

- [ ] **Step 4: Render the popover using `position`**

Replace the entire `return createPortal(...)` block from Task 4 with this anchored version. The outer flex-center wrapper is gone; the popover is absolutely positioned using inline `top`/`left`.

```tsx
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
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="carousel-tour-headline"
    style={{ position: 'fixed', top: position.top, left: position.left, width: POPOVER_W, zIndex: 70 }}
    className={`rounded-xl shadow-2xl border ${
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
  </div>,
  document.body
);
```

Note on caret coloring: the simple solid-triangle approach uses only the border that's on the visible side. The other three border edges are transparent. The colored edge inherits from the popover background — the implementer should test that the caret color matches the popover in both themes; if it doesn't, swap the `border-white` / `border-[var(--theme-bgSecondary)]` for explicit `borderColor` style.

- [ ] **Step 5: Manual verify in browser**

Run: `npm run dev`. Clear `rdz_carousel_tour_seen_v1` and reload.

1. Step 1 popover appears just below the hero image, centered horizontally with the hero. Caret points up at the hero.
2. Click Next → step 2 popover appears to the **left** of the comments aside (the aside is on the right). Caret points right at the aside.
3. Click Next → step 3 popover appears **above** the pause button (no room below). Caret points down at the pause button.
4. While on step 1, scroll the page down. Popover stays anchored to the hero (follows the hero as it scrolls).
5. Resize the window to narrow it. Popover repositions; on very narrow viewports, it stays within margins.
6. Click `?` to replay; same anchoring works.

- [ ] **Step 6: Commit**

```bash
git add src/components/CarouselOnboardingTour.tsx
git commit -m "Anchor tour popover to data-tour elements with side selection and caret"
```

---

## Task 6: Add dim overlay, anchor elevation, and fade/slide animations

**Files:**
- Modify: `src/components/CarouselOnboardingTour.tsx`

Add the dim backdrop behind the popover, elevate the current step's anchor above the dim by setting `z-index` directly on the DOM element while the step is active, and add enter animations for the overlay and popover.

- [ ] **Step 1: Specify expected behavior**

After this task:
1. When the tour activates, a semi-transparent dim layer fades in over the page (200ms). The popover slides 8px from its caret direction + fades in (220ms).
2. The current step's anchor element stays fully visible — not dimmed — because its `z-index` is bumped above the overlay's.
3. Clicking on the dim backdrop dismisses the tour.
4. Moving between steps, the same anchor-elevation hand-off happens: the old anchor's `z-index` is cleared, the new one is set.
5. On close, the dim fades out (200ms) and any anchor `z-index` is cleared.

- [ ] **Step 2: Manage anchor elevation via effect**

Add this effect after the positioning effect (the one from Task 5):

```tsx
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
}, [active, stepIndex, visibleSteps]);
```

Note: the dim overlay sits at `z-index: 60` (defined in the next step), the popover at `70`, and the anchor at `65` — so the order from back to front is page → dim → anchor → popover.

- [ ] **Step 3: Render the dim overlay**

Replace the entire existing `return createPortal(<div role="dialog" ... />, document.body)` JSX block with a fragment portal that renders **both** the overlay and the popover. Note the two new animation class names (`carousel-tour-overlay-enter`, `carousel-tour-popover-enter`):

```tsx
return createPortal(
  <>
    <div
      onClick={close}
      style={{ position: 'fixed', inset: 0, zIndex: 60 }}
      className={`carousel-tour-overlay-enter ${isLight ? 'bg-black/35' : 'bg-black/55'} backdrop-blur-sm`}
      aria-hidden
    />
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="carousel-tour-headline"
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
```

- [ ] **Step 4: Add animation CSS**

Animations use CSS keyframes since this codebase already uses similar patterns (e.g., `carousel-fade-in`, `carousel-progress-fill` referenced in `NewsCarousel.tsx`). Add to the global stylesheet — find it via:

Run: `grep -rn "carousel-fade-in" /Users/alexvallejo/Sites/personal/reddzit/reddzit/src --include="*.css" --include="*.scss"`

That command will reveal which file owns the existing `carousel-fade-in` keyframes. Add the two new keyframes and classes to that same file, immediately after the existing carousel animations:

```css
@keyframes carousel-tour-overlay-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.carousel-tour-overlay-enter {
  animation: carousel-tour-overlay-fade 200ms ease-out;
}

@keyframes carousel-tour-popover-fade {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.carousel-tour-popover-enter {
  animation: carousel-tour-popover-fade 220ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

Notes:
- The popover entry direction (8px down) matches a "from above the caret" feel for the most-common `bottom` side. Visually consistent enough for all sides without per-side animation keyframes.
- Step transitions re-run the popover animation when stepIndex changes because React unmounts/remounts due to position-state changes; if it doesn't visibly re-run, add `key={stepIndex}` to the popover div to force remount.

- [ ] **Step 5: Manual verify in browser**

Run: `npm run dev`. Clear flag, reload.

1. Tour appears: dim layer fades in, popover slides in from above slightly with fade. The hero (step 1 anchor) stays fully bright — only the rest of the page is dimmed.
2. Click Next → comments aside is now the bright anchor; hero is dimmed.
3. Click Next → pause button area is highlighted; the rest dimmed.
4. Click on the dim backdrop (e.g., far away from the popover) → tour closes, dim fades out, hero returns to normal.
5. Re-trigger via `?`. Confirm hero `z-index` is correctly cleared when closing.
6. Switch theme to light mode → dim is lighter (`black/35`), still legible.
7. Inspect the hero in DevTools while step 1 is active — its inline `style="position: relative; z-index: 65"` should be present. Close the tour → those inline styles should be gone.

- [ ] **Step 6: Commit**

```bash
git add src/components/CarouselOnboardingTour.tsx src/<animations-file>
git commit -m "Add dim overlay, anchor elevation, and entry animations to tour"
```

(Replace `<animations-file>` with the actual path found in Step 4.)

---

## Task 7: Accessibility — focus trap and ARIA polish

**Files:**
- Modify: `src/components/CarouselOnboardingTour.tsx`

Add a focus trap so Tab/Shift+Tab cycle within the popover while open. Move focus to the popover on activate, return focus to the trigger on close. The carousel anchors already got `aria-keyshortcuts` in Task 2; the popover already has `role="dialog"`, `aria-modal`, `aria-labelledby` from Task 4. This task adds the last accessibility pieces.

- [ ] **Step 1: Specify expected behavior**

After this task:
1. When the tour opens, focus moves to the popover's primary action button ("Next" or "Got it").
2. Pressing Tab cycles through the popover's focusable elements: Close (X) → Back (if visible) → Next/Got it → wraps back to Close.
3. Pressing Shift+Tab cycles in reverse.
4. Tab cannot escape the popover into the underlying page while the tour is active.
5. When the tour closes, focus returns to whichever element triggered it: the `?` button if user clicked it; `document.body` if auto-triggered.

- [ ] **Step 2: Track the trigger element**

In the component, replace the current `open` callback definition with one that captures the previously-focused element:

```tsx
const triggerElRef = useRef<HTMLElement | null>(null);

const open = useCallback(() => {
  if (isCoarsePointer) return;
  triggerElRef.current = (document.activeElement instanceof HTMLElement) ? document.activeElement : null;
  setStepIndex(0);
  setActive(true);
}, [isCoarsePointer]);
```

Also add the import:

```tsx
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
```

(extend the existing line — add `useRef`.)

- [ ] **Step 3: Add focus management effect**

Add a new effect after the anchor-elevation effect from Task 6:

```tsx
const popoverRef = useRef<HTMLDivElement>(null);

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
    document.removeEventListener('keydown', onKey, { capture: true } as EventListenerOptions);
  };
}, [active, stepIndex]);
```

- [ ] **Step 4: Return focus on close**

Update the `close` callback:

```tsx
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
```

- [ ] **Step 5: Mark the primary button + attach the ref**

In the popover JSX, add `ref={popoverRef}` to the `role="dialog"` div, and add `data-tour-primary` to the Next/Got it button:

```tsx
<div ref={popoverRef} role="dialog" aria-modal="true" ... >
  ...
  <button
    type="button"
    data-tour-primary
    onClick={...}
    ...
  >
    {isLast ? 'Got it' : 'Next'}
  </button>
</div>
```

- [ ] **Step 6: Manual verify in browser**

Run: `npm run dev`. Clear flag and reload.

1. Tour opens. Press Tab — focus moves to the Close button (X). Tab again — focus moves to Next/Got it. Tab again — focus wraps back to Close.
2. Now click `?` to replay (mouse). Tour opens, focus lands on Next. Close it (click "Got it"). After closing, focus is restored to the `?` button (you'll see the focus ring on it).
3. Open the tour on step 2 (click Next once). Press Shift+Tab — focus goes from Next to Back to Close (in reverse).
4. With the tour open, try pressing Tab repeatedly — focus never escapes the popover. The underlying page's tab order is inaccessible.
5. With a screen-reader (macOS VoiceOver: Cmd+F5), confirm the dialog is announced as "dialog, Browse top posts" (or similar) and shortcuts are announced when navigating to the hero/comments/pause elements.

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/CarouselOnboardingTour.tsx
git commit -m "Add focus trap and trigger-element focus return to carousel tour"
```

---

## Task 8: Final QA pass against spec test plan

**Files:**
- None directly modified (any fixes from QA get their own focused commit).

Run through every test case from the spec's "Testing plan" section and confirm behavior. Fix any issues found inline; commit fixes separately.

- [ ] **Step 1: Run through each spec test case**

For each item below, perform the action and confirm the expected result. Note any failures.

Run: `npm run dev` and open http://localhost:5173/.

| # | Scenario | Expected | Status |
|---|---|---|---|
| 1 | Clear flag, reload, dark theme | Tour appears ~600ms after load, all 3 steps, dismisses cleanly, flag persists, reload does not re-show | |
| 2 | Click `?` | Tour re-opens regardless of flag | |
| 3 | Switch theme (light↔dark) mid-tour | Popover, overlay, kbd chips restyle correctly | |
| 4 | Resize window mid-tour | Popover stays anchored, repositions on the fly | |
| 5 | Scroll page mid-tour | Popover follows its anchor | |
| 6 | DevTools mobile emulation (iPhone) reload | Tour never shows, no `?` button visible, footer shows plain "swipe" | |
| 7 | Single-post carousel (force `carouselPosts` length to 1 in DevTools React tab, or use a feed slice with 1 post) | Step 3 anchor missing → step skipped → "1 of 2" or "1 of 1" depending on comments | |
| 8 | Zero-comments post (use React DevTools to set `topComments` to `[]` on the current post) | Step 2 skipped → "1 of 2" counter | |
| 9 | Press Space while focus is in an input | Carousel does NOT pause; space character appears in input | |
| 10 | Press Space while focus is on body | Carousel toggles pause | |
| 11 | Esc closes tour | Tour closes; flag set | |
| 12 | X button closes tour | Tour closes; flag set | |
| 13 | Got it closes tour | Tour closes; flag set | |
| 14 | Backdrop click closes tour | Tour closes; flag set | |
| 15 | localStorage disabled (DevTools → Application → block storage) | Tour still shows, but only once per session; no console errors | |
| 16 | Tab cycles inside popover | Focus stays trapped within popover | |
| 17 | Re-trigger via `?` then "Got it" | Focus returns to `?` button | |
| 18 | Build passes | `npm run build` succeeds | |
| 19 | Lint passes | `npm run lint` succeeds | |

For #7 and #8, the easiest way is React DevTools → find the `<NewsCarousel>` instance → set the `posts` prop or modify the current post's `topComments` field. Alternatively, temporarily slice or filter in `TopFeed` for the duration of the check.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: no new ESLint errors introduced by the changes.

- [ ] **Step 4: Address any issues**

For each failing item from Step 1, make the focused fix in its appropriate file. Commit each fix separately with a descriptive message:

```bash
git add <file>
git commit -m "<concise description of the fix>"
```

- [ ] **Step 5: Final commit (only if no fixes needed)**

If the QA pass found no issues, no commit is required — Tasks 1–7 produced working software. Move on to merging.

---

## Self-review notes (for the executing engineer)

- `useFirstVisit` (Task 1) is generic and may be reused for other future onboarding flags — don't lock its key into the hook itself.
- The `tourActive` prop on `NewsCarousel` is intentionally optional (defaulting `false`) so `SavedFeed`'s usage of the same carousel keeps working without any prop changes.
- `onReplayTour` is also optional — when omitted (as in `SavedFeed`), the `?` button simply doesn't render.
- The `data-tour="comments"` anchor only exists when `commentCount > 0` — the tour handles this by filtering missing anchors out of `visibleSteps`. No special-casing needed at the call site.
- The animation file location (Task 6 Step 4) is intentionally discovered at runtime rather than hardcoded — the grep command will reveal it. If no `carousel-fade-in` definition is found in `.css`/`.scss` files, those classes may be defined via Tailwind's `@keyframes` in a global stylesheet, in which case the implementer should put the new keyframes in the same global stylesheet.
- If the caret color (Task 5 Step 4 / Task 6) doesn't visually match the popover background in one of the themes (light vs dark), the simplest fix is to compute it explicitly: `borderColor: isLight ? '#ffffff' : 'var(--theme-bgSecondary)'` on the colored caret edge only.
- `aria-keyshortcuts` was added in Task 2 to the three anchors (hero, comments aside, pause button). This is in addition to the popover's `aria-labelledby` set in Task 4 and the focus trap added in Task 7.

---

## Execution handoff

Plan complete. Two execution options:

1. **Subagent-Driven (recommended)** — one fresh subagent per task, review between tasks. Tasks are small and well-bounded; this is a good fit.
2. **Inline Execution** — execute in this session via executing-plans with checkpoints.

Which approach?
