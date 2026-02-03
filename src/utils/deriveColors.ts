/** Parse a hex color string (3, 4, 6, or 8 digit) into RGB components. */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace(/^#/, '');

  // Expand shorthand (e.g. "abc" -> "aabbcc")
  if (h.length === 3 || h.length === 4) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }

  const num = parseInt(h.substring(0, 6), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/** Convert RGB components (0-255) back to a hex string. */
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Darken a hex color by a percentage (0-1). 0 = unchanged, 1 = black. */
function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - amount;
  return rgbToHex(r * factor, g * factor, b * factor);
}

/** Mix two hex colors. ratio=0 returns color1, ratio=1 returns color2. */
function mix(color1: string, color2: string, ratio: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * ratio,
    c1.g + (c2.g - c1.g) * ratio,
    c1.b + (c2.b - c1.b) * ratio,
  );
}

/**
 * Returns the relative luminance (0-1) of a hex color per WCAG 2.0.
 * Useful for deciding whether to use light or dark text on a background.
 */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);

  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Derive all 18 theme CSS variable values from a background color and accent
 * color. Both inputs should be hex strings (e.g. "#1a1a2e", "#6c63ff").
 *
 * Returns a `Record<string, string>` whose keys correspond to the CSS custom
 * property names used by the app (without the `--` prefix).
 */
export function deriveColors(
  bg: string,
  accent: string,
): Record<string, string> {
  const isDark = luminance(bg) < 0.2;

  const text = isDark ? '#f0eef5' : '#1f2937';
  const { r: bgR, g: bgG, b: bgB } = hexToRgb(darken(bg, 0.15));
  const { r: accentR, g: accentG, b: accentB } = hexToRgb(accent);

  return {
    bg,
    bgSecondary: darken(bg, 0.1),
    text,
    textMuted: mix(accent, text, 0.4),
    primary: accent,
    primaryHover: darken(accent, 0.15),
    accent,
    border: `rgba(${accentR}, ${accentG}, ${accentB}, 0.3)`,
    cardBg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.2)',
    headerBg: `rgba(${bgR}, ${bgG}, ${bgB}, 0.85)`,
    bannerBg: darken(bg, 0.1),
    bannerText: text,
    bannerButtonBg: accent,
    bannerButtonText: luminance(accent) > 0.4 ? '#1e1e4a' : '#f0eef5',
    bannerErrorText: isDark ? '#f87171' : '#8b2020',
    bannerInputBg: isDark
      ? 'rgba(255, 255, 255, 0.15)'
      : 'rgba(255, 255, 255, 0.3)',
    bannerInputText: text,
    bannerInputPlaceholder: mix(text, bg, 0.5),
  };
}
