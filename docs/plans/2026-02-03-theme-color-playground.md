# Theme Color Playground Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add accent color picker, saved palettes, and "Copy as Code" export to the existing ThemeSwitcher dropdown, allowing live experimentation with color combinations while preserving all existing themes.

**Architecture:** Extend ThemeContext with `accentShade` state (mirrors existing `bgShade`). Add a `deriveColors` utility that generates all 18 CSS variables from a background + accent pair. Saved palettes stored in localStorage. ThemeSwitcher UI gets new sections for saved palettes, accent picker, and action buttons.

**Tech Stack:** React, TypeScript, existing ThemeContext, localStorage

---

### Task 1: Add `deriveColors` utility

**Files:**
- Create: `src/utils/deriveColors.ts`

**Step 1: Create the color derivation utility**

```typescript
// src/utils/deriveColors.ts

/**
 * Parse a hex color to RGB components.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
}

/**
 * Darken a hex color by a percentage (0-1).
 */
function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

/**
 * Mix two hex colors. ratio=0 returns color1, ratio=1 returns color2.
 */
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
 * Returns relative luminance (0-1) for contrast decisions.
 */
function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Derive all 18 theme color variables from a background and accent color.
 */
export function deriveColors(bg: string, accent: string): Record<string, string> {
  const isDark = luminance(bg) < 0.2;
  const text = isDark ? '#f0eef5' : '#1f2937';
  const textMuted = mix(accent, text, 0.4);

  return {
    bg,
    bgSecondary: darken(bg, 0.1),
    text,
    textMuted,
    primary: accent,
    primaryHover: darken(accent, 0.15),
    accent,
    border: (() => {
      const { r, g, b } = hexToRgb(accent);
      return `rgba(${r}, ${g}, ${b}, 0.3)`;
    })(),
    cardBg: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.2)',
    headerBg: (() => {
      const { r, g, b } = hexToRgb(darken(bg, 0.15));
      return `rgba(${r}, ${g}, ${b}, 0.85)`;
    })(),
    bannerBg: darken(bg, 0.1),
    bannerText: text,
    bannerButtonBg: accent,
    bannerButtonText: luminance(accent) > 0.4 ? '#1e1e4a' : '#f0eef5',
    bannerErrorText: isDark ? '#f87171' : '#8b2020',
    bannerInputBg: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.3)',
    bannerInputText: text,
    bannerInputPlaceholder: mix(text, bg, 0.5),
  };
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit src/utils/deriveColors.ts` or check that the dev server has no errors.

**Step 3: Commit**

```bash
git add src/utils/deriveColors.ts
git commit -m "feat: add deriveColors utility for theme color playground"
```

---

### Task 2: Add `accentShade` state to ThemeContext

**Files:**
- Modify: `src/context/ThemeContext.tsx`

**Step 1: Add accentShade state and expose it via context**

In `ThemeContext.tsx`, make these changes:

1. Add to the `ThemeContextType` interface (line 184-194):
   ```typescript
   accentShade: string | null;
   setAccentShade: (color: string | null) => void;
   ```

2. Add state in `ThemeProvider` (after the bgShade state, around line 211):
   ```typescript
   const [accentShade, setAccentShadeState] = useState<string | null>(() => {
     return localStorage.getItem('reddzit_accent_shade');
   });
   ```

3. Add setter function (after the `setBgShade` function, around line 265):
   ```typescript
   const setAccentShade = (color: string | null) => {
     setAccentShadeState(color);
     if (color) {
       localStorage.setItem('reddzit_accent_shade', color);
     } else {
       localStorage.removeItem('reddzit_accent_shade');
     }
   };
   ```

4. In the main `useEffect` that applies CSS variables (lines 215-229), add logic to apply derived colors when accentShade is set. Import `deriveColors` from `../utils/deriveColors` and update the effect:
   ```typescript
   useEffect(() => {
     localStorage.setItem('reddzit_theme', themeName);
     const root = document.documentElement;

     if (accentShade || bgShade) {
       // Derive all colors from overrides
       const effectiveBg = bgShade ?? theme.colors.bg;
       const effectiveAccent = accentShade ?? theme.colors.primary;
       const derived = deriveColors(effectiveBg, effectiveAccent);
       Object.entries(derived).forEach(([key, value]) => {
         root.style.setProperty(`--theme-${key}`, value);
       });
       document.body.style.backgroundColor = effectiveBg;
       document.body.style.color = derived.text;
     } else {
       // Apply base theme colors as-is
       Object.entries(theme.colors).forEach(([key, value]) => {
         root.style.setProperty(`--theme-${key}`, value);
       });
       document.body.style.backgroundColor = theme.colors.bg;
       document.body.style.color = theme.colors.text;
     }
   }, [themeName, theme, bgShade, accentShade]);
   ```

5. Update `setTheme` to also clear accentShade when switching themes:
   ```typescript
   const setTheme = (name: ThemeName) => {
     if (themes[name]) {
       setBgShade(null);
       setAccentShade(null);
       setThemeName(name);
     }
   };
   ```

6. Add `accentShade` and `setAccentShade` to the Provider value:
   ```typescript
   <ThemeContext.Provider value={{ theme, themeName, setTheme, toggleTheme, fontFamily, setFontFamily, toggleFont, bgShade, setBgShade, accentShade, setAccentShade }}>
   ```

**Step 2: Verify dev server shows no errors**

Run: `npm run dev` and confirm no TypeScript or runtime errors.

**Step 3: Commit**

```bash
git add src/context/ThemeContext.tsx
git commit -m "feat: add accentShade state to ThemeContext with deriveColors integration"
```

---

### Task 3: Add saved palettes to localStorage

**Files:**
- Create: `src/utils/palettes.ts`

**Step 1: Create palette storage utility**

```typescript
// src/utils/palettes.ts

export interface SavedPalette {
  name: string;
  bg: string;
  accent: string;
  baseTheme: string;
}

const STORAGE_KEY = 'reddzit_palettes';

export function loadPalettes(): SavedPalette[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePalette(palette: SavedPalette): SavedPalette[] {
  const palettes = loadPalettes();
  // Replace if same name exists, otherwise append
  const idx = palettes.findIndex(p => p.name === palette.name);
  if (idx >= 0) {
    palettes[idx] = palette;
  } else {
    palettes.push(palette);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(palettes));
  return palettes;
}

export function deletePalette(name: string): SavedPalette[] {
  const palettes = loadPalettes().filter(p => p.name !== name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(palettes));
  return palettes;
}
```

**Step 2: Commit**

```bash
git add src/utils/palettes.ts
git commit -m "feat: add palette save/load/delete localStorage utility"
```

---

### Task 4: Update ThemeSwitcher UI

**Files:**
- Modify: `src/components/ThemeSwitcher.tsx`

This is the main UI task. The ThemeSwitcher dropdown gets expanded with these sections in order:

1. Built-in themes (existing, unchanged)
2. Saved palettes (new -- only shows if palettes exist)
3. Font selector (existing, unchanged)
4. Customize Colors section header with bg picker (existing) + accent picker (new)
5. Actions row: "Save Palette" + "Copy as Code" buttons (visible when overrides active), "Reset" clears both

**Step 1: Update imports and add state**

At the top of `ThemeSwitcher.tsx`:
```typescript
import { useState, useRef, useEffect } from 'react';
import { useTheme, themes, ThemeName, FontFamily } from '../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette, faCheck, faTimes, faCopy, faSave } from '@fortawesome/free-solid-svg-icons';
import { loadPalettes, savePalette, deletePalette, SavedPalette } from '../utils/palettes';
import { deriveColors } from '../utils/deriveColors';
```

Inside the component, add state:
```typescript
const { themeName, setTheme, fontFamily, setFontFamily, theme, bgShade, setBgShade, accentShade, setAccentShade } = useTheme();
const [isOpen, setIsOpen] = useState(false);
const [palettes, setPalettes] = useState<SavedPalette[]>(loadPalettes);
const [saveName, setSaveName] = useState('');
const [showSaveInput, setShowSaveInput] = useState(false);
const [toast, setToast] = useState<string | null>(null);
const menuRef = useRef<HTMLDivElement>(null);
```

**Step 2: Add helper functions**

```typescript
const hasOverrides = bgShade !== null || accentShade !== null;

const showToast = (msg: string) => {
  setToast(msg);
  setTimeout(() => setToast(null), 2000);
};

const handleSavePalette = () => {
  if (!saveName.trim()) return;
  const updated = savePalette({
    name: saveName.trim(),
    bg: bgShade ?? theme.colors.bg,
    accent: accentShade ?? theme.colors.primary,
    baseTheme: themeName,
  });
  setPalettes(updated);
  setSaveName('');
  setShowSaveInput(false);
  showToast('Palette saved!');
};

const handleDeletePalette = (name: string) => {
  setPalettes(deletePalette(name));
};

const handleApplyPalette = (p: SavedPalette) => {
  setTheme(p.baseTheme as ThemeName);
  // setTheme clears overrides, so we need to re-apply after a tick
  setTimeout(() => {
    setBgShade(p.bg);
    setAccentShade(p.accent);
  }, 0);
};

const handleCopyAsCode = () => {
  const effectiveBg = bgShade ?? theme.colors.bg;
  const effectiveAccent = accentShade ?? theme.colors.primary;
  const colors = deriveColors(effectiveBg, effectiveAccent);
  const code = `{
  name: 'custom',
  label: 'Custom',
  colors: ${JSON.stringify(colors, null, 4)},
}`;
  navigator.clipboard.writeText(code);
  showToast('Copied to clipboard!');
};

const handleReset = () => {
  setBgShade(null);
  setAccentShade(null);
};
```

**Step 3: Update the JSX**

Replace everything inside the dropdown `<div>` (the `isOpen &&` block) with the new layout. The full JSX is lengthy so here's the structure -- each section uses the same styling patterns already in the file:

1. **"Theme" header + built-in theme buttons** -- keep exactly as-is (lines 52-87)

2. **Saved palettes section** (insert after theme buttons, before Font hr):
   ```tsx
   {palettes.length > 0 && (
     <>
       <hr className={`my-2 ${isLight ? 'border-gray-100' : 'border-white/10'}`} />
       <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400`}>
         Saved Palettes
       </div>
       {palettes.map((p) => (
         <div key={p.name} className="flex items-center">
           <button
             onClick={() => handleApplyPalette(p)}
             className={`flex-1 flex items-center gap-3 px-4 py-2.5 text-sm text-left border-none cursor-pointer transition-colors ${
               isLight ? 'text-gray-700 hover:bg-gray-50 bg-transparent' : 'text-gray-200 hover:bg-white/5 bg-transparent'
             }`}
           >
             <span className="w-5 h-5 rounded-full border-2 flex-shrink-0" style={{ backgroundColor: p.bg, borderColor: p.accent }} />
             <span className="flex-1">{p.name}</span>
           </button>
           <button
             onClick={() => handleDeletePalette(p.name)}
             className={`px-2 py-1 mr-2 text-xs border-none cursor-pointer bg-transparent transition-colors ${
               isLight ? 'text-gray-400 hover:text-red-500' : 'text-gray-500 hover:text-red-400'
             }`}
           >
             <FontAwesomeIcon icon={faTimes} />
           </button>
         </div>
       ))}
     </>
   )}
   ```

3. **Font section** -- keep exactly as-is (lines 89-117)

4. **Customize Colors section** -- replace existing "Background" section (lines 119-148) with:
   ```tsx
   <hr className={`my-2 ${isLight ? 'border-gray-100' : 'border-white/10'}`} />
   <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400`}>
     Customize Colors
   </div>
   {/* Background picker */}
   <div className="px-4 py-1.5 flex items-center gap-2">
     <input type="color" value={bgShade ?? theme.colors.bg} onChange={(e) => setBgShade(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-none bg-transparent p-0" />
     <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>BG</span>
     <span className={`flex-1 text-xs font-mono ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>{bgShade ?? theme.colors.bg}</span>
   </div>
   {/* Accent picker */}
   <div className="px-4 py-1.5 flex items-center gap-2">
     <input type="color" value={accentShade ?? theme.colors.primary} onChange={(e) => setAccentShade(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-none bg-transparent p-0" />
     <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>Accent</span>
     <span className={`flex-1 text-xs font-mono ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>{accentShade ?? theme.colors.primary}</span>
   </div>
   ```

5. **Action buttons** (below the pickers):
   ```tsx
   {hasOverrides && (
     <div className="px-4 py-2 flex items-center gap-2">
       <button onClick={() => setShowSaveInput(!showSaveInput)} className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded cursor-pointer border-none transition-colors ${isLight ? 'text-orange-600 hover:bg-orange-50 bg-transparent' : 'text-[var(--theme-primary)] hover:bg-white/10 bg-transparent'}`}>
         <FontAwesomeIcon icon={faSave} /> Save
       </button>
       <button onClick={handleCopyAsCode} className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded cursor-pointer border-none transition-colors ${isLight ? 'text-orange-600 hover:bg-orange-50 bg-transparent' : 'text-[var(--theme-primary)] hover:bg-white/10 bg-transparent'}`}>
         <FontAwesomeIcon icon={faCopy} /> Copy
       </button>
       <button onClick={handleReset} className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded cursor-pointer border-none transition-colors ${isLight ? 'text-gray-500 hover:bg-gray-100 bg-transparent' : 'text-gray-300 hover:bg-white/10 bg-transparent'}`}>
         Reset
       </button>
     </div>
   )}
   {showSaveInput && (
     <div className="px-4 py-2 flex items-center gap-2">
       <input
         type="text"
         value={saveName}
         onChange={(e) => setSaveName(e.target.value)}
         onKeyDown={(e) => e.key === 'Enter' && handleSavePalette()}
         placeholder="Palette name..."
         className={`flex-1 text-xs px-2 py-1.5 rounded border ${isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-white/10 border-white/20 text-gray-200'}`}
         autoFocus
       />
       <button onClick={handleSavePalette} className={`text-xs px-2 py-1.5 rounded cursor-pointer border-none ${isLight ? 'bg-orange-500 text-white' : 'bg-[var(--theme-primary)] text-[var(--theme-bg)]'}`}>
         Save
       </button>
     </div>
   )}
   ```

6. **Toast** (outside the dropdown, at the end of the component return, after the closing `</div>` of the dropdown):
   ```tsx
   {toast && (
     <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-full text-sm font-medium shadow-lg ${isLight ? 'bg-orange-500 text-white' : ''}`} style={!isLight ? { backgroundColor: 'var(--theme-primary)', color: 'var(--theme-bg)' } : undefined}>
       {toast}
     </div>
   )}
   ```

**Step 4: Verify in browser**

Run: `npm run dev` and test:
- Open ThemeSwitcher, see all 6 themes still work
- Change accent color, see live changes
- Change background color, see live changes
- Save a palette, see it in the list
- Apply a saved palette
- Delete a saved palette
- Copy as Code, paste somewhere to verify output
- Reset clears both pickers
- Switching themes clears overrides

**Step 5: Commit**

```bash
git add src/components/ThemeSwitcher.tsx
git commit -m "feat: add color playground with accent picker, saved palettes, and code export"
```

---

### Task 5: Verify all existing themes are intact

**Files:**
- None (manual verification)

**Step 1: Test each theme**

Switch through all 6 themes (classic, violet, indigo, dusk, lavender, light) with no overrides active. Verify each looks exactly as before -- the original color definitions in `ThemeContext.tsx` are never modified.

**Step 2: Test override + theme switch flow**

1. Select Dusk theme
2. Set a custom accent (e.g. orange `#f59e0b`)
3. Switch to Classic -- overrides should clear, Classic looks normal
4. Switch back to Dusk -- should be original Dusk (salmon pink), not the orange override

**Step 3: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "chore: cleanup after theme playground verification"
```
