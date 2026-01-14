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
  reportDate: string;
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
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      }

      // Using hourly pulse reports (top posts from r/all with comments)
      const response = await axios.get(`${API_BASE_URL}/api/hourly-pulse/latest`);
      
      // Update cache
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: response.data,
        timestamp: Date.now()
      }));
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch report', error);
      // Try to return stale cache on error
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached).data;
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
        if (Date.now() - timestamp < RSS_CACHE_DURATION) {
          return data;
        }
      }

      const response = await axios.get(`${API_BASE_URL}/api/trending/rss`);
      const posts = response.data.posts || [];

      // Update cache
      localStorage.setItem(RSS_CACHE_KEY, JSON.stringify({
        data: posts,
        timestamp: Date.now()
      }));

      return posts;
    } catch (error) {
      console.error('Failed to fetch trending RSS', error);
      // Try to return stale cache on error
      const cached = localStorage.getItem(RSS_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached).data;
      }
      return [];
    }
  }
};

export default DailyService;
