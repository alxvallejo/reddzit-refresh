# Save / Like / Share Actions on Carousel Slides

## Goal

Add a per-slide action set — **Save**, **Like**, **Share** — to the
`NewsCarousel` so users can act on the currently visible post without leaving
the carousel or opening `PostView`. Placement is a vertical "edge stack" on the
right side of the hero image (the TikTok-style pattern), preserving the title
gradient and the existing skip-post button.

## Non-goals

- Action UI on the `MagazineGrid` cards (`HeroCard` reuse path outside the
  carousel). The new buttons render only when the carousel mounts the hero.
- Counts/totals next to icons. The hero gradient already shows ▲ score and
  💬 comments; the action buttons are toggles, not metrics.
- A separate floating action menu, deep-link, or modal.
- Changes to the comments aside (right/below the hero on desktop/mobile).
- Touch-and-hold or right-click context menus.

## Placement and visual

### Position

The action stack lives on the **inner right edge of the hero card**, vertically
positioned so it sits **between the top-right skip button and the bottom title
gradient**. Concretely, anchored to the card's bottom with `bottom: ~30%` (or
`bottom-1/3`), `right: 8px`, above the title gradient on the z-axis.

```
┌─────────────────────────────────┐
│ [r/news]                  [👁]  │ ← subreddit chip + existing skip
│                                 │
│                                 │
│                            (♡)  │
│                            (🔖) │ ← new action stack
│                            (↗)  │
│                                 │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ Headline of the post...         │ ← title gradient (unchanged)
│ 2h · ▲ 12k · 💬 850             │
└─────────────────────────────────┘
```

Same placement on mobile and desktop. The desktop "side-by-side with comments"
layout is unaffected because the actions stay on the hero column.

### Button style

Match the existing `SkipButton` glass-morphic style
(`src/components/MagazineGrid.tsx:158`):

- Container: `absolute right-2`, `flex flex-col gap-2`
- Each button: `w-9 h-9 rounded-full backdrop-blur-sm`
  - Dark theme: `text-gray-200 bg-black/60 hover:bg-white/20`
  - Light theme: `text-gray-700 bg-white/80 hover:bg-gray-200`
- Active/toggled state (saved or liked): icon swaps to filled variant; button
  background tints with `bg-[var(--theme-primary)]/70 text-[#262129]`.
- Icons (FontAwesome, already in the bundle):
  - Like: `faHeart` / `faHeartRegular`
  - Save: `faBookmark` / `faBookmarkRegular` (already imported in `PostView`)
  - Share: `faShareNodes` (already imported in `PostView`)

### Interaction guards

- Each button calls `e.stopPropagation()` before its handler so the hero's
  `onClick` (which opens `PostView`) does not fire. Same pattern as
  `SkipButton`.
- Buttons set `pointer-events-auto` and are placed inside the swipe area; the
  swipe handlers ignore taps that originate on `<button>` (the existing pointer
  logic only triggers a swipe past `SWIPE_THRESHOLD_PX = 50`, so a tap is safe,
  but to be explicit the action handlers also call `stopPropagation`).
- Hovering the action stack should **not** pause the carousel any differently
  than hovering the main card does — the existing `onMouseEnter` on `<main>`
  already covers this.

## Action semantics

### Save

Maps to Reddit's saved-posts endpoint, already wired in
`src/context/RedditContext.tsx` (`savePost` / `unsavePost`) and demonstrated in
`src/components/PostView.tsx:408`.

- Fullname: the carousel's `TrendingPost` lacks a Reddit `name` field, so
  construct it as `` `t3_${post.id}` `` (same fallback `PostView` uses).
- Saved state: the carousel does not currently track `saved` per post. We add a
  local `Set<string>` of saved post IDs in `NewsCarousel` keyed by `post.id`,
  seeded from `RedditContext.saved` on mount, and updated optimistically on
  toggle.
- Signed-out: click triggers `redirectForAuth()` from `RedditContext`, matching
  `PostView`'s pattern.
- Toast: reuse `showToast` from the existing toast helper used by `PostView`
  (`'Post saved!'` / `'Post unsaved'`).

### Like

**Like = Reddit upvote.** Reddit's API supports `/api/vote` with `dir=1`
(upvote) / `dir=0` (clear vote). This requires three small additions:

1. `read-api`: new route `POST /api/reddit/vote` in `server.js`, mirroring the
   existing `/api/reddit/save` proxy. Body: `{ id, dir }`. Forwards to
   `https://oauth.reddit.com/api/vote` with the user's bearer token.
2. `Reddit.js` helper: `vote = async (fullname, dir) => { ... }` method that
   posts to `/api/reddit/vote`.
3. `RedditContext`: `likePost(id)` / `unlikePost(id)` callbacks plus a local
   `liked: Set<string>` mirror (Reddit's GET endpoints do not return a user's
   vote state in feeds, so we cannot trivially hydrate it across reloads —
   this state is **session-scoped only**, persisted in `sessionStorage`
   keyed by `liked:<id>` and rehydrated on context mount).
- Signed-out: same `redirectForAuth()` path as Save.
- Toast: `'Liked'` / `'Like removed'`.

**Why this matters / risk:** This is the only piece that touches `read-api`
and adds new server scope. If the user wants to keep the change frontend-only,
the alternative is "Like = local favorite" — a client-side `Set` in
`localStorage` with no Reddit roundtrip. That alternative is called out in the
**Open question** section below; pick one before we move to planning.

### Share

Copy the Reddit permalink to the clipboard. Matches `PostView.handleShare`
(`src/components/PostView.tsx:175`).

- URL: `` `https://www.reddit.com/comments/${post.id}` `` — `TrendingPost` does
  not include a `permalink`, but the canonical `/comments/<id>` form redirects
  to the full permalink server-side.
- Web Share API: if `navigator.share` is available **and** the user is on a
  touch device, prefer it for the native share sheet; otherwise fall back to
  clipboard copy. The fallback is the existing behavior in `PostView`.
- Always available — no auth gate.
- Toast: `'Link copied!'` (or no toast when the native share sheet handled it,
  matching browser conventions).

## Component structure

A new internal component, `SlideActions`, defined inside
`src/components/NewsCarousel.tsx` (private, not exported). Keeps the surface
area of `NewsCarousel.tsx` contained — adding a separate file for three small
buttons would over-fragment the carousel module.

```tsx
interface SlideActionsProps {
  post: TrendingPost;
  isSaved: boolean;
  isLiked: boolean;
  onToggleSave: () => void;
  onToggleLike: () => void;
  onShare: () => void;
  signedIn: boolean;
}
```

`NewsCarousel` owns the `saved` / `liked` sets and the handlers, passes the
booleans for the *current* slide into `<SlideActions />`, which renders the
vertical stack. The stack is rendered inside the same swipe container as the
slide, layered on top of the `HeroCard` (z-index above the title gradient).

The component is **not** rendered when there are zero posts (`total === 0`).

## Data flow

```
NewsCarousel mount
  ├─ subscribe to RedditContext.{ saved, savePost, unsavePost,
  │                                likePost, unlikePost, redirectForAuth,
  │                                signedIn }
  ├─ derive savedIds: Set<string> = new Set(saved.map(p => p.id))
  ├─ hydrate likedIds: Set<string> from sessionStorage('liked')
  └─ render <SlideActions /> overlaid on the current hero

User taps ♡ on slide N
  ├─ if !signedIn -> redirectForAuth(); return
  ├─ optimistic: likedIds.add/delete(posts[N].id); setLikedIds(new Set(...))
  ├─ persist likedIds -> sessionStorage
  ├─ await likePost(`t3_${posts[N].id}`) or unlikePost(...)
  │     └─ on error: revert likedIds; toast 'Couldn't like — try again'
  └─ toast 'Liked' / 'Like removed'
```

`saved` follows the same shape, but its source of truth is
`RedditContext.saved` (not session-local).

## Edge cases and error handling

- **Stale slide:** if the user mashes ♡ then swipes mid-flight, the optimistic
  update is keyed to `post.id`, not the slide index, so it survives a slide
  change. The toast reflects the post the action targeted, not the post now on
  screen.
- **Backend failure:** revert the optimistic flip and show an error toast.
  Reuse the same `showToast` channel.
- **Clipboard unavailable:** if `navigator.clipboard.writeText` rejects (e.g.,
  insecure context, denied permission), fall back to opening a tiny invisible
  textarea + `document.execCommand('copy')`, then toast. Identical to current
  `PostView` behavior — though `PostView` simply logs the error and shows no
  toast on failure. We surface a `'Copy failed'` toast here so the action is
  not silently lost.
- **Already-saved seeding:** `RedditContext.saved` is populated only when
  `fetchSaved` has run. If a user lands on the carousel before that fetch
  completes, the heart starts un-toggled and updates after `saved` hydrates.
  We `useEffect` on `saved` to refresh `savedIds` whenever the context array
  changes.

## Testing

- **Visual smoke test:** in dev, the action stack appears on every slide and
  swaps icons on click.
- **Auth gate:** signed-out user clicking Save or Like is redirected to OAuth;
  Share works without auth.
- **Swipe isolation:** tapping a button does not advance the slide and does
  not open `PostView`.
- **Cross-slide persistence:** save post N, swipe to N+1, swipe back — the
  bookmark icon on N is still filled.
- **Vote roundtrip:** with the dev `read-api` running, toggling Like fires a
  request to `/api/reddit/vote` and updates the Reddit account's vote state.
- **Share fallback:** in a browser without `navigator.share`, Share copies the
  link and shows the toast.

## File touchpoints

Frontend (`reddzit-refresh`):

- `src/components/NewsCarousel.tsx` — add `SlideActions` component, overlay it
  on the hero, manage `savedIds` / `likedIds` state, wire to `RedditContext`.
- `src/context/RedditContext.tsx` — add `likePost` / `unlikePost`, expose
  alongside `savePost`. Hydrate `likedIds` from `sessionStorage`.
- `src/helpers/Reddit.js` — add `vote(fullname, dir)` method.

Backend (`read-api`), conditional on "Like = Reddit upvote":

- `controllers/redditProxyController.js` — add `vote` handler that proxies
  `https://oauth.reddit.com/api/vote` (mirrors the existing `save` /
  `unsave` handlers).
- `server.js` — register `app.post('/api/reddit/vote', redditProxy.vote);`.

## Open question (must resolve before planning)

**What does "Like" mean here?**

- **A.** Reddit upvote (this spec's default) — adds a small `read-api`
  route, a helper method, and survives across devices because Reddit owns the
  state. Cost: a backend change.
- **B.** Local favorite — purely client-side `Set` in `localStorage`,
  independent of Reddit. No backend work. Cost: state is per-device-per-browser
  and disappears if the user clears storage; "like" becomes a private signal
  Reddzit owns rather than something visible on Reddit.

If unspecified at planning time, the plan will assume **A**.
