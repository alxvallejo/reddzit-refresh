# Google Search Console & Discoverability — Design

**Date:** 2026-05-30
**Goal:** Make reddzit.com discoverable in Google Search by registering it in Google Search Console (GSC), giving crawlers a `robots.txt` and a `sitemap.xml`, and verifying ownership.

## Context

reddzit.com is a client-rendered React SPA built with Vite, deployed to a DigitalOcean droplet via `.github/workflows/deploy-frontend.yml` (build in CI → ship `dist/` → nginx serves static, proxies `/p /q /s` to the read-api SSR backend). GA4 (`G-WXP5MRZDTL`) and OG/Twitter meta tags are already present in `index.html`.

**Gaps:** no `robots.txt`, no `sitemap.xml`, not registered in GSC.

Files in `public/` are copied to `dist/` root at build time and deploy automatically — no Vite or workflow config change is required.

## Decisions (approved)

- **Verification method:** HTML meta tag, URL-prefix property (`https://reddzit.com/`). Lives in `index.html`, version-controlled, re-deploys with every build.
- **Sitemap scope:** public marketing + content pages — `/`, `/welcome`, `/about`, `/privacy`, `/promo`, `/news`, `/top`.
- **robots.txt policy:** allow general crawling, **allow** the SSR share routes (`/p`, `/q`, `/s`, `/c`) since they have real server-rendered meta, **disallow** auth-only app routes, and point to the sitemap.

## Components / Changes

### 1. `public/robots.txt` (new)
```
User-agent: *
Allow: /
Disallow: /foryou
Disallow: /links
Disallow: /quotes
Disallow: /stories
Disallow: /admin
Disallow: /reddit

Sitemap: https://reddzit.com/sitemap.xml
```
Note: `Disallow` is a crawl directive, not a security control — these routes are already auth-gated client-side. The intent is to keep low-value/empty-for-crawler routes out of the index.

### 2. `public/sitemap.xml` (new)
Static XML listing the 7 public URLs above, each with `<loc>` and a `<lastmod>` of `2026-05-30`. `changefreq`/`priority` omitted (Google ignores them). Example entry:
```xml
<url><loc>https://reddzit.com/</loc><lastmod>2026-05-30</lastmod></url>
```

### 3. `index.html` (edit)
Add inside `<head>`, near the other meta tags:
```html
<meta name="google-site-verification" content="REPLACE_WITH_TOKEN_FROM_GSC" />
```
The user provides the token from the GSC "HTML tag" verification screen; the placeholder is replaced before the verifying deploy.

## Data flow

1. Push to `main` → CI builds → `dist/robots.txt`, `dist/sitemap.xml`, and the verification meta tag in `dist/index.html` ship to the droplet.
2. nginx serves `/robots.txt` and `/sitemap.xml` as static files at the domain root.
3. In GSC: add URL-prefix property `https://reddzit.com/` → choose "HTML tag" → Google reads the meta tag → verified.
4. In GSC: submit `https://reddzit.com/sitemap.xml` under Sitemaps.

## Manual steps the user performs (cannot be automated)

1. Go to https://search.google.com/search-console → Add property → URL prefix → `https://reddzit.com/`.
2. Pick the **HTML tag** method; copy the `content="..."` token.
3. Paste the token to me (or into `index.html`) → we deploy.
4. Click **Verify** in GSC (after the deploy is live).
5. Sitemaps → submit `sitemap.xml`.
6. (Optional) Use **URL Inspection → Request indexing** on `/` to prime the crawl.

## Out of scope / not doing

- DNS/Domain property verification (single host; not worth the friction).
- Dynamic/generated sitemap for `/p /q /s` share routes (infinite, user-generated; left to organic crawl, allowed in robots.txt).
- Structured data (JSON-LD), prerendering/SSR for marketing pages — possible future SEO work, not part of this task.

## Verification (per project norm: browser/curl, no test infra)

- Local: `yarn build` then confirm `dist/robots.txt`, `dist/sitemap.xml`, and the meta tag in `dist/index.html` exist.
- Prod after deploy: `curl https://reddzit.com/robots.txt` and `curl https://reddzit.com/sitemap.xml` return the expected content; view-source on the homepage shows the verification tag.
- GSC reports the property as verified and the sitemap as "Success".
