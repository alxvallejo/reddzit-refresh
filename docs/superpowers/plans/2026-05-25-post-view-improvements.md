# Post View Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `PostView` feel native to the rest of the app — themed header for all users, sticky right-side comments column at md+, and a dismissible Reddit sign-in promo at the bottom with the action pill lifted clear of it.

**Architecture:** All edits land in or around `src/components/PostView.tsx`. Two supporting changes: a one-line event dispatch in `StickyPromoFooter.tsx`, and a new shared hook `src/helpers/usePromoDismissed.ts` that surfaces the dismissal flag (with cross-tab + same-tab observability) so PostView can lift its action pill in sync.

**Tech Stack:** React 18 + Vite + Tailwind. No test runner is configured in this repo — verification is by running the dev server and exercising the surface in a real browser. Playwright (installed in `/tmp`) is used for one DOM probe where state-driven CSS would otherwise be easy to miss visually.

**Reference spec:** `docs/superpowers/specs/2026-05-25-post-view-improvements-design.md`

---

## Pre-flight: dev server and verification setup

The dev server may already be running from a prior session. If not, start it. The plan assumes Vite's default `http://localhost:5173` but will use whatever port Vite picks — capture the URL from its output.

- [ ] **Start (or confirm) the dev server**

```bash
# Check if already running and what port it picked
ls /private/tmp/claude-501/*/tasks/*.output 2>/dev/null | xargs grep -l "Local:" 2>/dev/null | tail -1
# If nothing or stale, start fresh:
npm run dev
# Wait for the "ready in ..." line and note the URL (e.g. http://localhost:5175/)
```

- [ ] **Pick a sample post URL for manual verification**

Navigate to `http://localhost:<port>/` in any browser. The homepage renders the news carousel. Right-click a slide and copy the link, OR let the homepage choose: the URL pattern is `/p/t3_<id>/<slug>`. Save one such URL — you'll reload it after every task to eyeball changes.

- [ ] **Install playwright-core for the one automated probe (Task 5)**

```bash
mkdir -p /tmp/verify-postview && cd /tmp/verify-postview && npm init -y >/dev/null && npm install playwright-core --no-save
```

Expected output: `added 1 package`.

---

## Task 1: Add `usePromoDismissed` hook

**Files:**
- Create: `src/helpers/usePromoDismissed.ts`

This is standalone — no consumer yet. Following the existing convention (`src/helpers/useCoarsePointer.ts`).

- [ ] **Step 1: Create the hook**

Write `src/helpers/usePromoDismissed.ts`:

```ts
import { useEffect, useState } from 'react';

const PROMO_DISMISS_KEY = 'rdz_homepage_promo_dismissed_v1';
const PROMO_DISMISSED_EVENT = 'rdz-promo-dismissed';

const readDismissed = (): boolean => {
  try {
    return localStorage.getItem(PROMO_DISMISS_KEY) === 'true';
  } catch {
    return false;
  }
};

export function usePromoDismissed(): boolean {
  const [dismissed, setDismissed] = useState<boolean>(readDismissed);

  useEffect(() => {
    const onChange = () => setDismissed(readDismissed());
    window.addEventListener(PROMO_DISMISSED_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(PROMO_DISMISSED_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  return dismissed;
}
```

- [ ] **Step 2: Verify the file typechecks**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: no errors related to the new file. (Pre-existing errors elsewhere, if any, are not in scope.)

- [ ] **Step 3: Commit**

```bash
git add src/helpers/usePromoDismissed.ts
git commit -m "$(cat <<'EOF'
Add usePromoDismissed hook for cross-component promo visibility.

Reads the StickyPromoFooter dismissal flag from localStorage and
re-renders consumers on same-tab dismiss (custom event) and cross-tab
changes (storage event), so other components can react to dismissal
without lifting state out of StickyPromoFooter.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Dispatch dismissal event from `StickyPromoFooter`

**Files:**
- Modify: `src/components/StickyPromoFooter.tsx` (single line addition in `handleDismiss`)

- [ ] **Step 1: Add the dispatch**

In `src/components/StickyPromoFooter.tsx`, find `handleDismiss`:

```ts
  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, 'true');
  };
```

Change it to:

```ts
  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, 'true');
    window.dispatchEvent(new CustomEvent('rdz-promo-dismissed'));
  };
```

- [ ] **Step 2: Verify the home page still dismisses cleanly**

Open `http://localhost:<port>/` (signed-out). Click the × button on the orange "Keep track of your saved Reddit posts" promo. The promo should disappear with no console errors. Reload → still gone (localStorage persists).

Then clear the flag for the next manual test:

```bash
# Run this in the browser DevTools console:
# localStorage.removeItem('rdz_homepage_promo_dismissed_v1'); location.reload();
```

- [ ] **Step 3: Commit**

```bash
git add src/components/StickyPromoFooter.tsx
git commit -m "$(cat <<'EOF'
Dispatch rdz-promo-dismissed event from StickyPromoFooter handleDismiss.

Lets other components (PostView) react to a same-tab dismissal without
polling, by pairing it with the usePromoDismissed hook.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Replace custom logged-out header with `MainHeader` for all users

**Files:**
- Modify: `src/components/PostView.tsx`

Three coordinated changes in one task: drop the custom `<header>` block, remove the now-dead `headerBg` / `isScrolled` / scroll effect, and ungate the inline `ReadControls`.

- [ ] **Step 1: Remove `isScrolled` state**

In `src/components/PostView.tsx`, find this line (roughly line 37):

```tsx
  const [isScrolled, setIsScrolled] = useState(false);
```

Delete it.

- [ ] **Step 2: Remove the scroll effect**

Find this block (roughly lines 70–78):

```tsx
  // Handle scroll for sticky header
  useEffect(() => {
      const handleScroll = () => {
          const scrollTop = window.scrollY || document.documentElement.scrollTop;
          setIsScrolled(scrollTop > 50);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
  }, []);
```

Delete the entire block including the comment.

- [ ] **Step 3: Remove the `headerBg` constant**

Find this line (roughly line 170):

```tsx
  const headerBg = isLight ? 'bg-[#b6aaf1]/95' : 'bg-[var(--theme-bg)]/95';
```

Delete it.

- [ ] **Step 4: Replace the conditional header block with `<MainHeader />`**

Find this block (roughly lines 287–319):

```tsx
        {/* Header */}
        {signedIn ? (
          <MainHeader />
        ) : (
          <header className={`sticky top-9 z-40 transition-all duration-300 backdrop-blur-md shadow-sm px-4 py-3 flex items-center justify-between ${headerBg}`}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                  <Link to="/" className="flex-shrink-0">
                      <img src="/favicon.png" alt="Reddzit" className="w-8 h-8 drop-shadow-sm" />
                  </Link>

                  <div className={`transition-opacity duration-300 ${isScrolled ? 'opacity-100' : 'opacity-0 hidden sm:block'}`}>
                       <h2 className="text-sm font-medium truncate max-w-[200px] sm:max-w-md text-white">
                          {getDisplayTitle(post)}
                       </h2>
                  </div>

                  {!isScrolled && (
                       <div className="text-white">
                          <Link to="/" className="text-white font-serif font-bold text-xl no-underline hover:opacity-80">Reddzit</Link>
                       </div>
                  )}
              </div>

              <div className="flex-shrink-0">
                  <ReadControls
                      fontSize={fontSize}
                      setSize={setFontSize}
                      contentFont={contentFont}
                      setContentFont={setContentFont}
                  />
              </div>
          </header>
        )}
```

Replace with just:

```tsx
        {/* Header */}
        <MainHeader />
```

- [ ] **Step 5: Ungate the inline `ReadControls`**

Find this block (roughly lines 354–364, just above the `<article>` tag):

```tsx
             {/* Read Controls (signed-in users get these inline; signed-out get them in the header) */}
             {signedIn && (
               <div className="flex justify-end mb-4">
                 <ReadControls
                   fontSize={fontSize}
                   setSize={setFontSize}
                   contentFont={contentFont}
                   setContentFont={setContentFont}
                 />
               </div>
             )}
```

Replace with (drop the `{signedIn && ...}` wrapper and update the comment):

```tsx
             {/* Read Controls */}
             <div className="flex justify-end mb-4">
               <ReadControls
                 fontSize={fontSize}
                 setSize={setFontSize}
                 contentFont={contentFont}
                 setContentFont={setContentFont}
               />
             </div>
```

- [ ] **Step 6: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: no new errors in `PostView.tsx`. (If you see unused-import warnings for things like `getDisplayTitle` — it's still used in the document title effect; leave it.)

- [ ] **Step 7: Verify in a signed-out browser**

Open `http://localhost:<port>/p/t3_<id>/<slug>` (your sample URL) in an incognito window.

Visual checks:
- The header is the standard themed `MainHeader` — same purple/dark background as the home page, NOT the lavender `#b6aaf1` it used to be.
- The theme switcher (the three "A A A" font-size icons in a pill on the right) is visible.
- A "Log in" button appears on the right side of the header.
- The `ReadControls` (font size A−/A+ and font family toggle) appear above the article body, not in the header.

If anything looks wrong, fix before committing.

- [ ] **Step 8: Verify in a signed-in browser**

If you can log in (or you already are in another tab on `localhost:<port>`), reload the same post URL. The header should look identical to step 7 except the right side now shows your username and dropdown rather than "Log in". `ReadControls` is in the same inline position.

- [ ] **Step 9: Commit**

```bash
git add src/components/PostView.tsx
git commit -m "$(cat <<'EOF'
Use MainHeader on PostView for all users.

Drops the custom logged-out header with its hardcoded #b6aaf1
background so the post view picks up theme colors and the
ThemeSwitcher like the rest of the app. ReadControls move to a
single inline position above the article and render for everyone.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Two-column layout with sticky right-side comments at md+

**Files:**
- Modify: `src/components/PostView.tsx` (the `<main>` block and the top-comments section)

- [ ] **Step 1: Widen the main container and wrap article content in a flex row**

In `PostView.tsx`, find the opening of `<main>` (roughly line 324) through to the closing `</main>`. Currently it looks like:

```tsx
        <main className="max-w-3xl mx-auto px-4 py-8 pb-32">
             <div className="mb-8">
                 <Link
                     to="/news"
                     className="..."
                 >
                     <FontAwesomeIcon icon={faArrowLeft} />
                     <span>News</span>
                 </Link>
                 <div className="text-[var(--theme-primary)] font-bold text-sm uppercase tracking-wide mb-2">
                     {post.subreddit}
                 </div>
                 <h1 ...>...</h1>

                 {getArticlePreviewImage(post) && !getVideoUrl(post) && (
                     <div className="rounded-xl overflow-hidden my-6 shadow-md">
                        ...
                     </div>
                 )}
             </div>

             {/* Read Controls */}
             <div className="flex justify-end mb-4">
               <ReadControls .../>
             </div>

             {/* Article Content */}
             <article ...>
                 {getParsedContent(...)}
             </article>

             {/* Top Comments */}
             {(() => {
               const displayable = topComments.filter(isDisplayableComment);
               if (displayable.length === 0) return null;
               return (
                 <section className="mt-12 pt-8 border-t border-[var(--theme-border)]">
                   <h2 className="text-xs uppercase tracking-wider text-[var(--theme-textMuted)] opacity-70 mb-6">
                     Top comments
                   </h2>
                   <ul className="flex flex-col gap-10 list-none p-0 m-0">
                     {displayable.map(c => (
                       <li key={c.id}>
                         <CommentQuote comment={c} />
                       </li>
                     ))}
                   </ul>
                 </section>
               );
             })()}
        </main>
```

Restructure to:

```tsx
        <main className="max-w-screen-xl mx-auto px-4 py-8 pb-32">
          <div className="md:flex md:gap-8 md:items-start">
            <div className="md:flex-1 md:min-w-0 md:max-w-3xl">
             <div className="mb-8">
                 <Link
                     to="/news"
                     className="inline-flex items-center gap-1.5 text-sm opacity-70 hover:opacity-100 transition-opacity mb-4 no-underline text-inherit"
                 >
                     <FontAwesomeIcon icon={faArrowLeft} />
                     <span>News</span>
                 </Link>
                 <div className="text-[var(--theme-primary)] font-bold text-sm uppercase tracking-wide mb-2">
                     {post.subreddit}
                 </div>
                 <h1 className={`text-3xl sm:text-4xl font-sans leading-tight mb-4 ${!isLight ? 'font-extralight' : 'font-normal'}`}>
                     <a href={`https://www.reddit.com${post.permalink}`} target="_blank" rel="noreferrer" className="hover:text-[var(--theme-primary)] transition-colors text-inherit no-underline">
                        {getDisplayTitle(post)}
                     </a>
                 </h1>

                 {getArticlePreviewImage(post) && !getVideoUrl(post) && (
                     <div className="rounded-xl overflow-hidden my-6 shadow-md">
                         <img
                            src={getArticlePreviewImage(post)}
                            alt=""
                            className="w-full h-auto object-cover"
                         />
                     </div>
                 )}
             </div>

             {/* Read Controls */}
             <div className="flex justify-end mb-4">
               <ReadControls
                 fontSize={fontSize}
                 setSize={setFontSize}
                 contentFont={contentFont}
                 setContentFont={setContentFont}
               />
             </div>

             {/* Article Content */}
             <article className={`prose prose-lg max-w-none break-words ${articleClass}`} style={{ fontSize: `${fontSize}px` }} data-content-font={contentFont}>
                 {getParsedContent(content, false, post, fontSize, !!getArticlePreviewImage(post))}
             </article>
            </div>

            {/* Top Comments — sticky right column at md+, stacked below on mobile */}
            {(() => {
              const displayable = topComments.filter(isDisplayableComment);
              if (displayable.length === 0) return null;
              return (
                <aside className="mt-12 md:mt-0 md:w-80 md:flex-shrink-0 md:sticky md:top-24 md:max-h-[calc(100vh-7rem)] md:overflow-y-auto border-t md:border-t-0 border-[var(--theme-border)] pt-8 md:pt-0">
                  <h2 className="text-xs uppercase tracking-wider text-[var(--theme-textMuted)] opacity-70 mb-6">
                    Top comments
                  </h2>
                  <ul className="flex flex-col gap-10 list-none p-0 m-0">
                    {displayable.map(c => (
                      <li key={c.id}>
                        <CommentQuote comment={c} />
                      </li>
                    ))}
                  </ul>
                </aside>
              );
            })()}
          </div>
        </main>
```

Key things that change:
- `<main>` className: `max-w-3xl` → `max-w-screen-xl`.
- New wrapper `<div className="md:flex md:gap-8 md:items-start">` around both the article column and the comments aside.
- Article content moves into `<div className="md:flex-1 md:min-w-0 md:max-w-3xl">`.
- Comments `<section>` becomes `<aside>` with the sticky/scroll classes.

Don't change anything inside the article column other than indentation; the back-link, subreddit tag, title, image, ReadControls, and article body are all the same content, just nested one level deeper.

- [ ] **Step 2: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Verify at desktop width (≥1024px)**

Reload your sample post URL in a window ≥1024px wide. Pick a post that has top comments (most homepage carousel posts do).

Visual checks:
- The article column stays roughly the same width as before (≤768px content width). It is no longer horizontally centered in the viewport — it sits left-of-center.
- A "TOP COMMENTS" heading and a stacked list of `CommentQuote` cards appear to the right of the article.
- Scroll the article down. The comments column stays visible (sticky). It doesn't scroll off the top.
- If there are many comments, scroll inside the comments column with the mouse wheel — the column scrolls independently, not the page.

- [ ] **Step 4: Verify at tablet width (md, ~768–1023px)**

Resize the browser to ~900px. Same two-column layout. Article narrows slightly; sidebar still on the right.

- [ ] **Step 5: Verify at mobile width (<768px)**

Resize to ~400px. The aside should drop below the article with a top border separator (`border-t pt-8`). No sticky positioning. This matches the pre-change layout for mobile.

- [ ] **Step 6: Verify with a post that has no top comments**

In another tab, open a different post URL. If you can find one without `topComments` (or wait for `getTopCommentsForPost` to come back empty), the aside doesn't render and the article column sits naturally — still capped at `max-w-3xl` so it doesn't stretch awkwardly across the wider container.

If you can't easily find a no-comments post, temporarily edit the file to force `displayable = []` and verify, then revert. (Not a required step — the conditional is straightforward.)

- [ ] **Step 7: Commit**

```bash
git add src/components/PostView.tsx
git commit -m "$(cat <<'EOF'
Move top comments to a sticky right column on desktop.

At md+ (≥768px) the article and top comments render side by side
with the comments sticky to top-24, scrolling independently when long.
Below md, comments stack inline below the article as before.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Render `StickyPromoFooter` and lift the action pill

**Files:**
- Modify: `src/components/PostView.tsx` (imports, hook call, action pill wrapper className, add `<StickyPromoFooter />`)

- [ ] **Step 1: Add the imports**

At the top of `src/components/PostView.tsx`, add (after the other component imports):

```tsx
import StickyPromoFooter from './StickyPromoFooter';
import { usePromoDismissed } from '../helpers/usePromoDismissed';
```

- [ ] **Step 2: Call the hook and derive `promoVisible`**

Inside `export default function PostView() { ... }`, near the other top-level state and hooks (e.g., immediately after the `useReddit()` destructure block, roughly line 31), add:

```tsx
  const promoDismissed = usePromoDismissed();
  const promoVisible = !signedIn && !promoDismissed;
```

- [ ] **Step 3: Lift the action pill when the promo is visible**

Find the outer wrapper of the fixed action pill (roughly line 393):

```tsx
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pointer-events-none flex justify-center">
```

Change to:

```tsx
        <div className={`fixed bottom-0 left-0 right-0 px-4 pb-6 pointer-events-none flex justify-center transition-[margin] duration-200 ${promoVisible ? 'mb-20' : ''}`}>
```

(The `transition-[margin] duration-200` makes the drop look smooth when the user dismisses the promo.)

- [ ] **Step 4: Render `<StickyPromoFooter />`**

Find the closing `</div>` of the top-level wrapper (the very last line before the closing `);` of the return — roughly line 640 where the toast block ends). Just before that closing `</div>`, add:

```tsx
        <StickyPromoFooter />
```

So the tail of the return looks roughly like:

```tsx
        {/* Toast */}
        {toast && (
          <div ...>
            {toast}
          </div>
        )}

        <StickyPromoFooter />
    </div>
  );
}
```

`StickyPromoFooter` self-hides when `signedIn` is true or the user has dismissed it, so no extra gating is needed.

- [ ] **Step 5: Typecheck**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: no new errors.

- [ ] **Step 6: Manual verification — signed-out**

In an incognito window, clear any prior dismiss flag and reload the post URL:

```js
// In DevTools console:
localStorage.removeItem('rdz_homepage_promo_dismissed_v1');
location.reload();
```

Visual checks:
- The orange/themed promo bar appears at the very bottom: "Keep track of your saved Reddit posts." with a "Connect with Reddit" button.
- The Back/Login/Share/View on Reddit action pill sits **above** the promo, not behind it.
- Click the × on the promo. The promo disappears and the action pill smoothly drops to the bottom of the viewport.
- Reload the page (don't clear localStorage). The promo stays dismissed and the pill is at the bottom.

- [ ] **Step 7: Manual verification — signed-in**

Reload the post URL while signed in. The promo should not render at all (StickyPromoFooter returns null when `signedIn`). The action pill sits at its default bottom position.

- [ ] **Step 8: Automated probe — pill margin toggles with dismissal**

This is the one CSS-state-driven behavior that's easy to miss visually. Write `/tmp/verify-postview/test.mjs`:

```js
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'chrome', headless: false });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
await page.goto('http://localhost:<port>/'); // replace <port>

// Capture sample post URL from the carousel
await page.waitForSelector('main article[role="button"]', { timeout: 10_000 });
// Click the first slide center to navigate to its post view (uses the fix from earlier)
const slide = page.locator('main article[role="button"]').first();
const box = await slide.boundingBox();
await page.mouse.click(box.x + box.width * 0.35, box.y + box.height * 0.4);
await page.waitForURL(/\/p\/t3_/, { timeout: 5_000 });
await page.waitForTimeout(800);

// Ensure promo is undismissed
await page.evaluate(() => localStorage.removeItem('rdz_homepage_promo_dismissed_v1'));
await page.reload();
await page.waitForTimeout(800);

// Find the action pill wrapper — the fixed bottom-0 div containing buttons
const pillWrapper = page.locator('div.fixed.bottom-0.pointer-events-none').first();
const beforeMargin = await pillWrapper.evaluate(el => getComputedStyle(el).marginBottom);
console.log('PROMO_VISIBLE_pill_margin_bottom:', beforeMargin);

// Click the promo dismiss button
await page.locator('button[aria-label="Dismiss"]').click();
await page.waitForTimeout(400); // let the transition settle

const afterMargin = await pillWrapper.evaluate(el => getComputedStyle(el).marginBottom);
console.log('PROMO_DISMISSED_pill_margin_bottom:', afterMargin);

const promoHidden = await page.locator('text=Connect with Reddit').count();
console.log('PROMO_HIDDEN:', promoHidden === 0);

await browser.close();
```

Run it:

```bash
cd /tmp/verify-postview && node test.mjs
```

Expected output:
- `PROMO_VISIBLE_pill_margin_bottom: 80px` (from `mb-20` = 5rem = 80px)
- `PROMO_DISMISSED_pill_margin_bottom: 0px`
- `PROMO_HIDDEN: true`

If `PROMO_DISMISSED_pill_margin_bottom` is still 80px, the `usePromoDismissed` hook isn't re-rendering — verify Task 2's event dispatch is in place, and re-check the hook's `useEffect` listener registration.

- [ ] **Step 9: Commit**

```bash
git add src/components/PostView.tsx
git commit -m "$(cat <<'EOF'
Render StickyPromoFooter on PostView and lift the action pill.

Logged-out readers now see the same dismissible Reddit sign-in promo
as the home page. The fixed action pill picks up an extra 5rem of
bottom margin while the promo is visible and drops back smoothly when
dismissed, driven by the usePromoDismissed hook.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Final smoke test

A single pass through the full verification matrix from the spec, after all tasks are committed.

- [ ] **Logged-out, viewport ≥1024px**

Incognito window. Clear `localStorage.rdz_homepage_promo_dismissed_v1`. Reload the post URL.
- Header: themed (no lavender), `ThemeSwitcher` visible, "Log in" button visible.
- Article column on the left at `max-w-3xl`, top comments sticky right column.
- Promo at bottom; action pill above promo.
- Switch theme via `ThemeSwitcher` → header background updates live.

- [ ] **Logged-out, viewport <768px**

Resize to ~400px.
- Header: themed.
- Comments stack below article with top border.
- Promo at bottom; action pill above promo.

- [ ] **Logged-in, viewport ≥1024px**

Same window, signed in. (If you don't have an account ready, sign in from a tab — the auth flow opens in a separate window.)
- No promo at bottom.
- Action pill at default bottom (no `mb-20`).
- Signed-in pill buttons present: Save, Add to Story, etc.

- [ ] **Cleanup**

```bash
rm -rf /tmp/verify-postview
```

The dev server can keep running for further work.

---

## Self-review notes

- **Spec coverage:** Header (Task 3), two-column layout (Task 4), promo + pill lift (Tasks 1, 2, 5). All three design sections covered.
- **Type consistency:** `usePromoDismissed` returns `boolean`. PostView derives `promoVisible: boolean`. Both consistent.
- **Placeholder scan:** No TBD/TODO; every code edit shows the full snippet to land. The two `<port>` substitutions in verification steps are expected — the engineer reads the port from `npm run dev` output.
- **DRY/YAGNI:** Single render of the comments section, single inline location for ReadControls, hook reused across components without lifting state out of the promo.
