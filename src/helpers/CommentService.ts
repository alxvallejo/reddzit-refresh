// src/helpers/CommentService.ts
import axios from 'axios';
import API_BASE_URL from '../config/api';

export interface PublicComment {
  id: string;           // fullname, e.g. "t1_abcdef"
  body: string;
  author: string;
  score: number;
  permalink: string;    // "/r/sub/comments/postid/slug/commentid/"
  createdAt: string;    // ISO
}

export interface PublicCommentPost {
  fullname: string;     // "t3_xyz123"
  title: string;
  subreddit: string;
  permalink: string;
  previewImage: string | null;
}

export interface PublicCommentBundle {
  comment: PublicComment;
  post: PublicCommentPost | null;
}

const CommentService = {
  async getPublicComment(fullname: string): Promise<PublicCommentBundle> {
    const response = await axios.get<PublicCommentBundle>(
      `${API_BASE_URL}/api/reddit/public/comment/${fullname}`
    );
    return response.data;
  },
};

export default CommentService;
