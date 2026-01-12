import axios from 'axios';
import API_BASE_URL from '../config/api';

// Hourly Report types (from database)
export interface HourlyStory {
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
  summary: string | null;
  sentimentLabel: string | null;
  topicTags: string[] | null;
}

export interface HourlyReport {
  id: string;
  reportHour: string;
  status: string;
  title: string | null;
  generatedAt: string;
  publishedAt: string | null;
  sourceSubreddits: string[] | null;
  stories: HourlyStory[];
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
   * Fetch the latest hourly report (AI-analyzed, pre-generated)
   */
  async getLatestHourlyReport(): Promise<HourlyReport | null> {
    try {
      const response = await axios.get<HourlyReport>(
        `${API_BASE_URL}/api/hourly/latest`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch hourly report', error);
      return null;
    }
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
   * Check if report is from current hour
   */
  isReportCurrent(reportHour: string): boolean {
    const reportDate = new Date(reportHour);
    const now = new Date();
    return (
      reportDate.getUTCFullYear() === now.getUTCFullYear() &&
      reportDate.getUTCMonth() === now.getUTCMonth() &&
      reportDate.getUTCDate() === now.getUTCDate() &&
      reportDate.getUTCHours() === now.getUTCHours()
    );
  }
};

export default LiveFeedService;
