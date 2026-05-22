# Mobile Carousel Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix horizontal swipe between posts on Mobile Safari, add horizontal swipe between comments, and make hint text reflect the input device.

**Architecture:** Modify `NewsCarousel.tsx` to use Pointer Events with `touch-action: pan-y`, `setPointerCapture`, `pointercancel` handling, and a click-after-swipe suppression flag. Replicate the gesture pattern on the comment aside. Add a small `useCoarsePointer` hook that wraps `matchMedia('(pointer: coarse)')` and use it to branch the hint strings.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind. No test framework in repo — verification is `tsc`, `eslint`, and manual browser testing.

**Spec:** `docs/superpowers/specs/2026-05-22-mobile-carousel-nav-design.md`

---

## File Structure

- **Create:** `src/helpers/useCoarsePointer.ts` — hook wrapping `matchMedia('(pointer: coarse)')`. ~15 lines, SSR-safe, one responsibility.
- **Modify:** `src/components/NewsCarousel.tsx` — pointer-event fixes on hero swipe container, new swipe handlers on the comment aside, hint-text branching via the new hook.

No other files change.

---

## Task 1: Add `useCoarsePointer` hook

**Files:**
- Create: `src/helpers/useCoarsePointer.ts`

- [ ] **Step 1: Create the hook**

Write `src/helpers/useCoarsePointer.ts`:

```typescript
import { useEffect, useState } from 'react';

const QUERY = '(pointer: coarse)';

export const useCoarsePointer = (): boolean => {
  const [isCoarse, setIsCoarse] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsCoarse(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isCoarse;
};
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/helpers/useCoarsePointer.ts`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/helpers/useCoarsePointer.ts
git commit -m "Add useCoarsePointer hook for touch-device detection."
```

---

## Task 2: Fix hero swipe on Mobile Safari

**Files:**
- Modify: `src/components/NewsCarousel.tsx`

The current hero swipe uses `onPointerDown` and `onPointerUp` on the container `<div>` wrapping the `HeroCard` stack (around line 220-224). It fails on iOS Safari because the browser cancels horizontal pans as scroll candidates and the synthetic click after a successful swipe opens the post.

- [ ] **Step 1: Add a `wasSwipingRef` and update the hero pointer handlers**

In `NewsCarousel.tsx`, near the existing `swipeStartX` ref (currently `const swipeStartX = useRef<number | null>(null);` around line 41), add a sibling ref:

```typescript
const swipeStartX = useRef<number | null>(null);
const wasSwipingRef = useRef(false);
```

Replace the existing `onPointerDown` and `onPointerUp` functions (currently lines 181-197) with the following four handlers:

```typescript
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
```

- [ ] **Step 2: Wire the new handlers and add `touch-action` to the hero container**

Find the hero swipe container (currently around lines 220-224):

```tsx
<div
  className="relative w-full aspect-[4/5] md:aspect-[16/9] md:basis-3/4 md:flex-shrink-0 overflow-hidden rounded-xl select-none"
  onPointerDown={onPointerDown}
  onPointerUp={onPointerUp}
>
```

Replace with:

```tsx
<div
  className="relative w-full aspect-[4/5] md:aspect-[16/9] md:basis-3/4 md:flex-shrink-0 overflow-hidden rounded-xl select-none"
  style={{ touchAction: 'pan-y' }}
  onPointerDown={onPointerDown}
  onPointerUp={onPointerUp}
  onPointerCancel={onPointerCancel}
  onClickCapture={onClickCaptureHero}
>
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/components/NewsCarousel.tsx`
Expected: no errors.

- [ ] **Step 4: Manual verification — desktop**

Run: `npm run dev`
Open in Chrome at the news-carousel route. Confirm:
- Mouse drag right-to-left across the hero advances to the next post.
- Mouse drag left-to-right goes to the previous post.
- A normal click on the hero (no drag) still opens the post.
- Arrow keys still navigate.

- [ ] **Step 5: Manual verification — Mobile Safari**

Open the dev server URL on an iOS device (or the iOS Simulator's Safari). Confirm:
- Horizontal swipe across the hero advances/retreats posts.
- A tap on the hero opens the post.
- A swipe does NOT open a post when the gesture completes.
- Vertical drag through the hero still scrolls the page.

- [ ] **Step 6: Commit**

```bash
git add src/components/NewsCarousel.tsx
git commit -m "Fix carousel swipe on Mobile Safari with pointer capture and touch-action."
```

---

## Task 3: Add horizontal swipe to comment aside

**Files:**
- Modify: `src/components/NewsCarousel.tsx`

Comments currently rotate automatically and respond only to `ArrowUp` / `ArrowDown`. Add horizontal swipe (mirroring the hero) so touch users can advance/retreat manually.

- [ ] **Step 1: Add comment-swipe refs and handlers**

In `NewsCarousel.tsx`, near the existing refs added in Task 2, add two more:

```typescript
const commentSwipeStartX = useRef<number | null>(null);
const commentWasSwipingRef = useRef(false);
```

Below `goTo` (around line 179), add:

```typescript
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
```

- [ ] **Step 2: Wire the handlers onto the comment swipe wrapper**

The `<aside>` (around lines 254-285) currently wraps the comment stack directly. Add a swipe wrapper around the inner `<div className="relative">` that holds the comment stack.

Find this block (currently around lines 270-283):

```tsx
<div className="relative">
  {commentStack.map((c, i) => {
    const isFirst = i === 0;
    const isLast = i === commentStack.length - 1;
    return (
      <div
        key={c.id}
        className={`${isFirst ? '' : 'absolute inset-0'} ${isLast ? 'carousel-fade-in' : 'carousel-fade-out pointer-events-none'}`}
      >
        <CommentQuote comment={c} />
      </div>
    );
  })}
</div>
```

Replace with:

```tsx
<div
  className="relative select-none"
  style={{ touchAction: 'pan-y' }}
  onPointerDown={onCommentPointerDown}
  onPointerUp={onCommentPointerUp}
  onPointerCancel={onCommentPointerCancel}
  onClickCapture={onCommentClickCapture}
>
  {commentStack.map((c, i) => {
    const isFirst = i === 0;
    const isLast = i === commentStack.length - 1;
    return (
      <div
        key={c.id}
        className={`${isFirst ? '' : 'absolute inset-0'} ${isLast ? 'carousel-fade-in' : 'carousel-fade-out pointer-events-none'}`}
      >
        <CommentQuote comment={c} />
      </div>
    );
  })}
</div>
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/components/NewsCarousel.tsx`
Expected: no errors.

- [ ] **Step 4: Manual verification — desktop**

Run: `npm run dev`
With multiple comments on a post:
- Mouse drag horizontally across the comment area advances/retreats comments.
- `ArrowUp`/`ArrowDown` still navigate comments.
- Selecting text inside the comment (no large horizontal drag) does NOT advance the carousel.

- [ ] **Step 5: Manual verification — Mobile Safari**

On an iOS device:
- Horizontal swipe across the comment area advances/retreats comments.
- Vertical drag through the comment area still scrolls the page.
- Tapping the comment text (for selection / quote action, if any) does NOT trigger advance.

- [ ] **Step 6: Commit**

```bash
git add src/components/NewsCarousel.tsx
git commit -m "Add horizontal swipe between comments in news carousel."
```

---

## Task 4: Touch-aware hint text

**Files:**
- Modify: `src/components/NewsCarousel.tsx`

The footer hint currently reads `← → arrows · swipe` and the comment header reads `n / m · ↑ ↓` regardless of input device. On touch devices, drop the arrow notation.

- [ ] **Step 1: Import the hook**

Near the top of `NewsCarousel.tsx`, add:

```typescript
import { useCoarsePointer } from '../helpers/useCoarsePointer';
```

- [ ] **Step 2: Call the hook inside the component**

Below the existing `const { isLight } = useTheme();` (around line 30), add:

```typescript
const isCoarsePointer = useCoarsePointer();
```

- [ ] **Step 3: Branch the comment-count indicator**

Find the existing block (around lines 264-268):

```tsx
{commentCount > 1 && (
  <div className="text-[10px] text-[var(--theme-textMuted)] tabular-nums opacity-70">
    {safeCommentIndex + 1} / {commentCount} · ↑ ↓
  </div>
)}
```

Replace with:

```tsx
{commentCount > 1 && (
  <div className="text-[10px] text-[var(--theme-textMuted)] tabular-nums opacity-70">
    {safeCommentIndex + 1} / {commentCount}
    {!isCoarsePointer && ' · ↑ ↓'}
  </div>
)}
```

- [ ] **Step 4: Branch the footer hint**

Find the existing block (around lines 331-335):

```tsx
<span className="text-[10px] uppercase tracking-wider text-[var(--theme-textMuted)] opacity-70">
  {total > 1
    ? (effectivelyPaused ? 'paused · ← → arrows · swipe' : 'auto-advancing · hover to pause')
    : '← → arrows · swipe'}
</span>
```

Replace with:

```tsx
<span className="text-[10px] uppercase tracking-wider text-[var(--theme-textMuted)] opacity-70">
  {total > 1
    ? (effectivelyPaused
        ? (isCoarsePointer ? 'paused · swipe' : 'paused · ← → arrows · swipe')
        : 'auto-advancing · hover to pause')
    : (isCoarsePointer ? 'swipe' : '← → arrows · swipe')}
</span>
```

Note: the `auto-advancing · hover to pause` string is intentionally unchanged on touch — autoplay still pauses via the existing pointer events firing the hover handlers.

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && npx eslint src/components/NewsCarousel.tsx src/helpers/useCoarsePointer.ts`
Expected: no errors.

- [ ] **Step 6: Manual verification — desktop**

Run: `npm run dev`
In a desktop browser (mouse, fine pointer):
- Footer (multi-post, paused) reads `paused · ← → arrows · swipe`.
- Footer (single post) reads `← → arrows · swipe`.
- Comment header (multi-comment) reads `n / m · ↑ ↓`.

- [ ] **Step 7: Manual verification — Mobile Safari**

On an iOS device:
- Footer (multi-post, paused) reads `paused · swipe`.
- Footer (single post) reads `swipe`.
- Comment header (multi-comment) reads `n / m` (no arrows).

- [ ] **Step 8: Manual verification — Chrome DevTools device emulation**

In Chrome DevTools, toggle device toolbar (Cmd+Shift+M) and pick an iPhone preset. Confirm hint strings flip to touch versions. Toggle back to desktop and confirm they flip back. This validates the `matchMedia` listener.

- [ ] **Step 9: Commit**

```bash
git add src/components/NewsCarousel.tsx
git commit -m "Branch carousel hint text on coarse pointer."
```

---

## Final Verification

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 2: Lint clean**

Run: `npm run lint`
Expected: no new errors introduced by this work.

- [ ] **Step 3: Cross-browser manual sweep**

Walk through this checklist with the dev server running:

Desktop Chrome:
- [ ] Mouse drag advances posts.
- [ ] Mouse drag advances comments.
- [ ] Click on hero opens post; drag does not.
- [ ] `←/→` and `↑/↓` keys work.
- [ ] Hints show arrow notation.

Mobile Safari (real device or simulator):
- [ ] Horizontal swipe advances posts.
- [ ] Horizontal swipe advances comments.
- [ ] Tap on hero opens post; swipe does not.
- [ ] Vertical drag scrolls the page through both the hero and the comment area.
- [ ] Hints show `swipe` only (no arrow notation).

Chrome DevTools device emulation:
- [ ] Toggling between mobile and desktop emulation flips the hint strings.

- [ ] **Step 4: Confirm done**

Report back to the user with a one-line summary of what shipped and any caveats from manual testing.
