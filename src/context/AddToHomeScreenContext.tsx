import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  detectPlatform,
  isStandaloneMode,
  evaluateEngagement,
  incrementVisitCount,
  DISMISSED_KEY,
  ENGAGED_KEY,
  type Platform,
} from '../utils/a2hs';
import { trackEvent } from '../utils/analytics';

// Minimal shape of the (non-standard) beforeinstallprompt event.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface A2HSContextValue {
  platform: Platform;
  isStandalone: boolean;
  canPrompt: boolean; // Android prompt captured and ready
  shouldAutoShow: boolean; // banner gate
  promptInstall: (surface: 'banner' | 'menu') => Promise<void>;
  dismissBanner: () => void;
  instructionsOpen: boolean;
  closeInstructions: () => void;
}

const A2HSContext = createContext<A2HSContextValue | null>(null);

export function useAddToHomeScreen(): A2HSContextValue {
  const ctx = useContext(A2HSContext);
  if (!ctx) throw new Error('useAddToHomeScreen must be used within AddToHomeScreenProvider');
  return ctx;
}

export function AddToHomeScreenProvider({ children }: { children: ReactNode }) {
  const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);

  const [platform] = useState<Platform>(() =>
    typeof navigator !== 'undefined' ? detectPlatform(navigator.userAgent) : 'other'
  );
  const [isStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const mql = window.matchMedia ? window.matchMedia('(display-mode: standalone)') : null;
    return isStandaloneMode(mql, navigator as unknown as { standalone?: boolean });
  });
  const [canPrompt, setCanPrompt] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(DISMISSED_KEY) !== null;
  });
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  // One-time setup: visit count, engagement, install listeners, SW, pwa_launch.
  useEffect(() => {
    if (isStandalone) {
      trackEvent('pwa_launch', { platform });
      return; // already installed: no prompts, no listeners
    }

    // Engagement: bump visit count, then evaluate against session scroll flag.
    const visitCount = incrementVisitCount(localStorage);
    const scrolled = sessionStorage.getItem(ENGAGED_KEY) === '1';
    setEngaged(evaluateEngagement(visitCount, scrolled));

    const onScroll = () => {
      if (window.scrollY > 600) {
        sessionStorage.setItem(ENGAGED_KEY, '1');
        setEngaged(true);
        window.removeEventListener('scroll', onScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      promptEventRef.current = e as BeforeInstallPromptEvent;
      setCanPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    const onInstalled = () => {
      trackEvent('a2hs_installed', { platform });
      setCanPrompt(false);
    };
    window.addEventListener('appinstalled', onInstalled);

    // Register the no-op service worker (production + secure context only).
    if (
      'serviceWorker' in navigator &&
      import.meta.env.PROD &&
      window.isSecureContext
    ) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [isStandalone, platform]);

  const openInstructions = () => {
    setInstructionsOpen(true);
    trackEvent('a2hs_ios_instructions_shown');
  };

  // `surface` is part of the public type for call-site clarity; the
  // implementation behaves identically regardless of which surface invoked it.
  const promptInstall = async () => {
    if (platform === 'ios') {
      openInstructions();
      return;
    }
    const evt = promptEventRef.current;
    if (!evt) return;
    await evt.prompt();
    const choice = await evt.userChoice;
    trackEvent('a2hs_outcome', { outcome: choice.outcome });
    promptEventRef.current = null;
    setCanPrompt(false);
  };

  const dismissBanner = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  const shouldAutoShow =
    !isStandalone && !dismissed && engaged && (canPrompt || platform === 'ios');

  const value: A2HSContextValue = {
    platform,
    isStandalone,
    canPrompt,
    shouldAutoShow,
    promptInstall,
    dismissBanner,
    instructionsOpen,
    closeInstructions: () => setInstructionsOpen(false),
  };

  return <A2HSContext.Provider value={value}>{children}</A2HSContext.Provider>;
}
