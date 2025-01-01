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
import history from '../history';

export const getPostType = (url) => {
  let videoUrl = getVideoUrlExternal(url),
    imageUrl = getImageUrl(url);
  let postType;
  if (videoUrl) {
    postType = {
      type: 'video',
      url: videoUrl,
    };
  } else if (imageUrl) {
    postType = {
      type: 'image',
      url: imageUrl,
    };
  } else {
    postType = {
      type: 'article',
      url: url,
    };
  }
  return postType;
};

export const getParsedContentExternal = (content) => {
  if (content.img) {
    let src = content.img;
    return <img className='fix-image' src={src} alt={src} />;
  } else if (content.video) {
    console.log('trying to set video ', content.video);
    return <Video url={content.video} />;
  } else {
    return Parser(content.data, {
      replace: (domNode) => {
        if (badTags.indexOf(domNode.name) !== -1) {
          return React.createElement('span', {}, '');
        }
        if (domNode.name === 'img') {
          let { src, alt } = domNode.attribs;
          return <img className='fix-image' src={src} alt={alt} />;
        }
      },
    });
  }
};
