# Per-route SEO Metadata (Helmet) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every public route a unique `<title>`, `<meta description>`, and canonical URL (plus OG/Twitter overrides) via client-side Helmet, so Google stops treating the marketing/content pages as duplicates of the homepage.

**Architecture:** Add `react-helmet-async`, wrap the app in `<HelmetProvider>`, and introduce a single reusable `<Seo>` component. Each public page renders `<Seo>` with its own copy. `/news` and `/top` (which both render `<AppShell/>`) get `<Seo>` composed at the route in `App.tsx`. No prerendering, no nginx/read-api changes. The static tags in `index.html` remain as the no-JS fallback.

**Tech Stack:** React 18, Vite 5, TypeScript, react-router-dom v6, `react-helmet-async`. Package manager: **yarn** (CI uses `yarn install --frozen-lockfile` + `yarn build`).

**Note on verification:** This project has no unit-test infra by design (verify in browser). Tasks are verified with `yarn lint`, `yarn build`, and manual `<head>` inspection in `yarn preview` — not vitest.

---

### Task 1: Add dependency and HelmetProvider

**Files:**
- Modify: `package.json` + `yarn.lock` (via `yarn add`)
- Modify: `src/main.tsx`

- [ ] **Step 1: Install the dependency**

Run:
```bash
yarn add react-helmet-async
```
Expected: `package.json` gains `"react-helmet-async"` under `dependencies`; `yarn.lock` updates.

Note: if `yarn.lock` shows a large unrelated diff (pre-existing lockfile drift was observed in this repo around the `vitest` entry), that drift is not part of this change — but a single `yarn add` reconciling it is acceptable. Confirm `react-helmet-async` and its transitive deps are present, then proceed.

- [ ] **Step 2: Wrap the app in HelmetProvider**

Edit `src/main.tsx` to:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
```

- [ ] **Step 3: Verify it builds and lints**

Run:
```bash
yarn lint && yarn build
```
Expected: both succeed; `dist/index.html` is produced.

- [ ] **Step 4: Commit**

```bash
git add package.json yarn.lock src/main.tsx
git commit -m "Add react-helmet-async and HelmetProvider"
```

---

### Task 2: Create the Seo component

**Files:**
- Create: `src/components/Seo.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/Seo.tsx`:
```tsx
import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://reddzit.com';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

type SeoProps = {
  /** Full document title, e.g. "About Reddzit — a clean reader" */
  title: string;
  description: string;
  /** Route pathname, e.g. "/about". Used to build the canonical and og:url. */
  path: string;
  /** Absolute URL to the share image. Defaults to the site OG image. */
  image?: string;
  /** Emit <meta name="robots" content="noindex"> when true. */
  noindex?: boolean;
};

export default function Seo({
  title,
  description,
  path,
  image = DEFAULT_IMAGE,
  noindex = false,
}: SeoProps) {
  const url = `${SITE_URL}${path}`;
  return (
    <Helmet prioritizeSeoTags>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noindex ? <meta name="robots" content="noindex" /> : null}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
    </Helmet>
  );
}
```

- [ ] **Step 2: Verify it builds and lints**

Run:
```bash
yarn lint && yarn build
```
Expected: both succeed (the component is unused so far, but must compile).

- [ ] **Step 3: Commit**

```bash
git add src/components/Seo.tsx
git commit -m "Add reusable Seo component for per-route meta"
```

---

### Task 3: Apply Seo to the single-route page components

These five components each map 1:1 to a route. Add the `Seo` import and render `<Seo>` as the **first element of the component's marketing/content return** — for `HomePage` and `LandingPage` this means the branch *after* the logged-in `<Navigate>` redirect, so crawlers (always logged-out) see it.

**Files:**
- Modify: `src/components/HomePage.tsx` (return at line ~52, fragment `<>` at line ~53, before `<AppShell />`)
- Modify: `src/components/LandingPage.tsx` (main return at line ~180, before `<MainHeader />`; the `<Navigate>` guard is at line ~170)
- Modify: `src/components/About.tsx` (top of returned `<div>`)
- Modify: `src/components/PromoPage.tsx` (top of the component's main returned element)
- Modify: `src/components/PrivacyPolicy.tsx` (top of returned `<div>`, line ~8)

- [ ] **Step 1: HomePage**

Add import at top of `src/components/HomePage.tsx`:
```tsx
import Seo from './Seo';
```
In the final `return (` block (the `<>…</>` fragment containing `<AppShell />`), make `<Seo>` the first child:
```tsx
  return (
    <>
      <Seo
        title="Reddzit: Keep track of your saved Reddit posts and comments"
        description="Keep track of your saved Reddit posts and comments. A clean reader for browsing top stories, saving what matters, and revisiting it later — minus the doomscroll."
        path="/"
      />
      <AppShell />
```
(Leave the `if (...) return <Navigate to="/news" replace />;` guard above untouched.)

- [ ] **Step 2: LandingPage**

Add import at top of `src/components/LandingPage.tsx`:
```tsx
import Seo from './Seo';
```
In the main `return (` block (the one rendering `<MainHeader />`, after the `return <Navigate to="/news" replace />;` guard), make `<Seo>` the first child of the top-level element:
```tsx
      <Seo
        title="Welcome to Reddzit — a calmer Reddit reader"
        description="Sign in to browse top stories, save what matters, and skip the doomscroll."
        path="/welcome"
      />
      <MainHeader />
```

- [ ] **Step 3: About**

Add import at top of `src/components/About.tsx`:
```tsx
import Seo from './Seo';
```
As the first child of the component's returned top-level `<div>`:
```tsx
      <Seo
        title="About Reddzit — a clean reader for your saved Reddit"
        description="Why we built Reddzit and how it keeps your saved posts and comments organized."
        path="/about"
      />
```

- [ ] **Step 4: PromoPage**

Add import at top of `src/components/PromoPage.tsx`:
```tsx
import Seo from './Seo';
```
As the first child of the component's main returned element:
```tsx
      <Seo
        title="Reddzit — keep track of your saved Reddit posts"
        description="A clean reader for browsing top stories, saving what matters, and revisiting it later."
        path="/promo"
      />
```

- [ ] **Step 5: PrivacyPolicy**

Add import at top of `src/components/PrivacyPolicy.tsx`:
```tsx
import Seo from './Seo';
```
As the first child of the returned outer `<div>` (line ~8):
```tsx
        <div className="min-h-screen bg-[var(--color-primary)] flex items-center justify-center p-4">
            <Seo
                title="Privacy Policy — Reddzit"
                description="How Reddzit handles your data and Reddit account access."
                path="/privacy"
            />
```

- [ ] **Step 6: Verify build and lint**

Run:
```bash
yarn lint && yarn build
```
Expected: both succeed.

- [ ] **Step 7: Commit**

```bash
git add src/components/HomePage.tsx src/components/LandingPage.tsx src/components/About.tsx src/components/PromoPage.tsx src/components/PrivacyPolicy.tsx
git commit -m "Add per-route Seo to home, welcome, about, promo, privacy"
```

---

### Task 4: Apply Seo to /news and /top via route composition

`/news` and `/top` both render `<AppShell/>`, so set their distinct meta at the route element in `App.tsx`.

**Files:**
- Modify: `src/App.tsx` (import at top; routes at lines 40–41)

- [ ] **Step 1: Import Seo**

Add to the imports in `src/App.tsx`:
```tsx
import Seo from './components/Seo';
```

- [ ] **Step 2: Compose Seo into the /news and /top routes**

Replace:
```tsx
            <Route path='/news' element={<AppShell />} />
            <Route path='/top' element={<AppShell />} />
```
with:
```tsx
            <Route path='/news' element={<><Seo title='Trending Reddit news — Reddzit' description="The day's top Reddit stories in a clean, fast reader." path='/news' /><AppShell /></>} />
            <Route path='/top' element={<><Seo title='Top Reddit posts today — Reddzit' description="Browse today's top posts across Reddit without the noise." path='/top' /><AppShell /></>} />
```

- [ ] **Step 3: Verify build and lint**

Run:
```bash
yarn lint && yarn build
```
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "Add per-route Seo to /news and /top"
```

---

### Task 5: Browser verification

No code changes — confirm the feature works in a real browser (project norm: no test infra).

**Files:** none

- [ ] **Step 1: Start preview server**

Run:
```bash
yarn build && yarn preview
```
Expected: preview server starts (note the local URL it prints).

- [ ] **Step 2: Inspect each public route's `<head>`**

For each of `/`, `/welcome`, `/about`, `/promo`, `/privacy`, `/news`, `/top`: open the route in the browser, then in DevTools → Elements, expand `<head>` and confirm:
- `<title>` matches the route's copy from the plan.
- exactly **one** `<meta name="description">` with the route's text.
- exactly **one** `<link rel="canonical">` pointing to `https://reddzit.com<path>`.
- `og:title` / `og:description` / `og:url` reflect the route (not the homepage default for non-home routes).

- [ ] **Step 3: Confirm no tag accumulation across navigation**

Navigate `/about` → `/privacy` → `/news` within the SPA (using in-app links / address bar). After each navigation, confirm `<head>` still has exactly one `<title>` and one canonical (Helmet replaces rather than appends).

- [ ] **Step 4: Confirm the no-JS fallback is intact**

Run:
```bash
grep -c "google-site-verification\|og:title" dist/index.html
```
Expected: the static homepage OG/title tags are still present in the built `index.html` (the fallback for non-JS crawlers/unfurlers). There should be no errors; `og:title` count ≥ 1.

- [ ] **Step 5: Stop the preview server**

Stop the `yarn preview` process (Ctrl-C).

---

## Notes for the implementer
- Do **not** remove or edit the static SEO tags in `index.html` — they are the intentional no-JS fallback.
- Do **not** add `<Seo>` to auth/app routes (`/foryou`, `/links`, `/quotes`, `/stories`, `/admin`, `/reddit`); they are robots-disallowed and auth-gated.
- Copy text is editable — if the product owner tweaks wording, only the `title`/`description` strings change.
- Deferred (not in this plan): build-time prerendering (approach A) and JSON-LD structured data.
