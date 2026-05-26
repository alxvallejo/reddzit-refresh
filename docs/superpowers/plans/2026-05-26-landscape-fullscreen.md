# Landscape Fullscreen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit, tap-to-enter landscape fullscreen mode to the `NewsCarousel` on TopFeed for coarse-pointer (touch) devices, rendering the existing hero + rotating-comment layout inside a viewport-filling portal that progressively enhances with the Fullscreen and Screen Orientation APIs where supported.

**Architecture:** Add an `enableFullscreen` prop and `isFullscreen` state to `NewsCarousel`. When fullscreen is on, the same carousel content renders inside a portal-mounted `FullscreenShell` (a private component declared inside `NewsCarousel.tsx`) that pseudo-fullscreens via `position: fixed` + `100dvh`, locks body scroll via a class on `<html>`, and best-effort-calls `requestFullscreen()` and `screen.orientation.lock('landscape')`. A small enter-fullscreen button is added to the `HeroCard` top-right via a new `headerSlot` prop on `CardProps`.

**Tech Stack:** React 18, TypeScript, Tailwind v4, FontAwesome, Vite. No test framework — verification is in-browser via `npm run dev`. (See `feedback_testing.md` memory.)

**Spec:** `docs/superpowers/specs/2026-05-26-landscape-fullscreen-design.md`

---

## Task 1: Add `headerSlot` prop to `HeroCard`

**Files:**
- Modify: `src/components/MagazineGrid.tsx` (interface `CardProps` at line 45; `HeroCard` at line 210)

- [ ] **Step 1: Add `headerSlot` to `CardProps`**

In `src/components/MagazineGrid.tsx`, find the `CardProps` interface (line 45) and add a new optional prop. Result:

```tsx
interface CardProps {
  post: TrendingPost;
  onClick: () => void;
  onSkip?: () => void;
  fillContainer?: boolean;
  actionsSlot?: React.ReactNode;
  headerSlot?: React.ReactNode;
}
```

- [ ] **Step 2: Destructure `headerSlot` in `HeroCard`**

Change the `HeroCard` function signature on line 210 from:

```tsx
export const HeroCard = ({ post, onClick, onSkip, fillContainer, actionsSlot }: CardProps) => {
```

to:

```tsx
export const HeroCard = ({ post, onClick, onSkip, fillContainer, actionsSlot, headerSlot }: CardProps) => {
```

- [ ] **Step 3: Render `{headerSlot}` in the text-forward branch**

In `HeroCard`'s text-forward branch (the `if (isTextForward)` return, around line 228), immediately after `{onSkip && <SkipButton onSkip={onSkip} position="bottom" />}`, add `{headerSlot}`. Result for that area:

```tsx
{onSkip && <SkipButton onSkip={onSkip} position="bottom" />}
{headerSlot}
<div className="absolute inset-0 flex flex-col px-5 md:px-8 py-4 md:py-6 gap-3 md:gap-4">
```

- [ ] **Step 4: Render `{headerSlot}` in the image branch**

In the second (image) return (around line 261), immediately after `{onSkip && <SkipButton onSkip={onSkip} />}`, add `{headerSlot}`. Result:

```tsx
{onSkip && <SkipButton onSkip={onSkip} />}
{headerSlot}
<ImageArea post={post} aspect={fillContainer ? 'h-full' : 'aspect-[4/5] md:aspect-[16/9]'} />
```

`{headerSlot}` is rendered as a sibling of `SkipButton`. The slot's content is responsible for its own absolute positioning — `HeroCard` does not wrap it.

- [ ] **Step 5: Build to verify no type errors**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: completes with no output (no errors).

- [ ] **Step 6: Commit**

```bash
git add src/components/MagazineGrid.tsx
git commit -m "Add headerSlot prop to HeroCard for top-row overlay buttons"
```

---

## Task 2: Add body scroll-lock CSS class

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Append the scroll-lock rule**

Append to `src/index.css`:

```css
html.fullscreen-open,
html.fullscreen-open body {
  overflow: hidden;
  overscroll-behavior: contain;
}
```

`overscroll-behavior: contain` prevents iOS Safari rubber-banding through the overlay onto the page beneath.

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "Add fullscreen-open class for body scroll lock"
```

---

## Task 3: Add `enableFullscreen` prop and `isFullscreen` state to `NewsCarousel`

**Files:**
- Modify: `src/components/NewsCarousel.tsx` (interface `NewsCarouselProps` at line 82; component body)

- [ ] **Step 1: Add `enableFullscreen` to `NewsCarouselProps`**

In `src/components/NewsCarousel.tsx`, update the interface at line 82:

```tsx
interface NewsCarouselProps {
  posts: TrendingPost[];
  onPostClick: (post: TrendingPost) => void;
  onSkipPost?: (postId: string) => void;
  onVisibleRangeChange?: (indices: number[]) => void;
  enableFullscreen?: boolean;
}
```

- [ ] **Step 2: Destructure the new prop and add `isFullscreen` state**

In the component signature on line 89:

```tsx
const NewsCarousel = ({ posts, onPostClick, onSkipPost, onVisibleRangeChange, enableFullscreen }: NewsCarouselProps) => {
```

Then immediately after the existing `const [savedIds, setSavedIds] = useState<Set<string>>(new Set());` declaration (around line 101), add:

```tsx
const [isFullscreen, setIsFullscreen] = useState(false);
```

- [ ] **Step 3: Build to verify**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/NewsCarousel.tsx
git commit -m "Add enableFullscreen prop and isFullscreen state to NewsCarousel"
```

---

## Task 4: Render the fullscreen-enter button via `headerSlot`

**Files:**
- Modify: `src/components/NewsCarousel.tsx`

- [ ] **Step 1: Add the `faExpand` import**

At the top of `src/components/NewsCarousel.tsx`, the existing solid-icons import (line 10) reads:

```tsx
import { faBookmark as faBookmarkSolid, faShareNodes } from '@fortawesome/free-solid-svg-icons';
```

Update to add `faExpand` and `faXmark` (we'll use `faXmark` in Task 5; importing it now keeps the import block tidy):

```tsx
import { faBookmark as faBookmarkSolid, faShareNodes, faExpand, faXmark } from '@fortawesome/free-solid-svg-icons';
```

- [ ] **Step 2: Add the private `FullscreenEnterButton` component**

In `src/components/NewsCarousel.tsx`, immediately after the existing `SlideActions` component definition (the closing `};` near line 80), add:

```tsx
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
```

`right-12 top-2` places it ~48px from the right edge — enough gap for the existing `SkipButton` (which sits at `right-2 top-2` and is ~24px wide). `z-20` keeps it above the title gradient (`z-10`) but below the future close X (`z-30`).

- [ ] **Step 3: Wire the button into the `HeroCard` `headerSlot`**

In `NewsCarousel`, find the `<HeroCard … />` render inside the `stack.map(...)` block (around line 495). It currently looks like:

```tsx
<HeroCard
  post={p}
  onClick={() => onPostClick(p)}
  onSkip={onSkipPost ? () => onSkipPost(p.id) : undefined}
  fillContainer
  actionsSlot={isLast ? (
    <SlideActions
      isSaved={isCurrentSaved}
      onToggleSave={handleToggleSave}
      onShare={handleShare}
      variant="row"
    />
  ) : undefined}
/>
```

Add a `headerSlot` prop, gated on `enableFullscreen && isCoarsePointer && isLast`:

```tsx
<HeroCard
  post={p}
  onClick={() => onPostClick(p)}
  onSkip={onSkipPost ? () => onSkipPost(p.id) : undefined}
  fillContainer
  headerSlot={enableFullscreen && isCoarsePointer && isLast ? (
    <FullscreenEnterButton onEnter={() => setIsFullscreen(true)} />
  ) : undefined}
  actionsSlot={isLast ? (
    <SlideActions
      isSaved={isCurrentSaved}
      onToggleSave={handleToggleSave}
      onShare={handleShare}
      variant="row"
    />
  ) : undefined}
/>
```

`isLast` reuses the cross-fade-stack gate so the button only renders on the currently-visible slide, not on the outgoing slide during a transition. `isCoarsePointer` is already destructured from `useCoarsePointer()` at the top of `NewsCarousel`.

- [ ] **Step 4: Build to verify**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 5: Browser verify (no real fullscreen yet)**

The button now renders but tapping it just flips `isFullscreen` to true with no visible effect (the render branch lands in Task 6). Skip in-browser verify here — the next task adds the visible shell.

- [ ] **Step 6: Commit**

```bash
git add src/components/NewsCarousel.tsx
git commit -m "Render fullscreen-enter button on carousel hero for touch devices"
```

---

## Task 5: Add the `FullscreenShell` portal component (no API calls yet)

**Files:**
- Modify: `src/components/NewsCarousel.tsx`

- [ ] **Step 1: Add the `createPortal` import**

At the top of `src/components/NewsCarousel.tsx`, the existing `useEffect, useRef, useState` import (line 1) needs `createPortal` from `react-dom`. Add a new import line after the existing React import:

```tsx
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
```

- [ ] **Step 2: Add the `FullscreenShell` component**

In `src/components/NewsCarousel.tsx`, immediately after the `FullscreenEnterButton` definition added in Task 4, add:

```tsx
interface FullscreenShellProps {
  onClose: () => void;
  children: React.ReactNode;
}

const FullscreenShell = ({ onClose, children }: FullscreenShellProps) => {
  const { isLight } = useTheme();
  useEffect(() => {
    document.documentElement.classList.add('fullscreen-open');
    return () => {
      document.documentElement.classList.remove('fullscreen-open');
    };
  }, []);

  const closeButtonClass = isLight
    ? 'text-gray-700 bg-white/80 hover:bg-gray-200'
    : 'text-gray-200 bg-black/60 hover:bg-white/20';

  return createPortal(
    <div
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
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {children}
      </div>
    </div>,
    document.body
  );
};
```

- [ ] **Step 3: Build to verify**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/NewsCarousel.tsx
git commit -m "Add FullscreenShell portal component with scroll lock and close button"
```

---

## Task 6: Wire `FullscreenShell` into the `NewsCarousel` render

**Files:**
- Modify: `src/components/NewsCarousel.tsx`

This is the largest change — we refactor the existing render to compute the carousel layout once and wrap it in either the existing `<main>` or `<FullscreenShell>`.

- [ ] **Step 1: Find the current return statement**

The existing return starts at line 469 with `<main className="max-w-screen-2xl mx-auto px-4 pt-4 pb-8" …>` and ends at line 635 with `</main>`.

- [ ] **Step 2: Replace the return with the variant-aware branching**

Replace the entire `return (...)` block (everything from `return (` near line 469 through the closing `);` near line 635) with:

```tsx
const variant: 'inline' | 'fullscreen' = isFullscreen ? 'fullscreen' : 'inline';

const heroWrapperClass =
  variant === 'fullscreen'
    ? 'relative basis-[62%] flex-shrink-0 min-h-0 overflow-hidden rounded-xl select-none'
    : 'relative w-full aspect-[4/5] md:aspect-[16/9] md:basis-3/4 md:flex-shrink-0 overflow-hidden rounded-xl select-none';

const asideClass =
  variant === 'fullscreen'
    ? `flex-1 min-w-0 max-h-full overflow-y-auto select-none ${
        isLight ? 'rounded-2xl bg-[rgba(249,115,22,0.08)] p-3' : ''
      }`
    : `mt-6 md:mt-0 md:flex-1 md:min-w-0 md:max-h-[calc(100vh-16rem)] md:overflow-y-auto select-none ${
        isLight ? 'rounded-2xl bg-[rgba(249,115,22,0.08)] p-5 md:p-6' : ''
      }`;

const rowClass =
  variant === 'fullscreen'
    ? `flex flex-row gap-3 items-stretch flex-1 min-h-0 ${commentCount === 0 ? 'justify-center' : ''}`
    : `md:flex md:gap-6 md:items-start ${commentCount === 0 ? 'md:justify-center' : ''}`;

const footerClass =
  variant === 'fullscreen'
    ? 'flex flex-col items-center gap-2 mt-2 flex-shrink-0'
    : 'flex flex-col items-center gap-2 mt-5';

const carouselBody = (
  <>
    <div className={rowClass}>
      <div
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
                className={`${isFirst ? 'h-full w-full' : 'absolute inset-0'} ${isLast ? 'carousel-fade-in' : 'carousel-fade-out pointer-events-none'}`}
              >
                <HeroCard
                  post={p}
                  onClick={() => onPostClick(p)}
                  onSkip={onSkipPost ? () => onSkipPost(p.id) : undefined}
                  fillContainer
                  headerSlot={enableFullscreen && isCoarsePointer && isLast && variant === 'inline' ? (
                    <FullscreenEnterButton onEnter={() => setIsFullscreen(true)} />
                  ) : undefined}
                  actionsSlot={isLast ? (
                    <SlideActions
                      isSaved={isCurrentSaved}
                      onToggleSave={handleToggleSave}
                      onShare={handleShare}
                      variant="row"
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
        <SlideActions
          isSaved={isCurrentSaved}
          onToggleSave={handleToggleSave}
          onShare={handleShare}
          variant="stack"
        />
      </div>
      {commentCount > 0 && (
        <aside className={asideClass}>
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
      <span className="text-[10px] uppercase tracking-wider text-[var(--theme-textMuted)] opacity-70">
        {total > 1
          ? (effectivelyPaused
              ? (isCoarsePointer ? 'paused · swipe' : 'paused · ← → arrows · swipe')
              : 'auto-advancing · hover to pause')
          : (isCoarsePointer ? 'swipe' : '← → arrows · swipe')}
      </span>
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
        onMouseEnter={() => setIsHoverPaused(true)}
        onMouseLeave={() => setIsHoverPaused(false)}
        onFocusCapture={() => setIsHoverPaused(true)}
        onBlurCapture={() => setIsHoverPaused(false)}
      >
        {carouselBody}
      </main>
    </FullscreenShell>
  );
}

return (
  <main
    className="max-w-screen-2xl mx-auto px-4 pt-4 pb-8"
    onMouseEnter={() => setIsHoverPaused(true)}
    onMouseLeave={() => setIsHoverPaused(false)}
    onFocusCapture={() => setIsHoverPaused(true)}
    onBlurCapture={() => setIsHoverPaused(false)}
  >
    {carouselBody}
  </main>
);
```

Notes:
- The fullscreen branch uses `flex flex-row` unconditionally so the side-by-side layout applies regardless of viewport width — that's the whole point of fullscreen on mobile landscape.
- The inline branch keeps the existing `md:flex` so portrait phones still stack vertically.
- The `headerSlot` is **only** rendered in the inline variant (`variant === 'inline'`). When already fullscreen, the enter button is replaced by the close X in the shell.
- The toast's `z-[10000]` (was `z-50`) keeps it above the shell's `z-[9999]`.

- [ ] **Step 3: Build to verify**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 4: Browser verify**

Run: `npm run dev`

In a Chromium-based browser with devtools open:
1. Toggle device toolbar (Cmd+Shift+M) and select an iPhone profile in **landscape**.
2. Navigate to the carousel view of `/top` (use the carousel view-mode toggle).
3. (The fullscreen button is not wired in `TopFeed` yet — Task 9 — so test by temporarily passing `enableFullscreen` to the existing `<NewsCarousel />` call OR by temporarily defaulting the prop to `true` for this verify only. Revert before committing.)
4. Tap the ⤢ button on the hero. Expect: viewport fills with the side-by-side hero + comments layout. Body scroll behind the overlay is locked (try scrolling — nothing moves).
5. Tap the X. Expect: overlay closes, page is interactable again.
6. Autoplay continues across the open/close (the post should not reset to index 0).
7. Save/share toasts still appear correctly while in fullscreen.

If any step fails, fix before committing.

- [ ] **Step 5: Commit**

```bash
git add src/components/NewsCarousel.tsx
git commit -m "Branch NewsCarousel render between inline and fullscreen variants"
```

---

## Task 7: Best-effort Fullscreen API + Screen Orientation lock

**Files:**
- Modify: `src/components/NewsCarousel.tsx` (`FullscreenShell` component)

- [ ] **Step 1: Extend `FullscreenShell` with the API calls and `fullscreenchange` listener**

Replace the entire `FullscreenShell` component body (the one added in Task 5) with:

```tsx
const FullscreenShell = ({ onClose, children }: FullscreenShellProps) => {
  const { isLight } = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);

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
        onClose();
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);

    return () => {
      document.documentElement.classList.remove('fullscreen-open');
      document.removeEventListener('fullscreenchange', onFsChange);
      const orientationCleanup = (screen as unknown as { orientation?: { unlock?: () => void } }).orientation;
      if (orientationCleanup?.unlock) {
        try { orientationCleanup.unlock(); } catch { /* not always allowed; ignore */ }
      }
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [onClose]);

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
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        {children}
      </div>
    </div>,
    document.body
  );
};
```

- [ ] **Step 2: Build to verify**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 3: Browser verify**

Run: `npm run dev` (or keep the dev server running).

1. **Desktop Chrome (Mac):** Tap the ⤢ button — the page enters real browser fullscreen (top bar hides). Press Esc — the `fullscreenchange` listener flips `isFullscreen` to false and the overlay unmounts. Body scroll lock is released.
2. **Devtools iPhone profile:** the Fullscreen API call rejects silently (no error in console). Overlay still renders correctly via the pseudo-fullscreen path. X button closes.
3. Confirm no console errors related to `requestFullscreen` or `orientation.lock` (rejection paths are caught).

- [ ] **Step 4: Commit**

```bash
git add src/components/NewsCarousel.tsx
git commit -m "Best-effort Fullscreen API and orientation lock with sync on external exit"
```

---

## Task 8: Add the "rotate your phone" hint for portrait

**Files:**
- Modify: `src/components/NewsCarousel.tsx` (`FullscreenShell`)

- [ ] **Step 1: Track portrait orientation inside `FullscreenShell`**

Add an `isPortrait` state and a matchMedia listener inside `FullscreenShell`, immediately after the `rootRef` declaration:

```tsx
const [isPortrait, setIsPortrait] = useState(() =>
  typeof window !== 'undefined' && window.matchMedia('(orientation: portrait)').matches
);
useEffect(() => {
  if (typeof window === 'undefined') return;
  const mql = window.matchMedia('(orientation: portrait)');
  const onChange = (e: MediaQueryListEvent) => setIsPortrait(e.matches);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}, []);
```

- [ ] **Step 2: Render the hint when portrait**

Inside the `<div ref={rootRef} …>` block, after the close button but before the `<div className="flex-1 min-h-0 …">` children wrapper, add:

```tsx
{isPortrait && (
  <div
    role="status"
    aria-live="polite"
    className="absolute left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full text-xs font-medium shadow-lg pointer-events-none bg-black/70 text-white"
    style={{ top: 'max(env(safe-area-inset-top), 0.5rem)' }}
  >
    Rotate your phone for landscape
  </div>
)}
```

The hint is centered along the top of the overlay. Because the close X uses `left: …` and the hint uses `left-1/2 -translate-x-1/2`, they don't visually collide on phone widths.

- [ ] **Step 3: Build to verify**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 4: Browser verify**

Run: `npm run dev`.

1. Devtools iPhone profile in **portrait**: tap ⤢ — the rotate hint appears centered at the top.
2. Rotate the device toolbar to landscape — the hint disappears.
3. Rotate back to portrait — hint reappears.
4. Tap X — the hint state is reset on next entry.

- [ ] **Step 5: Commit**

```bash
git add src/components/NewsCarousel.tsx
git commit -m "Show rotate-phone hint in fullscreen when device reports portrait"
```

---

## Task 9: Wire `enableFullscreen` from `TopFeed`

**Files:**
- Modify: `src/components/TopFeed.tsx` (the `<NewsCarousel … />` call around line 500)

- [ ] **Step 1: Pass `enableFullscreen` to `NewsCarousel`**

Find the `<NewsCarousel …/>` JSX block in `src/components/TopFeed.tsx` (around line 500):

```tsx
<NewsCarousel
  posts={carouselPosts}
  onPostClick={handlePostClick}
  onSkipPost={handleSkipPost}
  onVisibleRangeChange={handleVisibleRange}
/>
```

Add the prop:

```tsx
<NewsCarousel
  posts={carouselPosts}
  onPostClick={handlePostClick}
  onSkipPost={handleSkipPost}
  onVisibleRangeChange={handleVisibleRange}
  enableFullscreen
/>
```

`SavedFeed.tsx` is intentionally left unchanged so the button does not appear there.

- [ ] **Step 2: Build to verify**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/TopFeed.tsx
git commit -m "Enable fullscreen mode on TopFeed news carousel"
```

---

## Task 10: End-to-end browser verification

This task has no code edits — it's a structured manual pass against the spec's testing section. Run `npm run dev` and walk through each item. If any check fails, file the regression as a follow-up commit on this branch.

- [ ] **Step 1: Verify entry button visibility rules**

1. Open `/top` carousel view on **desktop with a mouse** (devtools default). The ⤢ button is **not visible** (coarse pointer false).
2. Open devtools, enable device-toolbar with an iPhone profile (coarse pointer true). The ⤢ button **is visible** on the hero, to the left of the existing 👁 skip button.
3. Switch to `/saved` carousel view (`SavedFeed`). The ⤢ button is **not visible** there (no `enableFullscreen` prop passed).

- [ ] **Step 2: Verify entry/exit on iPhone Safari profile (devtools)**

1. Tap ⤢ — overlay opens, fills viewport, body scroll behind locks.
2. Rotate hint appears in portrait, disappears on landscape rotation.
3. Tap X — overlay closes, body scroll is restored, no console errors.

- [ ] **Step 3: Verify entry/exit on desktop Chrome (real Fullscreen API)**

1. With the coarse pointer override on (devtools `Emulate touch screen → On`, or simply temporarily change the gate locally), tap ⤢. Browser chrome hides — true fullscreen.
2. Press Esc — `fullscreenchange` listener fires, overlay closes, state stays in sync.
3. Tap ⤢ again, then tap X — `document.exitFullscreen()` runs and chrome returns.

- [ ] **Step 4: Verify autoplay + comment ticker continue in fullscreen**

1. Open fullscreen on a multi-post feed.
2. Wait — within ~45s the next post auto-advances (progress bar fills along the bottom of the hero).
3. The comments aside continues to rotate through top comments.
4. Hover the hero — autoplay pauses (visible "paused · …" footer text).

- [ ] **Step 5: Verify save / share / swipe still work in fullscreen**

1. Tap 🔖 — bookmark fills, toast "Post saved!" appears (signed-in case).
2. Tap ↗ — share sheet (touch device) or "Link copied!" toast.
3. Swipe left/right on the hero — advances to next/previous post. Pinned post state survives.
4. Tap the hero (not the buttons) — `PostView` opens over the fullscreen overlay. Close `PostView` — fullscreen overlay is still visible behind.

- [ ] **Step 6: Verify body scroll lock cleanup**

1. Enter fullscreen, exit, then scroll the underlying `/top` page. Scrolling works (no leftover `fullscreen-open` class on `<html>`).
2. Inspect `<html>` — class list does not contain `fullscreen-open` after exit.

- [ ] **Step 7: Smoke test on a real iPhone if available**

If a real iPhone in iOS Safari is available, confirm:
1. ⤢ button is visible on the hero.
2. Tapping it opens the overlay; address bar may stay visible (acceptable).
3. Portrait shows the rotate hint; rotating to landscape dismisses it.
4. X exits cleanly.

- [ ] **Step 8: No new commit**

This task is verification-only. If a regression is found, file a follow-up commit on the same branch describing the fix.

---

## Spec coverage check

- Trigger button on TopFeed touch only — Task 4 + Task 9.
- Side-by-side hero + rotating comment layout — Task 6 (fullscreen variant uses `flex flex-row` unconditionally).
- Hybrid Fullscreen API + orientation lock + pseudo-fullscreen — Task 7.
- Pseudo-fullscreen + body scroll lock — Tasks 2 + 5 + 7.
- `headerSlot` on `HeroCard` — Task 1.
- `enableFullscreen` prop and `isFullscreen` state on `NewsCarousel` — Task 3.
- Close X in top-left — Task 5.
- `fullscreenchange` external-exit sync — Task 7.
- Rotate-phone hint when portrait — Task 8.
- Layout sizing tweaks (`flex-1 min-h-0` hero, `max-h-full` aside) — Task 6.
- Safe-area insets on overlay — Task 5.
- Toast z-index above shell — Task 6 (`z-[10000]`).
- SavedFeed unaffected — Task 9 (intentional omission).

All spec sections have at least one task. No placeholders remain.
