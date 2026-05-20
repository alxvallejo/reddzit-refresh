# News Carousel View — Design Spec

Date: 2026-05-19
Scope: `src/components/TopFeed.tsx`, `src/components/MagazineGrid.tsx`, new `src/components/NewsCarousel.tsx`

## Goal

Add a toggleable alternate "carousel" view to the news feed that displays one post at a time in a full-width, magnified card — letting the user cycle through posts deliberately rather than scanning a grid. The current "magazine" (2-column grid) view remains the default.

## User Experience

- **View toggle** — A segmented control in the page header lets the user switch between **Grid** (current magazine view) and **Carousel**.
- **Persistence** — The selected mode is stored in `localStorage` under `rdz_news_view_mode` (`"grid"` | `"carousel"`). It applies across `/news` and `/top` (shared component).
- **Default** — `grid` for new users.
- **Carousel layout** — A single post card spans the available width (capped at the same `max-w-7xl` container). Larger headline typography (`text-3xl md:text-4xl`, light weight) consistent with the existing magazine card hierarchy.
- **Navigation** —
  - Left/right chevron buttons on either side of the card.
  - ← / → keyboard arrows.
  - Touch swipe on mobile (basic horizontal swipe detection; no library).
- **Position indicator** — `n / total` counter and a row of dots (current dot expanded as a pill).
- **Wrap behavior** — Next on last item wraps to first; Prev on first wraps to last.
- **Skip behavior preserved** — Skip button advances to the next card and removes the current one from the visible set (same `skippedPostIds` state as today).
- **Empty state** — If all posts skipped, show the existing "No posts available" UI (no carousel chrome).
- **Click card** — Opens the post (same `handlePostClick`).

## Components

- **`MagazineGrid.tsx`** — Add a named export for `HeroCard` so the carousel can reuse the existing hero card layout (image, subreddit badge, meta row, title, rotating quote).
- **`NewsCarousel.tsx`** (new) — Owns carousel rendering: `posts`, `onPostClick`, `onSkipPost` props matching MagazineGrid. Internally manages `currentIndex`, prev/next buttons, dot pagination, keyboard arrows, swipe, and wrap behavior. Reuses `HeroCard` from MagazineGrid for the post itself.
- **`TopFeed.tsx`** — Add:
  - `viewMode` state initialized from `localStorage` (`rdz_news_view_mode`).
  - View-mode toggle rendered inside the existing header right-side controls cluster.
  - Conditional render: `viewMode === 'grid'` → `<MagazineGrid>`, else `<NewsCarousel>`.

## Data Flow

No data layer changes. `visiblePosts` is the same filtered list both views consume.

```
DailyService.getTrendingRSS()
  → posts
  → minus skippedPostIds
  → visiblePosts
       ├── grid view (existing <main> grid)
       └── carousel view (new — index into visiblePosts)
```

## Edge Cases

- **Index out-of-range after skip** — If the user skips the last visible post, clamp `currentIndex` to `Math.max(0, visiblePosts.length - 1)`.
- **All posts skipped** — Render the existing empty state (skipping carousel chrome).
- **Single post** — Hide pagination dots; chevrons disabled.
- **Loading / error** — Use the existing top-level loading/error returns (no view-mode branching).
- **localStorage unavailable** — Wrap reads in try/catch; default to `'grid'`.

## Styling

- Uses existing CSS variables (`--theme-bg`, `--theme-cardBg`, `--theme-primary`, `--theme-border`, `--theme-text`, `--theme-textMuted`).
- Toggle styled like a segmented control: two adjoining buttons, the active one filled with `--theme-primary`.
- Light/dark variants follow the existing `isLight` ternaries.

## Out of Scope

- No animation library — use CSS transitions only (transform/opacity) if needed.
- No deep-link to a specific card index.
- No autoplay.
- No "save view per route" — single global preference is sufficient.

## Testing

- Type-check passes (`tsc --noEmit`).
- Manual verify: toggle round-trips with `localStorage`; keyboard arrows; swipe on a touch-emulated browser viewport; skip behavior in carousel; empty state.

## Files Touched

- `src/components/TopFeed.tsx` — add view mode state + toggle + conditional render.
- `src/components/MagazineGrid.tsx` — add named export for `HeroCard`.
- `src/components/NewsCarousel.tsx` — new file.
