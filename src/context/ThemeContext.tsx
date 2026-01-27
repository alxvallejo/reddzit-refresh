import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeName = 'classic' | 'light';
export type FontFamily = 'google-sans' | 'outfit';

const fontFamilies: Record<FontFamily, string> = {
  'google-sans': '"Google Sans Flex", "Outfit", "Open Sans", system-ui, sans-serif',
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

  const theme = themes[themeName];

  useEffect(() => {
    localStorage.setItem('reddzit_theme', themeName);

    // Apply CSS variables to document root
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });

    // Update body background
    document.body.style.backgroundColor = theme.colors.bg;
    document.body.style.color = theme.colors.text;
  }, [themeName, theme]);

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
    setFontFamilyState(prev => prev === 'google-sans' ? 'outfit' : 'google-sans');
  };

  return (
    <ThemeContext.Provider value={{ theme, themeName, setTheme, toggleTheme, fontFamily, setFontFamily, toggleFont }}>
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
