import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import LinkService, { SavedLink } from '../helpers/LinkService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faLink, faSpinner, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';

const LinksFeed = () => {
  const { accessToken } = useReddit();
  const { isLight } = useTheme();
  const navigate = useNavigate();

  const [links, setLinks] = useState<SavedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    (async () => {
      try {
        const { links: l } = await LinkService.listLinks(accessToken);
        if (!cancelled) setLinks(l);
      } catch (err) {
        console.error('Failed to load links:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [accessToken]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !urlInput.trim() || saving) return;

    setError(null);
    setSaving(true);

    try {
      const { link } = await LinkService.saveLink(accessToken, urlInput.trim());
      setLinks(prev => [link, ...prev]);
      setUrlInput('');
      showToast('Link saved!');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to save link';
      if (err?.response?.status === 409) {
        setError('Link already saved');
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!accessToken) return;

    try {
      await LinkService.deleteLink(accessToken, id);
      setLinks(prev => prev.filter(l => l.id !== id));
      showToast('Link removed');
    } catch (err) {
      console.error('Failed to delete link:', err);
    }
  };

  const handleClick = (link: SavedLink) => {
    navigate(`/link/${link.id}`, { state: { link } });
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="font-sans">
      {/* Header */}
      <header id="page-header" className="px-4 pb-2 sticky top-16 z-40 bg-[var(--theme-bg)]">
        <div className="max-w-7xl mx-auto border-b-2 border-[var(--theme-border)]">
          <div className="flex items-center justify-between py-4 pl-4">
            <h1 className="text-2xl font-bold text-[var(--theme-text)]">
              Links
            </h1>
          </div>
        </div>
      </header>

      {/* Quick-save input */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <form onSubmit={handleSave} className="flex gap-2">
          <div className="relative flex-1">
            <FontAwesomeIcon
              icon={faLink}
              className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${
                isLight ? 'text-gray-400' : 'text-gray-500'
              }`}
            />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setError(null); }}
              placeholder="Paste a URL to save..."
              className={`w-full pl-9 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 border ${
                isLight
                  ? 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-orange-500/50'
                  : 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:ring-[var(--theme-primary)]/50'
              }`}
            />
          </div>
          <button
            type="submit"
            disabled={saving || !urlInput.trim()}
            className={`px-5 py-3 rounded-xl text-sm font-medium transition-colors border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isLight
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-[var(--theme-primary)] text-[var(--theme-bg)] hover:opacity-90'
            }`}
          >
            {saving ? (
              <FontAwesomeIcon icon={faSpinner} spin />
            ) : (
              <FontAwesomeIcon icon={faPlus} />
            )}
          </button>
        </form>
        {error && (
          <p className="text-xs text-red-400 mt-1.5 pl-1">{error}</p>
        )}
      </div>

      {/* Links list */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin border-[var(--theme-primary)]"></div>
        </div>
      ) : links.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h2 className="text-xl font-bold mb-2 text-[var(--theme-text)]">No saved links yet</h2>
          <p className="text-[var(--theme-textMuted)] max-w-sm">
            Paste any URL above to save it. We'll extract the article content so you can read it here.
          </p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 pt-4 pb-24 grid grid-cols-1 md:grid-cols-2 gap-3">
          {links.map((link) => (
            <article
              key={link.id}
              onClick={() => handleClick(link)}
              className={`group relative p-4 rounded-xl transition cursor-pointer border border-[var(--theme-border)] ${
                isLight
                  ? 'bg-[var(--theme-cardBg)] hover:border-orange-600'
                  : 'bg-transparent hover:border-[var(--theme-primary)]'
              }`}
            >
              <div className="flex gap-3 items-start">
                {/* Favicon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                  isLight ? 'bg-gray-100' : 'bg-white/5'
                }`}>
                  {link.domain ? (
                    <img
                      src={`https://www.google.com/s2/favicons?sz=32&domain=${link.domain}`}
                      alt=""
                      className="w-5 h-5"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.innerHTML =
                          '<span class="text-xs opacity-40">🔗</span>';
                      }}
                    />
                  ) : (
                    <FontAwesomeIcon icon={faLink} className="text-xs opacity-40" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {link.domain && (
                    <span className="text-xs font-normal text-[var(--theme-primary)]">
                      {link.domain}
                    </span>
                  )}
                  <h2 className="font-light text-base my-1 leading-tight text-[var(--theme-text)] line-clamp-2">
                    {link.title || link.url}
                  </h2>
                  {link.title && (
                    <p className="text-xs text-[var(--theme-textMuted)] truncate">
                      {link.url}
                    </p>
                  )}
                  <span className="text-xs text-[var(--theme-textMuted)] mt-1 block">
                    {timeAgo(link.createdAt)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={`p-2 rounded-lg text-xs transition-colors ${
                      isLight
                        ? 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                        : 'hover:bg-white/10 text-gray-500 hover:text-gray-300'
                    }`}
                    title="Open original"
                  >
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                  </a>
                  <button
                    onClick={(e) => handleDelete(link.id, e)}
                    className={`p-2 rounded-lg text-xs transition-colors border-none cursor-pointer bg-transparent ${
                      isLight
                        ? 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                        : 'hover:bg-red-500/10 text-gray-500 hover:text-red-400'
                    }`}
                    title="Delete"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-sm font-medium shadow-lg text-[var(--theme-bg)]"
          style={{ backgroundColor: 'var(--theme-primary)' }}
        >
          {toast}
        </div>
      )}
    </div>
  );
};

export default LinksFeed;
