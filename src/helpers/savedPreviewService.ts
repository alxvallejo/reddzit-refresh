import { crawlUrl } from './UrlCrawler';
import { isComment, getImageUrlFromText, getPreviewImage } from './RedditUtils';

type AnyRedditPost = Record<string, any>;

export interface SavedPreview {
  imageUrl?: string;
  bodyPreview?: string;
  content?: any;
}

const SNIPPET_MAX = 240;

const isRedditUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host === 'reddit.com' || host.endsWith('.reddit.com') || host === 'redd.it' || host.endsWith('.redd.it');
  } catch {
    return false;
  }
};

const extractFirstImage = (html: string): string | undefined => {
  if (!html) return undefined;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const img = doc.querySelector('img[src]');
    const src = img?.getAttribute('src') || undefined;
    if (!src) return undefined;
    if (/^https?:\/\//i.test(src)) return src;
    return undefined;
  } catch {
    return undefined;
  }
};

const extractSnippetFromHtml = (html: string, max = SNIPPET_MAX): string => {
  if (!html) return '';
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length <= max) return text;
    return text.slice(0, max - 1).trim() + '…';
  } catch {
    return '';
  }
};

const truncate = (text: string | undefined, max = SNIPPET_MAX): string | undefined => {
  if (!text) return undefined;
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return undefined;
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max - 1).trim() + '…';
};

const resolveTarget = async (
  post: AnyRedditPost,
  redditHelper: any
): Promise<AnyRedditPost> => {
  if (!isComment(post)) return post;
  if (!post.link_id || !redditHelper?.getById) return post;
  try {
    const parent = await redditHelper.getById(post.link_id);
    return parent || post;
  } catch {
    return post;
  }
};

export const fetchSavedPreview = async (
  post: AnyRedditPost,
  redditHelper: any
): Promise<SavedPreview> => {
  const target = await resolveTarget(post, redditHelper);

  let imageUrl: string | undefined =
    getImageUrlFromText(target?.url) ||
    getImageUrlFromText(target?.link_url) ||
    getPreviewImage(target) ||
    undefined;

  let bodyPreview: string | undefined =
    truncate(target?.selftext) ||
    (isComment(post) ? truncate(post.body) : undefined);

  let content: any = undefined;

  const candidateUrl: string | undefined = target?.url;
  if (!imageUrl && candidateUrl && !isRedditUrl(candidateUrl)) {
    try {
      const article = await crawlUrl(candidateUrl);
      content = article;
      if (article?.content) {
        imageUrl = imageUrl || extractFirstImage(article.content);
        bodyPreview = bodyPreview || extractSnippetFromHtml(article.content);
      }
    } catch {
      // crawl failed — leave existing values
    }
  }

  return { imageUrl, bodyPreview, content };
};
