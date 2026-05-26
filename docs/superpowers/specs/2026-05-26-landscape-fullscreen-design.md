# Landscape Fullscreen Mode for the News Carousel

## Goal

Give touch users on TopFeed a tap-to-enter, immersive landscape view of the
`NewsCarousel` that fills the device viewport and renders the hero and the
rotating top-comment side-by-side. The same auto-advance, save/share, swipe,
and PostView affordances continue to work; the layout just unlocks more space
for reading.

## Non-goals

- Auto-entering fullscreen on device rotation. Entry is always an explicit tap
  so users with rotation lock or who turn the phone briefly aren't yanked into
  a modal.
- Adding fullscreen on SavedFeed or any other future carousel mount. Opt-in
  per caller via an `enableFullscreen` prop, off by default.
- Desktop fullscreen. The button only renders on coarse-pointer devices —
  desktop users already have the full window.
- A scrollable list of comments. We keep the existing single-comment ticker
  (auto-rotating) per the picked layout option; a scrollable list is a
  separate future spec.
- A new PostView shell. Tapping the hero in fullscreen continues to open the
  existing `PostView` overlay over the top.
- True browser fullscreen on iPhone Safari. iOS Safari iPhone does not
  implement `requestFullscreen` or `screen.orientation.lock`; we use a
  pseudo-fullscreen overlay there and accept that the address bar may stay
  visible.

## Why side-by-side (and not full-bleed TikTok-style)

The side-by-side layout reuses the existing desktop arrangement of
`NewsCarousel` (`md:flex md:gap-6` row). Landscape on a phone is roughly the
same aspect ratio and width-to-height story as the desktop layout. Picking
this means:

- No new comment-rendering pattern. The rotating `CommentQuote` ticker that
  already drives portrait stays the source of truth.
- Existing autoplay, swipe, and pause-on-hover/focus all keep working — the
  layout change is purely CSS sizing.
- A full-bleed overlay would force the title and comment to fight for the
  same bottom-of-image gradient zone, and we'd need a new sheet component for
  comments. Deferred — easy to revisit later as a "cinema mode" variant.

## Trigger and entry button

A small fullscreen icon button (`faExpand`, FontAwesome solid — already in
the bundle) renders **inside the hero card, top-right, to the immediate left
of the existing skip-post button** (`SkipButton` at
`src/components/MagazineGrid.tsx:158`).

### When the button renders

- `enableFullscreen` prop on `NewsCarousel` is true (TopFeed passes this;
  SavedFeed does not).
- `useCoarsePointer()` returns true. Desktop pointer devices never see it.
- `posts.length > 0` — same gate as the rest of the slide chrome.

### Style

Match the existing `SkipButton` / `SlideActions` glass-morphic style so the
three top-right buttons (fullscreen, skip, and — when present — the desktop
action stack) read as one set:

- Container: rendered through `HeroCard`'s new `headerSlot?: React.ReactNode`
  prop, so it lives inside the same absolute-positioned header row as
  `SkipButton`. Position: `absolute top-2 right-2` row, with the skip button
  on the far right and the fullscreen button immediately to its left
  (`gap-2`).
- Button: `w-9 h-9 rounded-full backdrop-blur-sm transition border-none
  cursor-pointer flex items-center justify-center`
  - Dark on image: `text-gray-200 bg-black/60 hover:bg-white/20`
  - Light theme: `text-gray-700 bg-white/80 hover:bg-gray-200`
- Icon: `faExpand`, `w-3.5 h-3.5`.

### Interaction guards

- `e.stopPropagation()` on the click handler so the hero's `onClick` does not
  fire and `PostView` does not open.
- `onPointerDown` / `onPointerUp` also stop propagation so the swipe
  container's `setPointerCapture` doesn't swallow the synthesized click —
  same pattern `SlideActions` already uses.

## Layout when fullscreen

The fullscreen overlay reuses the existing desktop side-by-side row
(`md:flex md:gap-6 md:items-start`), unconditionally applied:

- **Hero (left):** `flex-[0_0_62%]`, fills the available height of the
  overlay rather than enforcing `aspect-[16/9]`. The hero `<HeroCard
  fillContainer />` already supports filling its parent.
- **Comments aside (right):** `flex-1 min-w-0 overflow-y-auto` (the existing
  classes from the portrait `<aside>`), capped at the overlay height. Keeps
  the rotating single-comment ticker exactly as portrait/desktop renders it.
- **Footer bar:** the `safeIndex / total · play/pause · dot strip` lives at
  the bottom of the overlay, inside the safe-area inset
  (`pb-[max(env(safe-area-inset-bottom),0.5rem)]`).
- **Close button:** an `X` (`faXmark`) in the **top-left** of the overlay,
  also inside the safe-area inset (`top-[max(env(safe-area-inset-top),0.5rem)]
  left-[max(env(safe-area-inset-left),0.5rem)]`), same glass-morphic style as
  the entry button.
- **Sizing:** the overlay root uses `position: fixed; inset: 0; width:
  100dvw; height: 100dvh` so iOS Safari's address-bar collapse is followed
  without jumping. `100dvh` is preferred over `100vh` specifically because of
  iOS Safari's dynamic viewport behavior.

### Layout in portrait while the overlay is open

We do not force-rotate the layout. If the device is in portrait — either
because orientation lock failed (iPhone) or the user rotated back — the
side-by-side flex row still renders, just with a narrow comments column. We
overlay a small "rotate your phone for landscape" hint when the overlay
mounts while `window.matchMedia('(orientation: portrait)').matches`; the hint
auto-dismisses once landscape is reported.

## How "fullscreen" is achieved

A hybrid approach that takes the best path each platform allows:

1. **Attempt browser fullscreen.** Call `element.requestFullscreen()` on the
   overlay root (`overlayRef.current.requestFullscreen?.()`). On Android
   Chrome and iPad this hides the browser chrome. On iPhone Safari it returns
   a rejected promise; we swallow it.
2. **Attempt orientation lock.** Call `screen.orientation?.lock?.('landscape')`.
   Works on Android Chrome (after `requestFullscreen` succeeds); rejects on
   iPad and iPhone. Swallow rejections.
3. **Pseudo-fullscreen as the source of truth.** Independently of (1) and
   (2), we render the overlay through `createPortal(<FullscreenShell />,
   document.body)` with `position: fixed; inset: 0; z-index: 9999`. Body
   scroll is locked by toggling a `fullscreen-open` class on
   `document.documentElement` (`overflow: hidden`). The pseudo-fullscreen is
   what guarantees the experience on iPhone; (1) and (2) are progressive
   enhancements for everywhere else.

### On exit

1. `document.exitFullscreen?.()` if `document.fullscreenElement` matches.
2. `screen.orientation?.unlock?.()` (swallow rejections).
3. Remove the `fullscreen-open` class from `document.documentElement`.
4. Unmount the portal by flipping `isFullscreen` to false.

### Listening to externally-driven exits

Add a `fullscreenchange` listener while open. If `document.fullscreenElement`
becomes null (user pressed Esc on iPad, used the back gesture, etc.) and our
state still says fullscreen, set `isFullscreen` to false. This catches all
hardware/OS-driven exits without ambiguity.

## Component structure

A new private component, `FullscreenShell`, declared inside
`src/components/NewsCarousel.tsx` (alongside the existing private
`SlideActions`). Keeps the file scope predictable and avoids creating a new
module for a component only one caller uses.

```tsx
interface FullscreenShellProps {
  onClose: () => void;
  children: React.ReactNode;
}
```

`FullscreenShell` handles:
- `createPortal` to `document.body`.
- On mount: add `fullscreen-open` to `document.documentElement`, attempt
  `requestFullscreen` and `screen.orientation.lock('landscape')`, attach the
  `fullscreenchange` listener.
- On unmount: remove the class, exit/unlock, detach the listener.
- The close `X` button (`onClose`) and the "rotate your phone" hint
  (driven by a `matchMedia('(orientation: portrait)')` listener).

The shell does not own carousel state. Index, autoplay, comment ticker,
savedIds — all of that stays in `NewsCarousel`, so toggling fullscreen is
"render the same content with a different wrapper."

### Render branching in NewsCarousel

```tsx
const carouselBody = (
  <div className={layoutRowClasses}>
    {/* existing hero + aside + footer */}
  </div>
);

return isFullscreen ? (
  <FullscreenShell onClose={() => setIsFullscreen(false)}>
    {carouselBody}
  </FullscreenShell>
) : (
  <main className="max-w-screen-2xl mx-auto px-4 pt-4 pb-8" ...>
    {carouselBody}
  </main>
);
```

`layoutRowClasses` is the existing `md:flex md:gap-6 md:items-start
${commentCount === 0 ? 'md:justify-center' : ''}` string, but with two small
tweaks when `isFullscreen`:

- The hero container drops `aspect-[4/5] md:aspect-[16/9]` in favor of
  filling the overlay height (`flex-1 min-h-0`), since the overlay supplies
  the height.
- The comments aside uses `max-h-full` rather than
  `md:max-h-[calc(100vh-16rem)]`.

These are passed via a `variant: 'inline' | 'fullscreen'` flag computed once
near the top of the render.

## Data flow

```
User taps ⤢ on hero
  ├─ stopPropagation
  └─ setIsFullscreen(true)

isFullscreen flips to true
  ├─ NewsCarousel re-renders with FullscreenShell wrapper
  ├─ FullscreenShell mount effect:
  │     ├─ document.documentElement.classList.add('fullscreen-open')
  │     ├─ overlayRef.current.requestFullscreen?.()   (best effort)
  │     ├─ screen.orientation?.lock?.('landscape')    (best effort)
  │     └─ window.addEventListener('fullscreenchange', onFsChange)
  └─ Portrait? → render rotate-hint overlay until landscape reported

User taps X / hits back / rotates and taps X
  └─ setIsFullscreen(false)

isFullscreen flips to false
  └─ FullscreenShell unmount effect:
        ├─ document.exitFullscreen?.()
        ├─ screen.orientation?.unlock?.()
        ├─ document.documentElement.classList.remove('fullscreen-open')
        └─ remove fullscreenchange listener

User opens PostView from inside fullscreen
  └─ PostView mounts at higher z-index over FullscreenShell — no state change.
     Closing PostView returns the user to the still-open fullscreen carousel.
```

## Edge cases

- **Orientation lock unsupported (iPhone):** lock call rejects; we display
  the rotate hint until the orientation media query reports landscape. Hint
  never blocks interaction — it's a corner toast, not a curtain.
- **User rotates to portrait while open:** layout stays side-by-side
  (narrower comments column), rotate hint reappears. No auto-exit.
- **Tab becomes hidden:** existing `tabVisible` state already pauses
  autoplay. Nothing extra to wire.
- **Browser exits fullscreen externally (Esc / back gesture / pinch):**
  `fullscreenchange` listener flips `isFullscreen` to false so our state
  stays in sync with the browser's.
- **Save/share while in fullscreen:** the existing `SlideActions` (both the
  desktop stack and the mobile row) render inside `carouselBody` and so are
  present in fullscreen too. Toasts (`fixed bottom-24 …`) still appear; in
  fullscreen the toast is over the overlay because both share the document
  body and we don't move the toast root.
- **iOS Safari address bar visible at first paint:** `100dvh` accounts for
  it; the overlay is positioned correctly even before the user scrolls.
- **Multiple fullscreen attempts on the page:** only `NewsCarousel` opens
  one. If the browser is already in fullscreen for another element, our
  `requestFullscreen` rejects — fine, pseudo-fullscreen still works.
- **Body scroll lock cleanup on hot-reload / crash:** the
  `fullscreen-open` class is removed in the shell's unmount effect cleanup.
  If a render throws between mount and unmount, the class can stick — the
  effect's setup uses a `try/finally` pattern around the DOM mutations to
  reduce that risk, and a `useEffect` cleanup that always removes the class
  guards the common path.

## Testing (per project's browser-verify default)

No automated tests. Manual verification, run with `npm run dev`:

- **Entry/exit on iPhone Safari (or iPhone simulator):** tap ⤢, overlay
  fills viewport, rotate hint shows in portrait, hint disappears when
  rotated to landscape; tap X to exit, page is unlocked and scroll restored.
- **Entry/exit on Android Chrome:** tap ⤢, browser chrome hides
  (requestFullscreen succeeded), orientation locks to landscape; press
  hardware back, overlay closes cleanly.
- **Entry/exit on iPad:** tap ⤢, requestFullscreen succeeds, orientation
  lock rejects (acceptable). Esc key exits and the `fullscreenchange`
  listener flips state.
- **Desktop with mouse:** button is not rendered (coarse pointer false).
- **SavedFeed:** button is not rendered there (`enableFullscreen` not
  passed).
- **Autoplay continues:** while fullscreen, 45s post auto-advance and the
  per-comment ticker run on the same cadence as portrait. Hovering pauses
  on devices that have hover.
- **Save / Share:** both work from inside fullscreen; toasts show.
- **PostView in fullscreen:** tap a hero image — `PostView` opens over the
  overlay; close it and the fullscreen overlay is still open.
- **Body scroll lock:** while open, the underlying page does not scroll
  behind the overlay on iOS Safari.

## File touchpoints

Frontend (`reddzit-refresh`):

- `src/components/NewsCarousel.tsx`
  - Add `enableFullscreen?: boolean` prop.
  - Add `isFullscreen` state.
  - Add `FullscreenShell` private component (portal mount, body scroll
    lock, fullscreen + orientation calls, close X, rotate hint,
    `fullscreenchange` listener).
  - Add fullscreen-enter button rendered into `HeroCard` via the new
    `headerSlot` prop. Show only when `enableFullscreen && isCoarsePointer
    && posts.length > 0`.
  - Refactor the render to compute `carouselBody` once and wrap in either
    the existing `<main>` or `FullscreenShell` based on `isFullscreen`.
  - Compute a `variant: 'inline' | 'fullscreen'` and apply the two layout
    tweaks (hero `flex-1 min-h-0` vs `aspect-*`; aside `max-h-full` vs
    `md:max-h-[calc(100vh-16rem)]`).

- `src/components/MagazineGrid.tsx`
  - Add `headerSlot?: React.ReactNode` to `CardProps`.
  - In both `HeroCard` branches (image + text-forward), render
    `{headerSlot}` immediately to the left of the existing `SkipButton`
    inside the same absolute-positioned `top-2 right-2` row.
  - Existing callers pass nothing — `MagazineGrid` is unaffected.

- `src/components/TopFeed.tsx`
  - Pass `enableFullscreen` to `<NewsCarousel />`.

- `src/index.css`
  - Add a global class: `html.fullscreen-open, html.fullscreen-open body {
    overflow: hidden; }`.
  - Optional fade-in for the overlay if the existing carousel-fade-in
    keyframes don't already work for this case.

No backend changes. No new dependencies. `RedditContext` and
`DailyService` are untouched.
