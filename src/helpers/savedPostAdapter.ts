import type { TrendingPost } from './DailyService';
import {
  getPreviewImage,
  getDisplayTitle,
  isComment,
  getCommentSnippet,
  getImageUrlFromText,
} from './RedditUtils';
import type { SavedPreview } from './savedPreviewService';

type AnyRedditPost = Record<string, any>;

const SNIPPET_MAX = 240;

const truncate = (text: string | undefined, max = SNIPPET_MAX): string | undefined => {
  if (!text) return undefined;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return undefined;
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max - 1).trim() + '…';
};

export const adaptSavedPostToTrending = (
  post: AnyRedditPost,
  commentParentImages: Record<string, string>,
  preview?: SavedPreview
): TrendingPost => {
  const commentImageUrl = isComment(post) ? getImageUrlFromText(post.body) : null;
  const fallbackImageFromPost =
    getImageUrlFromText(post.link_url) ||
    getImageUrlFromText(post.url) ||
    getPreviewImage(post);
  const parentPostImage =
    isComment(post) && post.link_id ? commentParentImages[post.link_id] : null;

  const imageUrl =
    preview?.imageUrl ||
    commentImageUrl ||
    fallbackImageFromPost ||
    parentPostImage ||
    undefined;

  // Synchronous bodyPreview: comment body or self-text. Async preview overrides.
  const syncBodyPreview = isComment(post)
    ? truncate(getCommentSnippet(post, SNIPPET_MAX))
    : truncate(post.selftext);

  const bodyPreview = preview?.bodyPreview || syncBodyPreview || undefined;

  const pubDate =
    typeof post.created_utc === 'number'
      ? new Date(post.created_utc * 1000).toISOString()
      : undefined;

  return {
    id: String(post.id),
    title: getDisplayTitle(post),
    subreddit: post.subreddit || '',
    link: post.permalink ? `https://reddit.com${post.permalink}` : (post.url || ''),
    author: post.author,
    pubDate,
    imageUrl,
    score: typeof post.score === 'number' ? post.score : undefined,
    numComments: typeof post.num_comments === 'number' ? post.num_comments : undefined,
    topComments: [],
    bodyPreview,
  };
};
