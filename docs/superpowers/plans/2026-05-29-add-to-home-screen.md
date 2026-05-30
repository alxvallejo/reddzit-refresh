# Add-to-Home-Screen Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mobile "Add to Home Screen" affordance (engagement-gated auto-banner + always-available menu item) backed by a minimal PWA foundation, with GA4 funnel tracking.

**Architecture:** A small React context provider (`AddToHomeScreenProvider`) mounted once at the App root captures the Android `beforeinstallprompt` event, detects iOS/standalone, applies an engagement gate, and shares an iOS-instructions open-state. Two UI surfaces consume it: a bottom banner (mounted at App root, reaches all routes) and a menu item in `MainHeader`. Pure decision logic lives in a testable `src/utils/a2hs.ts` module. A no-cache passthrough service worker + web manifest + generated icons satisfy Android installability; iOS uses `apple-touch-icon` meta tags + an instructions overlay. Events fire through a `trackEvent` GA4 helper.

**Tech Stack:** React 18 + TypeScript + Vite, Tailwind v4 (existing `--theme-*` CSS variables), FontAwesome, GA4 `gtag` (already in `index.html`), vitest (added minimally for pure-logic tests). Icons generated with `sips` + ImageMagick (`magick`), both available locally.

**Spec:** `docs/superpowers/specs/2026-05-29-add-to-home-screen-design.md`

**Note on testing:** This project has no existing test framework or component tests. Per project norms, TDD applies to the new **pure logic** (`a2hs.ts`, `analytics.ts`) via a minimal node-environment vitest setup. UI/provider/integration tasks are verified with `npx tsc --noEmit`, `npm run build`, and manual checks — we do NOT add jsdom/testing-library for this feature.

---

### Task 1: Minimal vitest setup for pure-logic tests

**Files:**
- Modify: `package.json` (scripts + devDependency)
- Modify: `vite.config.ts:1` (import source + `test` block)

- [ ] **Step 1: Install vitest**

Run:
```bash
npm install -D vitest
```
Expected: vitest added to devDependencies; no errors.

- [ ] **Step 2: Add test scripts to package.json**

In `package.json`, add to the `"scripts"` object (after the existing `"preview"` line):

```json
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Enable vitest in vite.config.ts (node environment)**

Change the first import line of `vite.config.ts` from:

```ts
import { defineConfig } from 'vite'
```
to:
```ts
import { defineConfig } from 'vitest/config'
```

Then add a `test` block inside the `defineConfig({ ... })` object (after the existing `css` block, before the closing `})`):

```ts
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        silenceDeprecations: ['slash-div', 'color-functions']
      }
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
```

- [ ] **Step 4: Verify the runner starts (no tests yet)**

Run:
```bash
npm test
```
Expected: vitest runs and reports "No test files found" (exit may be non-zero for "no tests" — that is fine at this step; the next task adds tests).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.ts
git commit -m "Add minimal vitest setup for pure-logic tests"
```

---

### Task 2: Pure decision logic — `src/utils/a2hs.ts`

**Files:**
- Create: `src/utils/a2hs.ts`
- Test: `src/utils/a2hs.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/a2hs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  detectPlatform,
  isIOSPlatform,
  isStandaloneMode,
  evaluateEngagement,
  incrementVisitCount,
  VISIT_COUNT_KEY,
} from './a2hs';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

describe('detectPlatform', () => {
  it('detects iOS', () => expect(detectPlatform(IPHONE_UA)).toBe('ios'));
  it('detects Android', () => expect(detectPlatform(ANDROID_UA)).toBe('android'));
  it('falls back to other', () => expect(detectPlatform(DESKTOP_UA)).toBe('other'));
});

describe('isIOSPlatform', () => {
  it('true for iPhone', () => expect(isIOSPlatform(IPHONE_UA)).toBe(true));
  it('false for Android', () => expect(isIOSPlatform(ANDROID_UA)).toBe(false));
});

describe('isStandaloneMode', () => {
  it('true when matchMedia matches', () =>
    expect(isStandaloneMode({ matches: true }, {})).toBe(true));
  it('true when iOS navigator.standalone', () =>
    expect(isStandaloneMode({ matches: false }, { standalone: true })).toBe(true));
  it('false otherwise', () =>
    expect(isStandaloneMode({ matches: false }, { standalone: false })).toBe(false));
  it('false when matchMedia is null and not iOS standalone', () =>
    expect(isStandaloneMode(null, {})).toBe(false));
});

describe('evaluateEngagement', () => {
  it('engaged on second visit', () => expect(evaluateEngagement(2, false)).toBe(true));
  it('engaged when scrolled this session', () => expect(evaluateEngagement(1, true)).toBe(true));
  it('not engaged on first visit with no scroll', () =>
    expect(evaluateEngagement(1, false)).toBe(false));
});

describe('incrementVisitCount', () => {
  it('increments and persists', () => {
    const store: Record<string, string> = {};
    const storage = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    } as unknown as Storage;
    expect(incrementVisitCount(storage)).toBe(1);
    expect(incrementVisitCount(storage)).toBe(2);
    expect(store[VISIT_COUNT_KEY]).toBe('2');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
npx vitest run src/utils/a2hs.test.ts
```
Expected: FAIL — cannot resolve `./a2hs` (module not found).

- [ ] **Step 3: Write the implementation**

Create `src/utils/a2hs.ts`:

```ts
export type Platform = 'ios' | 'android' | 'other';

// localStorage keys
export const VISIT_COUNT_KEY = 'rdz_visit_count';
export const DISMISSED_KEY = 'rdz_a2hs_dismissed';
// sessionStorage key
export const ENGAGED_KEY = 'rdz_a2hs_engaged';

export function detectPlatform(ua: string): Platform {
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'other';
}

export function isIOSPlatform(ua: string): boolean {
  return detectPlatform(ua) === 'ios';
}

export function isStandaloneMode(
  mql: { matches: boolean } | null,
  nav: { standalone?: boolean }
): boolean {
  if (mql?.matches) return true;
  return nav?.standalone === true;
}

export function evaluateEngagement(visitCount: number, scrolledThisSession: boolean): boolean {
  return visitCount >= 2 || scrolledThisSession;
}

export function incrementVisitCount(storage: Storage): number {
  const current = parseInt(storage.getItem(VISIT_COUNT_KEY) ?? '0', 10) || 0;
  const next = current + 1;
  storage.setItem(VISIT_COUNT_KEY, String(next));
  return next;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
npx vitest run src/utils/a2hs.test.ts
```
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/utils/a2hs.ts src/utils/a2hs.test.ts
git commit -m "Add a2hs pure decision logic with tests"
```

---

### Task 3: GA4 analytics helper — `src/utils/analytics.ts`

**Files:**
- Create: `src/utils/analytics.ts`
- Test: `src/utils/analytics.test.ts`
- Modify: `src/vite-env.d.ts`

- [ ] **Step 1: Write the failing test**

Create `src/utils/analytics.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { trackEvent } from './analytics';

afterEach(() => {
  delete (globalThis as any).window;
});

describe('trackEvent', () => {
  it('calls window.gtag with event name and params', () => {
    const calls: unknown[][] = [];
    (globalThis as any).window = {
      gtag: (...args: unknown[]) => calls.push(args),
    };
    trackEvent('a2hs_installed', { platform: 'android' });
    expect(calls).toEqual([['event', 'a2hs_installed', { platform: 'android' }]]);
  });

  it('no-ops safely when gtag is absent', () => {
    (globalThis as any).window = {};
    expect(() => trackEvent('a2hs_installed')).not.toThrow();
  });

  it('no-ops safely when window is undefined', () => {
    expect(() => trackEvent('a2hs_installed')).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/utils/analytics.test.ts
```
Expected: FAIL — cannot resolve `./analytics`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/analytics.ts`:

```ts
/**
 * Thin wrapper over the GA4 `gtag` global declared in index.html.
 * No-ops when gtag is unavailable (SSR, tests, blockers).
 */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, params ?? {});
  }
}
```

- [ ] **Step 4: Add the `gtag` type to the global Window**

Replace the entire contents of `src/vite-env.d.ts` with:

```ts
/// <reference types="vite/client" />

interface Window {
  gtag?: (command: string, ...args: unknown[]) => void;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:
```bash
npx vitest run src/utils/analytics.test.ts
```
Expected: PASS — all three tests green.

- [ ] **Step 6: Commit**

```bash
git add src/utils/analytics.ts src/utils/analytics.test.ts src/vite-env.d.ts
git commit -m "Add GA4 trackEvent helper and gtag Window typing"
```

---

### Task 4: PWA static assets — icons, manifest, service worker

**Files:**
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `public/icons/icon-maskable-512.png`
- Create: `public/manifest.webmanifest`
- Create: `public/sw.js`

- [ ] **Step 1: Generate the icons from favicon.png**

Run (from repo root; `public/favicon.png` is already 512×512):
```bash
cp public/favicon.png public/icons/icon-512.png
sips -z 192 192 public/favicon.png --out public/icons/icon-192.png
magick -size 512x512 xc:'#262129' \( public/favicon.png -resize 320x320 \) -gravity center -composite public/icons/icon-maskable-512.png
```
Expected: three files created in `public/icons/`. Verify sizes:
```bash
sips -g pixelWidth -g pixelHeight public/icons/icon-192.png public/icons/icon-512.png public/icons/icon-maskable-512.png 2>/dev/null | grep -E "pixel|icons"
```
Expected: 192×192, 512×512, 512×512 respectively.

- [ ] **Step 2: Visually verify the maskable icon**

Run:
```bash
open public/icons/icon-maskable-512.png
```
Expected: the Reddzit mark centered on a dark (`#262129`) square with visible padding on all sides (so a circular crop won't clip it). If the mark looks too small or too large, re-run the `magick` command adjusting `-resize 320x320` (larger number = bigger mark / less padding).

- [ ] **Step 3: Create the web manifest**

Create `public/manifest.webmanifest`:

```json
{
  "name": "Reddzit: Review your saved Reddit posts",
  "short_name": "Reddzit",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#262129",
  "background_color": "#262129",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 4: Create the no-cache passthrough service worker**

Create `public/sw.js`:

```js
// Minimal service worker: exists ONLY to satisfy Android PWA installability.
// It performs NO caching — every request goes straight to the network — so it
// can never serve a stale build.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// A fetch listener is part of installability criteria. Passthrough only.
self.addEventListener('fetch', () => {
  // Intentionally empty: do not call respondWith, so the browser handles
  // the request normally with no interception or caching.
});
```

- [ ] **Step 5: Validate the manifest JSON**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('public/manifest.webmanifest','utf8')); console.log('manifest OK')"
```
Expected: `manifest OK`.

- [ ] **Step 6: Commit**

```bash
git add public/icons/icon-192.png public/icons/icon-512.png public/icons/icon-maskable-512.png public/manifest.webmanifest public/sw.js
git commit -m "Add PWA manifest, icons, and no-cache service worker"
```

---

### Task 5: Wire manifest + iOS meta tags into index.html

**Files:**
- Modify: `index.html` (head section, around the existing `<link rel="icon">` at line ~13)

- [ ] **Step 1: Add manifest, theme-color, and Apple meta tags**

In `index.html`, find this line:

```html
    <link rel="icon" type="image/png" href="/favicon.png" />
```

Add immediately AFTER it:

```html
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#262129" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Reddzit" />
```

- [ ] **Step 2: Verify the build includes the assets**

Run:
```bash
npm run build
```
Expected: build succeeds; no errors. (Files in `public/` are copied verbatim to the build output.)

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Link PWA manifest and iOS home-screen meta tags in index.html"
```

---

### Task 6: Add-to-Home-Screen context provider + hook

**Files:**
- Create: `src/context/AddToHomeScreenContext.tsx`

This provider owns all runtime state and side effects. It captures `beforeinstallprompt` once, registers the service worker (production + HTTPS only), tracks engagement, owns the iOS-instructions open-state, and fires the lifecycle analytics events (`pwa_launch`, `a2hs_outcome`, `a2hs_installed`, `a2hs_ios_instructions_shown`). Surfaces (`prompt_shown`/`prompt_clicked`) are fired by the UI components in later tasks.

- [ ] **Step 1: Create the context provider**

Create `src/context/AddToHomeScreenContext.tsx`:

```tsx
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  detectPlatform,
  isStandaloneMode,
  evaluateEngagement,
  incrementVisitCount,
  DISMISSED_KEY,
  ENGAGED_KEY,
  type Platform,
} from '../utils/a2hs';
import { trackEvent } from '../utils/analytics';

// Minimal shape of the (non-standard) beforeinstallprompt event.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface A2HSContextValue {
  platform: Platform;
  isStandalone: boolean;
  canPrompt: boolean; // Android prompt captured and ready
  shouldAutoShow: boolean; // banner gate
  promptInstall: (surface: 'banner' | 'menu') => Promise<void>;
  dismissBanner: () => void;
  instructionsOpen: boolean;
  closeInstructions: () => void;
}

const A2HSContext = createContext<A2HSContextValue | null>(null);

export function useAddToHomeScreen(): A2HSContextValue {
  const ctx = useContext(A2HSContext);
  if (!ctx) throw new Error('useAddToHomeScreen must be used within AddToHomeScreenProvider');
  return ctx;
}

export function AddToHomeScreenProvider({ children }: { children: ReactNode }) {
  const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);

  const [platform] = useState<Platform>(() =>
    typeof navigator !== 'undefined' ? detectPlatform(navigator.userAgent) : 'other'
  );
  const [isStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const mql = window.matchMedia ? window.matchMedia('(display-mode: standalone)') : null;
    return isStandaloneMode(mql, navigator as unknown as { standalone?: boolean });
  });
  const [canPrompt, setCanPrompt] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(DISMISSED_KEY) !== null;
  });
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  // One-time setup: visit count, engagement, install listeners, SW, pwa_launch.
  useEffect(() => {
    if (isStandalone) {
      trackEvent('pwa_launch', { platform });
      return; // already installed: no prompts, no listeners
    }

    // Engagement: bump visit count, then evaluate against session scroll flag.
    const visitCount = incrementVisitCount(localStorage);
    const scrolled = sessionStorage.getItem(ENGAGED_KEY) === '1';
    setEngaged(evaluateEngagement(visitCount, scrolled));

    const onScroll = () => {
      if (window.scrollY > 600) {
        sessionStorage.setItem(ENGAGED_KEY, '1');
        setEngaged(true);
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      promptEventRef.current = e as BeforeInstallPromptEvent;
      setCanPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    const onInstalled = () => {
      trackEvent('a2hs_installed', { platform });
      setCanPrompt(false);
    };
    window.addEventListener('appinstalled', onInstalled);

    // Register the no-op service worker (production + secure context only).
    if (
      'serviceWorker' in navigator &&
      import.meta.env.PROD &&
      window.isSecureContext
    ) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [isStandalone, platform]);

  const openInstructions = () => {
    setInstructionsOpen(true);
    trackEvent('a2hs_ios_instructions_shown');
  };

  const promptInstall = async (_surface: 'banner' | 'menu') => {
    if (platform === 'ios') {
      openInstructions();
      return;
    }
    const evt = promptEventRef.current;
    if (!evt) return;
    await evt.prompt();
    const choice = await evt.userChoice;
    trackEvent('a2hs_outcome', { outcome: choice.outcome });
    promptEventRef.current = null;
    setCanPrompt(false);
  };

  const dismissBanner = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  const shouldAutoShow =
    !isStandalone && !dismissed && engaged && (canPrompt || platform === 'ios');

  const value: A2HSContextValue = {
    platform,
    isStandalone,
    canPrompt,
    shouldAutoShow,
    promptInstall,
    dismissBanner,
    instructionsOpen,
    closeInstructions: () => setInstructionsOpen(false),
  };

  return <A2HSContext.Provider value={value}>{children}</A2HSContext.Provider>;
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors. (If `import.meta.env.PROD` errors, confirm `/// <reference types="vite/client" />` is present in `src/vite-env.d.ts` — it is, from Task 3.)

- [ ] **Step 3: Commit**

```bash
git add src/context/AddToHomeScreenContext.tsx
git commit -m "Add AddToHomeScreen context provider with install/engagement logic"
```

---

### Task 7: iOS instructions overlay component

**Files:**
- Create: `src/components/AddToHomeScreenInstructions.tsx`

- [ ] **Step 1: Create the overlay**

Create `src/components/AddToHomeScreenInstructions.tsx`:

```tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faArrowUpFromBracket, faSquarePlus } from '@fortawesome/free-solid-svg-icons';
import { useAddToHomeScreen } from '../context/AddToHomeScreenContext';

export default function AddToHomeScreenInstructions() {
  const { instructionsOpen, closeInstructions } = useAddToHomeScreen();
  if (!instructionsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={closeInstructions}
    >
      <div
        className="w-full sm:max-w-sm m-0 sm:m-4 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl bg-[var(--theme-bgSecondary)] text-[var(--theme-text)] border border-[var(--theme-border)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src="/icons/icon-192.png" alt="Reddzit" className="w-10 h-10 rounded-xl" />
            <span className="font-serif text-lg font-bold">Add Reddzit to your Home Screen</span>
          </div>
          <button
            onClick={closeInstructions}
            aria-label="Close"
            className="border-none bg-transparent cursor-pointer text-[var(--theme-textMuted)] p-1"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <ol className="space-y-3 m-0 pl-0 list-none">
          <li className="flex items-center gap-3">
            <FontAwesomeIcon icon={faArrowUpFromBracket} className="text-[var(--theme-primary)] w-5" />
            <span>
              Tap the <strong>Share</strong> button in the Safari toolbar.
            </span>
          </li>
          <li className="flex items-center gap-3">
            <FontAwesomeIcon icon={faSquarePlus} className="text-[var(--theme-primary)] w-5" />
            <span>
              Choose <strong>Add to Home Screen</strong>.
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors. (Confirms the FontAwesome icon names `faArrowUpFromBracket` and `faSquarePlus` exist in `@fortawesome/free-solid-svg-icons`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/AddToHomeScreenInstructions.tsx
git commit -m "Add iOS add-to-home-screen instructions overlay"
```

---

### Task 8: Auto-banner component

**Files:**
- Create: `src/components/AddToHomeScreenBanner.tsx`

- [ ] **Step 1: Create the banner**

Create `src/components/AddToHomeScreenBanner.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { useAddToHomeScreen } from '../context/AddToHomeScreenContext';
import { trackEvent } from '../utils/analytics';

export default function AddToHomeScreenBanner() {
  const { shouldAutoShow, platform, promptInstall, dismissBanner } = useAddToHomeScreen();
  const shownRef = useRef(false);

  useEffect(() => {
    if (shouldAutoShow && !shownRef.current) {
      shownRef.current = true;
      trackEvent('a2hs_prompt_shown', { surface: 'banner', platform });
    }
  }, [shouldAutoShow, platform]);

  if (!shouldAutoShow) return null;

  const ctaLabel = platform === 'ios' ? 'Show me how' : 'Install';

  const onCta = () => {
    trackEvent('a2hs_prompt_clicked', { surface: 'banner', platform });
    void promptInstall('banner');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:hidden">
      <div className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl bg-[var(--theme-bgSecondary)] border border-[var(--theme-border)] text-[var(--theme-text)]">
        <img src="/icons/icon-192.png" alt="Reddzit" className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="m-0 text-sm font-semibold leading-tight">Add Reddzit to your home screen</p>
          <p className="m-0 text-xs text-[var(--theme-textMuted)] leading-tight">One tap to your daily Reddit digest.</p>
        </div>
        <button
          onClick={onCta}
          className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold border-none cursor-pointer bg-[var(--theme-primary)] text-[#262129] hover:opacity-90"
        >
          {ctaLabel}
        </button>
        <button
          onClick={dismissBanner}
          aria-label="Dismiss"
          className="flex-shrink-0 border-none bg-transparent cursor-pointer text-[var(--theme-textMuted)] p-1"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/AddToHomeScreenBanner.tsx
git commit -m "Add engagement-gated add-to-home-screen banner"
```

---

### Task 9: Wire provider + banner into App.tsx (and remove dead react-ga import)

**Files:**
- Modify: `src/App.tsx` (imports at lines 1-23; provider/component placement around lines 25-31)

- [ ] **Step 1: Update imports**

In `src/App.tsx`, remove this line (dead — `react-ga` is legacy Universal Analytics, unused, wrong for GA4):

```ts
import ReactGA from 'react-ga';
```

Add these imports alongside the other component imports (e.g. after the `import AppShell ...` line):

```ts
import { AddToHomeScreenProvider } from './context/AddToHomeScreenContext';
import AddToHomeScreenBanner from './components/AddToHomeScreenBanner';
import AddToHomeScreenInstructions from './components/AddToHomeScreenInstructions';
```

- [ ] **Step 2: Wrap the app and mount the surfaces**

In `src/App.tsx`, the current structure is:

```tsx
      <ThemeProvider>
        <RedditProvider>
          <div className='App'>
          <TrendingMarquee />
          <Routes>
```

Change it to wrap with the provider and mount the banner + instructions once, app-wide:

```tsx
      <ThemeProvider>
        <RedditProvider>
          <AddToHomeScreenProvider>
          <div className='App'>
          <TrendingMarquee />
          <AddToHomeScreenBanner />
          <AddToHomeScreenInstructions />
          <Routes>
```

Then find the matching closing tags. The current closing structure (after `</Routes>`) is:

```tsx
          </div>
        </RedditProvider>
      </ThemeProvider>
```

Change it to close the new provider:

```tsx
          </div>
          </AddToHomeScreenProvider>
        </RedditProvider>
      </ThemeProvider>
```

- [ ] **Step 3: Typecheck and build**

Run:
```bash
npx tsc --noEmit && npm run build
```
Expected: no type errors; build succeeds. (Also confirms the `react-ga` removal left no dangling references.)

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "Mount add-to-home-screen provider, banner, and overlay app-wide; drop dead react-ga import"
```

---

### Task 10: Add the persistent menu item in MainHeader

**Files:**
- Modify: `src/components/MainHeader.tsx` (imports line 7; user dropdown block ~lines 160-205, beside the "Buy me a coffee" link)

- [ ] **Step 1: Add imports**

In `src/components/MainHeader.tsx`, add `faMobileScreenButton` to the existing FontAwesome solid-icons import (line 7). Change:

```ts
import { faChevronDown, faUser, faCoffee, faSignOutAlt, faQuoteLeft, faBookOpen, faPenNib, faArrowUp, faBookmark, faBinoculars, faLink } from '@fortawesome/free-solid-svg-icons';
```
to:
```ts
import { faChevronDown, faUser, faCoffee, faSignOutAlt, faQuoteLeft, faBookOpen, faPenNib, faArrowUp, faBookmark, faBinoculars, faLink, faMobileScreenButton } from '@fortawesome/free-solid-svg-icons';
```

Add the context + analytics imports after the existing `useTheme` import (around line 5):

```ts
import { useAddToHomeScreen } from '../context/AddToHomeScreenContext';
import { trackEvent } from '../utils/analytics';
```

- [ ] **Step 2: Read the provider value in the component**

In `MainHeader`, find the existing hook calls near the top of the component body:

```tsx
  const { signedIn, user, logout, redirectForAuth } = useReddit();
  const { isLight } = useTheme();
```

Add immediately after them:

```tsx
  const { isStandalone, canPrompt, platform, promptInstall } = useAddToHomeScreen();
  const showInstall = !isStandalone && (canPrompt || platform === 'ios');
```

- [ ] **Step 3: Add the menu item beside "Buy me a coffee"**

In the user dropdown block, find the "Buy me a coffee" anchor:

```tsx
          <a
            href="https://www.buymeacoffee.com/reddzit"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 px-4 py-2.5 text-sm no-underline text-[var(--theme-text)] ${
              isLight ? 'hover:bg-gray-50' : 'hover:bg-white/10'
            }`}
          >
            <FontAwesomeIcon icon={faCoffee} className="w-4 text-gray-400" />
            Buy me a coffee
          </a>
```

Add this BEFORE that anchor (so install sits above "Buy me a coffee"):

```tsx
          {showInstall && (
            <button
              onClick={() => {
                trackEvent('a2hs_prompt_shown', { surface: 'menu', platform });
                trackEvent('a2hs_prompt_clicked', { surface: 'menu', platform });
                setShowUserMenu(false);
                void promptInstall('menu');
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm no-underline text-left border-none bg-transparent cursor-pointer text-[var(--theme-text)] ${
                isLight ? 'hover:bg-gray-50' : 'hover:bg-white/10'
              }`}
            >
              <FontAwesomeIcon icon={faMobileScreenButton} className="w-4 text-gray-400" />
              Add to Home Screen
            </button>
          )}
```

- [ ] **Step 4: Typecheck and build**

Run:
```bash
npx tsc --noEmit && npm run build
```
Expected: no errors; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/MainHeader.tsx
git commit -m "Add 'Add to Home Screen' item to user menu"
```

---

### Task 11: Full-suite verification and manual checks

**Files:** none (verification only)

- [ ] **Step 1: Run the unit tests**

Run:
```bash
npm test
```
Expected: all `a2hs` and `analytics` tests PASS.

- [ ] **Step 2: Typecheck, lint, build**

Run:
```bash
npx tsc --noEmit && npm run lint && npm run build
```
Expected: no type errors, no new lint errors, build succeeds.

- [ ] **Step 3: Manual verification (preview build)**

Run:
```bash
npm run preview
```
Then verify (note: `preview` serves over HTTP on localhost, which counts as a secure context, so the SW registers):
- **Desktop browser:** no banner, no menu item (provider reports `other` platform / no prompt).
- **Chrome DevTools → Application → Manifest:** manifest loads, all three icons resolve, "Installability" shows no blocking errors.
- **Chrome DevTools → Application → Service Workers:** `sw.js` is registered and activated.
- **Android emulation / real Android Chrome:** after engagement (scroll > 600px OR a 2nd visit), the banner appears; "Install" fires the native prompt; check GA4 DebugView for `a2hs_prompt_shown`, `a2hs_prompt_clicked`, `a2hs_outcome`, and `a2hs_installed`.
- **iOS Safari (real device):** banner appears after engagement with "Show me how"; tapping opens the instructions overlay (`a2hs_ios_instructions_shown` in GA4). After manually adding to home screen and launching, confirm a `pwa_launch` event and that no banner/menu item shows in standalone mode.

- [ ] **Step 4: Confirm GA4 receives events**

In GA4 → Admin → DebugView (or the Realtime report), confirm the event names appear while exercising the flows above. (GA4 DebugView requires the `debug_mode` param or the GA Debugger extension; Realtime works without it.)

- [ ] **Step 5: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "Verify add-to-home-screen feature end to end"
```

---

## Self-Review

**Spec coverage:**
- Manifest → Task 4. Generated icons incl. maskable → Task 4. iOS meta tags → Task 5. No-cache service worker → Task 4 (created) + Task 6 (registered). `useAddToHomeScreen` single-source-of-truth → Task 6 (as a provider/hook). Standalone detection, iOS/Android branching, engagement gate, dismissal → Tasks 2 + 6. Analytics helper + 6 events → Task 3 (helper), Task 6 (`pwa_launch`, `a2hs_outcome`, `a2hs_installed`, `a2hs_ios_instructions_shown`), Tasks 8 & 10 (`a2hs_prompt_shown`, `a2hs_prompt_clicked`). Banner → Task 8 + 9. Menu item → Task 10. iOS instructions overlay → Task 7. Dead `react-ga` removal → Task 9. Testing/risks → Tasks 2, 3, 11.
- **Refinement vs. spec:** spec described a `useAddToHomeScreen` hook rendering the banner in `AppShell`; the plan implements it as a context provider mounted in `App.tsx` with the banner at app root. This better satisfies two spec requirements ("single source of truth" — listeners run once; "banner reaches logged-out visitors" — `AppShell` does not render on `/`). No requirement is dropped.

**Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to Task N". Every code step shows complete code.

**Type consistency:** `Platform` type and key constants (`VISIT_COUNT_KEY`, `DISMISSED_KEY`, `ENGAGED_KEY`) defined in Task 2, imported in Task 6. `A2HSContextValue` defined in Task 6; consumers (Tasks 7, 8, 10) use only fields it declares (`instructionsOpen`, `closeInstructions`, `shouldAutoShow`, `platform`, `promptInstall`, `dismissBanner`, `isStandalone`, `canPrompt`). `promptInstall(surface)` signature consistent across provider and both call sites. `trackEvent(name, params?)` signature consistent across all call sites.
