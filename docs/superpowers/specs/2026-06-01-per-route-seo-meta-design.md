# Per-route SEO Metadata (Helmet) — Design

**Date:** 2026-06-01
**Goal:** Give every public route a unique `<title>`, `<meta description>`, and canonical URL so Google stops treating the marketing/content pages as variations of the homepage. Client-side only (Helmet) — no prerendering, no nginx or read-api changes.

## Context

reddzit.com is a client-rendered React SPA (Vite 5, React 18, `BrowserRouter`). Today there is **no per-route metadata**: `index.html` carries a single static `<title>`/description and OG/Twitter tags, and only `PostView`/`LinkView` set `document.title` imperatively. Every other public route (`/welcome`, `/about`, `/promo`, `/privacy`, `/news`, `/top`) inherits the homepage's title and description.

read-api already injects per-item meta for the SSR share routes (`/p /q /s`) and canonicals shared posts to Reddit — that path is unaffected by this work.

This is approach **C** from the discussion (Helmet-only). It is deliberately the first half of approach A (build-time prerender): the per-route Helmet meta added here is a prerequisite for prerendering, so nothing here is wasted if prerendering is added later.

### Known limitations accepted by this approach
- **Social/link unfurlers** (Facebook, LinkedIn, Slack, iMessage, X, Discord) fetch raw HTML and do not execute JS, so they will see the static `index.html` OG tags (the homepage card), not the per-route Helmet tags. Acceptable: this only affects marketing routes; the `/p /q /s` share routes already unfurl correctly via read-api.
- **Body content** still renders client-side; Google indexes it via its JS-rendering pass. Helmet only manages `<head>`.

## Components

### 1. Dependency
Add `react-helmet-async` (SSR-safe successor to `react-helmet`; works fine in a pure-CSR app and keeps the door open for prerendering).

### 2. Provider
Wrap the tree in `<HelmetProvider>` in `src/main.tsx`, outside `<App/>`.

### 3. `src/components/Seo.tsx` (new)
Reusable component. Props:
- `title: string` — full document title.
- `description: string`
- `path: string` — pathname used to build the canonical (`https://reddzit.com${path}`) and `og:url`.
- `image?: string` — defaults to the existing `https://reddzit.com/og-image.png`.
- `noindex?: boolean` — when true, emits `<meta name="robots" content="noindex">` (not used by the routes in this spec, but available).

Renders a single `<Helmet>` that sets: `<title>`, `meta[name=description]`, `link[rel=canonical]`, and overrides `og:title`, `og:description`, `og:url`, `og:image`, `twitter:title`, `twitter:description`, `twitter:image`. Brand constants (base URL `https://reddzit.com`, default image) live at the top of this file so callers pass only what differs.

`react-helmet-async` dedupes `<title>` and dedupes `<meta>` by `name`/`property`, so the static tags in `index.html` are overridden (not duplicated) on the client.

### 4. Apply `<Seo>` to public routes
Pages with a 1:1 component → route mapping render `<Seo/>` at the top of their JSX:
- `HomePage` → `/`
- `LandingPage` → `/welcome`
- `About` → `/about`
- `PromoPage` → `/promo`
- `PrivacyPolicy` → `/privacy`

`/news` and `/top` both render `<AppShell/>`, so compose at the route in `src/App.tsx`:
```jsx
<Route path='/news' element={<><Seo title='Trending Reddit news — Reddzit' description='…' path='/news' /><AppShell /></>} />
<Route path='/top'  element={<><Seo title='Top Reddit posts today — Reddzit' description='…' path='/top'  /><AppShell /></>} />
```

### 5. `index.html`
Leave the existing static `<title>`/description/OG/Twitter tags in place as the no-JS fallback. No change.

## Per-route copy (editable)

| Path | Title | Description |
|------|-------|-------------|
| `/` | Reddzit: Keep track of your saved Reddit posts and comments *(unchanged)* | *(unchanged homepage description)* |
| `/welcome` | Welcome to Reddzit — a calmer Reddit reader | Sign in to browse top stories, save what matters, and skip the doomscroll. |
| `/about` | About Reddzit — a clean reader for your saved Reddit | Why we built Reddzit and how it keeps your saved posts and comments organized. |
| `/promo` | Reddzit — keep track of your saved Reddit posts | A clean reader for browsing top stories, saving what matters, and revisiting it later. |
| `/privacy` | Privacy Policy — Reddzit | How Reddzit handles your data and Reddit account access. |
| `/news` | Trending Reddit news — Reddzit | The day's top Reddit stories in a clean, fast reader. |
| `/top` | Top Reddit posts today — Reddzit | Browse today's top posts across Reddit without the noise. |

The homepage already sets the right title/description in `index.html`; rendering `<Seo>` on `/` with the same values keeps behavior identical while centralizing the source of truth.

## Data flow
1. Route mounts → its page renders `<Seo>` → `react-helmet-async` updates `document.head` (title, description, canonical, OG/Twitter) on the client.
2. First-paint HTML still carries the `index.html` static tags (fallback for no-JS consumers).
3. Googlebot's JS-rendering pass observes the per-route tags.

## Error handling / edge cases
- Missing props: `Seo` requires `title`, `description`, `path`; TypeScript enforces this. `image` and `noindex` default safely.
- Switching routes: Helmet re-applies on each mount; react-helmet-async handles unmount/replacement so stale tags don't linger.

## Out of scope
- Build-time prerendering (approach A) — deferred; documented as the natural next step.
- JSON-LD structured data (Tier-1 follow-up) — cheap to add later, not included here.
- read-api and nginx changes.
- Auth/app routes (`/foryou`, `/links`, `/quotes`, `/stories`, `/admin`, `/reddit`) — already robots-disallowed and auth-gated; left untouched.

## Verification (project norm: browser, no test infra)
- `yarn build` succeeds.
- `yarn preview`, then for each public route: view-source shows the static fallback tags; DevTools → Elements → `<head>` shows the unique per-route `<title>`, `meta description`, and `link canonical`, with OG/Twitter overridden.
- Confirm navigating between routes swaps the title (no duplicate `<title>`/canonical tags accumulating in `<head>`).
