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
