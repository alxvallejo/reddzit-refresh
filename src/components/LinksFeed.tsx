import { useState, useEffect } from 'react';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import LinkService, { SavedLink } from '../helpers/LinkService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import NoContent from './NoContent';

const LinksFeed = () => {
  const { accessToken } = useReddit();
  const { isLight } = useTheme();
  const [links, setLinks] = useState<SavedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const fetchLinks = async () => {
      try {
        setLoading(true);
        const data = await LinkService.listLinks(accessToken);
        setLinks(data.links);
      } catch (err) {
        console.error('Failed to fetch links:', err);
        setError('Failed to load saved links');
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, [accessToken]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!accessToken || deletingId) return;

    setDeletingId(id);
    try {
      await LinkService.deleteLink(accessToken, id);
      setLinks(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error('Failed to delete link:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const getFaviconUrl = (link: SavedLink) => {
    if (link.favicon) return link.favicon;
    try {
      const hostname = new URL(link.url).hostname;
      return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
    } catch {
      return null;
    }
  };

  const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin border-[var(--theme-primary)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-[var(--theme-textMuted)]">{error}</p>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="text-6xl mb-6">🔗</div>
        <h2 className="text-2xl font-bold mb-3 text-[var(--theme-text)]">No Saved Links</h2>
        <p className="text-[var(--theme-textMuted)] max-w-md mx-auto">
          Use the Reddzit Chrome extension to save links from any webpage. Click the extension icon and hit "Save This Page".
        </p>
      </div>
    );
  }

  return (
    <div className="font-sans">
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-24 grid grid-cols-1 md:grid-cols-2 gap-3">
        {links.map((link) => {
          const favicon = getFaviconUrl(link);

          return (
            <article
              key={link.id}
              onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
              className={`group relative p-4 rounded-xl transition cursor-pointer border border-[var(--theme-border)] ${
                isLight ? 'bg-[var(--theme-cardBg)] hover:border-indigo-500' : 'bg-transparent hover:border-[var(--theme-primary)]'
              }`}
            >
              <div className="flex gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {favicon && (
                      <img
                        src={favicon}
                        alt=""
                        className="w-4 h-4 rounded-sm flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <span className="text-xs font-normal text-[var(--theme-primary)] truncate">
                      {getHostname(link.url)}
                    </span>
                    <span className="text-xs text-[var(--theme-textMuted)] flex-shrink-0">
                      {timeAgo(link.createdAt)}
                    </span>
                  </div>

                  <h2 className="font-light text-base my-2 leading-tight text-[var(--theme-text)]">
                    {link.title}
                  </h2>

                  {link.description && (
                    <p className="text-sm line-clamp-2 text-[var(--theme-textMuted)]">
                      {link.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-center justify-between flex-shrink-0">
                  <FontAwesomeIcon
                    icon={faExternalLinkAlt}
                    className="text-xs text-[var(--theme-textMuted)] opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  <button
                    onClick={(e) => handleDelete(e, link.id)}
                    disabled={deletingId === link.id}
                    className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer ${
                      isLight
                        ? 'bg-transparent hover:bg-red-50 text-red-400 hover:text-red-600'
                        : 'bg-transparent hover:bg-red-500/20 text-red-400 hover:text-red-300'
                    } ${deletingId === link.id ? 'opacity-50' : ''}`}
                    title="Remove link"
                  >
                    <FontAwesomeIcon icon={faTrash} className="text-xs" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default LinksFeed;
