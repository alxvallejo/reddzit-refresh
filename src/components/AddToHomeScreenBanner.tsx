import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { useAddToHomeScreen } from '../context/AddToHomeScreenContext';
import { trackEvent } from '../utils/analytics';

export default function AddToHomeScreenBanner() {
  const { shouldAutoShow, platform, promptInstall, dismissBanner } = useAddToHomeScreen();
  const shownRef = useRef(false);

  useEffect(() => {
    if (shouldAutoShow && !shownRef.current) {
      shownRef.current = true;
      trackEvent('a2hs_prompt_shown', { surface: 'banner', platform });
    }
  }, [shouldAutoShow, platform]);

  if (!shouldAutoShow) return null;

  const ctaLabel = platform === 'ios' ? 'Show me how' : 'Install';

  const onCta = () => {
    trackEvent('a2hs_prompt_clicked', { surface: 'banner', platform });
    void promptInstall('banner');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:hidden">
      <div className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl bg-[var(--theme-bgSecondary)] border border-[var(--theme-border)] text-[var(--theme-text)]">
        <img src="/icons/icon-192.png" alt="Reddzit" className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="m-0 text-sm font-semibold leading-tight">Add Reddzit to your home screen</p>
          <p className="m-0 text-xs text-[var(--theme-textMuted)] leading-tight">One tap to your daily Reddit digest.</p>
        </div>
        <button
          onClick={onCta}
          className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold border-none cursor-pointer bg-[var(--theme-primary)] text-[#262129] hover:opacity-90"
        >
          {ctaLabel}
        </button>
        <button
          onClick={dismissBanner}
          aria-label="Dismiss"
          className="flex-shrink-0 border-none bg-transparent cursor-pointer text-[var(--theme-textMuted)] p-1"
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
    </div>
  );
}
