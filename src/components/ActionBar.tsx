import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useTheme } from '../context/ThemeContext';

export interface ActionBarItem {
  key: string;
  icon: IconDefinition;
  label: string;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  active?: boolean;
}

interface ActionBarProps {
  actions: ActionBarItem[];
  className?: string;
  // Optional controls pinned to the start/end of the pill (e.g. prev/next nav).
  leading?: ReactNode;
  trailing?: ReactNode;
}

// Presentational "pill" action bar shared with PostView's sticky footer. Full
// width with icon-only buttons on mobile; auto width with icon + label on sm+.
// `leading`/`trailing` flank the action group — used by the carousel for
// prev/next navigation.
const ActionBar = ({ actions, className = '', leading, trailing }: ActionBarProps) => {
  const { isLight } = useTheme();

  // Stop pointer events so a swipe-capturing ancestor (e.g. NewsCarousel's
  // slide) doesn't setPointerCapture on this tap and swallow the click on touch.
  const stopPointer = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <div
      className={`pointer-events-auto flex items-center gap-1 backdrop-blur-xl border px-2 sm:px-4 py-2 rounded-full shadow-2xl ${
        isLight ? 'bg-gray-900/85 border-gray-700/50 text-gray-200' : 'bg-white/8 border-white/15 text-white/80'
      } ${className}`}
    >
      {leading}
      <div className="flex flex-1 items-center justify-evenly sm:justify-center sm:gap-3">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={action.onClick}
            onPointerDown={stopPointer}
            onPointerUp={stopPointer}
            title={action.title}
            aria-label={action.title}
            aria-pressed={action.active}
            className={`flex items-center gap-2 p-3 sm:px-2 sm:py-1 text-lg sm:text-sm transition-colors border-none bg-transparent cursor-pointer font-normal tracking-wide ${
              action.active ? 'text-[var(--theme-primary)]' : 'text-inherit hover:text-white'
            }`}
          >
            <FontAwesomeIcon icon={action.icon} />
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        ))}
      </div>
      {trailing}
    </div>
  );
};

export default ActionBar;
