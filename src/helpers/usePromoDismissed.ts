import { useEffect, useState } from 'react';

const PROMO_DISMISS_KEY = 'rdz_homepage_promo_dismissed_v1';
const PROMO_DISMISSED_EVENT = 'rdz-promo-dismissed';

const readDismissed = (): boolean => {
  try {
    return localStorage.getItem(PROMO_DISMISS_KEY) === 'true';
  } catch {
    return false;
  }
};

export function usePromoDismissed(): boolean {
  const [dismissed, setDismissed] = useState<boolean>(readDismissed);

  useEffect(() => {
    const onChange = () => setDismissed(readDismissed());
    window.addEventListener(PROMO_DISMISSED_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(PROMO_DISMISSED_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  return dismissed;
}
