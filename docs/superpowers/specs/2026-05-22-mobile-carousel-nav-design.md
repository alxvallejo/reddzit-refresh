# Mobile Carousel Navigation

## Problem

`NewsCarousel.tsx` ships with horizontal swipe support via pointer events, but the gesture does not fire on Mobile Safari. Comments inside the carousel have no touch navigation at all — they rotate automatically and respond only to `ArrowUp` / `ArrowDown` keys, which a phone keyboard does not produce.

## Goals

- Restore horizontal swipe between posts on iOS Safari (and other touch browsers).
- Add a touch path for advancing/retreating through the comment ticker.
- Update the on-screen hint text so it accurately reflects the input device.
- No new visible navigation controls. Discoverability comes from gesture standards and an accurate hint.

## Non-goals

- No tap zones on the hero image.
- No chevron buttons or comment up/down buttons.
- No vertical swipe on comments (avoided to preserve page scroll).
- No changes to the autoplay timing, dots, play/pause button, or keyboard bindings.

## Root cause of broken hero swipe

The existing handler uses `onPointerDown` + `onPointerUp` with a 50px threshold. On Mobile Safari, three things go wrong:

1. The container has no `touch-action`. iOS treats a horizontal drag as a candidate scroll gesture and fires `pointercancel` instead of `pointerup`, so the swipe-end branch never runs.
2. There is no `setPointerCapture`. If the finger drifts outside the element during the drag, the browser may route `pointerup` elsewhere.
3. Even when a swipe does succeed, the synthetic `click` that follows pointerup will bubble into `HeroCard` and open the post. There is no suppression today.

## Design

### 1. Hero swipe fixes

In `NewsCarousel.tsx`, on the existing swipe container (the `<div>` that wraps the `HeroCard` stack):

- Add inline `style={{ touchAction: 'pan-y' }}` so the browser knows horizontal pans are app gestures and vertical pans remain page scroll.
- In `onPointerDown`, call `e.currentTarget.setPointerCapture(e.pointerId)` so subsequent pointer events on this drag are guaranteed to fire on this element.
- Add `onPointerCancel` that clears `swipeStartX.current = null` (no navigation).
- Add a `wasSwipingRef` (a `useRef<boolean>`). In `onPointerUp`, when `Math.abs(delta) >= SWIPE_THRESHOLD_PX`, set `wasSwipingRef.current = true` before calling `goPrev`/`goNext`.
- Add `onClickCapture` on the same container: if `wasSwipingRef.current` is true, call `e.stopPropagation()` and `e.preventDefault()`, then reset the flag. This swallows the click-after-swipe so the post does not open underneath the gesture.

### 2. Comment swipe

The `<aside>` containing the comment stack gets a parallel treatment with horizontal direction:

- Wrap the comment stack in a swipe container with `style={{ touchAction: 'pan-y' }}` (same value — horizontal capture, vertical scroll passes through).
- Mirror the hero handlers: `onPointerDown` records `swipeStartX` and captures the pointer; `onPointerUp` checks `Math.abs(delta) >= SWIPE_THRESHOLD_PX` and advances or retreats `commentIndex` (modulo `commentCount`); `onPointerCancel` clears state.
- Same `wasSwipingRef` pattern (a separate ref for comments) wired via `onClickCapture` so an in-progress quote-selection inside `CommentQuote` does not fire mid-swipe.
- Use the same `SWIPE_THRESHOLD_PX = 50` constant.
- No `autoplayTick` bump is needed for the comment rotator. The rotator's effect already keys off `commentIndex` and `currentComment?.id`, so changing `commentIndex` via swipe naturally resets its timer.

Keyboard bindings (`ArrowUp` / `ArrowDown`) are unchanged.

### 3. Touch-aware hint text

The footer span currently reads:

- `auto-advancing · hover to pause` (autoplay active)
- `paused · ← → arrows · swipe` (multi-post, paused)
- `← → arrows · swipe` (single-post or default)

And the comment header reads `n / m · ↑ ↓` when there are multiple comments.

Add a tiny `useCoarsePointer` hook (placed in `src/helpers/useCoarsePointer.ts`) that wraps `window.matchMedia('(pointer: coarse)')`, subscribes to `change`, and returns a boolean. SSR-safe: defaults to `false` when `window` is undefined.

Use it in `NewsCarousel` to branch the hint text:

- Coarse pointer (touch):
  - Footer hint shows `swipe` (no arrow notation).
  - Comment header shows `n / m` only (drops `· ↑ ↓`).
- Non-coarse pointer (mouse/desktop):
  - Existing strings unchanged.

The `auto-advancing · hover to pause` string is unchanged on touch — autoplay still pauses on hover-equivalent events (the existing hover/focus handlers also fire on touch via the pointer events), and a clearer touch story is out of scope here.

## Data flow

No state shape changes. Two new refs (`wasSwipingRef` for hero, `wasSwipingRef` for comments) and one new boolean from `useCoarsePointer`. All gesture state stays local to `NewsCarousel`.

## Error handling

Pointer capture can throw if the pointer id is invalid (rare; e.g., a synthetic event in tests). Wrap `setPointerCapture` in a try/catch and swallow — the swipe still works without capture, just less reliably during edge drifts.

## Testing

Manual verification (no automated UI tests exist for this component today):

- iOS Safari (real device or simulator): horizontal swipe on hero advances posts; tapping the hero opens the post; mid-swipe never opens a post.
- iOS Safari: horizontal swipe on the comment area advances comments; vertical drag through the comment area still scrolls the page.
- Desktop Chrome/Firefox/Safari: mouse drag on hero still advances posts (pointer events fire for mouse too). Keyboard `←/→` and `↑/↓` still work.
- Desktop: footer reads `← → arrows · swipe`, comment header reads `↑ ↓`.
- Mobile: footer reads `swipe`, comment header drops the arrows.
- Edge cases: single post (no swipe needed, no hint change beyond existing logic), single comment (no swipe needed), tab hidden (autoplay paused — unchanged).

## Files touched

- `src/components/NewsCarousel.tsx` — swipe fixes on hero, new swipe handlers on aside, hint text branching.
- `src/helpers/useCoarsePointer.ts` — new file, ~15 lines.

No changes to `MagazineGrid.tsx`, `CommentQuote.tsx`, or styling files.
