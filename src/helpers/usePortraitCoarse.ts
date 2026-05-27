import { useEffect, useState } from 'react';

const ORIENTATION_QUERY = '(orientation: portrait)';
const POINTER_QUERY = '(pointer: coarse)';

const matches = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return (
    window.matchMedia(ORIENTATION_QUERY).matches &&
    window.matchMedia(POINTER_QUERY).matches
  );
};

/** True on touch devices held in portrait — where the landscape fullscreen layout is too cramped. */
export const usePortraitCoarse = (): boolean => {
  const [isPortraitCoarse, setIsPortraitCoarse] = useState(matches);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const orientationMql = window.matchMedia(ORIENTATION_QUERY);
    const pointerMql = window.matchMedia(POINTER_QUERY);
    const update = () => setIsPortraitCoarse(matches());
    orientationMql.addEventListener('change', update);
    pointerMql.addEventListener('change', update);
    return () => {
      orientationMql.removeEventListener('change', update);
      pointerMql.removeEventListener('change', update);
    };
  }, []);

  return isPortraitCoarse;
};
