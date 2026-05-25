import { useCallback, useState } from 'react';

const isBrowser = typeof window !== 'undefined';

const readSeen = (key: string): boolean => {
  if (!isBrowser) return false;
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

const writeSeen = (key: string) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // storage unavailable — in-memory state still flips for the session
  }
};

export const useFirstVisit = (key: string) => {
  const [seen, setSeen] = useState<boolean>(() => readSeen(key));

  const markSeen = useCallback(() => {
    setSeen(true);
    writeSeen(key);
  }, [key]);

  return { seen, markSeen };
};
