import axios from 'axios';
import API_BASE_URL from '../config/api';

export interface SavedLink {
  id: string;
  url: string;
  title: string;
  description: string | null;
  favicon: string | null;
  tags: string[];
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateLinkData {
  note?: string;
  tags?: string[];
}

const LinkService = {
  async listLinks(token: string): Promise<{ links: SavedLink[]; count: number }> {
    const response = await axios.get<{ links: SavedLink[]; count: number }>(
      `${API_BASE_URL}/api/links`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async deleteLink(token: string, id: string): Promise<{ success: boolean }> {
    const response = await axios.delete<{ success: boolean }>(
      `${API_BASE_URL}/api/links/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async updateLink(token: string, id: string, data: UpdateLinkData): Promise<{ link: SavedLink }> {
    const response = await axios.put<{ link: SavedLink }>(
      `${API_BASE_URL}/api/links/${id}`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }
};

export default LinkService;
