import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFont, faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontFamily, fontFamilies } from '../context/ThemeContext';

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

interface ReadControlsProps {
    fontSize: number;
    setSize: (size: number) => void;
    contentFont?: FontFamily;
    setContentFont?: (font: FontFamily) => void;
}

const ReadControls: React.FC<ReadControlsProps> = ({ fontSize, setSize, contentFont, setContentFont }) => {
    const increment = 2;
    const btnClass = "bg-white/20 hover:bg-white/30 text-white font-bold rounded-lg transition-colors flex items-center justify-center backdrop-blur-sm cursor-pointer border-none";
    const [fontMenuOpen, setFontMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!fontMenuOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setFontMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [fontMenuOpen]);

    return (
        <div className="flex items-center gap-2">
            {contentFont && setContentFont && (
                <div className="relative" ref={menuRef}>
                    <button
                        className={`${btnClass} h-8 px-2 text-xs`}
                        onClick={() => setFontMenuOpen(!fontMenuOpen)}
                        aria-label="Change content font"
                    >
                        <FontAwesomeIcon icon={faFont} className="text-sm" />
                    </button>

                    {fontMenuOpen && (
                        <div className="absolute right-0 bottom-full mb-2 w-48 rounded-xl shadow-2xl py-1 border z-50 bg-[var(--theme-bgSecondary,_#3d3466)] border-white/20">
                            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
                                Reading Font
                            </div>
                            {fontOptions.map((font) => {
                                const isActive = font.key === contentFont;
                                return (
                                    <button
                                        key={font.key}
                                        onClick={() => {
                                            setContentFont(font.key);
                                            setFontMenuOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left border-none cursor-pointer transition-colors bg-transparent ${
                                            isActive
                                                ? 'text-white bg-white/10'
                                                : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                        }`}
                                        style={{ fontFamily: fontFamilies[font.key] }}
                                    >
                                        <span className="flex-1">{font.label}</span>
                                        {isActive && (
                                            <FontAwesomeIcon icon={faCheck} className="text-xs opacity-70" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            <button
                className={`${btnClass} w-8 h-8 text-sm`}
                onClick={() => setSize(Math.max(12, fontSize - increment))}
                aria-label="Decrease font size"
            >
                A
            </button>
            <button
                className={`${btnClass} w-10 h-10 text-lg`}
                onClick={() => setSize(Math.min(32, fontSize + increment))}
                aria-label="Increase font size"
            >
                A
            </button>
        </div>
    );
};

export default ReadControls;
