# JSON-LD Structured Data — Design

**Date:** 2026-06-01
**Goal:** Add `schema.org` structured data (JSON-LD) so search engines and AI systems understand Reddzit as a recognized *entity* — a free web application and its publisher organization.

## Context

reddzit.com is a client-rendered React SPA. It already has per-route `<title>`/description/canonical/OG tags (via `react-helmet-async`) and a sitemap + robots.txt registered in Google Search Console. What it lacks is **structured data**: machine-readable facts describing *what the site is*, rather than leaving search/AI systems to infer it from prose.

This is Tier-1 item #3 from the SEO discussion. It is independent of the per-route meta work and the (deferred) prerendering work.

## Decisions (approved)

- **Pricing:** Free (freemium with an optional Pro tier) → `offers` lists `price: "0"`.
- **`sameAs`:** Chrome Web Store listing only (the one authoritative external profile).
- **Schema types:** `Organization` + `WebApplication`. No `WebSite`/`SearchAction` (Reddzit has no site-wide search endpoint, so the markup would be invalid). No ratings/reviews.

## Approach

A single static `<script type="application/ld+json">` block in `index.html`'s `<head>`.

Rationale:
- The data is **site/entity-level** — identical for every page — and the homepage is the canonical entity page.
- A static block has **zero rendering dependency** (no JS execution needed for crawlers to read it).
- JSON-LD `<script>` blocks are **not** subject to the `react-helmet-async` `data-rh` deduplication issue that affected the meta tags — they are inert script content, so a static block is the simplest correct option.
- It will appear on all routes (since `index.html` is shared by the SPA). That is acceptable and common for entity-level structured data.

## Component / Change

### `index.html` (edit)
Add the following block inside `<head>` (placement: after the OG/Twitter meta block, before the `<link rel="preconnect">` font tags):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://reddzit.com/#organization",
      "name": "Reddzit",
      "url": "https://reddzit.com/",
      "logo": "https://reddzit.com/icons/icon-512.png",
      "sameAs": [
        "https://chromewebstore.google.com/detail/reddzit-save-quotes-from/pphbloclmhhppmiknfjpddkefnialknl"
      ]
    },
    {
      "@type": "WebApplication",
      "@id": "https://reddzit.com/#webapp",
      "name": "Reddzit",
      "url": "https://reddzit.com/",
      "applicationCategory": "UtilitiesApplication",
      "operatingSystem": "Web",
      "description": "Keep track of your saved Reddit posts and comments. A clean reader for browsing top stories, saving what matters, and revisiting it later.",
      "publisher": { "@id": "https://reddzit.com/#organization" },
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    }
  ]
}
</script>
```

Notes:
- The two nodes are linked: `WebApplication.publisher` references the `Organization` via `@id`.
- `logo` reuses the existing 512px PWA icon (`public/icons/icon-512.png` → served at `/icons/icon-512.png`).
- No other file changes. The GA snippet, inline trending-cache script, meta tags, and `data-rh` attributes are untouched.

## Honest expectations

- This is for **entity understanding**, not a rich snippet. Software-application rich results (the star-rating cards) require `aggregateRating`/`review` data, which Reddzit does not legitimately have — fabricating it violates Google's guidelines. So expect **no visible rich card**; the value is search/AI systems knowing "Reddzit = a free web app, published by the Reddzit org, also distributed on the Chrome Web Store."
- It does not directly affect ranking; it supports presentation and entity/knowledge-graph understanding.

## Out of scope
- `WebSite` + `SearchAction` (no site search endpoint).
- Per-page / per-route schema (e.g., `Article`, `BreadcrumbList`).
- `aggregateRating` / `review`.
- Any read-api or nginx change.

## Verification (project norm: browser, no test infra)
- `yarn build` succeeds.
- The JSON-LD `<script>` is present in `dist/index.html` and its JSON parses cleanly (e.g., extract the block and `JSON.parse` / `jq` it).
- After deploy: run `https://reddzit.com/` through Google's **Rich Results Test** and the **Schema Markup Validator** (validator.schema.org). Expected: no errors; 2 items detected (`Organization`, `WebApplication`).
