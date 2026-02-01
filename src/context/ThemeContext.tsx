import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeName = 'classic' | 'violet' | 'teal' | 'light';
export type FontFamily = 'brygada' | 'outfit';

const fontFamilies: Record<FontFamily, string> = {
  'brygada': '"Brygada 1918", "Outfit", system-ui, serif',
  'outfit': '"Outfit", "Open Sans", system-ui, sans-serif',
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
      bg: '#7063ab',
      bgSecondary: '#5e5392',
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
  teal: {
    name: 'teal',
    label: 'Teal',
    colors: {
      bg: '#2d5a5a',
      bgSecondary: '#234a4a',
      text: '#eaf5f5',
      textMuted: '#a3cccc',
      primary: '#7dd3d3',
      primaryHover: '#5cb8b8',
      accent: '#4db8a4',
      border: 'rgba(125, 211, 211, 0.3)',
      cardBg: 'rgba(255, 255, 255, 0.08)',
      headerBg: 'rgba(30, 50, 50, 0.85)',
      bannerBg: '#234a4a',
      bannerText: '#eaf5f5',
      bannerButtonBg: '#7dd3d3',
      bannerButtonText: '#1e3232',
      bannerErrorText: '#e8b4b4',
      bannerInputBg: 'rgba(255, 255, 255, 0.15)',
      bannerInputText: '#eaf5f5',
      bannerInputPlaceholder: '#80b3b3',
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
  bgShade: string | null;
  setBgShade: (color: string | null) => void;
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

  const [bgShade, setBgShadeState] = useState<string | null>(() => {
    return localStorage.getItem('reddzit_bg_shade');
  });

  const theme = themes[themeName];

  useEffect(() => {
    localStorage.setItem('reddzit_theme', themeName);

    // Apply CSS variables to document root
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });

    // Apply bgShade override if set
    const effectiveBg = bgShade ?? theme.colors.bg;
    root.style.setProperty('--theme-bg', effectiveBg);
    document.body.style.backgroundColor = effectiveBg;
    document.body.style.color = theme.colors.text;
  }, [themeName, theme, bgShade]);

  useEffect(() => {
    localStorage.setItem('reddzit_font', fontFamily);
    // Set data attribute for CSS to use
    document.documentElement.setAttribute('data-font', fontFamily);
  }, [fontFamily]);

  const setTheme = (name: ThemeName) => {
    if (themes[name]) {
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

  return (
    <ThemeContext.Provider value={{ theme, themeName, setTheme, toggleTheme, fontFamily, setFontFamily, toggleFont, bgShade, setBgShade }}>
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
