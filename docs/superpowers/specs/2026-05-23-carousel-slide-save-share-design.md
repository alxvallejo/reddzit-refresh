# Save / Share Actions on Carousel Slides

## Goal

Add a per-slide action set — **Save** and **Share** — to the `NewsCarousel`
so users can act on the currently visible post without leaving the carousel
or opening `PostView`. Placement adapts to viewport: a vertical "edge stack"
on the right side of the hero on desktop, and a horizontal row inside the
title gradient on mobile.

## Non-goals

- A "Like" / upvote button. The slide already shows ▲ score in the meta row,
  Save covers "I valued this", and adding a third toggle would duplicate
  intent for marginal value. See **Why no Like** below.
- Action UI on the `MagazineGrid` cards (`HeroCard` reuse path outside the
  carousel). The new buttons render only when the carousel mounts the hero.
- Counts/totals next to icons. The hero gradient already shows ▲ score and
  💬 comments; the action buttons are toggles, not metrics.
- A separate floating action menu, deep-link, or modal.
- Changes to the comments aside (right/below the hero on desktop/mobile).
- Touch-and-hold or right-click context menus.

## Why no Like

The Save/Like/Share triad is borrowed from Instagram/TikTok, where Like is
the *primary* lightweight engagement. Reddzit is a reading app on top of
Reddit content — that triad doesn't translate:

- **Score is already visible** in the meta line (▲ 12k). A heart sitting
  beside a visible Reddit upvote count is redundant if it upvotes, and
  confusing if it does something else.
- **Save already covers "I valued this."** A second toggle splits intent.
- **Personalization signals work better implicitly.** Dwell time, "opened
  the post", and existing `ForYouService` triage actions give a richer
  signal than asking users to tap a heart.
- **Adding Like cost a backend route** (`/api/reddit/vote`) for a button
  likely to see low engagement. Save and Share earn their slot; Like
  doesn't.

If we ever want it back, it slots into the same `SlideActions` component as
a third button — no architectural cost to defer.

## Placement and visual

The placement is **responsive**: the same two buttons live in two different
layouts depending on viewport width. The Tailwind breakpoint is `md`
(≥768px), matching every other responsive switch in `NewsCarousel`.

### Desktop (≥md) — vertical edge stack

Inner right edge of the hero card, vertically positioned **between the
top-right skip button and the bottom title gradient**. Anchored with
`right: 8px`, `bottom: ~30%` (above the title gradient on the z-axis).

```
┌─────────────────────────────────┐
│ [r/news]                  [👁]  │ ← subreddit chip + existing skip
│                                 │
│                            (🔖) │ ← vertical action stack
│                            (↗)  │
│                                 │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ Headline of the post...         │ ← title gradient (unchanged)
│ 2h · ▲ 12k · 💬 850             │
└─────────────────────────────────┘
```

### Mobile (<md) — horizontal row in the gradient

Buttons render as a horizontal row **inside** the existing title gradient,
below the meta line (`2h · ▲ 12k · 💬 850`). The right edge of the hero
stays empty, so the swipe zone is uninterrupted.

```
┌─────────────────────────────────┐
│ [r/news]                  [👁]  │
│                                 │
│                                 │
│                                 │
│                                 │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ Headline of the post...         │
│ 2h · ▲ 12k · 💬 850             │
│ (🔖)   (↗)                      │ ← horizontal row in gradient
└─────────────────────────────────┘
```

The horizontal row uses a lighter button background (`bg-white/12`) since
it sits on top of the darker portion of the gradient and doesn't need its
own dimming.

### Button style

Match the existing `SkipButton` glass-morphic style
(`src/components/MagazineGrid.tsx:158`).

- Desktop stack container: `hidden md:flex absolute right-2 bottom-1/3
  flex-col gap-2 z-10`
- Mobile row container: rendered **inside the title gradient block** below
  the meta line — `flex md:hidden gap-3 mt-2 pointer-events-auto`
- Each button: `w-9 h-9 rounded-full backdrop-blur-sm transition`
  (~36px, comfortable thumb target; same size on both viewports so the
  icon scale stays consistent).
  - Dark theme on the gradient (mobile): `text-white bg-white/12
    hover:bg-white/25`
  - Dark theme on the image (desktop stack): `text-gray-200 bg-black/60
    hover:bg-white/20`
  - Light theme: `text-gray-700 bg-white/80 hover:bg-gray-200` (used only
    by the desktop stack — the gradient is dark in both themes)
- Active/toggled state (saved): icon swaps to the filled bookmark; button
  background tints with `bg-[var(--theme-primary)]/70 text-[#262129]`.
- Icons (FontAwesome, already in the bundle):
  - Save: `faBookmark` / `faBookmarkRegular` (already imported in
    `PostView`)
  - Share: `faShareNodes` (already imported in `PostView`)

### Interaction guards

- Each button calls `e.stopPropagation()` before its handler so the hero's
  `onClick` (which opens `PostView`) does not fire. Same pattern as
  `SkipButton`.
- Buttons set `pointer-events-auto` and are placed inside the swipe area;
  the swipe handlers ignore taps that originate on `<button>` (the
  existing pointer logic only triggers a swipe past `SWIPE_THRESHOLD_PX
  = 50`, so a tap is safe, but to be explicit the action handlers also
  call `stopPropagation`).
- Hovering the action stack should **not** pause the carousel any
  differently than hovering the main card does — the existing
  `onMouseEnter` on `<main>` already covers this.

## Action semantics

### Save

Maps to Reddit's saved-posts endpoint, already wired in
`src/context/RedditContext.tsx` (`savePost` / `unsavePost`) and
demonstrated in `src/components/PostView.tsx:408`.

- Fullname: the carousel's `TrendingPost` lacks a Reddit `name` field, so
  construct it as `` `t3_${post.id}` `` (same fallback `PostView` uses).
- Saved state: the carousel does not currently track `saved` per post.
  We add a local `Set<string>` of saved post IDs in `NewsCarousel` keyed
  by `post.id`, seeded from `RedditContext.saved` on mount, and updated
  optimistically on toggle.
- Signed-out: click triggers `redirectForAuth()` from `RedditContext`,
  matching `PostView`'s pattern.
- Toast: reuse `showToast` from the existing toast helper used by
  `PostView` (`'Post saved!'` / `'Post unsaved'`).

### Share

Copy the Reddit permalink to the clipboard. Matches
`PostView.handleShare` (`src/components/PostView.tsx:175`).

- URL: `` `https://www.reddit.com/comments/${post.id}` `` —
  `TrendingPost` does not include a `permalink`, but the canonical
  `/comments/<id>` form redirects to the full permalink server-side.
- Web Share API: if `navigator.share` is available **and** the user is
  on a touch device, prefer it for the native share sheet; otherwise
  fall back to clipboard copy. The fallback is the existing behavior in
  `PostView`.
- Always available — no auth gate.
- Toast: `'Link copied!'` (or no toast when the native share sheet
  handled it, matching browser conventions).

## Component structure

A new internal component, `SlideActions`, defined inside
`src/components/NewsCarousel.tsx` (private, not exported). Keeps the
surface area of `NewsCarousel.tsx` contained — adding a separate file for
two small buttons would over-fragment the carousel module.

```tsx
interface SlideActionsProps {
  post: TrendingPost;
  isSaved: boolean;
  onToggleSave: () => void;
  onShare: () => void;
  signedIn: boolean;
  variant: 'stack' | 'row';
}
```

`SlideActions` renders the buttons in either layout based on `variant`.
The two variants share the same handlers and toggled-state logic — only
positioning and background tint differ.

### Wiring the two variants

`NewsCarousel` owns the `savedIds` set and the handlers. It renders
**two** `<SlideActions />` instances per slide, each gated by a Tailwind
responsive class so only one is visible at a time:

- **Desktop stack:** rendered as a sibling of `HeroCard` inside the
  swipe container, absolutely positioned over the hero
  (`hidden md:flex …`). This works the same as the existing `SkipButton`
  overlay.
- **Mobile row:** rendered **inside the title gradient block** of
  `HeroCard`, below the meta line. This requires a small change to
  `HeroCard`:
  - Add an optional `actionsSlot?: React.ReactNode` prop on `CardProps`.
  - In both the image branch and the `isTextForward` branch, render
    `{actionsSlot}` immediately after the meta row (the
    `flex items-center gap-2 …` row that shows time / score / comments).
  - Only `NewsCarousel` passes `actionsSlot`; `MagazineGrid` continues
    to pass nothing, so the slot is empty there.

### When to render

The desktop stack and mobile row are both rendered for every visible
slide when `total > 0`. They share state, so toggling on mobile and
resizing to desktop (or vice versa) reflects immediately.

The component is **not** rendered when there are zero posts
(`total === 0`).

## Data flow

```
NewsCarousel mount
  ├─ subscribe to RedditContext.{ saved, savePost, unsavePost,
  │                                redirectForAuth, signedIn }
  ├─ derive savedIds: Set<string> = new Set(saved.map(p => p.id))
  └─ render <SlideActions /> overlaid on the current hero

User taps 🔖 on slide N
  ├─ if !signedIn -> redirectForAuth(); return
  ├─ optimistic: savedIds.add/delete(posts[N].id); setSavedIds(new Set(...))
  ├─ await savePost(`t3_${posts[N].id}`) or unsavePost(...)
  │     └─ on error: revert savedIds; toast "Couldn't save — try again"
  └─ toast 'Post saved!' / 'Post unsaved'

User taps ↗ on slide N
  ├─ if navigator.share + touch device -> navigator.share({ url })
  ├─ else -> navigator.clipboard.writeText(url)
  │           └─ on reject: textarea + execCommand('copy') fallback
  └─ toast 'Link copied!' (clipboard path only)
```

## Edge cases and error handling

- **Stale slide:** if the user mashes 🔖 then swipes mid-flight, the
  optimistic update is keyed to `post.id`, not the slide index, so it
  survives a slide change. The toast reflects the post the action
  targeted, not the post now on screen.
- **Backend failure:** revert the optimistic flip and show an error
  toast. Reuse the same `showToast` channel.
- **Clipboard unavailable:** if `navigator.clipboard.writeText` rejects
  (e.g., insecure context, denied permission), fall back to opening a
  tiny invisible textarea + `document.execCommand('copy')`, then toast.
  Identical to current `PostView` behavior — though `PostView` simply
  logs the error and shows no toast on failure. We surface a
  `'Copy failed'` toast here so the action is not silently lost.
- **Already-saved seeding:** `RedditContext.saved` is populated only
  when `fetchSaved` has run. If a user lands on the carousel before that
  fetch completes, the bookmark starts un-toggled and updates after
  `saved` hydrates. We `useEffect` on `saved` to refresh `savedIds`
  whenever the context array changes.

## Testing

- **Visual smoke test:** in dev, the action buttons appear on every
  slide and the bookmark icon swaps on click.
- **Responsive switch:** narrow the browser below the `md` breakpoint
  and confirm the vertical stack disappears and the horizontal row
  appears inside the gradient (and vice versa when widening). Toggled
  state survives the switch.
- **Auth gate:** signed-out user clicking Save is redirected to OAuth;
  Share works without auth.
- **Swipe isolation:** tapping a button does not advance the slide and
  does not open `PostView`.
- **Cross-slide persistence:** save post N, swipe to N+1, swipe back —
  the bookmark icon on N is still filled.
- **Share fallback:** in a browser without `navigator.share`, Share
  copies the link and shows the toast.

## File touchpoints

Frontend (`reddzit-refresh`):

- `src/components/NewsCarousel.tsx` — add `SlideActions` component,
  render both the desktop stack and mobile row variants per slide,
  manage `savedIds` state, wire to `RedditContext`.
- `src/components/MagazineGrid.tsx` — add optional `actionsSlot?:
  React.ReactNode` to `CardProps` and render it inside the title
  gradient block of `HeroCard` (below the meta row), in both the image
  branch and the text-forward branch. Existing `MagazineGrid` callers
  pass nothing, so the grid view is unaffected.

No backend changes. No `RedditContext` changes (Save is already wired).
