import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPuzzlePiece } from '@fortawesome/free-solid-svg-icons';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';

const DISMISS_KEY = 'rdz_homepage_promo_dismissed_v1';
const CHROME_STORE_URL =
  'https://chromewebstore.google.com/detail/pphbloclmhhppmiknfjpddkefnialknl';

const StickyPromoFooter = () => {
  const { signedIn, redirectForAuth } = useReddit();
  const { isLight } = useTheme();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === 'true'
  );

  if (signedIn || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, 'true');
  };

  const ctaBg = 'var(--theme-primary)';
  const ctaText = isLight ? '#ffffff' : 'var(--theme-bg)';

  return (
    <div
      role="region"
      aria-label="Reddzit promo"
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        backgroundColor: 'var(--theme-bg)',
        borderTop: '1px solid var(--theme-border)',
        boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.12)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center gap-3 md:gap-4">
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          <img src="/favicon.png" alt="Reddzit" className="w-8 h-8" />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm md:text-base font-semibold leading-tight truncate"
            style={{ color: 'var(--theme-text)' }}
          >
            Keep track of your saved Reddit posts.
          </p>
          <p
            className="text-xs md:text-sm leading-tight truncate"
            style={{ color: 'var(--theme-textMuted)' }}
          >
            Sign in to unlock For You, saved posts, and the writing tool.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={redirectForAuth}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-transform hover:scale-105 cursor-pointer whitespace-nowrap"
            style={{ backgroundColor: ctaBg, color: ctaText }}
          >
            Connect with Reddit
          </button>
          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Get the Chrome Extension"
            className="hidden md:inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm font-semibold border-2 no-underline whitespace-nowrap"
            style={{
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-textMuted)',
            }}
          >
            <FontAwesomeIcon icon={faPuzzlePiece} />
            <span className="hidden lg:inline">Extension</span>
          </a>
          <Link
            to="/welcome"
            className="hidden md:inline text-xs font-semibold underline"
            style={{ color: 'var(--theme-textMuted)' }}
          >
            Learn more
          </Link>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
            style={{ color: 'var(--theme-textMuted)' }}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StickyPromoFooter;
