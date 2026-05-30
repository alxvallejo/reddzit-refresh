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
