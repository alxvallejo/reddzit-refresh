# Add-to-Home-Screen Button — Design

**Date:** 2026-05-29
**Status:** Approved, ready for implementation plan

## Goal

Let mobile visitors add Reddzit to their device home screen via an in-app
affordance, instead of relying on them to discover the browser's hidden
"Add to Home Screen" flow. Surfaced two ways: an engagement-gated auto-banner
and an always-available menu item. Track the install funnel in GA4.

This is a **retention** feature, not acquisition — it converts existing
visitors into repeat, one-tap users. It does not bring in new traffic.

## Platform reality (the constraint that shapes everything)

| | Android (Chrome/Edge) | iOS Safari |
|---|---|---|
| Native install trigger | Yes — `beforeinstallprompt` → `prompt()` | **None.** No API exists. |
| What the button does | Fires the OS install prompt | Opens an instructions overlay |
| Install signal for analytics | `appinstalled` event + `userChoice` | None — use `display-mode: standalone` launch as proxy |
| Requirements | Manifest + icons + HTTPS + service worker | `apple-touch-icon` + meta tags |

## Scope

**In scope:** manifest, generated icons, iOS meta tags, a no-op service worker,
a shared detection hook, an auto-banner, a user-menu item, an iOS instructions
overlay, and GA4 funnel events.

**Out of scope (YAGNI):** offline caching, push notifications, app-store
packaging, background sync. The service worker stays a no-op passthrough and
must never cache content (avoids serving stale builds).

## Architecture

### 1. PWA foundation (new static assets + index.html)

- **`public/manifest.webmanifest`**
  - `name`: "Reddzit: Review your saved Reddit posts"
  - `short_name`: "Reddzit"
  - `start_url`: "/"
  - `display`: "standalone"
  - `theme_color`: `#262129` (matches dark theme background)
  - `background_color`: `#262129`
  - `icons`: the three entries below
- **`public/icons/`** — generated from the existing 512×512 `public/favicon.png`
  using `sips` (available locally):
  - `icon-192.png` — purpose `any`
  - `icon-512.png` — purpose `any`
  - `icon-maskable-512.png` — purpose `maskable`; favicon centered on a solid
    `#262129` background with ~20% safe-zone padding so Android's circle/squircle
    crop does not clip it. **Verify visually before finalizing.**
- **`public/sw.js`** — minimal service worker:
  - `install` → `self.skipWaiting()`
  - `activate` → `self.clients.claim()`
  - `fetch` → no listener body that intercepts/caches; network passthrough only.
  - Its sole purpose is to satisfy Android installability criteria.
- **`index.html`** `<head>` additions:
  - `<link rel="manifest" href="/manifest.webmanifest">`
  - `<link rel="apple-touch-icon" href="/icons/icon-192.png">`
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
  - `<meta name="apple-mobile-web-app-title" content="Reddzit">`
  - `<meta name="theme-color" content="#262129">`

### 2. Logic — `useAddToHomeScreen` hook (`src/utils/useAddToHomeScreen.ts`)

Single source of truth. Consumed by both UI surfaces.

State/values exposed:
- `isStandalone: boolean` — already installed/launched as app. True when
  `window.matchMedia('(display-mode: standalone)').matches` OR
  `(navigator as any).standalone === true` (iOS). When true, suppress all
  surfaces.
- `isIOS: boolean` — iOS Safari (UA check for iPhone/iPad/iPod, excluding
  in-app webviews where possible).
- `canPrompt: boolean` — a `beforeinstallprompt` event was captured and is
  available to fire (Android).
- `shouldAutoShow: boolean` — `!isStandalone && !dismissed && (canPrompt || isIOS) && engaged`
  (see engagement gate below).
- `promptInstall(): Promise<void>` — Android: call the stashed event's
  `prompt()`, await `userChoice`, fire analytics. iOS: open the instructions
  overlay.
- `dismiss(): void` — set the dismissal flag.

Side effects on mount (production + HTTPS only):
- Register `/sw.js`.
- `window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); stash(e); setCanPrompt(true) })`.
- `window.addEventListener('appinstalled', …)` → fire `a2hs_installed`.
- On load, if `isStandalone`, fire `pwa_launch` once per session.

**Engagement gate** (`engaged`): true when EITHER
- visit count ≥ 2 — `localStorage['rdz_visit_count']`, incremented once per
  app load; OR
- the user has scrolled a feed this session — a session flag
  (`sessionStorage['rdz_a2hs_engaged']`) set when a feed scroll passes a
  threshold (reuse/extend an existing scroll listener if present, else a
  lightweight one).

**Dismissal:** `localStorage['rdz_a2hs_dismissed']` = timestamp. Banner stays
hidden once dismissed. The menu item ignores dismissal (always available when
`!isStandalone && (canPrompt || isIOS)`).

### 3. Analytics — `src/utils/analytics.ts` helper

Thin typed wrapper over GA4 `gtag` (the legacy `react-ga` import in `App.tsx`
is dead code for GA4 and is NOT used here; remove the unused import while we're
in the file).

```ts
export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, params);
  }
}
```

(Add a `gtag` declaration to the global `Window` type in `vite-env.d.ts`.)

Events fired:

| Event | Fires when | Platform | Params |
|---|---|---|---|
| `a2hs_prompt_shown` | banner or menu item surfaced | both | `{ surface: 'banner' \| 'menu', platform }` |
| `a2hs_prompt_clicked` | user taps Install / Show-me-how | both | `{ surface, platform }` |
| `a2hs_outcome` | Android `userChoice` resolves | Android | `{ outcome: 'accepted' \| 'dismissed' }` |
| `a2hs_installed` | `appinstalled` fires | Android | — |
| `a2hs_ios_instructions_shown` | iOS overlay opens | iOS | — |
| `pwa_launch` | app loads in standalone mode | both (iOS proxy) | `{ platform }` |

Funnel: Android = shown → clicked → outcome → installed. iOS = shown →
instructions → (later) pwa_launch.

### 4. UI surfaces (share the hook)

- **`AddToHomeScreenBanner`** (`src/components/AddToHomeScreenBanner.tsx`),
  rendered in `AppShell`:
  - Dismissible bottom banner. Renders only when `shouldAutoShow`.
  - Content: app icon + "Add Reddzit to your home screen" + primary button
    ("Install" on Android, "Show me how" on iOS) + ✕ dismiss.
  - Styled with existing `--theme-*` CSS variables; respects light/dark.
  - Fires `a2hs_prompt_shown {surface:'banner'}` on first render; primary tap
    calls `promptInstall()` and fires `a2hs_prompt_clicked`.
- **Menu item in `MainHeader`** user dropdown:
  - New "Add to Home Screen" entry (phone/plus FontAwesome icon) beside
    "Buy me a coffee". Rendered only when `!isStandalone && (canPrompt || isIOS)`.
  - Tap calls `promptInstall()`; fires `a2hs_prompt_shown {surface:'menu'}`
    when the dropdown opens with the item visible, and `a2hs_prompt_clicked`
    on tap.
  - Note: dropdown only exists for signed-in users — banner covers logged-out
    visitors.
- **`AddToHomeScreenInstructions`** (`src/components/AddToHomeScreenInstructions.tsx`):
  - iOS-only modal/overlay. "Tap the Share icon, then *Add to Home Screen*."
    with the Share glyph illustrated. Closeable. Fires
    `a2hs_ios_instructions_shown` on open.
  - Open state owned by the hook (or a small context) so both banner and menu
    can trigger it.

## Behavior summary

| Platform / state | Banner | Menu item tap |
|---|---|---|
| Android, installable, engaged | auto-shows → native prompt | native prompt |
| iOS Safari, engaged | auto-shows → instructions overlay | instructions overlay |
| Not yet engaged | hidden | visible (intent-driven) |
| Already installed / desktop | hidden | hidden |

## Testing

- Unit-test `useAddToHomeScreen` state logic: standalone detection, engagement
  gate (visit count / scroll flag), dismissal persistence, iOS vs Android
  branching. Mock `matchMedia`, `navigator`, `localStorage`, `sessionStorage`.
- Unit-test `trackEvent` no-ops safely when `gtag` is absent.
- Manual verification (per project norms): Android Chrome native prompt fires;
  iOS Safari shows instructions and the saved icon is the maskable icon;
  desktop shows nothing; reinstall after dismiss via menu item; confirm GA4
  DebugView receives the funnel events.

## Risks & mitigations

- **Stale builds via service worker** → SW does zero caching (passthrough only).
- **Burning Android's one-shot prompt** → engagement gate defers the auto-banner.
- **iOS has no install signal** → accept partial tracking; use `pwa_launch`
  standalone-launch as the proxy.
- **Maskable icon clipping** → generate with safe-zone padding and verify
  visually before finalizing.
