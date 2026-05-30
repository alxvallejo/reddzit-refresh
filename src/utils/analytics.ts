/**
 * Thin wrapper over the GA4 `gtag` global declared in index.html.
 * No-ops when gtag is unavailable (SSR, tests, blockers).
 */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, params ?? {});
  }
}
