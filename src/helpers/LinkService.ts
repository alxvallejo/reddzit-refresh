import axios from 'axios';
import API_BASE_URL from '../config/api';

export interface SavedLink {
  id: string;
  url: string;
  title: string | null;
  imageUrl: string | null;
  domain: string | null;
  hasContent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LinkContent {
  type: 'article';
  title: string | null;
  content: string;
}

const LinkService = {
  async saveLink(token: string, url: string): Promise<{ link: SavedLink }> {
    const response = await axios.post<{ link: SavedLink }>(
      `${API_BASE_URL}/api/links`,
      { url },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

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

  async getLinkContent(token: string, id: string): Promise<{ link: SavedLink; content: LinkContent | null }> {
    const response = await axios.get<{ link: SavedLink; content: LinkContent | null }>(
      `${API_BASE_URL}/api/links/${id}/content`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }
};

export default LinkService;
