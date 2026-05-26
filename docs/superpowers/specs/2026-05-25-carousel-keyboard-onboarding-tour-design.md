# Carousel Keyboard Onboarding Tour

**Status:** Design approved, ready for implementation plan
**Date:** 2026-05-25
**Scope:** Home page (`HomePage` → `AppShell` for signed-out users)

## Goal

First-time desktop visitors should discover the carousel's keyboard shortcuts (`←`/`→` for posts, `↑`/`↓` for comments, and a new `Space` for pause/play) through a brief, dismissible coachmark tour. Users can replay the tour at any time via a `?` button in the carousel footer.

## Non-goals

- Mobile / touch users — the tour never shows on coarse-pointer devices. Their existing "swipe" hint is unchanged.
- Site-wide help system. This is scoped to the home-page carousel only.
- Tour content management (CMS / i18n). Strings are hardcoded English.
- Analytics on tour completion. Not in scope; can be added later by wrapping `markSeen` and dismissal handlers.

## User-facing behavior

### First-visit flow (desktop only)

1. User loads home page. Carousel renders normally.
2. After a 600ms delay (so the hero image has time to paint), the tour activates:
   - Carousel autoplay pauses.
   - A dim overlay fades in over the page (200ms).
   - The current step's anchor is visually elevated above the dim.
   - A popover appears next to the anchor with a caret pointing at it.
3. User advances with **Next** / `Enter` / `→`, goes back with `←`, or dismisses with **X** / `Esc` / backdrop click.
4. On step 3's **Got it** (or any dismissal), overlay fades out, autoplay resumes, and `rdz_carousel_tour_seen_v1` is written to `localStorage`.

### Replay

- A small `?` icon button sits at the end of the carousel's footer hint line. Clicking it re-opens the tour regardless of the seen flag; replaying does not re-write the flag.

### Steps

| # | Anchor (`data-tour`) | Headline | Body | Visual |
|---|---|---|---|---|
| 1 | `hero` (hero card container) | Browse top posts | Use **←** **→** to flip through stories. | Two kbd chips for ←/→ |
| 2 | `comments` (top-comments aside) | Skim top comments | Use **↑** **↓** to cycle through replies. | kbd chips for ↑/↓ |
| 3 | `pause` (play/pause button) | Pause anytime | Hit **Space** to pause or resume. | kbd chip for Space |

Steps with missing anchors are skipped:
- Step 2 skipped when `commentCount === 0`.
- Step 3 skipped when `total <= 1` (no pause button rendered).
- Counter ("1 of N") reflects the visible step count.

### Footer hint update

The existing hint line in `NewsCarousel.tsx` (currently `← → arrows · swipe` text) is replaced for fine-pointer users with:

```
[←][→] arrows · swipe   [?]
```

Where `[←]` and `[→]` are kbd-styled chips and `[?]` is a small icon button (`faCircleQuestion`, ~12px) with `aria-label="Show keyboard shortcuts tour"`. Coarse-pointer users continue to see just `swipe` with no chips and no `?` button.

### New Space-key pause/play

`NewsCarousel`'s existing `keydown` listener gains a `Space` case that toggles `isManuallyPaused` (mirroring the existing pause button). It uses the same input-element guard as the arrow keys: skip if focus is in `INPUT`, `TEXTAREA`, or `SELECT`. The tour overlay, when active, prevents this handler from firing (see Architecture / event handling).

## Architecture

### File changes

**New:**
- `src/components/CarouselOnboardingTour.tsx` — tour overlay, popover, step orchestration. Exposes an imperative ref handle `{ open(): void }` for replay.
- `src/helpers/useFirstVisit.ts` — small hook reading/writing one localStorage key with SSR-safe defaults and an in-memory fallback when storage is unavailable.

**Modified:**
- `src/components/NewsCarousel.tsx`:
  - Adds `data-tour="hero"` on the hero container, `data-tour="comments"` on the comments aside, `data-tour="pause"` on the play/pause button.
  - Adds `Space` handler to the existing `keydown` effect.
  - Replaces the footer hint span with a flex row containing kbd chips, the existing "arrows · swipe" text, and the `?` button.
  - Accepts new optional props: `onReplayTour?: () => void` and `tourActive?: boolean`. `tourActive` is used to short-circuit the carousel's own keydown handler while the tour is open.
- `src/components/TopFeed.tsx` is the host of `NewsCarousel` on the home page (signed-out users land on `HomePage` → `AppShell` → `TopContent` → `TopFeed` → `NewsCarousel`). It mounts `<CarouselOnboardingTour />` as a sibling, passes a ref to it, and wires `?` button clicks through the new `onReplayTour` prop to `tourRef.current?.open()`. It also tracks `tourActive` state and passes it down to the carousel.
- The same `NewsCarousel` is also rendered inside `SavedFeed` (signed-in users). For this initial scope, the tour mounts **only from `TopFeed`** so it stays a home-page feature. `SavedFeed` does not get the tour or the `?` button. The `?` button and `onReplayTour` prop on `NewsCarousel` are optional — if `SavedFeed` doesn't pass them, the footer renders without a `?` icon.

### Component boundaries

- `CarouselOnboardingTour` knows nothing about carousel internals. It locates anchors via `document.querySelector('[data-tour="…"]')` and reads `getBoundingClientRect()`.
- `NewsCarousel` knows nothing about tour internals. It exposes anchors via `data-tour` attributes and accepts a generic `tourActive` flag.
- Communication is one-way data + one imperative `open()` call. No context required.

### State

`CarouselOnboardingTour` internal state:
- `active: boolean`
- `stepIndex: number` (0-based into the visible-steps array)
- `popoverRect: { top, left, side, caretOffset } | null`

Host-level state:
- `tourActive: boolean` (mirrors the tour's `active` via callbacks, used to gate the carousel's keyboard handler)

### Data flow

```
TopFeed (home-page host)
 ├── tourRef = useRef<{ open(): void }>(null)
 ├── tourActive state
 ├── NewsCarousel
 │    ├── data-tour="hero" / "comments" / "pause"
 │    ├── Space-key handler (gated by tourActive)
 │    └── Footer ? button → tourRef.current.open()
 └── CarouselOnboardingTour ref={tourRef}
      ├── useFirstVisit() → { seen, markSeen }
      ├── useCoarsePointer() → no-op if coarse
      ├── useTheme() → light/dark styling
      ├── On mount: if !seen && !coarse, setTimeout(activate, 600)
      ├── On open(): activate regardless of seen
      └── Portal → dim overlay + positioned popover
```

### Event handling

- Tour `keydown` listener is attached to `document` while active with `capture: true` so it intercepts keys before the carousel's own listener. It handles `Enter`/`→`/`Space` → next, `←` → back, `Esc` → dismiss, and `stopPropagation()`s on all of them.
- The carousel's `keydown` handler additionally checks `tourActive`; if true, it returns early. This is belt-and-suspenders against any ordering edge case.
- Anchor positioning recomputes on `window.resize` and `window.scroll` (passive listeners, rAF-throttled).
- A `MutationObserver` is not used; instead the tour re-queries the anchor on each render so anchor disappearance is handled naturally on the next state change.

### Theming

The tour uses the existing `useTheme()` hook and `var(--theme-*)` tokens:
- Popover background: `var(--theme-surface)` (or its light-mode counterpart already used in NewsCarousel's comments aside).
- Text: `var(--theme-text)` / `var(--theme-textMuted)`.
- Accent buttons + kbd chip highlight: `var(--theme-primary)` (matches carousel dots).
- Dim overlay: `rgba(0,0,0,0.55)` dark, `rgba(0,0,0,0.35)` light, plus `backdrop-blur-sm`.
- Specific token names will be confirmed against `src/context/ThemeContext` and existing usage during implementation; the design is to reuse whatever is already in use, not introduce new tokens.

### Visual / positioning details

- Popover width: `min(340px, viewport - 32px)`. Padding 16px. Rounded `xl`. Drop shadow.
- Side selection: prefer below the anchor; flip above on viewport overflow; for the comments aside (step 2) prefer the side closer to the viewport center.
- Caret: 8px triangle pointing at anchor center, clamped 16px from popover edges.
- Anchor elevation: the matched element gets a `position: relative; z-index: 61` boost via a tour-active class while the dim overlay is at `z-[60]`. No SVG cutout / clip-path.
- Animation: overlay 200ms fade; popover 220ms slide-8px-from-caret-direction + fade. Step transitions reposition the same popover (no overlay flicker).

### Accessibility

- Popover: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at the headline element id.
- Focus trap inside popover while open. On dismissal, focus returns to the `?` button if it triggered, else to `document.body`.
- `aria-keyshortcuts` is added to the relevant carousel controls:
  - Hero container: `aria-keyshortcuts="ArrowLeft ArrowRight"`.
  - Comments aside: `aria-keyshortcuts="ArrowUp ArrowDown"`.
  - Pause button: `aria-keyshortcuts="Space"`.

## Persistence

- localStorage key: `rdz_carousel_tour_seen_v1`. Value: `"1"` when seen.
- Bump suffix to `_v2` to re-show to returning users if tour content meaningfully changes.
- `useFirstVisit` reads inside a `try/catch`. If storage throws (e.g., private browsing in older Safari), it falls back to in-memory state for the session and does not throw.

## Error handling & edge cases

- **Anchor missing after 600ms delay** (e.g., empty carousel, slow image hydration): retry on `requestAnimationFrame` up to ~1.5s total, then silently abort and do not write the seen flag. User can replay later.
- **Anchor disappears mid-tour** (e.g., step 2 active and the post rotates to one with no comments while autoplay was somehow not paused — defensive only since we pause): skip forward to the next available step. If none, dismiss.
- **Carousel has only 1 post:** no autoplay, no dots, no pause button → step 3 anchor missing → tour shows steps 1–2 (or just 1 if also no comments).
- **No comments on the current post:** step 2 skipped.
- **localStorage unavailable:** tour shows once per browser session, never persists. No errors surfaced.
- **Window resize / scroll mid-tour:** popover recomputes via passive rAF-throttled listeners. If the anchor scrolls off-screen, the popover follows.
- **Space key while focused in input/textarea/select:** same guard as existing arrow-key handler — no pause toggle.

## Testing plan

This project has no automated test setup (per `package.json` scripts: `dev`, `build`, `lint`, `preview`). All testing is manual via `npm run dev` and browser.

- First visit on desktop dark theme → tour appears after delay, advances through visible steps, dismisses cleanly, flag persists, reload doesn't re-show.
- Click `?` → tour re-opens regardless of flag; dismissing replay does not re-write the flag (or re-writes the same value — both acceptable).
- Switch theme (light/dark) mid-tour → popover restyles correctly without flicker.
- Resize window / scroll the page while tour is open → popover stays anchored.
- Touch device (Chrome DevTools mobile emulation, coarse pointer) → tour never shows, no `?` button visible, footer reads just "swipe".
- Force zero-comments post → step 2 skipped, counter reads "1 of 2".
- Force single-post carousel → step 3 skipped.
- Press Space while focus is in a search/input → does NOT pause carousel.
- Press Space while focus is on the body → toggles pause as expected.
- Esc / X / Got-it / backdrop click → all dismiss and unpause autoplay.
- localStorage disabled (DevTools → Application → Storage → block site data) → tour still shows but only once per session, no crashes.

## Out-of-scope cleanups noted

- The current footer hint string is computed inline in `NewsCarousel.tsx` lines 624–628. Replacing it with the new chip-based row is part of this work; no other refactor of that file is planned.
- The carousel's existing arrow-key handler at lines 208–231 will gain one new `Space` case and a `tourActive` early-return; no other changes to that effect.
