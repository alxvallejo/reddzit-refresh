import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuoteLeft } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

interface QuoteSelectionButtonProps {
  position: { top: number; left: number };
  onClick: () => void;
}

export default function QuoteSelectionButton({ position, onClick }: QuoteSelectionButtonProps) {
  const { themeName } = useTheme();

  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        zIndex: 60
      }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium shadow-lg transition-all border-none cursor-pointer ${
        themeName === 'light'
          ? 'bg-orange-600 text-white hover:bg-orange-700'
          : 'bg-[#7e87ef] text-white hover:bg-[#6b74e0]'
      }`}
    >
      <FontAwesomeIcon icon={faQuoteLeft} className="text-xs" />
      Save Quote
    </button>
  );
}
