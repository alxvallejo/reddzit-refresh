import axios from 'axios';
import API_BASE_URL from '../config/api';

export interface LivePost {
  id: string;
  fullname: string;
  title: string;
  subreddit: string;
  author: string;
  score: number;
  num_comments: number;
  url: string;
  permalink: string;
  created_utc: number;
  thumbnail: string | null;
  selftext: string | null;
  is_self: boolean;
  domain: string;
}

export interface RotatingFeedResponse {
  posts: LivePost[];
  subreddits: string[];
  rotated: boolean;
  generated_at: string;
  message?: string;
}

export interface Subreddit {
  name: string;
  title: string;
  subscribers: number;
  description: string;
  over18: boolean;
  icon: string | null;
}

export interface SubredditsResponse {
  subreddits: Subreddit[];
  after?: string | null;
}

const LiveFeedService = {
  /**
   * Fetch rotating feed from random popular subreddits
   * @param options.rotate - Enable rotation (default true)
   * @param options.count - Number of subreddits to sample
   * @param options.limit - Posts per subreddit
   * @param options.subreddits - Specific subs to use (overrides random)
   * @param options.excludeIds - Post IDs to exclude (for deduplication)
   */
  async getRotatingFeed(options: {
    rotate?: boolean;
    count?: number;
    limit?: number;
    subreddits?: string[];
    excludeIds?: string[];
  } = {}): Promise<RotatingFeedResponse> {
    const { rotate = true, count = 5, limit = 10, subreddits, excludeIds = [] } = options;
    
    const params = new URLSearchParams({
      rotate: String(rotate),
      count: String(count),
      limit: String(limit),
    });
    
    if (subreddits && subreddits.length > 0) {
      params.set('subreddits', subreddits.join(','));
    }
    
    const response = await axios.get<RotatingFeedResponse>(
      `${API_BASE_URL}/api/reddit/feed/rotating?${params}`
    );
    
    // Client-side deduplication
    if (excludeIds.length > 0) {
      const excludeSet = new Set(excludeIds);
      response.data.posts = response.data.posts.filter(
        post => !excludeSet.has(post.id) && !excludeSet.has(post.fullname)
      );
    }
    
    return response.data;
  },

  /**
   * Fetch popular/trending subreddits (public, no auth)
   */
  async getPopularSubreddits(limit = 25): Promise<SubredditsResponse> {
    const response = await axios.get<SubredditsResponse>(
      `${API_BASE_URL}/api/reddit/subreddits/popular?limit=${limit}`
    );
    return response.data;
  },

  /**
   * Fetch user's subscribed subreddits (requires auth)
   */
  async getUserSubreddits(token: string, options: { limit?: number; after?: string } = {}): Promise<SubredditsResponse> {
    const { limit = 100, after } = options;
    const params = new URLSearchParams({ limit: String(limit) });
    if (after) params.set('after', after);
    
    const response = await axios.get<SubredditsResponse>(
      `${API_BASE_URL}/api/reddit/subreddits/mine?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Get cache key for hourly rotation
   */
  getCacheKey(): string {
    const now = new Date();
    return `livefeed_${now.getUTCFullYear()}_${now.getUTCMonth()}_${now.getUTCDate()}_${now.getUTCHours()}`;
  },

  /**
   * Check if cached feed is still valid (same hour)
   */
  isCacheValid(cachedKey: string): boolean {
    return cachedKey === this.getCacheKey();
  }
};

export default LiveFeedService;
