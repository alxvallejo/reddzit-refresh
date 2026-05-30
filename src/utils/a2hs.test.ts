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
