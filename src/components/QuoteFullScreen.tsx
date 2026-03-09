import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faEdit, faCheck, faShareAlt, faQuoteLeft, faExternalLinkAlt, faChevronLeft, faChevronRight, faFont, faPalette } from '@fortawesome/free-solid-svg-icons';
import { useTheme, FontFamily, fontFamilies } from '../context/ThemeContext';
import { Quote } from '../helpers/QuoteService';
import { isImageUrl } from '../helpers/isImageUrl';

const quoteFontOptions: { key: FontFamily; label: string }[] = [
  { key: 'brygada', label: 'Brygada 1918' },
  { key: 'outfit', label: 'Outfit' },
  { key: 'libertinus', label: 'Libertinus Math' },
  { key: 'tirra', label: 'Tirra' },
  { key: 'reddit-sans', label: 'Reddit Sans' },
  { key: 'zalando-sans', label: 'Zalando Sans' },
  { key: 'cactus-classical', label: 'Cactus Classical' },
  { key: 'noto-znamenny', label: 'Noto Znamenny' },
];

const bgPresets = [
  { color: '#1a1625', label: 'Dark Purple' },
  { color: '#1e1e4a', label: 'Deep Navy' },
  { color: '#1a2332', label: 'Dark Blue' },
  { color: '#2d1b2e', label: 'Dark Plum' },
  { color: '#1b2e1b', label: 'Dark Forest' },
  { color: '#2e2318', label: 'Dark Brown' },
  { color: '#1a1a1a', label: 'Near Black' },
  { color: '#2a1a3a', label: 'Violet Night' },
];

interface QuoteFullScreenProps {
  quote: Quote;
  onClose: () => void;
  onUpdateText: (id: string, text: string) => Promise<void>;
  onUpdateDisplay: (id: string, data: { displayFont?: string | null; displayBg?: string | null }) => Promise<void>;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalCount?: number;
}

export default function QuoteFullScreen({ quote, onClose, onUpdateText, onUpdateDisplay, onPrev, onNext, hasPrev, hasNext, currentIndex, totalCount }: QuoteFullScreenProps) {
  const { isLight } = useTheme();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(quote.text);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [bgMenuOpen, setBgMenuOpen] = useState(false);
  const [activeFont, setActiveFont] = useState<FontFamily | null>((quote.displayFont as FontFamily) || null);
  const [activeBg, setActiveBg] = useState<string | null>(quote.displayBg || null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fontMenuRef = useRef<HTMLDivElement>(null);
  const bgMenuRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editing) {
          setEditing(false);
          setEditText(quote.text);
        } else {
          onClose();
        }
      }
      if (editing) return;
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [editing, onClose, quote.text, hasPrev, hasNext, onPrev, onNext]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Auto-resize textarea and focus
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editing]);

  // Reset state when navigating to a different quote
  useEffect(() => {
    setEditText(quote.text);
    setEditing(false);
    setCopied(false);
    setFontMenuOpen(false);
    setBgMenuOpen(false);
    setActiveFont((quote.displayFont as FontFamily) || null);
    setActiveBg(quote.displayBg || null);
  }, [quote.id, quote.displayFont, quote.displayBg]);

  // Outside-click to close font menu
  useEffect(() => {
    if (!fontMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (fontMenuRef.current && !fontMenuRef.current.contains(e.target as Node)) {
        setFontMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [fontMenuOpen]);

  // Outside-click to close bg menu
  useEffect(() => {
    if (!bgMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (bgMenuRef.current && !bgMenuRef.current.contains(e.target as Node)) {
        setBgMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [bgMenuOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateText(quote.id, editText);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/q/${quote.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayDate = quote.sourceDate || quote.createdAt;
  const formattedDate = new Date(displayDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm transition-colors duration-300"
        style={{ backgroundColor: activeBg ? `${activeBg}f2` : isLight ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)' }}
        onClick={() => !editing && onClose()}
      />

      {/* Content */}
      <div className="relative w-full h-full flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            {/* Counter */}
            {currentIndex != null && totalCount != null && (
              <span className={`text-sm tabular-nums ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
                {currentIndex + 1} / {totalCount}
              </span>
            )}
            {!editing ? (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border-none cursor-pointer ${
                    isLight
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-white/10 text-gray-300 hover:bg-white/15'
                  }`}
                >
                  <FontAwesomeIcon icon={faEdit} className="text-xs" />
                  Edit
                </button>
                <button
                  onClick={handleShare}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border-none cursor-pointer ${
                    copied
                      ? isLight
                        ? 'bg-green-100 text-green-700'
                        : 'bg-green-500/20 text-green-400'
                      : isLight
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-white/10 text-gray-300 hover:bg-white/15'
                  }`}
                >
                  <FontAwesomeIcon icon={faShareAlt} className="text-xs" />
                  {copied ? 'Link copied!' : 'Share'}
                </button>
                {/* Font picker */}
                <div className="relative" ref={fontMenuRef}>
                  <button
                    onClick={() => { setFontMenuOpen(prev => !prev); setBgMenuOpen(false); }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border-none cursor-pointer ${
                      isLight
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-white/10 text-gray-300 hover:bg-white/15'
                    }`}
                  >
                    <FontAwesomeIcon icon={faFont} className="text-xs" />
                  </button>
                  {fontMenuOpen && (
                    <div className={`absolute left-0 top-full mt-1 w-52 rounded-xl shadow-2xl py-1 border z-50 ${
                      isLight
                        ? 'bg-white border-gray-200'
                        : 'bg-[var(--theme-bgSecondary,_#3d3466)] border-white/20'
                    }`}>
                      <div className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${
                        isLight ? 'text-gray-400' : 'text-white/50'
                      }`}>
                        Quote Font
                      </div>
                      {quoteFontOptions.map((font) => {
                        const isActive = font.key === activeFont;
                        return (
                          <button
                            key={font.key}
                            onClick={() => {
                              setActiveFont(font.key);
                              setFontMenuOpen(false);
                              onUpdateDisplay(quote.id, { displayFont: font.key });
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left border-none cursor-pointer transition-colors ${
                              isActive
                                ? isLight
                                  ? 'bg-orange-50 text-orange-700'
                                  : 'text-white bg-white/10'
                                : isLight
                                  ? 'bg-transparent text-gray-700 hover:bg-gray-50'
                                  : 'bg-transparent text-gray-300 hover:bg-white/5 hover:text-white'
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
                {/* Background picker */}
                <div className="relative" ref={bgMenuRef}>
                  <button
                    onClick={() => { setBgMenuOpen(prev => !prev); setFontMenuOpen(false); }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border-none cursor-pointer ${
                      isLight
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-white/10 text-gray-300 hover:bg-white/15'
                    }`}
                  >
                    <FontAwesomeIcon icon={faPalette} className="text-xs" />
                  </button>
                  {bgMenuOpen && (
                    <div className={`absolute left-0 top-full mt-1 w-52 rounded-xl shadow-2xl p-3 border z-50 ${
                      isLight
                        ? 'bg-white border-gray-200'
                        : 'bg-[var(--theme-bgSecondary,_#3d3466)] border-white/20'
                    }`}>
                      <div className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${
                        isLight ? 'text-gray-400' : 'text-white/50'
                      }`}>
                        Background
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {bgPresets.map(({ color, label }) => (
                          <button
                            key={color}
                            onClick={() => {
                              setActiveBg(color);
                              setBgMenuOpen(false);
                              onUpdateDisplay(quote.id, { displayBg: color });
                            }}
                            title={label}
                            className={`w-9 h-9 rounded-lg border-2 cursor-pointer transition-all ${
                              activeBg === color
                                ? 'border-[var(--theme-primary)] scale-110'
                                : 'border-transparent hover:border-white/30'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border-none cursor-pointer disabled:opacity-50 ${
                    isLight
                      ? 'bg-orange-600 text-white hover:bg-orange-700'
                      : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
                  }`}
                >
                  <FontAwesomeIcon icon={faCheck} className="text-xs" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditing(false); setEditText(quote.text); }}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors border-none cursor-pointer ${
                    isLight
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-white/10 text-gray-300 hover:bg-white/15'
                  }`}
                >
                  Cancel
                </button>
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors border-none cursor-pointer ${
              isLight
                ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                : 'text-gray-400 hover:bg-white/10 bg-transparent'
            }`}
          >
            <FontAwesomeIcon icon={faTimes} className="text-lg" />
          </button>
        </div>

        {/* Nav arrows — outside scrollable area so they stay fixed */}
        {hasPrev && onPrev && !editing && (
          <button
            onClick={onPrev}
            className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full transition-colors border-none cursor-pointer ${
              isLight
                ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
        )}
        {hasNext && onNext && !editing && (
          <button
            onClick={onNext}
            className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full transition-colors border-none cursor-pointer ${
              isLight
                ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                : 'bg-white/10 text-gray-400 hover:bg-white/20'
            }`}
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        )}

        {/* Quote content */}
        <div className={`flex-1 overflow-y-auto flex justify-center px-6 pb-8 ${editing ? 'items-start pt-8' : 'items-center'}`}>
          <div className="max-w-2xl w-full" data-content-font={activeFont || undefined}>
            <FontAwesomeIcon
              icon={faQuoteLeft}
              className={`text-4xl mb-6 ${isLight ? 'text-gray-200' : 'text-white/10'}`}
            />

            {editing ? (
              <textarea
                ref={textareaRef}
                value={editText}
                onChange={(e) => {
                  setEditText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                className={`w-full text-xl sm:text-2xl leading-relaxed resize-none focus:outline-none ${
                  isLight
                    ? 'bg-transparent text-gray-900 placeholder-gray-400'
                    : 'bg-transparent text-white placeholder-gray-600'
                }`}
                style={{ minHeight: '200px' }}
                placeholder="Enter quote text..."
              />
            ) : isImageUrl(quote.text) ? (
              <img
                src={quote.text}
                alt={quote.postTitle || 'Saved image'}
                className="max-w-full max-h-[60vh] rounded-xl object-contain"
              />
            ) : (
              <p className={`text-xl sm:text-2xl leading-relaxed whitespace-pre-wrap ${
                isLight ? 'text-gray-900' : 'text-white'
              }`}>
                {quote.text}
              </p>
            )}

            {/* Attribution */}
            <div className={`mt-8 pt-6 border-t ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
              {quote.postTitle && (
                <a
                  href={quote.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 text-sm font-medium no-underline mb-2 ${
                    isLight ? 'text-orange-600 hover:text-orange-700' : 'text-[var(--theme-primary)] hover:opacity-80'
                  }`}
                >
                  <FontAwesomeIcon icon={faExternalLinkAlt} className="text-xs" />
                  {quote.postTitle}
                </a>
              )}
              <div className={`flex items-center gap-2 text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                {quote.subreddit && <span>r/{quote.subreddit}</span>}
                {quote.subreddit && <span>·</span>}
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
