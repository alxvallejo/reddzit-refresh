# Share Comment — Design

Date: 2026-05-24

## Problem

Today, Reddzit lets users share posts (`/p/:fullname`) and their own saved quotes (`/q/:id`). There is no way to share a *specific comment* on a post in a way that lands the reader on Reddzit with the comment in focus and the post context preserved. Comments rendered via `CommentQuote` link out to reddit.com, so sharing a comment loses both branding and the Reddzit reading experience.

## Goal

Let any visitor share a single Reddit comment as a Reddzit URL that:
- Renders a focused comment page on Reddzit (comment body, author, score, attribution).
- Shows the parent post title and subreddit, with a clear path to read the full post in Reddzit's `PostView`.
- Generates rich Open Graph / Twitter previews when pasted into Slack, Discord, Messages, etc.

## Non-goals

- Threaded comment view (parent / replies). The focused page shows only the one shared comment.
- Sharing comments that the user has saved as quotes. That use case is already served by `/q/:id`.
- A new persistence layer. The shared content is public Reddit data fetched on demand; no DB records are created when sharing.

## URL shape

`/c/:fullname` where `:fullname` is the Reddit comment fullname (`t1_<id>`), e.g. `https://reddzit.com/c/t1_abcdef`.

Chosen for symmetry with the existing `/p/:fullname` (posts) and `/q/:id` (quotes) routes.

## Architecture

### Frontend

- **Route**: add `<Route path='/c/:fullname' element={<CommentSharePage />} />` in `src/App.tsx`.
- **New component**: `src/components/CommentSharePage.tsx`, modeled on `src/components/QuoteSharePage.tsx`. Shell, signed-out promo block, and theme handling are reused verbatim where possible.
- **New service helper**: `src/helpers/CommentService.ts` with `getPublicComment(fullname: string)` that calls the new read-api endpoint and returns `{ comment, post }`.
- **Share trigger**: extend `src/components/CommentQuote.tsx` to render a small `[⧉ Share]` icon-and-text button on the `<figcaption>` attribution line, immediately after `— u/author · ▲ score`. Clicking it:
  - Computes the comment fullname: if `comment.id` already starts with `t1_`, use as-is; otherwise prefix with `t1_`.
  - Calls `navigator.clipboard.writeText(`${window.location.origin}/c/${fullname}`)` with the document.execCommand fallback used in `QuoteSharePage`.
  - Sets a transient "Copied!" label state (~2s), mirroring the existing pattern.
  - Calls `e.stopPropagation()` and `e.preventDefault()` so the outer `<a>` wrapper present in some renders (e.g., wrapping permalink) does not navigate.

### CommentSharePage layout

Same shell as `QuoteSharePage`:

- Header: `reddzit` wordmark linking to `/`.
- Body (centered card):
  - Attribution row: `From: <post title> in r/<sub> →`, linking to `/p/<postFullname>`.
  - The comment itself rendered via `<CommentQuote comment={...} size="lg" />` for visual consistency with the rest of the app.
  - Action row: `[ Share ]` (copies current URL) and `[ Read full post → ]` (links to `/p/<postFullname>`).
- Signed-out promo block: reused from `QuoteSharePage`.

### Data flow

1. `CommentSharePage` mounts, reads `:fullname` from the route, calls `CommentService.getPublicComment(fullname)`.
2. read-api endpoint `GET /api/reddit/public/comment/:fullname`:
   - Calls Reddit's public `/api/info?id=t1_<id>` to fetch the comment.
   - Extracts `link_id` (parent post fullname) from the comment payload.
   - Fetches the parent post via the existing internal lookup.
   - Returns a denormalized payload: `{ comment: { id, body, author, score, permalink, createdAt }, post: { fullname, title, subreddit, permalink, previewImage? } }`.
3. Page renders the focused view.

The denormalization on the server keeps the client to a single round trip and lets the SSR handler reuse the same fetch path.

### SSR for share previews

The read-api service adds a sibling to its `/p/:fullname` handler:

- `GET /c/:fullname` reads the comment + parent post, injects OG / Twitter tags into `index.html`:
  - `og:title` → `u/<author> on r/<sub>`
  - `og:description` → first ~200 chars of the comment body, with markdown stripped to plain text
  - `og:image` → parent post's preview image when available, otherwise the default Reddzit OG card
  - `og:url` → canonical `/c/<fullname>` URL
  - matching `twitter:*` tags
- nginx is updated to proxy `/c/` to read-api alongside the existing `/p/` rule.

## States

- **Loading**: spinner identical to `QuoteSharePage`.
- **Success**: focused page as described.
- **Comment not found** (deleted/removed or bad id): "Comment not found" message + "Go to Reddzit" link, identical to `QuoteSharePage`'s error state.
- **Parent post deleted but comment exists**: best-effort — if the read-api response omits `post`, render the focused comment view, hide the `Read full post →` button, and show `From: deleted post` instead of a linked title.

## Auth

The share URL is public — no signed-in requirement. This matches `/p/` and `/q/`. The signed-out promo block from `QuoteSharePage` is reused to convert non-authenticated visitors.

## Testing

### Manual verification matrix

1. Click Share on a `CommentQuote` inside `PostView` top comments → URL on clipboard is `/c/t1_<id>` and "Copied!" feedback shows.
2. Same from `NewsCarousel`, `TopFeed`, `MagazineGrid` — the outer wrapping `<a>` (when present) does not navigate when Share is clicked.
3. Open the resulting `/c/t1_<id>` URL in a new tab → focused page renders, `From: …` links to `/p/<postFullname>`, `Read full post →` navigates there.
4. Paste the URL into Slack and Discord → preview shows comment excerpt + author + post title (verifies read-api SSR).
5. Open a `/c/t1_<id>` for a deleted comment → "Comment not found".
6. Open a `/c/t1_<id>` whose parent post was deleted → focused comment renders, "Read full post" hidden, "From: deleted post" shown.
7. Open `/c/<malformed>` → "Comment not found".
8. Signed-out visit → promo block renders. Signed-in visit → promo block hidden.

### Automated tests

- `CommentSharePage` renders loading → success → error transitions with a mocked `CommentService`.
- `CommentQuote` share button: clicking does not bubble to outer link; clipboard call fires with correct fullname; works whether `comment.id` already has the `t1_` prefix or not.

## Rollout

Ship the frontend (route, page, button, helper) and read-api changes in lockstep, since share URLs depend on SSR for previews to render correctly. If read-api lags, generated URLs still resolve client-side for human visitors; only the social preview is bare until SSR lands.

No database migration. No new persisted state.

## Out-of-repo work (read-api)

Called out here because this design is not fully implementable in the frontend repo alone:

1. New endpoint: `GET /api/reddit/public/comment/:fullname` returning denormalized comment + parent post.
2. New SSR handler: `/c/:fullname` mirroring the `/p/:fullname` handler.
3. nginx: extend the existing `/p/` proxy rule to also match `/c/`.

## File touch list (frontend)

- `src/App.tsx` — add `/c/:fullname` route.
- `src/components/CommentSharePage.tsx` — new.
- `src/helpers/CommentService.ts` — new.
- `src/components/CommentQuote.tsx` — add share button on the attribution line; ensure event propagation is stopped so outer wrappers don't navigate.
