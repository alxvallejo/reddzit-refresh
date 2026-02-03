import { useState, useRef, useEffect } from 'react';
import { useTheme, themes, ThemeName, FontFamily } from '../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette, faCheck, faTimes, faCopy, faSave } from '@fortawesome/free-solid-svg-icons';
import { loadPalettes, savePalette, deletePalette, SavedPalette } from '../utils/palettes';
import { deriveColors } from '../utils/deriveColors';

const fontOptions: { key: FontFamily; label: string }[] = [
  { key: 'brygada', label: 'Brygada 1918' },
  { key: 'outfit', label: 'Outfit' },
  { key: 'libertinus', label: 'Libertinus Math' },
  { key: 'tirra', label: 'Tirra' },
  { key: 'reddit-sans', label: 'Reddit Sans' },
  { key: 'zalando-sans', label: 'Zalando Sans' },
  { key: 'cactus-classical', label: 'Cactus Classical' },
  { key: 'noto-znamenny', label: 'Noto Znamenny' },
];

const ThemeSwitcher = () => {
  const { themeName, setTheme, fontFamily, setFontFamily, theme, bgShade, setBgShade, accentShade, setAccentShade } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [palettes, setPalettes] = useState<SavedPalette[]>(loadPalettes);
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isLight = themeName === 'light';

  const hasOverrides = bgShade !== null || accentShade !== null;

  const activePaletteName = hasOverrides
    ? palettes.find(
        (p) =>
          p.baseTheme === themeName &&
          p.bg === (bgShade ?? theme.colors.bg) &&
          p.accent === (accentShade ?? theme.colors.primary),
      )?.name ?? null
    : null;

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
    // We need to set the base theme first, then apply overrides.
    // But setTheme clears overrides, so we apply them after a tick.
    setTheme(p.baseTheme as ThemeName);
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

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border-none cursor-pointer ${
          isLight
            ? 'text-gray-700 hover:bg-gray-100 bg-transparent'
            : 'text-gray-200 hover:bg-white/10 bg-transparent'
        }`}
        aria-label="Change theme"
      >
        <FontAwesomeIcon icon={faPalette} className="text-sm" />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 top-full mt-2 w-60 rounded-xl shadow-xl py-2 border z-50 ${
            isLight
              ? 'bg-white border-gray-100'
              : 'bg-[var(--theme-bgSecondary)] border-[var(--theme-border)]'
          }`}
        >
          <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider ${
            isLight ? 'text-gray-400' : 'text-gray-400'
          }`}>
            Theme
          </div>
          {(Object.keys(themes) as ThemeName[]).map((key) => {
            const t = themes[key];
            const isActive = key === themeName && !hasOverrides;
            return (
              <button
                key={key}
                onClick={() => {
                  setTheme(key);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left border-none cursor-pointer transition-colors ${
                  isLight
                    ? `${isActive ? 'bg-orange-50 text-orange-700' : 'text-gray-700 hover:bg-gray-50'} bg-transparent`
                    : `${isActive ? 'bg-white/10 text-white' : 'text-gray-200 hover:bg-white/5'} bg-transparent`
                }`}
              >
                {/* Color preview swatch */}
                <span
                  className="w-5 h-5 rounded-full border-2 flex-shrink-0"
                  style={{
                    backgroundColor: t.colors.bg,
                    borderColor: t.colors.primary,
                  }}
                />
                <span className="flex-1">{t.label}</span>
                {isActive && (
                  <FontAwesomeIcon icon={faCheck} className="text-xs opacity-70" />
                )}
              </button>
            );
          })}

          {palettes.length > 0 && (
            <>
              <hr className={`my-2 ${isLight ? 'border-gray-100' : 'border-white/10'}`} />
              <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400`}>
                Saved Palettes
              </div>
              {palettes.map((p) => {
                const isPaletteActive = activePaletteName === p.name;
                return (
                <div key={p.name} className="flex items-center">
                  <button
                    onClick={() => handleApplyPalette(p)}
                    className={`flex-1 flex items-center gap-3 px-4 py-2.5 text-sm text-left border-none cursor-pointer transition-colors ${
                      isLight
                        ? `${isPaletteActive ? 'bg-orange-50 text-orange-700' : 'text-gray-700 hover:bg-gray-50'} bg-transparent`
                        : `${isPaletteActive ? 'bg-white/10 text-white' : 'text-gray-200 hover:bg-white/5'} bg-transparent`
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full border-2 flex-shrink-0" style={{ backgroundColor: p.bg, borderColor: p.accent }} />
                    <span className="flex-1">{p.name}</span>
                    {isPaletteActive && (
                      <FontAwesomeIcon icon={faCheck} className="text-xs opacity-70" />
                    )}
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
                );
              })}
            </>
          )}

          <hr className={`my-2 ${isLight ? 'border-gray-100' : 'border-white/10'}`} />

          <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider ${
            isLight ? 'text-gray-400' : 'text-gray-400'
          }`}>
            Font
          </div>
          {fontOptions.map((font) => {
            const isActive = font.key === fontFamily;
            return (
              <button
                key={font.key}
                onClick={() => {
                  setFontFamily(font.key);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left border-none cursor-pointer transition-colors ${
                  isLight
                    ? `${isActive ? 'bg-orange-50 text-orange-700' : 'text-gray-700 hover:bg-gray-50'} bg-transparent`
                    : `${isActive ? 'bg-white/10 text-white' : 'text-gray-200 hover:bg-white/5'} bg-transparent`
                }`}
              >
                <span className="flex-1">{font.label}</span>
                {isActive && (
                  <FontAwesomeIcon icon={faCheck} className="text-xs opacity-70" />
                )}
              </button>
            );
          })}

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
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-full text-sm font-medium shadow-lg ${isLight ? 'bg-orange-500 text-white' : ''}`} style={!isLight ? { backgroundColor: 'var(--theme-primary)', color: 'var(--theme-bg)' } : undefined}>
          {toast}
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;
