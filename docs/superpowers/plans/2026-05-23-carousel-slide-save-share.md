# Carousel Slide Save / Share Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Save and Share action buttons to each `NewsCarousel` slide, rendered as a vertical edge stack on desktop and a horizontal row inside the title gradient on mobile.

**Architecture:** A new private `SlideActions` component lives inside `NewsCarousel.tsx`. The carousel owns the per-post saved state (`savedIds: Set<string>`) and the action handlers, and passes a slot of action buttons into `HeroCard` via a new optional `actionsSlot` prop (used only by the carousel; `MagazineGrid` does not pass it). The desktop variant is overlaid as a sibling of the hero; the mobile variant renders inside `HeroCard`'s title gradient via the slot.

**Tech Stack:** React 18 + TypeScript, Vite, Tailwind v4, FontAwesome. No test runner in this project — verification is `tsc --noEmit`, `yarn lint`, `yarn build`, and manual dev-server smoke tests (running on http://localhost:5173).

**Spec:** `docs/superpowers/specs/2026-05-23-carousel-slide-save-share-design.md`

---

## File Structure

Files modified (no new files):

- `src/components/MagazineGrid.tsx` — add optional `actionsSlot?: React.ReactNode` to `CardProps`, render the slot inside the title gradient block below the meta row, in both the image branch and the text-forward branch of `HeroCard`. No other call sites change (the `MagazineGrid` body, `TallCard`, `StandardCard` pass nothing).
- `src/components/NewsCarousel.tsx` — define a private `SlideActions` component, manage `savedIds` and toast state, wire `useReddit()` (`saved`, `signedIn`, `savePost`, `unsavePost`, `redirectForAuth`), render desktop stack overlay + pass mobile row to `HeroCard` via `actionsSlot`, implement Save and Share handlers.

---

## Conventions used by this codebase

- **Package manager:** `yarn`. Use `yarn <script>` for everything (`yarn dev`, `yarn build`, `yarn lint`).
- **TypeScript check:** there is no `typecheck` script. Run `npx tsc -b --noEmit` or `npx tsc --noEmit -p tsconfig.app.json`.
- **Toast pattern:** each component owns its own `toast` state + `showToast` helper + a fixed-position div. See `src/components/LinkView.tsx:25-30,259-266`. We replicate the same pattern in `NewsCarousel`; do not extract a shared helper for this PR.
- **Glass buttons:** match `SkipButton` (`src/components/MagazineGrid.tsx:158-176`).
- **`useReddit()`:** consumer hook from `src/context/RedditContext.tsx:187-193`. Already exposes `savePost`, `unsavePost`, `saved`, `signedIn`, `redirectForAuth`.
- **Reddit fullname:** `TrendingPost` lacks Reddit's `name` field, so the fullname is `` `t3_${post.id}` `` — same fallback used in `PostView.tsx:188`.
- **Stop propagation:** every action button must call `e.stopPropagation()` so the parent hero `onClick` (opens `PostView`) does not fire. See `SkipButton` for the pattern.
- **Commits:** push directly to `main` (per `WARP.md`). Use short, imperative subject lines without conventional-commit prefixes (the repo's recent log uses sentence-case subjects like `Add spec for save/like/share actions on carousel slides`).

---

### Task 1: Add `actionsSlot` prop to HeroCard

Add an optional `actionsSlot?: React.ReactNode` to the existing `CardProps` interface in `MagazineGrid.tsx`. Render the slot below the meta row inside both branches of `HeroCard`. The carousel will fill this slot in Task 4; for now we just open the seam.

**Files:**
- Modify: `src/components/MagazineGrid.tsx` (the `CardProps` interface and the two return branches of `HeroCard`)

- [ ] **Step 1: Add `actionsSlot` to `CardProps`**

Find `CardProps` in `src/components/MagazineGrid.tsx` (around line 47). The current shape is:

```tsx
interface CardProps {
  post: TrendingPost;
  onClick: () => void;
  onSkip?: () => void;
  fillContainer?: boolean;
}
```

Replace with:

```tsx
interface CardProps {
  post: TrendingPost;
  onClick: () => void;
  onSkip?: () => void;
  fillContainer?: boolean;
  actionsSlot?: React.ReactNode;
}
```

- [ ] **Step 2: Destructure `actionsSlot` in `HeroCard`**

Find the signature `export const HeroCard = ({ post, onClick, onSkip, fillContainer }: CardProps) => {` (around line 209) and change to:

```tsx
export const HeroCard = ({ post, onClick, onSkip, fillContainer, actionsSlot }: CardProps) => {
```

- [ ] **Step 3: Render slot in the text-forward branch**

In the `isTextForward` return (around lines 228–245), find the meta row and the body paragraph. The current end of the inner column looks like:

```tsx
<h2 className="text-lg md:text-3xl font-semibold leading-tight text-[var(--theme-text)] flex-shrink-0">
  {getDisplayTitle(post)}
</h2>
<p className="text-sm md:text-base leading-relaxed text-[var(--theme-textMuted)] italic line-clamp-[8] md:line-clamp-[10] flex-1">
  “{post.bodyPreview}”
</p>
```

Add the slot immediately after the `<p>` tag, **before** the closing `</div>` of the inner column:

```tsx
<p className="text-sm md:text-base leading-relaxed text-[var(--theme-textMuted)] italic line-clamp-[8] md:line-clamp-[10] flex-1">
  “{post.bodyPreview}”
</p>
{actionsSlot && <div className="flex-shrink-0">{actionsSlot}</div>}
```

- [ ] **Step 4: Render slot in the image branch**

In the image return (around lines 266–275), find the bottom gradient block:

```tsx
<div className="absolute inset-x-0 bottom-0 px-4 pt-24 pb-4 md:px-5 md:pt-32 md:pb-5 bg-gradient-to-t from-black/95 via-black/70 to-transparent pointer-events-none">
  <h2 className="text-xl md:text-4xl font-semibold leading-tight text-white drop-shadow-md mb-2 pointer-events-auto">
    {getDisplayTitle(post)}
  </h2>
  <div className="flex items-center gap-2 md:gap-3 text-[0.7rem] md:text-[0.75rem] text-white/85 pointer-events-auto">
    <span>{formatTimeAgo(post.pubDate)}</span>
    {score && <span>▲ {score}</span>}
    {comments && <span>💬 {comments}</span>}
  </div>
</div>
```

Add the slot inside this block, after the meta row, **before** the closing `</div>`:

```tsx
<div className="flex items-center gap-2 md:gap-3 text-[0.7rem] md:text-[0.75rem] text-white/85 pointer-events-auto">
  <span>{formatTimeAgo(post.pubDate)}</span>
  {score && <span>▲ {score}</span>}
  {comments && <span>💬 {comments}</span>}
</div>
{actionsSlot}
```

(No wrapping `<div>` here because the carousel-supplied slot already manages its own spacing and `pointer-events`.)

- [ ] **Step 5: Verify typecheck + lint + build**

Run:

```bash
cd /Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh
npx tsc --noEmit -p tsconfig.app.json
yarn lint
yarn build
```

Expected: all three pass with no new errors. Existing `MagazineGrid` usages compile because `actionsSlot` is optional.

- [ ] **Step 6: Manual smoke check**

Run `yarn dev` and load http://localhost:5173. Switch to the news carousel view if not already there. Verify the hero card renders **identically** to before — no visual change yet (the slot is empty). Tap a slide to confirm `PostView` still opens.

- [ ] **Step 7: Commit**

```bash
git add src/components/MagazineGrid.tsx
git commit -m "Add actionsSlot prop to HeroCard for carousel actions"
```

---

### Task 2: Define internal `SlideActions` component

Add a private component inside `NewsCarousel.tsx` that renders the two action buttons (Save + Share) in either layout based on a `variant` prop. Purely presentational — receives `isSaved`, `onToggleSave`, `onShare`, `signedIn`, `variant`. No state, no context access of its own.

**Files:**
- Modify: `src/components/NewsCarousel.tsx` (add imports + new component above `NewsCarousel`)

- [ ] **Step 1: Update imports**

At the top of `src/components/NewsCarousel.tsx`, the current imports are:

```tsx
import { useEffect, useRef, useState } from 'react';
import { isDisplayableComment, type TrendingPost, type TrendingPostTopComment } from '../helpers/DailyService';
import { useTheme } from '../context/ThemeContext';
import { HeroCard } from './MagazineGrid';
import CommentQuote from './CommentQuote';
```

Add FontAwesome and Reddit-context imports:

```tsx
import { useEffect, useRef, useState } from 'react';
import { isDisplayableComment, type TrendingPost, type TrendingPostTopComment } from '../helpers/DailyService';
import { useTheme } from '../context/ThemeContext';
import { useReddit } from '../context/RedditContext';
import { HeroCard } from './MagazineGrid';
import CommentQuote from './CommentQuote';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookmark as faBookmarkSolid, faShareNodes } from '@fortawesome/free-solid-svg-icons';
import { faBookmark as faBookmarkRegular } from '@fortawesome/free-regular-svg-icons';
```

- [ ] **Step 2: Add `SlideActions` component above `NewsCarousel`**

Insert this component definition immediately before `const NewsCarousel = (...)` (around line 27). It does not access context or own state; it receives everything via props.

```tsx
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
    ? 'hidden md:flex absolute right-2 bottom-1/3 flex-col gap-2 z-10 pointer-events-auto'
    : 'flex md:hidden gap-3 mt-2 pointer-events-auto';

  const idleClass = isStack
    ? (isLight ? 'text-gray-700 bg-white/80 hover:bg-gray-200' : 'text-gray-200 bg-black/60 hover:bg-white/20')
    : 'text-white bg-white/12 hover:bg-white/25';

  const savedActiveClass = 'bg-[var(--theme-primary)]/70 text-[#262129] hover:bg-[var(--theme-primary)]/80';
  const buttonBase = 'w-9 h-9 rounded-full backdrop-blur-sm transition border-none cursor-pointer flex items-center justify-center';

  return (
    <div className={containerClass}>
      <button
        type="button"
        onClick={onToggleSave}
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
        title="Share"
        aria-label="Share post"
        className={`${buttonBase} ${idleClass}`}
      >
        <FontAwesomeIcon icon={faShareNodes} className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
```

- [ ] **Step 3: Verify typecheck + lint**

Run:

```bash
cd /Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh
npx tsc --noEmit -p tsconfig.app.json
yarn lint
```

Expected: pass. The component is defined but unused, which TypeScript allows; eslint may warn on unused — if so, the warning will clear after Task 4 wires it. If `eslint-plugin-react-hooks` flags the lone `useTheme()` call, that's fine, it's a valid hook call inside a component.

- [ ] **Step 4: Commit**

```bash
git add src/components/NewsCarousel.tsx
git commit -m "Define SlideActions component inside NewsCarousel"
```

---

### Task 3: Add Share handler + local toast in NewsCarousel

Wire a local toast (`toast` state + `showToast` helper + render block) and the Share handler. Share is the simpler action — clipboard with Web Share fallback on touch devices. We can verify the toast wiring here before adding the bigger Save logic in Task 4.

**Files:**
- Modify: `src/components/NewsCarousel.tsx`

- [ ] **Step 1: Add toast state + helper**

Inside the `NewsCarousel` body, immediately after the existing `const [autoplayTick, setAutoplayTick] = useState(0);` line (around line 34), add:

```tsx
const [toast, setToast] = useState<string | null>(null);
const showToast = (msg: string) => {
  setToast(msg);
  window.setTimeout(() => setToast(null), 2000);
};
```

- [ ] **Step 2: Add Share handler**

Add this handler just before the existing `if (total === 0 || !post) return null;` (around line 162):

```tsx
const handleShare = async (e: React.MouseEvent) => {
  e.stopPropagation();
  if (!post) return;
  const url = `https://www.reddit.com/comments/${post.id}`;
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
```

- [ ] **Step 3: Render the toast**

At the bottom of the returned JSX, inside the existing `<main>` element, just before the closing `</main>` tag (around line 307), add the toast block:

```tsx
      </div>
      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-medium shadow-lg text-[var(--theme-bg)]"
          style={{ backgroundColor: 'var(--theme-primary)' }}
        >
          {toast}
        </div>
      )}
    </main>
```

Make sure the toast is a sibling of the existing inner `<div className="flex flex-col items-center gap-2 mt-5">…</div>`, not inside it.

- [ ] **Step 4: Verify typecheck + lint + build**

```bash
cd /Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh
npx tsc --noEmit -p tsconfig.app.json
yarn lint
yarn build
```

Expected: pass. (Share handler is defined but not yet bound to a button — same notes as Task 2 step 3 apply.)

- [ ] **Step 5: Commit**

```bash
git add src/components/NewsCarousel.tsx
git commit -m "Add local toast and share handler to NewsCarousel"
```

---

### Task 4: Wire SlideActions with savedIds and Save handler

Wire `useReddit()`, derive and maintain `savedIds`, add the Save handler with the signed-out auth gate and optimistic update, then render `<SlideActions />` twice per slide — once as a desktop overlay (sibling of `HeroCard`) and once via the `actionsSlot` prop (mobile row inside the gradient).

**Files:**
- Modify: `src/components/NewsCarousel.tsx`

- [ ] **Step 1: Pull from `useReddit()`**

At the top of the `NewsCarousel` body, right after `const { isLight } = useTheme();` (around line 28), add:

```tsx
const { saved, signedIn, savePost, unsavePost, redirectForAuth } = useReddit();
```

- [ ] **Step 2: Track `savedIds` state, re-derive when `saved` changes**

After the existing `const [autoplayTick, setAutoplayTick] = useState(0);` (and the toast state from Task 3), add:

```tsx
const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

useEffect(() => {
  const next = new Set<string>();
  for (const item of saved as Array<{ id?: string; name?: string }>) {
    if (item?.id) next.add(item.id);
    else if (item?.name?.startsWith('t3_')) next.add(item.name.slice(3));
  }
  setSavedIds(prev => {
    // Preserve any optimistic adds that aren't yet reflected in the context array.
    const merged = new Set(next);
    for (const id of prev) merged.add(id);
    return merged;
  });
}, [saved]);
```

We merge rather than overwrite so an optimistic `add(id)` survives until the next `fetchSaved` round-trip catches up.

- [ ] **Step 3: Add the Save handler**

Just below `handleShare` from Task 3, add:

```tsx
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
    showToast("Couldn't save — try again");
  }
};
```

- [ ] **Step 4: Compute current-slide saved flag**

Just below the handlers, add a single derived value used by both render sites:

```tsx
const isCurrentSaved = post ? savedIds.has(post.id) : false;
```

We do not memoize the props object — the handlers are re-created each render and `SlideActions` is cheap to re-render, so a `useMemo` would hold stale closures without saving real work.

- [ ] **Step 5: Mount desktop stack as a sibling of `HeroCard`**

Find the swipe-area `<div>` containing the slide stack (around lines 207–230). The current structure is:

```tsx
<div
  className="relative w-full aspect-[4/5] md:aspect-auto md:h-[calc(100vh-16rem)] md:min-h-[420px] md:max-h-[720px] md:basis-3/5 md:flex-shrink-0 overflow-hidden rounded-xl select-none"
  onPointerDown={onPointerDown}
  onPointerUp={onPointerUp}
>
  <div className="relative h-full w-full">
    {stack.map(...)}
  </div>
  {total > 1 && autoplayActive && (
    <div className="absolute left-0 right-0 bottom-0 h-[2px] pointer-events-none z-20">
      ...
    </div>
  )}
</div>
```

Add the desktop-stack `<SlideActions />` as a sibling of the inner `<div className="relative h-full w-full">…</div>` and the progress bar — i.e., inside the outer swipe container, after the progress bar block:

```tsx
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
```

The component's own `hidden md:flex` class keeps it off mobile.

- [ ] **Step 6: Pass mobile row to `HeroCard` via `actionsSlot`**

In the `stack.map` body (around lines 213–229), find the `<HeroCard … />` JSX:

```tsx
<HeroCard
  post={p}
  onClick={() => onPostClick(p)}
  onSkip={onSkipPost ? () => onSkipPost(p.id) : undefined}
  fillContainer
/>
```

Only the top (`isLast`) card in the stack should render interactive actions — the fading-out card underneath is `pointer-events-none` anyway. Pass `actionsSlot` only on the topmost card:

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

`isLast` is already in scope from the existing `const isLast = i === stack.length - 1;` line just above.

- [ ] **Step 7: Verify typecheck + lint + build**

```bash
cd /Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh
npx tsc --noEmit -p tsconfig.app.json
yarn lint
yarn build
```

Expected: pass. Address any lint errors before moving on — do not suppress legitimate errors.

- [ ] **Step 8: Manual smoke test (sign-out path + Share)**

```bash
yarn dev
```

Open http://localhost:5173 in a browser, signed-out:

1. Carousel renders with the bookmark + share buttons on the right edge of the hero (desktop) or in the gradient (mobile).
2. Click bookmark → redirected to Reddit OAuth (the existing auth flow).
3. Cancel the OAuth, click Share → toast `'Link copied!'` appears, and the clipboard contains `https://www.reddit.com/comments/<id>` for the current post.
4. Click the hero (not a button) → `PostView` opens. Buttons did not trigger this.
5. Resize the browser past the `md` breakpoint (768px) — the stack disappears and the gradient row appears, and vice versa.

If any step fails, do **not** continue. Diagnose, fix, re-verify. Use the systematic-debugging skill if you get stuck.

- [ ] **Step 9: Commit**

```bash
git add src/components/NewsCarousel.tsx
git commit -m "Wire save and share actions into carousel slides"
```

---

### Task 5: Signed-in smoke test + cross-slide persistence verification

Validate the Save round-trip and the cross-slide persistence behavior that the spec calls out. This is the final gate before considering the feature complete.

**Files:** none modified in this task (verification only)

- [ ] **Step 1: Sign in and confirm Save round-trip**

In the running dev server, sign in to Reddit via the existing flow. With the carousel visible:

1. Click bookmark on slide N. Expect: button fills, toast `'Post saved!'`, no `PostView` open.
2. Reload the page. The same post's bookmark should be filled (re-derived from `RedditContext.saved` after `fetchSaved` runs).
3. Click bookmark again. Expect: button empties, toast `'Post unsaved'`.

- [ ] **Step 2: Verify cross-slide persistence**

1. Save post N.
2. Swipe (or arrow-key) to slide N+1. Save post N+1.
3. Swipe back to N. Bookmark is still filled.
4. Swipe to N+1. Bookmark is still filled.

- [ ] **Step 3: Verify stale-slide race**

1. Click bookmark on post N.
2. Immediately swipe forward before the network round-trip completes.
3. The toast names the action that just happened (`'Post saved!'`), and the bookmark icon on N (when you swipe back) reflects the optimistic state.

- [ ] **Step 4: Verify Share fallback path**

In a desktop Firefox or other browser without `navigator.share`, click Share. Expect toast `'Link copied!'` and a working clipboard paste.

- [ ] **Step 5: Verify swipe isolation on mobile**

Open the dev server on a real mobile device (or use Chrome devtools mobile emulation with touch events). Confirm:
- Tapping bookmark/share triggers the action (not a swipe, not a `PostView` open).
- A real swipe across the hero still advances the carousel.

- [ ] **Step 6: Final cleanup**

If steps 1–5 all pass, the feature is complete. There is nothing else to commit unless you discovered an issue and fixed it. Skip this commit if there are no changes.

---

## Out of scope (do not implement)

- A shared toast component — each component owns its own per the codebase convention.
- Hiding the Save button when signed out — the spec says signed-out clicks `redirectForAuth()`, matching `PostView`.
- Action UI on `MagazineGrid` cards.
- A Like / upvote button (explicitly dropped — see the spec's "Why no Like" section).
- Backend changes to `read-api`.

---

## Verification checklist (run before declaring done)

- [ ] `npx tsc --noEmit -p tsconfig.app.json` passes.
- [ ] `yarn lint` passes.
- [ ] `yarn build` succeeds.
- [ ] Manual smoke tests in Task 4 Step 8 all pass.
- [ ] Manual smoke tests in Task 5 all pass.
- [ ] No unused imports remain in `NewsCarousel.tsx` or `MagazineGrid.tsx`.
- [ ] `git status` is clean.
