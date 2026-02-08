import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faCheck, faTimes, faQuoteLeft, faSquare, faSquareCheck } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { Quote } from '../helpers/QuoteService';

function isImageUrl(text: string): boolean {
  if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(text)) return true;
  try {
    const url = new URL(text);
    return ['preview.redd.it', 'i.redd.it'].includes(url.hostname);
  } catch {
    return false;
  }
}

interface QuoteCardProps {
  quote: Quote;
  onUpdate: (id: string, note: string, tags: string[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export default function QuoteCard({ quote, onUpdate, onDelete, selected, onToggleSelect }: QuoteCardProps) {
  const { isLight } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editNote, setEditNote] = useState(quote.note || '');
  const [editTags, setEditTags] = useState(quote.tags.join(', '));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const displayText = expanded || quote.text.length <= 500
    ? quote.text
    : quote.text.substring(0, 500) + '...';

  const handleSave = async () => {
    setLoading(true);
    try {
      const tags = editTags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      await onUpdate(quote.id, editNote, tags);
      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete(quote.id);
    } finally {
      setLoading(false);
    }
  };

  const isComment = quote.postId?.startsWith('t1_') ?? false;
  const postSlug = quote.postTitle?.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50) ?? '';
  const postLink = quote.postId ? `/p/${quote.postId}/${postSlug}` : '#';

  const formattedDate = new Date(quote.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className={`rounded-xl p-4 bg-[var(--theme-bg)] border ${
      selected ? 'border-[var(--theme-primary)] ring-1 ring-[var(--theme-primary)]' : 'border-[var(--theme-border)]'
    }`}>
      {/* Metadata */}
      <div className="flex items-center justify-between text-xs mb-3 text-[var(--theme-textMuted)]">
        <div className="flex items-center gap-2">
          {onToggleSelect && (
            <button
              onClick={() => onToggleSelect(quote.id)}
              className={`p-1 rounded transition-colors border-none cursor-pointer bg-transparent ${
                selected
                  ? 'text-[var(--theme-primary)]'
                  : isLight ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <FontAwesomeIcon icon={selected ? faSquareCheck : faSquare} />
            </button>
          )}
          <span className="font-medium text-[#ff4500]">r/{quote.subreddit}</span>
          <span>·</span>
          {isComment ? (
            <a
              href={quote.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline truncate max-w-[200px] text-[var(--theme-textMuted)]"
            >
              {quote.postTitle}
            </a>
          ) : (
            <Link
              to={postLink}
              className="hover:underline truncate max-w-[200px] text-[var(--theme-textMuted)]"
            >
              {quote.postTitle}
            </Link>
          )}
          <span>·</span>
          <span>{formattedDate}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={loading}
                className={`p-1.5 rounded transition-colors border-none cursor-pointer ${
                  isLight
                    ? 'text-green-600 hover:bg-green-50 bg-transparent'
                    : 'text-green-400 hover:bg-green-500/20 bg-transparent'
                }`}
              >
                <FontAwesomeIcon icon={faCheck} />
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditNote(quote.note || '');
                  setEditTags(quote.tags.join(', '));
                }}
                className={`p-1.5 rounded transition-colors border-none cursor-pointer ${
                  isLight
                    ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                    : 'text-gray-400 hover:bg-white/10 bg-transparent'
                }`}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </>
          ) : confirmDelete ? (
            <>
              <span className="text-red-500 mr-1">Delete?</span>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="p-1.5 rounded text-red-500 hover:bg-red-500/20 transition-colors border-none cursor-pointer bg-transparent"
              >
                <FontAwesomeIcon icon={faCheck} />
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className={`p-1.5 rounded transition-colors border-none cursor-pointer ${
                  isLight
                    ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                    : 'text-gray-400 hover:bg-white/10 bg-transparent'
                }`}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className={`p-1.5 rounded transition-colors border-none cursor-pointer ${
                  isLight
                    ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                    : 'text-gray-400 hover:bg-white/10 bg-transparent'
                }`}
              >
                <FontAwesomeIcon icon={faEdit} />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className={`p-1.5 rounded transition-colors border-none cursor-pointer ${
                  isLight
                    ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                    : 'text-gray-400 hover:bg-white/10 bg-transparent'
                }`}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quoted Text */}
      <div className="mb-3 text-[var(--theme-text)]">
        {isImageUrl(quote.text) ? (
          <img
            src={quote.text}
            alt={quote.postTitle || 'Saved image'}
            className="max-w-full max-h-48 rounded-lg object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <>
            <FontAwesomeIcon icon={faQuoteLeft} className="mr-2 opacity-40" />
            <span>{displayText}</span>
            {quote.text.length > 500 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="ml-2 text-sm font-medium border-none bg-transparent cursor-pointer text-[var(--theme-primary)]"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </>
        )}
      </div>

      {/* Note */}
      {editing ? (
        <div className="mb-3 space-y-2">
          <textarea
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="Your note..."
            rows={2}
            className={`w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 ${
              isLight
                ? 'bg-gray-50 border border-gray-300 text-gray-900 focus:ring-orange-500/50'
                : 'bg-white/5 border border-white/20 text-white focus:ring-[var(--theme-border)]'
            }`}
          />
          <input
            type="text"
            value={editTags}
            onChange={(e) => setEditTags(e.target.value)}
            placeholder="Tags (comma-separated)"
            className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 ${
              isLight
                ? 'bg-gray-50 border border-gray-300 text-gray-900 focus:ring-orange-500/50'
                : 'bg-white/5 border border-white/20 text-white focus:ring-[var(--theme-border)]'
            }`}
          />
        </div>
      ) : quote.note ? (
        <div className="mb-3 pl-4 border-l-2 border-[var(--theme-border)] text-[var(--theme-textMuted)]">
          {quote.note}
        </div>
      ) : null}

      {/* Tags */}
      {!editing && quote.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {quote.tags.map((tag, i) => (
            <span
              key={i}
              className={`px-2 py-0.5 rounded-full text-xs ${
                isLight
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-white/10 text-gray-300'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

    </div>
  );
}
