import axios from 'axios';
import API_BASE_URL from '../config/api';

export interface Story {
  id: string;
  userId: string;
  title: string;
  slug: string;
  description: string | null;
  content: any;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { quotes: number };
}

export interface CreateStoryData {
  title: string;
  description?: string;
}

export interface UpdateStoryData {
  title?: string;
  description?: string;
  content?: any;
}

const StoryService = {
  async listStories(token: string): Promise<{ stories: Story[]; count: number }> {
    const response = await axios.get<{ stories: Story[]; count: number }>(
      `${API_BASE_URL}/api/stories`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async getStory(token: string, id: string): Promise<{ story: Story }> {
    const response = await axios.get<{ story: Story }>(
      `${API_BASE_URL}/api/stories/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async createStory(token: string, data: CreateStoryData): Promise<{ story: Story }> {
    const response = await axios.post<{ story: Story }>(
      `${API_BASE_URL}/api/stories`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async updateStory(token: string, id: string, data: UpdateStoryData): Promise<{ story: Story }> {
    const response = await axios.put<{ story: Story }>(
      `${API_BASE_URL}/api/stories/${id}`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async deleteStory(token: string, id: string): Promise<{ success: boolean }> {
    const response = await axios.delete<{ success: boolean }>(
      `${API_BASE_URL}/api/stories/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async publishStory(token: string, id: string): Promise<{ story: Story }> {
    const response = await axios.post<{ story: Story }>(
      `${API_BASE_URL}/api/stories/${id}/publish`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async unpublishStory(token: string, id: string): Promise<{ story: Story }> {
    const response = await axios.post<{ story: Story }>(
      `${API_BASE_URL}/api/stories/${id}/unpublish`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }
};

export default StoryService;
