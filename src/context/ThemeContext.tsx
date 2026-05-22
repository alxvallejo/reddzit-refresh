import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { deriveColors, luminance } from '../utils/deriveColors';

export type ThemeName = 'classic' | 'noir' | 'violet' | 'indigo' | 'dusk' | 'lavender' | 'light';
export type FontFamily = 'brygada' | 'outfit' | 'libertinus' | 'tirra' | 'reddit-sans' | 'zalando-sans' | 'cactus-classical' | 'noto-znamenny';
export type Mode = 'day' | 'night';

export const fontFamilies: Record<FontFamily, string> = {
  'brygada': '"Brygada 1918", "Outfit", system-ui, serif',
  'outfit': '"Outfit", "Open Sans", system-ui, sans-serif',
  'libertinus': '"Libertinus Math", "Outfit", system-ui, serif',
  'tirra': '"Tirra", "Outfit", system-ui, serif',
  'reddit-sans': '"Reddit Sans", "Outfit", system-ui, sans-serif',
  'zalando-sans': '"Zalando Sans", "Outfit", system-ui, sans-serif',
  'cactus-classical': '"Cactus Classical Serif", "Outfit", system-ui, serif',
  'noto-znamenny': '"Noto Znamenny Musical Notation", "Outfit", system-ui, serif',
};

interface Theme {
  name: ThemeName;
  label: string;
  colors: {
    bg: string;
    bgSecondary: string;
    text: string;
    textMuted: string;
    primary: string;
    primaryHover: string;
    accent: string;
    border: string;
    cardBg: string;
    headerBg: string;
    bannerBg: string;
    bannerText: string;
    bannerButtonBg: string;
    bannerButtonText: string;
    bannerErrorText: string;
    bannerInputBg: string;
    bannerInputText: string;
    bannerInputPlaceholder: string;
  };
}

export const themes: Record<ThemeName, Theme> = {
  classic: {
    name: 'classic',
    label: 'Classic Purple',
    colors: {
      bg: '#4a3f7a',
      bgSecondary: '#3d3466',
      text: '#f0eef5',
      textMuted: '#c4b8e8',
      primary: '#b6aaf1',
      primaryHover: '#9f8de8',
      accent: '#9f72d6',
      border: 'rgba(182, 170, 241, 0.3)',
      cardBg: 'rgba(255, 255, 255, 0.08)',
      headerBg: 'rgba(38, 33, 41, 0.85)',
      bannerBg: '#3d3466',
      bannerText: '#f0eef5',
      bannerButtonBg: '#b6aaf1',
      bannerButtonText: '#262129',
      bannerErrorText: '#e8b4b4',
      bannerInputBg: 'rgba(255, 255, 255, 0.15)',
      bannerInputText: '#f0eef5',
      bannerInputPlaceholder: '#a89cc4',
    },
  },
  noir: {
    name: 'noir',
    label: 'Noir',
    colors: {
      bg: '#18181b',
      bgSecondary: '#0f0f10',
      text: '#fafafa',
      textMuted: '#a1a1aa',
      primary: '#f97316',
      primaryHover: '#ea580c',
      accent: '#f59e0b',
      border: 'rgba(250, 250, 250, 0.1)',
      cardBg: 'rgba(255, 255, 255, 0.04)',
      headerBg: 'rgba(15, 15, 16, 0.85)',
      bannerBg: '#0f0f10',
      bannerText: '#fafafa',
      bannerButtonBg: '#f97316',
      bannerButtonText: '#18181b',
      bannerErrorText: '#fca5a5',
      bannerInputBg: 'rgba(255, 255, 255, 0.08)',
      bannerInputText: '#fafafa',
      bannerInputPlaceholder: '#71717a',
    },
  },
  violet: {
    name: 'violet',
    label: 'Violet',
    colors: {
      bg: '#5756c8',
      bgSecondary: '#4a49a8',
      text: '#f0eef5',
      textMuted: '#c4b8e8',
      primary: '#b6aaf1',
      primaryHover: '#9f8de8',
      accent: '#9f72d6',
      border: 'rgba(182, 170, 241, 0.3)',
      cardBg: 'rgba(255, 255, 255, 0.08)',
      headerBg: 'rgba(38, 33, 41, 0.85)',
      bannerBg: '#5e5392',
      bannerText: '#f0eef5',
      bannerButtonBg: '#b6aaf1',
      bannerButtonText: '#262129',
      bannerErrorText: '#e8b4b4',
      bannerInputBg: 'rgba(255, 255, 255, 0.15)',
      bannerInputText: '#f0eef5',
      bannerInputPlaceholder: '#a89cc4',
    },
  },
  indigo: {
    name: 'indigo',
    label: 'Indigo',
    colors: {
      bg: '#5e43a8',
      bgSecondary: '#4e3890',
      text: '#eaf5f5',
      textMuted: '#a3cccc',
      primary: '#7dd3d3',
      primaryHover: '#5cb8b8',
      accent: '#4db8a4',
      border: 'rgba(125, 211, 211, 0.3)',
      cardBg: 'rgba(255, 255, 255, 0.08)',
      headerBg: 'rgba(80, 57, 143, 0.85)',
      bannerBg: '#4e3890',
      bannerText: '#eaf5f5',
      bannerButtonBg: '#7dd3d3',
      bannerButtonText: '#5e43a8',
      bannerErrorText: '#e8b4b4',
      bannerInputBg: 'rgba(255, 255, 255, 0.15)',
      bannerInputText: '#eaf5f5',
      bannerInputPlaceholder: '#80b3b3',
    },
  },
  dusk: {
    name: 'dusk',
    label: 'Dusk',
    colors: {
      bg: '#1e1e4a',
      bgSecondary: '#16163a',
      text: '#f5efe8',
      textMuted: '#cc9aab',
      primary: '#f08aab',
      primaryHover: '#e06e92',
      accent: '#e87da0',
      border: 'rgba(240, 138, 171, 0.3)',
      cardBg: 'rgba(255, 255, 255, 0.08)',
      headerBg: 'rgba(20, 20, 50, 0.85)',
      bannerBg: '#16163a',
      bannerText: '#f5efe8',
      bannerButtonBg: '#f08aab',
      bannerButtonText: '#1e1e4a',
      bannerErrorText: '#e8b4b4',
      bannerInputBg: 'rgba(255, 255, 255, 0.15)',
      bannerInputText: '#f5efe8',
      bannerInputPlaceholder: '#b38090',
    },
  },
  lavender: {
    name: 'lavender',
    label: 'Lavender',
    colors: {
      bg: '#7e5ab5',
      bgSecondary: '#7151a3',
      text: '#f0eef5',
      textMuted: '#c7b3d9',
      primary: '#b79bd9',
      primaryHover: '#9c84b9',
      accent: '#b79bd9',
      border: 'rgba(183, 155, 217, 0.3)',
      cardBg: 'rgba(255, 255, 255, 0.08)',
      headerBg: 'rgba(108, 77, 154, 0.85)',
      bannerBg: '#7151a3',
      bannerText: '#f0eef5',
      bannerButtonBg: '#b79bd9',
      bannerButtonText: '#3d2a5e',
      bannerErrorText: '#f87171',
      bannerInputBg: 'rgba(255, 255, 255, 0.15)',
      bannerInputText: '#f0eef5',
      bannerInputPlaceholder: '#b8a2ca',
    },
  },
  light: {
    name: 'light',
    label: 'Light',
    colors: {
      bg: '#fcfcfc',
      bgSecondary: '#f5f5f5',
      text: '#1f2937',
      textMuted: '#6b7280',
      primary: '#ea580c',
      primaryHover: '#c2410c',
      accent: '#f97316',
      border: '#e5e7eb',
      cardBg: '#ffffff',
      headerBg: '#ffffff',
      bannerBg: 'linear-gradient(to right, #f97316, #ea580c)',
      bannerText: '#ffffff',
      bannerButtonBg: '#ffffff',
      bannerButtonText: '#ea580c',
      bannerErrorText: '#fed7aa',
      bannerInputBg: '#ffffff',
      bannerInputText: '#1f2937',
      bannerInputPlaceholder: '#9ca3af',
    },
  },
};

interface ThemeSlot {
  themeName: ThemeName;
  bgShade: string | null;
  accentShade: string | null;
}

const DEFAULT_DAY_SLOT: ThemeSlot = { themeName: 'light', bgShade: null, accentShade: null };
const DEFAULT_NIGHT_SLOT: ThemeSlot = { themeName: 'classic', bgShade: null, accentShade: null };

const DAY_KEY = 'reddzit_theme_day';
const NIGHT_KEY = 'reddzit_theme_night';
const LEGACY_THEME_KEY = 'reddzit_theme';
const LEGACY_BG_KEY = 'reddzit_bg_shade';
const LEGACY_ACCENT_KEY = 'reddzit_accent_shade';

const readSlot = (key: string, fallback: ThemeSlot): ThemeSlot => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ThemeSlot>;
    if (!parsed.themeName || !themes[parsed.themeName as ThemeName]) return fallback;
    return {
      themeName: parsed.themeName as ThemeName,
      bgShade: typeof parsed.bgShade === 'string' ? parsed.bgShade : null,
      accentShade: typeof parsed.accentShade === 'string' ? parsed.accentShade : null,
    };
  } catch {
    return fallback;
  }
};

const writeSlot = (key: string, slot: ThemeSlot) => {
  try {
    localStorage.setItem(key, JSON.stringify(slot));
  } catch {
    // localStorage may be disabled; in-memory state still works for the session
  }
};

const runLegacyMigration = () => {
  const legacyName = localStorage.getItem(LEGACY_THEME_KEY) as ThemeName | null;
  if (!legacyName || !themes[legacyName]) return;
  const legacyBg = localStorage.getItem(LEGACY_BG_KEY);
  const legacyAccent = localStorage.getItem(LEGACY_ACCENT_KEY);
  const slot: ThemeSlot = {
    themeName: legacyName,
    bgShade: legacyBg,
    accentShade: legacyAccent,
  };
  const effectiveBg = slot.bgShade ?? themes[slot.themeName].colors.bg;
  const targetKey = luminance(effectiveBg) >= 0.2 ? DAY_KEY : NIGHT_KEY;
  // Only fill the target slot; leave the other at its default.
  writeSlot(targetKey, slot);
  localStorage.removeItem(LEGACY_THEME_KEY);
  localStorage.removeItem(LEGACY_BG_KEY);
  localStorage.removeItem(LEGACY_ACCENT_KEY);
};

const resolveMode = (): Mode => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'day';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
};

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily) => void;
  toggleFont: () => void;
  contentFont: FontFamily;
  setContentFont: (font: FontFamily) => void;
  bgShade: string | null;
  setBgShade: (color: string | null) => void;
  accentShade: string | null;
  setAccentShade: (color: string | null) => void;
  isLight: boolean;
  mode: Mode;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window !== 'undefined') runLegacyMigration();
    return resolveMode();
  });

  const [daySlot, setDaySlotState] = useState<ThemeSlot>(() => readSlot(DAY_KEY, DEFAULT_DAY_SLOT));
  const [nightSlot, setNightSlotState] = useState<ThemeSlot>(() => readSlot(NIGHT_KEY, DEFAULT_NIGHT_SLOT));

  const [fontFamily, setFontFamilyState] = useState<FontFamily>(() => {
    const saved = localStorage.getItem('reddzit_font') as FontFamily | null;
    return saved && fontFamilies[saved] ? saved : 'tirra';
  });

  const [contentFont, setContentFontState] = useState<FontFamily>(() => {
    const saved = localStorage.getItem('reddzit_content_font') as FontFamily | null;
    return saved && fontFamilies[saved] ? saved : 'reddit-sans';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setMode(e.matches ? 'night' : 'day');
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const activeSlot = mode === 'night' ? nightSlot : daySlot;
  const theme = themes[activeSlot.themeName];
  const themeName = activeSlot.themeName;
  const bgShade = activeSlot.bgShade;
  const accentShade = activeSlot.accentShade;
  const effectiveBg = bgShade ?? theme.colors.bg;
  const isLight = luminance(effectiveBg) >= 0.2;

  useEffect(() => {
    const root = document.documentElement;
    if (accentShade || bgShade) {
      const effectiveAccent = accentShade ?? theme.colors.primary;
      const derived = deriveColors(effectiveBg, effectiveAccent);
      Object.entries(derived).forEach(([key, value]) => {
        root.style.setProperty(`--theme-${key}`, value);
      });
      document.body.style.backgroundColor = effectiveBg;
      document.body.style.color = derived.text;
    } else {
      Object.entries(theme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--theme-${key}`, value);
      });
      document.body.style.backgroundColor = theme.colors.bg;
      document.body.style.color = theme.colors.text;
    }
  }, [theme, bgShade, accentShade, effectiveBg]);

  useEffect(() => {
    localStorage.setItem('reddzit_font', fontFamily);
    document.documentElement.setAttribute('data-font', fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    localStorage.setItem('reddzit_content_font', contentFont);
  }, [contentFont]);

  const updateActiveSlot = (updater: (slot: ThemeSlot) => ThemeSlot) => {
    if (mode === 'night') {
      setNightSlotState(prev => {
        const next = updater(prev);
        writeSlot(NIGHT_KEY, next);
        return next;
      });
    } else {
      setDaySlotState(prev => {
        const next = updater(prev);
        writeSlot(DAY_KEY, next);
        return next;
      });
    }
  };

  const setTheme = (name: ThemeName) => {
    if (!themes[name]) return;
    updateActiveSlot(() => ({ themeName: name, bgShade: null, accentShade: null }));
  };

  const setBgShade = (color: string | null) => {
    updateActiveSlot(prev => ({ ...prev, bgShade: color }));
  };

  const setAccentShade = (color: string | null) => {
    updateActiveSlot(prev => ({ ...prev, accentShade: color }));
  };

  const setFontFamily = (font: FontFamily) => {
    if (fontFamilies[font]) setFontFamilyState(font);
  };

  const setContentFont = (font: FontFamily) => {
    if (fontFamilies[font]) setContentFontState(font);
  };

  const toggleFont = () => {
    setFontFamilyState(prev => prev === 'brygada' ? 'outfit' : 'brygada');
  };

  const value = useMemo<ThemeContextType>(() => ({
    theme,
    themeName,
    setTheme,
    fontFamily,
    setFontFamily,
    toggleFont,
    contentFont,
    setContentFont,
    bgShade,
    setBgShade,
    accentShade,
    setAccentShade,
    isLight,
    mode,
  }), [theme, themeName, fontFamily, contentFont, bgShade, accentShade, isLight, mode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
