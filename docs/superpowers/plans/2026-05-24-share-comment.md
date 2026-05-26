# Share Comment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users share a single Reddit comment as a Reddzit URL (`/c/:fullname`) that renders a focused, branded page with parent-post context and rich social previews.

**Architecture:** Add a `/c/:fullname` route backed by a new `CommentSharePage` modeled on `QuoteSharePage`. A new `CommentService.getPublicComment` helper calls a read-api endpoint that returns the comment plus denormalized parent post. A share button on `CommentQuote` builds the URL and copies it to the clipboard. read-api SSR work is documented but lives outside this repo.

**Tech Stack:** React 18, TypeScript, Vite, react-router-dom v6, axios, FontAwesome, Tailwind. No test framework — verification is `npm run build` (TypeScript + Vite) plus the manual matrix in the spec.

**Spec:** `docs/superpowers/specs/2026-05-24-share-comment-design.md`

---

## File map

- Create: `src/helpers/CommentService.ts` — single-purpose helper exporting `getPublicComment(fullname)`.
- Create: `src/components/CommentSharePage.tsx` — page mounted at `/c/:fullname`.
- Modify: `src/App.tsx` — add route.
- Modify: `src/components/CommentQuote.tsx` — add share button on the attribution line, with event propagation guards.
- Modify: `README.md` — add a one-liner under "Dynamic Share Previews" noting `/c/:fullname` mirrors `/p/:fullname` and requires the same nginx/read-api setup.

---

### Task 1: Add `CommentService.getPublicComment`

**Files:**
- Create: `src/helpers/CommentService.ts`

- [ ] **Step 1: Create the service file**

```typescript
// src/helpers/CommentService.ts
import axios from 'axios';
import API_BASE_URL from '../config/api';

export interface PublicComment {
  id: string;           // fullname, e.g. "t1_abcdef"
  body: string;
  author: string;
  score: number;
  permalink: string;    // "/r/sub/comments/postid/slug/commentid/"
  createdAt: string;    // ISO
}

export interface PublicCommentPost {
  fullname: string;     // "t3_xyz123"
  title: string;
  subreddit: string;
  permalink: string;
  previewImage: string | null;
}

export interface PublicCommentBundle {
  comment: PublicComment;
  post: PublicCommentPost | null;
}

const CommentService = {
  async getPublicComment(fullname: string): Promise<PublicCommentBundle> {
    const response = await axios.get<PublicCommentBundle>(
      `${API_BASE_URL}/api/reddit/public/comment/${fullname}`
    );
    return response.data;
  },
};

export default CommentService;
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc -b`
Expected: clean exit (no new errors).

- [ ] **Step 3: Commit**

```bash
git add src/helpers/CommentService.ts
git commit -m "Add CommentService.getPublicComment helper"
```

---

### Task 2: Scaffold `CommentSharePage` (route target, loading + error)

Build the page in two passes so the route can be wired and visited before all states render. This pass: page shell, loading spinner, error view. Task 3 layers in the success view.

**Files:**
- Create: `src/components/CommentSharePage.tsx`

- [ ] **Step 1: Create the file**

```tsx
// src/components/CommentSharePage.tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import CommentService, { PublicCommentBundle } from '../helpers/CommentService';

export default function CommentSharePage() {
  const { fullname } = useParams<{ fullname: string }>();
  const { isLight } = useTheme();
  const [bundle, setBundle] = useState<PublicCommentBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!fullname) return;
    CommentService.getPublicComment(fullname)
      .then(setBundle)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [fullname]);

  return (
    <div className={`min-h-screen flex flex-col ${isLight ? 'bg-white' : 'bg-[var(--theme-bg)]'}`}>
      <header className={`px-6 py-4 border-b ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
        <Link
          to="/"
          className={`text-lg font-bold no-underline ${
            isLight ? 'text-orange-600' : 'text-[var(--theme-primary)]'
          }`}
        >
          reddzit
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12 transition-colors duration-300">
        {loading ? (
          <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin opacity-50" />
        ) : error || !bundle ? (
          <div className="text-center">
            <p className={`text-lg mb-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Comment not found
            </p>
            <Link
              to="/"
              className={`text-sm font-medium no-underline ${
                isLight ? 'text-orange-600 hover:text-orange-700' : 'text-[var(--theme-primary)] hover:opacity-80'
              }`}
            >
              Go to Reddzit
            </Link>
          </div>
        ) : (
          <div className="max-w-2xl w-full">
            {/* Success view added in Task 3 */}
            <pre className="text-xs opacity-60">{JSON.stringify(bundle, null, 2)}</pre>
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc -b`
Expected: clean exit.

- [ ] **Step 3: Commit**

```bash
git add src/components/CommentSharePage.tsx
git commit -m "Scaffold CommentSharePage with loading and error states"
```

---

### Task 3: Wire the `/c/:fullname` route

**Files:**
- Modify: `src/App.tsx` (the `<Routes>` block, around lines 31-55)

- [ ] **Step 1: Add the import and route**

In `src/App.tsx`, alongside the other component imports near the top, add:

```tsx
import CommentSharePage from './components/CommentSharePage';
```

Then add this `<Route>` immediately after the existing `<Route path='/q/:id' element={<QuoteSharePage />} />` line:

```tsx
            <Route path='/c/:fullname' element={<CommentSharePage />} />
```

- [ ] **Step 2: Verify build**

Run: `npx tsc -b && npm run build`
Expected: clean build; `dist/` regenerates without errors.

- [ ] **Step 3: Smoke-test the route**

Run: `npm run dev`
Open `http://localhost:5173/c/t1_doesnotexist`.
Expected: page renders the "Comment not found" error state (the read-api endpoint does not exist yet, so the fetch fails — that is the intended path for this step).

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "Wire /c/:fullname route to CommentSharePage"
```

---

### Task 4: Render the focused success view in `CommentSharePage`

Replace the placeholder `<pre>` with the focused layout: post-attribution row, the comment via `CommentQuote`, action row, and the signed-out promo block.

**Files:**
- Modify: `src/components/CommentSharePage.tsx`

- [ ] **Step 1: Add the imports needed for the success view**

At the top of `src/components/CommentSharePage.tsx`, add to the existing imports:

```tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExternalLinkAlt,
  faLink,
  faHighlighter,
  faPuzzlePiece,
  faBookOpen,
  faShareAlt,
} from '@fortawesome/free-solid-svg-icons';
import { useReddit } from '../context/RedditContext';
import CommentQuote from './CommentQuote';
```

Then inside the component (right after the existing `useTheme()` line), add:

```tsx
  const { signedIn } = useReddit();
  const [copied, setCopied] = useState(false);

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
```

- [ ] **Step 2: Replace the placeholder success branch**

Replace the entire `<div className="max-w-2xl w-full">{/* Success view added in Task 3 */}...` block with:

```tsx
          <div className="max-w-2xl w-full">
            {/* From: <post title> in r/<sub> */}
            {bundle.post ? (
              <Link
                to={`/p/${bundle.post.fullname}`}
                className={`inline-flex items-center gap-2 text-sm font-medium no-underline mb-6 ${
                  isLight ? 'text-orange-600 hover:text-orange-700' : 'text-[var(--theme-primary)] hover:opacity-80'
                }`}
              >
                <FontAwesomeIcon icon={faExternalLinkAlt} className="text-xs" />
                <span>
                  From: <span className="font-semibold">{bundle.post.title}</span>
                  {' '}in r/{bundle.post.subreddit}
                </span>
              </Link>
            ) : (
              <div className={`text-sm mb-6 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                From: deleted post
              </div>
            )}

            {/* The comment itself */}
            <CommentQuote
              comment={{
                id: bundle.comment.id,
                body: bundle.comment.body,
                author: bundle.comment.author,
                score: bundle.comment.score,
                permalink: bundle.comment.permalink,
              }}
              size="lg"
            />

            {/* Action row */}
            <div className={`mt-8 pt-6 border-t flex items-center gap-3 ${isLight ? 'border-gray-100' : 'border-white/5'}`}>
              <button
                onClick={copyShareUrl}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors border-none cursor-pointer ${
                  copied
                    ? isLight ? 'bg-green-100 text-green-700' : 'bg-green-500/20 text-green-400'
                    : isLight ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-white/10 text-gray-300 hover:bg-white/15'
                }`}
              >
                <FontAwesomeIcon icon={faLink} className="text-xs" />
                {copied ? 'Link copied!' : 'Share'}
              </button>
              {bundle.post && (
                <Link
                  to={`/p/${bundle.post.fullname}`}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium no-underline transition-colors ${
                    isLight ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
                  }`}
                >
                  Read full post →
                </Link>
              )}
            </div>

            {/* Signed-out promo block (lifted verbatim from QuoteSharePage) */}
            {!signedIn && (
              <div className={`mt-10 rounded-2xl p-6 ${
                isLight ? 'bg-gray-50 border border-gray-200' : 'bg-white/5 border border-white/10'
              }`}>
                <h3 className={`text-lg font-semibold mb-3 ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  Save the best of what you read
                </h3>
                <p className={`text-sm leading-relaxed mb-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  Reddzit helps you capture and organize quotes from articles, Reddit threads, and the web.
                </p>
                <div className="flex flex-col gap-3 mb-5">
                  {[
                    { icon: faHighlighter, text: 'Highlight any text on the web to save it as a quote' },
                    { icon: faBookOpen, text: 'Organize quotes into stories and reports' },
                    { icon: faShareAlt, text: 'Share your favorite quotes with a beautiful link' },
                    { icon: faPuzzlePiece, text: 'Chrome extension for one-click saving from any page' },
                  ].map(({ icon, text }, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <FontAwesomeIcon icon={icon} className={`text-sm mt-0.5 ${
                        isLight ? 'text-orange-500' : 'text-[var(--theme-primary)]'
                      }`} />
                      <span className={`text-sm ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>{text}</span>
                    </div>
                  ))}
                </div>
                <Link
                  to="/"
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold no-underline transition-colors ${
                    isLight ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
                  }`}
                >
                  Get started with Reddzit
                </Link>
              </div>
            )}
          </div>
```

- [ ] **Step 2.5: Note on the `CommentQuote` permalink prop**

`CommentQuote` wraps the figure in an outer `<a>` to `https://www.reddit.com${permalink}`. For the share page, we pass through the Reddit permalink unchanged — that outer link goes to reddit.com (intentional; it gives readers the canonical thread). The "Read full post →" button is the Reddzit-internal destination.

- [ ] **Step 3: Build and smoke-test the loading + error states still work**

Run: `npx tsc -b && npm run build`
Expected: clean build.

Run: `npm run dev`, open `http://localhost:5173/c/t1_invalid`.
Expected: still renders "Comment not found" (read-api still missing).

- [ ] **Step 4: Commit**

```bash
git add src/components/CommentSharePage.tsx
git commit -m "Render focused comment view on CommentSharePage"
```

---

### Task 5: Add the Share button to `CommentQuote`

This is the main user-facing entry point. The attribution line currently reads `— u/<author> · ▲ <score>`. We add `· [⧉ Share]` after it. The button must stop event propagation, because in the no-inline-links branch the entire figure is wrapped in an outer `<a>`.

**Files:**
- Modify: `src/components/CommentQuote.tsx`

- [ ] **Step 1: Add the icon imports and a small inline share-button component at the top of the file**

In `src/components/CommentQuote.tsx`, immediately after the existing imports at the top, add:

```tsx
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareNodes } from '@fortawesome/free-solid-svg-icons';
```

Then, immediately above `export default function CommentQuote`, define the helper:

```tsx
function buildCommentFullname(id: string): string {
  return id.startsWith('t1_') ? id : `t1_${id}`;
}

function ShareCommentButton({ commentId }: { commentId: string }) {
  const [copied, setCopied] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const fullname = buildCommentFullname(commentId);
    const url = `${window.location.origin}/c/${fullname}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 -my-0.5 rounded text-[var(--theme-textMuted)] hover:text-[var(--theme-primary)] transition-colors border-none bg-transparent cursor-pointer text-xs"
      title={copied ? 'Link copied!' : 'Share this comment'}
    >
      <FontAwesomeIcon icon={faShareNodes} className="text-xs" />
      <span>{copied ? 'Copied!' : 'Share'}</span>
    </button>
  );
}
```

- [ ] **Step 2: Wire the button into both `<figcaption>` branches**

`CommentQuote` returns one of two `<figcaption>` shapes (with-links vs. without). Update both.

Find the first `<figcaption>` (inside the `if (hasLinks && href)` branch). Replace it with:

```tsx
        <figcaption className="mt-3 text-xs text-[var(--theme-textMuted)] not-italic flex items-center gap-1.5 flex-wrap">
          <span>
            —{' '}
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-[var(--theme-primary)] transition-colors"
            >
              u/{comment.author}
            </a>{' '}
            · ▲ {comment.score.toLocaleString()}
          </span>
          <span className="opacity-40">·</span>
          <ShareCommentButton commentId={comment.id} />
        </figcaption>
```

Find the second `<figcaption>` (the one rendered inside the `figure` constant). Replace it with:

```tsx
      <figcaption className="mt-3 text-xs text-[var(--theme-textMuted)] not-italic flex items-center gap-1.5 flex-wrap">
        <span>— u/{comment.author} · ▲ {comment.score.toLocaleString()}</span>
        <span className="opacity-40">·</span>
        <ShareCommentButton commentId={comment.id} />
      </figcaption>
```

- [ ] **Step 3: Verify build**

Run: `npx tsc -b && npm run build`
Expected: clean build.

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev`. Open `http://localhost:5173/news` (or any view that surfaces top comments). On a comment:

- Click the `Share` text/icon. Label changes to `Copied!` for ~2 seconds. The URL on the clipboard is `http://localhost:5173/c/t1_<id>`.
- The outer wrapping link to reddit.com does NOT open in a new tab (propagation guard works).
- Pasting the copied URL into the address bar loads the `CommentSharePage`. (It will hit the error state until the read-api endpoint exists — that is expected.)

- [ ] **Step 5: Commit**

```bash
git add src/components/CommentQuote.tsx
git commit -m "Add Share button to CommentQuote attribution line"
```

---

### Task 6: Document the read-api / nginx side-of-the-house in README

The implementation is half-implementable in this repo; the SSR + endpoint live in the read-api service. Add a short paragraph so the next maintainer doesn't have to spelunk through git history.

**Files:**
- Modify: `README.md` (the "Dynamic Share Previews" section, around lines 95-117)

- [ ] **Step 1: Add a `/c/:fullname` note**

In `README.md`, find the line:

```
Canonical share URL:
- Use `/p/:fullname` (e.g., `https://reddzit.com/p/t3_abcdef`).
```

Replace it with:

```
Canonical share URLs:
- Post: `/p/:fullname` (e.g., `https://reddzit.com/p/t3_abcdef`).
- Comment: `/c/:fullname` (e.g., `https://reddzit.com/c/t1_abcdef`). Mirrors `/p/`: nginx proxies `/c/` to read-api, which serves a focused-comment SSR page with OG/Twitter tags. The read-api endpoint `GET /api/reddit/public/comment/:fullname` returns `{ comment, post }` for the client to render.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "Document /c/:fullname share URL in README"
```

---

### Task 7: Full-feature manual verification

Once the read-api endpoint + SSR + nginx work has shipped, walk through the spec's verification matrix end-to-end. Until then, items (3), (4), (5), (6) will surface the error state — that is expected.

- [ ] **Step 1: Verify share button on every surface**

`npm run dev`, then visit each of:
- `/news` (NewsCarousel)
- `/top` (TopFeed)
- A post page like `/p/<some-fullname>` (PostView top comments)
- The magazine grid view

On a comment in each surface, click `Share`. Confirm:
- Clipboard receives `${origin}/c/t1_<id>`.
- "Copied!" feedback appears.
- The outer wrapping link (when present) does not navigate.

- [ ] **Step 2: Verify share-landing page (post-read-api)**

After the read-api endpoint is live, open a `/c/t1_<id>` URL fetched from a real comment. Confirm:
- Focused page renders with `From: <title> in r/<sub>` linking to `/p/<post-fullname>`.
- `Read full post →` navigates to the same `/p/` page.
- `Share` button on the focused page copies the current `/c/` URL.

- [ ] **Step 3: Verify error paths**

- Visit `/c/t1_definitelydoesnotexist123` → "Comment not found".
- Visit `/c/garbage` → "Comment not found".
- Visit a `/c/` URL where the parent post was deleted → focused comment renders, `Read full post →` hidden, `From: deleted post` shown. (Requires a real deleted-parent case or a server-side test fixture.)

- [ ] **Step 4: Verify social previews (post-read-api + post-nginx)**

Paste a `/c/t1_<id>` URL into:
- Slack — preview shows `u/<author> on r/<sub>`, comment excerpt, post image (when available).
- Discord — same.

- [ ] **Step 5: Auth state**

- Open `/c/t1_<id>` signed out → promo block visible.
- Open same URL signed in → promo block hidden.

No commit on this task — it is verification only.

---

## Out of scope (handed off to read-api repo)

These items are required for the feature to work end-to-end but are not implementable in this repo:

1. `GET /api/reddit/public/comment/:fullname` — returns `{ comment: { id, body, author, score, permalink, createdAt }, post: { fullname, title, subreddit, permalink, previewImage } | null }`.
2. SSR handler for `GET /c/:fullname` — mirrors the existing `/p/:fullname` handler; injects `og:title` (`u/<author> on r/<sub>`), `og:description` (~200 char plain-text excerpt of the body with markdown stripped), `og:image` (parent post preview image or default Reddzit OG card), `og:url`, plus matching `twitter:*` tags.
3. nginx rule — extend the existing `location /p/` proxy block to also match `location /c/`.

Until those ship, the frontend renders human-visitors-only — bot previews will be the default app shell.
