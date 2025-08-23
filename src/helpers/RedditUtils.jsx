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
  return post.thumbnail ? post.thumbnail : '';
};

export const noContentTile = () => {
  return (
    <div className='blocked-content'>
      <img className='img-fit-contain' src={gandalf} alt='reddzit' />
      <div>
        <h3>You shall not pass!</h3>
        <p>Unable to retrieve content.</p>
      </div>
    </div>
  );
};

export const setHistory = (name = null, after = null) => {
  let nextSearch;
  if (!name) {
    nextSearch = after ? '&after=' + after : null;
    history.push({
      pathname: window.location.pathname,
      search: nextSearch,
    });
  } else {
    let nameSearch = '?name=' + name;
    nextSearch = after ? nameSearch + '&after=' + after : nameSearch;
    history.push({
      pathname: window.location.pathname,
      search: nextSearch,
    });
  }
};

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
  let videoUrl = getVideoUrl(post),
    imageUrl = getImageUrl(post.url);
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
  } else if (post.is_self && post.selftext_html) {
    // Reddit self-post with text content
    postType = {
      type: 'reddit_self',
      content: post.selftext_html,
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

export const handlePostType = async (postType) => {
  // Convert to something our parser can understand
  switch (postType.type) {
    case 'video':
      return {
        video: postType.url,
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
      // Reddit link to another Reddit post - show basic info
      return {
        content: `<h2>${postType.title}</h2><p><a href="${postType.url}" target="_blank">View on Reddit</a></p>`,
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
  fontSize
) => {
  //const selectedPost = saved[selectedIndex]

  let content;

  if (!selectedContent || contentLoading) {
    return (
      <div className='container'>
        <div className='loading loading-lg' />
      </div>
    );
  }

  // Handle url calls
  if (!selectedPost) {
    if (selectedContent.img) {
      let src = selectedContent.img;
      return (
        <div className='read-content-inner media' style={{ fontSize }}>
          <img className='fix-image' src={src} alt={src} />
        </div>
      );
    } else if (selectedContent.video) {
      console.log('trying to set video ', selectedContent.video);
      return (
        <div className='read-content-inner media' style={{ fontSize }}>
          <Video url={selectedContent.video} />
        </div>
      );
    } else {
      //debugger
    }
  } else if (selectedContent.img && selectedPost) {
    return (
      <div className='read-content-inner media' style={{ fontSize }}>
        <figure className='figure'>
          <img
            className='img-responsive'
            src={selectedContent.img}
            alt={selectedPost.title}
          />
          <figcaption className='figure-caption text-center'>
            {selectedPost.title}
          </figcaption>
        </figure>
      </div>
    );
  } else if (selectedContent.video) {
    console.log('trying to set video ', selectedContent.video);
    return (
      <div className='read-content-inner media' style={{ fontSize }}>
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
            return (
              <div className='read-content-inner' style={{ fontSize }}>
                <img className='fix-image' src={src} alt={alt} />
              </div>
            );
          }
        },
      });

      return (
        <div className='read-content-inner' style={{ fontSize }}>
          {content}
        </div>
      );
    } catch (err) {
      return (
        <div className='read-content-inner' style={{ fontSize }}>
          {noContentTile()}
        </div>
      );
    }
  } else if (!selectedContent.data) {
    console.log('selectedContent', selectedContent);
    return (
      <div className='read-content-inner' style={{ fontSize }}>
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
            return (
              <div className='read-content-inner' style={{ fontSize }}>
                <img className='fix-image' src={src} alt={alt} />
              </div>
            );
          }
        },
      });

      return (
        <div className='read-content-inner' style={{ fontSize }}>
          {content}
        </div>
      );
    } catch (err) {
      return (
        <div className='read-content-inner' style={{ fontSize }}>
          {noContentTile()}
        </div>
      );
    }
  }
};
