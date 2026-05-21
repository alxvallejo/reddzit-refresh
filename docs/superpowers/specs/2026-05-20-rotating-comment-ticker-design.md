# Rotating Comment Ticker Under Each Slide

## Goal

Display 2–3 top comments beneath each `NewsCarousel` slide, cycling one comment
at a time with the same fade in/out transition the slide itself uses. Adds
supporting social context to each post without increasing API load.

## Non-goals

- Threaded comment view, replies, or comment paging.
- Live/fresh comment fetching per slide.
- User-facing interactivity on comments (no click target, no upvote, no link out).
- Changes to any service file, type, or API.

## Data source

Comments come from the `topComments` field already present on `TrendingPost`
(`src/helpers/DailyService.ts:64`). Shape per comment:

```ts
interface TrendingPostTopComment {
  id: string;
  body: string;
  author: string;
  score: number;
  permalink: string | null;
}
```

Because the data is already in the trending RSS payload, this feature adds
**zero new API calls**. The existing 5-minute localStorage cache on
`/api/trending/rss` continues to serve.

## Behavior

### Placement

A new section renders inside the existing `<main>` block of
`src/components/NewsCarousel.tsx`, positioned between the swipe area (the
slide stack with arrows) and the dots/progress row.

### Rotation

- Interval: **15 seconds** per comment.
- Transition: reuse the existing `carousel-fade-in` / `carousel-fade-out`
  CSS classes (~900ms cross-fade). Same visual language as the slide itself.
- Looping: cycles back to the first comment after the last one.
- The section header label "Top comments" stays static across rotations; only
  the comment body/meta cross-fades.

### Per-slide reset

When the slide index changes, the comment index resets to 0 and the 15s timer
restarts for the new slide. Comments from the previous slide are not retained
or interleaved.

### Pause sync with the slide

The comment rotator pauses under the same conditions the slide already
pauses, reusing existing state in `NewsCarousel`:

- Mouse hover over `<main>` (`isPaused` → true).
- Touch drag (`isPaused` set during `onPointerDown` for touch).
- Browser tab hidden (`tabVisible` → false).

When the slide resumes, the comment timer resumes too.

### Edge cases

- **0 comments** (`topComments` is empty or undefined): the entire section
  is omitted. No header, no empty placeholder.
- **1 comment**: rendered statically, no rotation, no timer.
- **2–3 comments**: rotates per the rules above.

### Content layout per comment

- Small static header label above the rotator: "Top comments".
- One-line meta row: `▲ {score} · u/{author}`, using the muted theme text
  color (`--theme-textMuted`).
- Body: clamped to 2 lines with ellipsis using `line-clamp-2`, using the
  standard theme text color (`--theme-text`).
- No interactive affordances: no hover state, no cursor change, no click
  handler, no link.

The section's visual weight is intentionally lower than the slide hero card —
this is supporting content, not the focus.

## Implementation footprint

All changes are local to `src/components/NewsCarousel.tsx`:

- Add a `commentIndex` state plus a `useEffect` timer scoped by
  `[safeIndex, isPaused, tabVisible, commentsLength]`.
- Add a `commentStack` state mirroring the existing `stack` pattern so the
  cross-fade reuses `carousel-fade-in` / `carousel-fade-out` classes.
- Add a JSX block below the swipe-area `<div>` and above the dots row.

No new files. No new CSS. No type changes. No service changes.

## Verification

- 0-comment post: section is absent (visual inspection across themes).
- 1-comment post: comment renders static; no flicker after 15s.
- 3-comment post: comments cross-fade every 15s, loop, and reset to first
  when the slide advances.
- Hovering the carousel pauses both the slide and the comment rotator.
- Touch swipe to a new slide resets the comment rotator to comment 0.
- Hiding the tab pauses rotation; returning resumes.

## Out of scope (deferred)

- General API quota monitoring / circuit breaker. The user raised this
  alongside the comment feature, but since this feature introduces no new
  requests, quota work is tracked separately if desired.
