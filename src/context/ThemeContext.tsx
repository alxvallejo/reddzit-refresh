import React, { createContext, useContext, useState, useEffect } from 'react';
import { deriveColors, luminance } from '../utils/deriveColors';

export type ThemeName = 'classic' | 'violet' | 'indigo' | 'dusk' | 'lavender' | 'light';
export type FontFamily = 'brygada' | 'outfit' | 'libertinus' | 'tirra' | 'reddit-sans' | 'zalando-sans' | 'cactus-classical' | 'noto-znamenny';

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

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
  toggleTheme: () => void;
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
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('reddzit_theme') as ThemeName | null;
    return saved && themes[saved] ? saved : 'classic';
  });

  const [fontFamily, setFontFamilyState] = useState<FontFamily>(() => {
    const saved = localStorage.getItem('reddzit_font') as FontFamily | null;
    return saved && fontFamilies[saved] ? saved : 'outfit';
  });

  const [contentFont, setContentFontState] = useState<FontFamily>(() => {
    const saved = localStorage.getItem('reddzit_content_font') as FontFamily | null;
    return saved && fontFamilies[saved] ? saved : 'cactus-classical';
  });

  const [bgShade, setBgShadeState] = useState<string | null>(() => {
    return localStorage.getItem('reddzit_bg_shade');
  });

  const [accentShade, setAccentShadeState] = useState<string | null>(() => {
    return localStorage.getItem('reddzit_accent_shade');
  });

  const theme = themes[themeName];
  const effectiveBg = bgShade ?? theme.colors.bg;
  const isLight = luminance(effectiveBg) >= 0.2;

  useEffect(() => {
    localStorage.setItem('reddzit_theme', themeName);
    const root = document.documentElement;

    if (accentShade || bgShade) {
      const effectiveBg = bgShade ?? theme.colors.bg;
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
  }, [themeName, theme, bgShade, accentShade]);

  useEffect(() => {
    localStorage.setItem('reddzit_font', fontFamily);
    // Set data attribute for CSS to use
    document.documentElement.setAttribute('data-font', fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    localStorage.setItem('reddzit_content_font', contentFont);
  }, [contentFont]);

  const setTheme = (name: ThemeName) => {
    if (themes[name]) {
      setBgShade(null);
      setAccentShade(null);
      setThemeName(name);
    }
  };

  const toggleTheme = () => {
    setThemeName(prev => prev === 'classic' ? 'light' : 'classic');
  };

  const setFontFamily = (font: FontFamily) => {
    if (fontFamilies[font]) {
      setFontFamilyState(font);
    }
  };

  const setContentFont = (font: FontFamily) => {
    if (fontFamilies[font]) {
      setContentFontState(font);
    }
  };

  const toggleFont = () => {
    setFontFamilyState(prev => prev === 'brygada' ? 'outfit' : 'brygada');
  };

  const setBgShade = (color: string | null) => {
    setBgShadeState(color);
    if (color) {
      localStorage.setItem('reddzit_bg_shade', color);
    } else {
      localStorage.removeItem('reddzit_bg_shade');
    }
  };

  const setAccentShade = (color: string | null) => {
    setAccentShadeState(color);
    if (color) {
      localStorage.setItem('reddzit_accent_shade', color);
    } else {
      localStorage.removeItem('reddzit_accent_shade');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, themeName, setTheme, toggleTheme, fontFamily, setFontFamily, toggleFont, contentFont, setContentFont, bgShade, setBgShade, accentShade, setAccentShade, isLight }}>
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
