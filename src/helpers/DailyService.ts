import axios from 'axios';
import API_BASE_URL from '../config/api';

export interface ReportStory {
  id: string;
  rank: number;
  title: string;
  subreddit: string;
  score: number;
  numComments: number;
  summary: string;
  sentimentLabel: string;
  takeaways: string[];
  topicTags: string[];
  redditPermalink: string;
  redditPostId: string;
  postUrl?: string;
  imageUrl?: string;
  comments: StoryComment[];
}

export interface StoryComment {
  id: string;
  body: string;
  author: string;
  score: number;
  isHighlighted: boolean;
}

export interface DailyReport {
  id: string;
  reportDate?: string;
  reportHour?: string;
  title: string;
  stories: ReportStory[];
}

const CACHE_KEY = 'rdz_latest_report';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const RSS_CACHE_KEY = 'rdz_trending_rss';
const RSS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface TrendingPost {
  id: string;
  title: string;
  subreddit: string;
  link: string;
  author?: string;
  pubDate?: string;
}

const DailyService = {
  async getLatestReport(): Promise<DailyReport | null> {
    try {
      // Check cache first
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const hasStories = data?.stories?.length > 0;
        if (Date.now() - timestamp < CACHE_DURATION && hasStories) {
          console.log('Using cached report, stories:', data.stories.length);
          return data;
        }
        // Clear invalid/empty cache
        if (!hasStories) {
          console.log('Clearing empty cached report');
          localStorage.removeItem(CACHE_KEY);
        }
      }

      // Using hourly pulse reports (top posts from r/all with comments)
      console.log('Fetching hourly pulse from API...');
      const response = await axios.get(`${API_BASE_URL}/api/hourly-pulse/latest`);
      console.log('Stories count:', response.data?.stories?.length || 0);

      // Only cache if we have stories
      if (response.data?.stories?.length > 0) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: response.data,
          timestamp: Date.now()
        }));
      }

      return response.data;
    } catch (error) {
      console.error('Failed to fetch report', error);
      // Try to return stale cache on error (only if it has stories)
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data } = JSON.parse(cached);
        if (data?.stories?.length > 0) {
          return data;
        }
      }
      return null;
    }
  },

  async subscribe(email: string, topics?: string[], source: string = 'landing') {
    return axios.post(`${API_BASE_URL}/api/subscribe`, { email, topics, source });
  },

  async trackEngagement(eventType: string, metadata?: any, reportId?: string, storyId?: string) {
    // Generate anonymous ID if not exists (store in localStorage)
    let anonymousId = localStorage.getItem('rdz_anon_id');
    if (!anonymousId) {
      anonymousId = crypto.randomUUID();
      localStorage.setItem('rdz_anon_id', anonymousId);
    }

    return axios.post(`${API_BASE_URL}/api/engagement`, {
      anonymous_id: anonymousId,
      event_type: eventType,
      report_id: reportId,
      story_id: storyId,
      metadata
    });
  },

  async getTrendingRSS(): Promise<TrendingPost[]> {
    try {
      // Check cache first
      const cached = localStorage.getItem(RSS_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const hasPosts = data?.length > 0;
        if (Date.now() - timestamp < RSS_CACHE_DURATION && hasPosts) {
          return data;
        }
        // Clear invalid/empty cache
        if (!hasPosts) {
          localStorage.removeItem(RSS_CACHE_KEY);
        }
      }

      // Call Reddit's public JSON API directly (no backend needed)
      const response = await fetch('https://www.reddit.com/r/all/hot.json?limit=15');
      if (!response.ok) {
        throw new Error(`Reddit API returned ${response.status}`);
      }

      const json = await response.json();
      const posts: TrendingPost[] = json.data.children
        .filter((child: { kind: string; data: { over_18: boolean } }) =>
          child.kind === 't3' && !child.data.over_18
        )
        .map((child: { data: { id: string; title: string; subreddit: string; permalink: string; author: string; created_utc: number } }) => ({
          id: child.data.id,
          title: child.data.title,
          subreddit: child.data.subreddit,
          link: `https://www.reddit.com${child.data.permalink}`,
          author: child.data.author,
          pubDate: new Date(child.data.created_utc * 1000).toISOString(),
        }));

      // Only cache if we have posts
      if (posts.length > 0) {
        localStorage.setItem(RSS_CACHE_KEY, JSON.stringify({
          data: posts,
          timestamp: Date.now()
        }));
      }

      return posts;
    } catch (error) {
      console.error('Failed to fetch trending posts', error);
      // Try to return stale cache on error (only if it has posts)
      const cached = localStorage.getItem(RSS_CACHE_KEY);
      if (cached) {
        const { data } = JSON.parse(cached);
        if (data?.length > 0) {
          return data;
        }
      }
      return [];
    }
  }
};

export default DailyService;
