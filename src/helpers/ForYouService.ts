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

const ForYouService = {
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
};

export default ForYouService;
