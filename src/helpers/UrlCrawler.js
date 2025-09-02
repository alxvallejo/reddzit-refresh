import urlParser from 'js-video-url-parser';
import axios from 'axios';

export const badTags = ['component_separator'];

export const getVideoUrl = (post) => {
  if (post.secure_media && post.secure_media.type) {
    const meta = urlParser.parse(post.url);
    if (meta && meta.provider == 'youtube') {
      return 'https://youtube.com/embed/' + meta.id;
    }
  }
  return null;
};

// Straight up parse the url
export const getVideoUrlExternal = (url) => {
  console.log('checking url', url);
  const meta = urlParser.parse(url);
  if (meta && meta.provider == 'youtube') {
    return 'https://youtube.com/embed/' + meta.id;
  }
  return null;
};

export const getImageUrl = (url) => {
  // Guard against undefined/null and non-string inputs
  if (!url || typeof url !== 'string') return null;

  // Ignore query params and hashes when checking the extension
  const cleanUrl = url.split(/[?#]/)[0];

  // Extract the lowercase file extension
  const fileExt = cleanUrl.split('.').pop().toLowerCase();
  const imgExt = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'mov'];

  if (imgExt.indexOf(fileExt) !== -1) {
    return url;
  }
  return null;
};

export const crawlUrl = async (url) => {
  try {
    // Use base URL and append the endpoint
    const apiBase = import.meta.env.VITE_READ_API_BASE || import.meta.env.VITE_READ_API;
    const endpoint = apiBase.includes('/getContent') ? apiBase : `${apiBase}/getContent`;
    
    let httpsUrl = url.replace('http://', 'https://');
    let article = await axios.post(endpoint, {
      url: httpsUrl,
    });
    return article.data;
  } catch (error) {
    console.log(error.message);
    throw new Error(error.message);
  }
};
