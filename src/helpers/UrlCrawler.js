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
  // Check for image extensions
  let fileExt = url.split('.').pop();
  let imgExt = ['png', 'jpg', 'jpeg', 'gif', 'mov'];

  if (imgExt.indexOf(fileExt) !== -1) {
    return url;
  }
  return null;
};

export const crawlUrl = async (url) => {
  try {
    let readApi = `${process.env.REACT_APP_READ_API}`;
    let httpsUrl = url.replace('http://', 'https://');
    let article = await axios.post(readApi, {
      url: httpsUrl,
    });
    return article.data;
  } catch (error) {
    console.log(error.message);
    throw new Error(error.message);
  }
};
