import axios from 'axios';
import API_BASE_URL from '../config/api';

export interface Quote {
  id: string;
  postId: string;
  text: string;
  note: string | null;
  tags: string[];
  sourceUrl: string;
  subreddit: string;
  postTitle: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuoteData {
  postId: string;
  text: string;
  note?: string;
  tags?: string[];
  sourceUrl: string;
  subreddit: string;
  postTitle: string;
  author: string;
}

export interface UpdateQuoteData {
  note?: string;
  tags?: string[];
}

const QuoteService = {
  async listQuotes(token: string): Promise<{ quotes: Quote[]; count: number }> {
    const response = await axios.get<{ quotes: Quote[]; count: number }>(
      `${API_BASE_URL}/api/quotes`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async createQuote(token: string, data: CreateQuoteData): Promise<{ quote: Quote }> {
    const response = await axios.post<{ quote: Quote }>(
      `${API_BASE_URL}/api/quotes`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async updateQuote(token: string, id: string, data: UpdateQuoteData): Promise<{ quote: Quote }> {
    const response = await axios.put<{ quote: Quote }>(
      `${API_BASE_URL}/api/quotes/${id}`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async deleteQuote(token: string, id: string): Promise<{ success: boolean }> {
    const response = await axios.delete<{ success: boolean }>(
      `${API_BASE_URL}/api/quotes/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }
};

export default QuoteService;
