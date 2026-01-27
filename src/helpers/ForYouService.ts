import axios from 'axios';
import API_BASE_URL from '../config/api';

// Types
export interface Persona {
  keywords: string[];
  topics: string[];
  subredditAffinities: { name: string; weight: number }[];
  contentPreferences: string[];
}

export interface ForYouPost {
  id: string;
  redditPostId: string;
  subreddit: string;
  title: string;
  url: string | null;
  thumbnail: string | null;
  score: number;
  numComments: number;
  author: string;
  createdUtc: string;
  isSelf: boolean;
}

export interface CuratedPost extends ForYouPost {
  action: 'saved' | 'already_read' | 'not_interested';
  savedVia: 'reddzit' | 'reddit';
  curatedAt: string;
}

export interface SubredditWeight {
  name: string;
  starred: boolean;
  postCount: number;
}

export type TriageAction = 'saved' | 'already_read' | 'not_interested';

export interface Report {
  id: string;
  content: string;
  model: string;
  generatedAt: string;
}

export interface SubredditSuggestion {
  name: string;
  category: string;
}

export interface SubredditPost {
  id: string;
  title: string;
  subreddit: string;
  link: string;
  author: string;
  pubDate: string;
  score: number;
  numComments: number;
  thumbnail: string | null;
}

const ForYouService = {
  /**
   * Sync user's Reddit subscriptions to our database
   */
  async syncSubscriptions(token: string): Promise<{ success: boolean; count: number }> {
    const response = await axios.post<{ success: boolean; count: number }>(
      `${API_BASE_URL}/api/foryou/subscriptions/sync`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Refresh user persona based on saved posts
   */
  async refreshPersona(token: string): Promise<{ persona: Persona }> {
    const response = await axios.post<{ persona: Persona }>(
      `${API_BASE_URL}/api/foryou/persona/refresh`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Get current user persona
   */
  async getPersona(token: string): Promise<{ persona: Persona | null; lastRefreshedAt: string | null }> {
    try {
      const response = await axios.get<{ persona: Persona | null; lastRefreshedAt: string | null }>(
        `${API_BASE_URL}/api/foryou/persona`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return { persona: null, lastRefreshedAt: null };
      }
      throw error;
    }
  },

  /**
   * Get personalized feed
   */
  async getFeed(token: string, limit = 20): Promise<{ posts: ForYouPost[]; recommendedSubreddits: string[] }> {
    const response = await axios.get<{ posts: ForYouPost[]; recommendedSubreddits: string[] }>(
      `${API_BASE_URL}/api/foryou/feed?limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Record triage action on a post
   */
  async recordAction(
    token: string,
    redditPostId: string,
    action: TriageAction
  ): Promise<{ success: boolean; curatedCount: number }> {
    const response = await axios.post<{ success: boolean; curatedCount: number }>(
      `${API_BASE_URL}/api/foryou/action`,
      { redditPostId, action },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Get curated posts (saved via For You)
   */
  async getCurated(token: string): Promise<{ posts: CuratedPost[]; count: number; limit: number }> {
    const response = await axios.get<{ posts: CuratedPost[]; count: number; limit: number }>(
      `${API_BASE_URL}/api/foryou/curated`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Get subreddit settings/weights
   */
  async getSettings(token: string): Promise<{ subreddits: SubredditWeight[]; recommendedSubreddits: string[] }> {
    const response = await axios.get<{ subreddits: SubredditWeight[]; recommendedSubreddits: string[] }>(
      `${API_BASE_URL}/api/foryou/settings`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Star/unstar a subreddit to boost its weight
   */
  async toggleSubredditStar(token: string, subreddit: string, starred: boolean): Promise<{ success: boolean }> {
    const response = await axios.post<{ success: boolean }>(
      `${API_BASE_URL}/api/foryou/settings/star`,
      { subreddit, starred },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Generate report from curated posts
   */
  async generateReport(token: string, model: string): Promise<{ report: Report }> {
    const response = await axios.post<{ report: Report }>(
      `${API_BASE_URL}/api/foryou/report/generate`,
      { model },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Get the latest cached report
   */
  async getReport(token: string): Promise<{ report: Report | null }> {
    try {
      const response = await axios.get<{ report: Report }>(
        `${API_BASE_URL}/api/foryou/report`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return { report: null };
      }
      throw error;
    }
  },

  /**
   * Get suggested subreddits for discovery
   */
  async getSuggestions(token: string): Promise<{ suggestions: SubredditSuggestion[] }> {
    const response = await axios.get<{ suggestions: SubredditSuggestion[] }>(
      `${API_BASE_URL}/api/foryou/suggestions`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Get posts from a specific subreddit
   */
  async getSubredditPosts(subreddit: string, sort: 'hot' | 'top' | 'new' = 'hot'): Promise<{ subreddit: string; posts: SubredditPost[]; relatedSubreddits: string[] }> {
    const response = await axios.get<{ subreddit: string; posts: SubredditPost[]; relatedSubreddits: string[] }>(
      `${API_BASE_URL}/api/subreddit/${subreddit}/posts?sort=${sort}`
    );
    return response.data;
  },

  /**
   * Mark a subreddit as not interested
   */
  async dismissSubreddit(token: string, subreddit: string): Promise<{ success: boolean; dismissCount: number; blocked: boolean }> {
    const response = await axios.post<{ success: boolean; dismissCount: number; blocked: boolean }>(
      `${API_BASE_URL}/api/foryou/subreddit-not-interested`,
      { subreddit },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },
};

export default ForYouService;
