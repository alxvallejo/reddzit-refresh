import axios from 'axios';
import API_BASE_URL from '../config/api';

// Types
export interface Subreddit {
  id: string;
  name: string;
  categoryId: string;
  isDefault: boolean;
  sortOrder: number;
  enabled?: boolean; // Client-side toggle state
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  subreddits: Subreddit[];
}

export interface DiscoverStory {
  id: string;
  rank: number;
  subreddit: string;
  redditPostId: string;
  redditPermalink: string;
  title: string;
  postUrl: string | null;
  imageUrl: string | null;
  author: string | null;
  score: number;
  numComments: number;
  createdUtc: string | null;
  isSelfPost: boolean;
  summary: string | null;
  sentimentLabel: string | null;
  topicTags: string[] | null;
  topCommentAuthor: string | null;
  topCommentBody: string | null;
  topCommentScore: number | null;
}

export interface DiscoverReport {
  id: string;
  userId: string;
  status: string;
  title: string | null;
  generatedAt: string;
  publishedAt: string | null;
  sourceCategories: string[] | null;
  sourceSubreddits: string[] | null;
  stories: DiscoverStory[];
}

// Global Briefing types (Free tier)
export interface GlobalBriefingStory {
  id: number;
  rank: number;
  subreddit: string;
  redditPostId: string;
  redditPermalink: string;
  title: string;
  postUrl: string | null;
  imageUrl: string | null;
  author: string | null;
  score: number;
  numComments: number;
  createdUtc: string | null;
  summary: string | null;
  sentimentLabel: string | null;
  topicTags: string[] | null;
  topCommentAuthor: string | null;
  topCommentBody: string | null;
  topCommentScore: number | null;
  category: { id: number; name: string; slug: string } | null;
}

export interface GlobalBriefing {
  id: number;
  briefingTime: string;
  status: string;
  title: string;
  executiveSummary: string;
  generatedAt: string;
  publishedAt: string | null;
  stories: GlobalBriefingStory[];
}

export interface UserSubscription {
  isPro: boolean;
  proExpiresAt: string | null;
  hasStripe: boolean;
  hasAccount: boolean;
}

export interface UserPreferences {
  selectedCategories: Category[];
  categoryCount: number;
  maxCategories: number;
}

const DiscoverService = {
  /**
   * Get all available categories with subreddits
   */
  async getCategories(): Promise<Category[]> {
    const response = await axios.get<{ categories: Category[] }>(
      `${API_BASE_URL}/api/discover/categories`
    );
    return response.data.categories;
  },

  /**
   * Get user's selected categories and subreddit preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const response = await axios.get<UserPreferences>(
      `${API_BASE_URL}/api/discover/user/${userId}/preferences`
    );
    return response.data;
  },

  /**
   * Set user's selected categories (replaces existing)
   */
  async setUserCategories(userId: string, categoryIds: string[]): Promise<void> {
    await axios.post(
      `${API_BASE_URL}/api/discover/user/${userId}/categories`,
      { categoryIds }
    );
  },

  /**
   * Toggle a subreddit on/off for a user
   */
  async toggleSubreddit(userId: string, subredditId: string, enabled: boolean): Promise<void> {
    await axios.post(
      `${API_BASE_URL}/api/discover/user/${userId}/subreddits/toggle`,
      { subredditId, enabled }
    );
  },

  /**
   * Generate a new discover report for user
   */
  async generateReport(userId: string): Promise<DiscoverReport> {
    const response = await axios.post<{ success: boolean; report: DiscoverReport }>(
      `${API_BASE_URL}/api/discover/user/${userId}/generate`
    );
    return response.data.report;
  },

  /**
   * Get user's latest report
   */
  async getLatestReport(userId: string): Promise<DiscoverReport | null> {
    try {
      const response = await axios.get<{ report: DiscoverReport }>(
        `${API_BASE_URL}/api/discover/user/${userId}/reports/latest`
      );
      return response.data.report;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Get user's report history
   */
  async getUserReports(userId: string, limit = 10): Promise<DiscoverReport[]> {
    const response = await axios.get<{ reports: DiscoverReport[] }>(
      `${API_BASE_URL}/api/discover/user/${userId}/reports?limit=${limit}`
    );
    return response.data.reports;
  },

  /**
   * Get or create anonymous user ID for non-logged-in users
   */
  getAnonymousUserId(): string {
    const key = 'reddzit_discover_anon_id';
    let id = localStorage.getItem(key);
    if (!id) {
      id = 'anon_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem(key, id);
    }
    return id;
  },

  // Global Briefing API (Free tier)

  /**
   * Get the latest global briefing
   */
  async getLatestBriefing(): Promise<GlobalBriefing | null> {
    try {
      const response = await axios.get<GlobalBriefing>(
        `${API_BASE_URL}/api/briefing/latest`
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Get a specific briefing by ID
   */
  async getBriefingById(id: number): Promise<GlobalBriefing | null> {
    try {
      const response = await axios.get<GlobalBriefing>(
        `${API_BASE_URL}/api/briefing/${id}`
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // User API

  /**
   * Sync user from Reddit OAuth to backend
   */
  async syncUser(redditId: string, redditUsername: string): Promise<void> {
    await axios.post(`${API_BASE_URL}/api/user/sync`, {
      redditId,
      redditUsername,
    });
  },

  /**
   * Check user subscription status
   */
  async getSubscriptionStatus(redditId: string): Promise<UserSubscription> {
    try {
      const response = await axios.get<UserSubscription>(
        `${API_BASE_URL}/api/user/${redditId}/subscription`
      );
      return response.data;
    } catch {
      return { isPro: false, proExpiresAt: null, hasStripe: false, hasAccount: false };
    }
  },
};

export default DiscoverService;
