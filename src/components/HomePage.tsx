import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import AppShell from './AppShell';
import Seo from './Seo';
import StickyPromoFooter from './StickyPromoFooter';

const SNAPSHOT_URL = '/snapshots/news.json';
const RSS_CACHE_KEY = 'rdz_trending_rss_news';

type SnapshotPayload = {
  posts?: unknown[];
  generatedAt?: string;
};

const warmTrendingCacheFromSnapshot = async () => {
  try {
    const existing = localStorage.getItem(RSS_CACHE_KEY);
    if (existing) {
      const parsed = JSON.parse(existing);
      const ageMs = Date.now() - (parsed?.timestamp ?? 0);
      if (Array.isArray(parsed?.data) && parsed.data.length > 0 && ageMs < 5 * 60 * 1000) {
        return;
      }
    }
  } catch {
    // fall through and refetch
  }

  const response = await fetch(SNAPSHOT_URL, { cache: 'force-cache' });
  if (!response.ok) return;

  const payload = (await response.json()) as SnapshotPayload;
  if (!Array.isArray(payload.posts) || payload.posts.length === 0) return;

  localStorage.setItem(
    RSS_CACHE_KEY,
    JSON.stringify({ data: payload.posts, timestamp: Date.now() })
  );
};

const HomePage = () => {
  const { signedIn } = useReddit();

  useEffect(() => {
    warmTrendingCacheFromSnapshot().catch(() => {});
  }, []);

  if (signedIn) {
    return <Navigate to="/news" replace />;
  }

  return (
    <>
      <Seo
        title="Reddzit: Keep track of your saved Reddit posts and comments"
        description="Keep track of your saved Reddit posts and comments. A clean reader for browsing top stories, saving what matters, and revisiting it later — minus the doomscroll."
        path="/"
      />
      <AppShell />
      <StickyPromoFooter />
    </>
  );
};

export default HomePage;
