import { useState, useRef, useEffect } from 'react';
import { useTheme, themes, ThemeName, FontFamily } from '../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette, faCheck } from '@fortawesome/free-solid-svg-icons';

const fontOptions: { key: FontFamily; label: string }[] = [
  { key: 'brygada', label: 'Brygada 1918' },
  { key: 'outfit', label: 'Outfit' },
];

const ThemeSwitcher = () => {
  const { themeName, setTheme, fontFamily, setFontFamily, theme, bgShade, setBgShade } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
          className={`absolute right-0 top-full mt-2 w-48 rounded-xl shadow-xl py-2 border z-50 ${
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
            const isActive = key === themeName;
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

          <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider ${
            isLight ? 'text-gray-400' : 'text-gray-400'
          }`}>
            Background
          </div>
          <div className="px-4 py-2 flex items-center gap-2">
            <input
              type="color"
              value={bgShade ?? theme.colors.bg}
              onChange={(e) => setBgShade(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-none bg-transparent p-0"
            />
            <span className={`flex-1 text-sm ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
              {bgShade ?? theme.colors.bg}
            </span>
            {bgShade && (
              <button
                onClick={() => setBgShade(null)}
                className={`text-xs px-2 py-1 rounded cursor-pointer border-none transition-colors ${
                  isLight
                    ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                    : 'text-gray-300 hover:bg-white/10 bg-transparent'
                }`}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;
