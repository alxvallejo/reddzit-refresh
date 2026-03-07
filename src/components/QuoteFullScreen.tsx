import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faEdit, faCheck, faShareAlt, faQuoteLeft, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { Quote } from '../helpers/QuoteService';

interface QuoteFullScreenProps {
  quote: Quote;
  onClose: () => void;
  onUpdateText: (id: string, text: string) => Promise<void>;
}

export default function QuoteFullScreen({ quote, onClose, onUpdateText }: QuoteFullScreenProps) {
  const { isLight } = useTheme();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(quote.text);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Escape key to close
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
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [editing, onClose, quote.text]);

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
        className={`absolute inset-0 ${isLight ? 'bg-white/95' : 'bg-black/95'} backdrop-blur-sm`}
        onClick={() => !editing && onClose()}
      />

      {/* Content */}
      <div className="relative w-full h-full flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
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

        {/* Quote content */}
        <div className="flex-1 overflow-y-auto flex items-center justify-center px-6 pb-8">
          <div className="max-w-2xl w-full">
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
