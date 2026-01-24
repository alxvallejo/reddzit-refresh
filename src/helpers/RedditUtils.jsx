import React from 'react';
import _ from 'lodash';
import Video from '../components/Video';
import Parser from 'html-react-parser';
import {
  crawlUrl,
  getVideoUrl,
  getVideoUrlExternal,
  getImageUrl,
  badTags,
} from './UrlCrawler';

const slugify = (text) =>
  (text || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
import gandalf from '../gandalf.png';

export const getContentParamUrl = (contentParam) => {
  if (contentParam.vid) {
    return contentParam.vid;
  } else if (contentParam.img) {
    return contentParam.img;
  } else if (contentParam.url) {
    return contentParam.url;
  } else {
    return null;
  }
};

export const getPreviewImage = (post) => {
  const thumb = post.thumbnail;
  // Return null if thumbnail is missing or is a special Reddit placeholder
  if (!thumb || ['self', 'default', 'nsfw', 'spoiler', 'image'].includes(thumb) || !/^https?:\/\//.test(thumb)) {
    return null;
  }
  return thumb;
};

// Get the best quality preview image for article reader view
export const getArticlePreviewImage = (post) => {
  if (!post) return null;
  
  // Try to get high-quality image from preview object
  try {
    const preview = post.preview?.images?.[0];
    if (preview?.source?.url) {
      // Decode HTML entities in URL
      return preview.source.url.replace(/&amp;/g, '&');
    }
  } catch (_) {}
  
  // Fallback to thumbnail if it's a valid URL
  const thumb = post.thumbnail;
  if (thumb && /^https?:\/\//.test(thumb) && !['self', 'default', 'nsfw', 'spoiler'].includes(thumb)) {
    return thumb;
  }
  
  return null;
};

export const noContentTile = () => {
  return (
    <div className='flex flex-col items-center justify-center p-8 text-center bg-gray-100 rounded-lg my-4'>
      <img className='w-32 h-32 object-contain mb-4' src={gandalf} alt='reddzit' />
      <div>
        <h3 className='text-xl font-bold mb-2'>You shall not pass!</h3>
        <p className='text-gray-600'>Unable to retrieve content.</p>
      </div>
    </div>
  );
};

export { slugify };

export const getUrlContent = (parsed) => {
  if (parsed.url || parsed.img || parsed.vid) {
    return parsed;
  }
  return null;
};

export const getContentSearchParam = (content) => {
  console.log('setting content url for content', content);
  if (content.img) {
    return 'url=' + content.img;
  } else if (content.video) {
    return 'url=' + content.video;
  } else {
    return 'url=' + content.url;
  }
};

export const getPostType = (post) => {
  let videoInfo = getVideoUrl(post),
    imageUrl = getImageUrl(post.url);
  let postType;
  // Basic comment detection: Reddit comments are kind t1 and include a body
  const isRedditComment =
    (post && post.name && post.name.startsWith('t1_')) || !!post.body;
  if (videoInfo) {
    postType = {
      type: 'video',
      videoInfo: videoInfo, // Pass the full video info object
    };
  } else if (imageUrl) {
    postType = {
      type: 'image',
      url: imageUrl,
    };
  } else if (isRedditComment && post.permalink) {
    // Reddit comment - treat as a link to the specific comment on Reddit
    postType = {
      type: 'reddit_link',
      url: `https://www.reddit.com${post.permalink}`,
      title: post.link_title || 'Reddit Comment',
      post: post,
    };
  } else if (post.is_self && (post.selftext_html || post.selftext)) {
    // Reddit self-post with text content
    // Decode HTML entities from selftext_html
    let content = post.selftext_html;
    if (content) {
      // Decode HTML entities that Reddit double-encodes
      const textarea = document.createElement('textarea');
      textarea.innerHTML = content;
      content = textarea.value;
    } else {
      // Fallback to plain text if no HTML available
      content = `<pre>${post.selftext}</pre>`;
    }
    
    postType = {
      type: 'reddit_self',
      content: content,
      title: post.title,
      post: post,
    };
  } else if (post.url && post.url.includes('reddit.com/r/') && post.url.includes('/comments/')) {
    // Reddit comment thread link - use the post data we already have
    postType = {
      type: 'reddit_link',
      url: post.url,
      title: post.title,
      post: post,
    };
  } else {
    postType = {
      type: 'article',
      url: post.url,
    };
  }
  return postType;
};

// Decode HTML entities in Reddit titles
const decodeHtmlEntities = (text) => {
  if (!text) return text;
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ');
};

// Human-friendly title for posts and comments
export const getDisplayTitle = (post) => {
  if (!post) return '';
  if (post.title) return decodeHtmlEntities(post.title);
  const isRedditComment =
    (post && post.name && post.name.startsWith('t1_')) || !!post.body;
  if (isRedditComment) {
    return decodeHtmlEntities(post.link_title) || 'Reddit Comment';
  }
  return decodeHtmlEntities(post.link_title) || post.url || 'Untitled';
};

// Create a short, single-line snippet for a Reddit comment body
export const getCommentSnippet = (post, maxLen = 400) => {
  if (!post || !post.body) return '';
  const cleaned = String(post.body).replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen - 1).trim() + '…';
};

// Detect whether a saved item is a Reddit comment
export const isComment = (post) => {
  return !!(
    post && ((post.name && post.name.startsWith('t1_')) || post.body)
  );
};

// Normalize a Reddit comment to the feed item shape for logging/UI mapping
export const mapCommentToFeedItem = (post) => {
  if (!post) return null;
  const title = post.link_title
    ? post.link_title
    : 'Comment';
  const subreddit = post.subreddit_name_prefixed
    ? post.subreddit_name_prefixed
    : post.subreddit
    ? `r/${post.subreddit}`
    : null;
  const permalink = post.permalink
    ? `https://www.reddit.com${post.permalink}`
    : post.link_permalink || post.link_url || null;
  const score = typeof post.score === 'number' ? post.score : post.ups;

  return {
    id: post.name || post.id,
    type: 'comment',
    title,
    snippet: post.body || null,
    author: post.author,
    subreddit,
    permalink,
    parentPermalink: post.link_permalink || post.link_url || null,
    createdUtc: post.created_utc,
    score,
    saved: post.saved === true,
  };
};

export const handlePostType = async (postType) => {
  // Convert to something our parser can understand
  switch (postType.type) {
    case 'video':
      return {
        video: postType.videoInfo, // Pass the full video info object
      };

    case 'image':
      return {
        img: postType.url,
      };

    case 'reddit_self':
      // Reddit self-post - use the content from the API
      return {
        content: postType.content,
        title: postType.title,
      };

    case 'reddit_link':
      // Reddit comment or link - show the comment body if available
      const post = postType.post;
      if (post && post.body) {
        // This is a comment with body text
        // Decode HTML entities if body_html is available
        let commentContent = post.body_html;
        if (commentContent) {
          const textarea = document.createElement('textarea');
          textarea.innerHTML = commentContent;
          commentContent = textarea.value;
        } else {
          // Fallback to plain text
          commentContent = `<pre>${post.body}</pre>`;
        }
        
        return {
          content: `<div class="comment-body p-4 bg-gray-50 rounded mb-4">${commentContent}</div><p style="margin-top: 1em;"><a href="${postType.url}" target="_blank" class="text-[#ff4500] hover:underline">View full thread on Reddit</a></p>`,
          title: postType.title,
        };
      }
      
      // Otherwise just show link
      return {
        content: `<h2 class="text-xl font-bold mb-2">${postType.title}</h2><p><a href="${postType.url}" target="_blank" class="text-[#ff4500] hover:underline">View on Reddit</a></p>`,
        title: postType.title,
      };

    default:
      // External links - use crawlUrl
      let article = await crawlUrl(postType.url);
      return article;
  }
};

export const getParsedContent = (
  selectedContent,
  contentLoading,
  selectedPost,
  fontSize,
  hasPreviewImage = false
) => {
  // Track if we've seen the first image (to skip it when preview image is shown)
  let firstImageSkipped = false;
  //const selectedPost = saved[selectedIndex]

  let content;

  if (!selectedContent || contentLoading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin' />
      </div>
    );
  }

  // Handle url calls
  if (!selectedPost) {
    if (selectedContent.img) {
      let src = selectedContent.img;
      return (
        <div className='my-4' style={{ fontSize }}>
          <img className='w-full h-auto rounded' src={src} alt={src} />
        </div>
      );
    } else if (selectedContent.video) {
      console.log('trying to set video ', selectedContent.video);
      return (
        <div className='my-4' style={{ fontSize }}>
          <Video url={selectedContent.video} />
        </div>
      );
    } else {
      //debugger
    }
  } else if (selectedContent.img && selectedPost) {
    // Skip displaying image if preview image is already shown
    if (hasPreviewImage) {
      return null;
    }
    return (
      <div className='my-4' style={{ fontSize }}>
        <figure className='my-4'>
          <img
            className='w-full h-auto rounded'
            src={selectedContent.img}
            alt={selectedPost.title}
          />
          <figcaption className='text-center text-sm text-gray-500 mt-2'>
            {selectedPost.title}
          </figcaption>
        </figure>
      </div>
    );
  } else if (selectedContent.video) {
    console.log('trying to set video ', selectedContent.video);
    return (
      <div className='my-4' style={{ fontSize }}>
        <Video url={selectedContent.video} />
      </div>
    );
  } else if (selectedContent.content) {
    try {
      //console.log('selectedContent.content', selectedContent.content);
      content = Parser(selectedContent.content, {
        replace: (domNode) => {
          if (badTags.indexOf(domNode.name) !== -1) {
            return React.createElement('span', {}, '');
          }
          if (domNode.name === 'img') {
            let { src, alt } = domNode.attribs;
            // Skip first image if we're showing a preview image (likely duplicate lead image)
            if (hasPreviewImage && !firstImageSkipped) {
              firstImageSkipped = true;
              return React.createElement('span', {}, '');
            }
            return (
              <div className='my-4' style={{ fontSize }}>
                <img className='w-full h-auto rounded' src={src} alt={alt} />
              </div>
            );
          }
        },
      });

      return content;
    } catch (err) {
      return (
        <div className='my-4' style={{ fontSize }}>
          {noContentTile()}
        </div>
      );
    }
  } else if (!selectedContent.data) {
    console.log('selectedContent', selectedContent);
    return (
      <div className='my-4' style={{ fontSize }}>
        {noContentTile()}
      </div>
    );
  } else {
    try {
      //console.log('selectedContent.data', selectedContent.data);
      content = Parser(selectedContent.data, {
        replace: (domNode) => {
          if (badTags.indexOf(domNode.name) !== -1) {
            return React.createElement('span', {}, '');
          }
          if (domNode.name === 'img') {
            let { src, alt } = domNode.attribs;
            // Skip first image if we're showing a preview image (likely duplicate lead image)
            if (hasPreviewImage && !firstImageSkipped) {
              firstImageSkipped = true;
              return React.createElement('span', {}, '');
            }
            return (
              <div className='my-4' style={{ fontSize }}>
                <img className='w-full h-auto rounded' src={src} alt={alt} />
              </div>
            );
          }
        },
      });

      return content;
    } catch (err) {
      return (
        <div className='my-4' style={{ fontSize }}>
          {noContentTile()}
        </div>
      );
    }
  }
};
