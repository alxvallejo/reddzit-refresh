import { describe, it, expect, afterEach } from 'vitest';
import { trackEvent } from './analytics';

// Typed view of globalThis so we can stub `window` without `any`.
const globalRef = globalThis as { window?: { gtag?: (...args: unknown[]) => void } };

afterEach(() => {
  delete globalRef.window;
});

describe('trackEvent', () => {
  it('calls window.gtag with event name and params', () => {
    const calls: unknown[][] = [];
    globalRef.window = {
      gtag: (...args: unknown[]) => calls.push(args),
    };
    trackEvent('a2hs_installed', { platform: 'android' });
    expect(calls).toEqual([['event', 'a2hs_installed', { platform: 'android' }]]);
  });

  it('no-ops safely when gtag is absent', () => {
    globalRef.window = {};
    expect(() => trackEvent('a2hs_installed')).not.toThrow();
  });

  it('no-ops safely when window is undefined', () => {
    expect(() => trackEvent('a2hs_installed')).not.toThrow();
  });
});
