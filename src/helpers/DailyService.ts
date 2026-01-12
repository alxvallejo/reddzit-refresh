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

const DailyService = {
  async getLatestReport(): Promise<DailyReport | null> {
    try {
      // Now using hourly reports for fresher content
      const response = await axios.get(`${API_BASE_URL}/api/hourly/latest`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch report', error);
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
  }
};

export default DailyService;
