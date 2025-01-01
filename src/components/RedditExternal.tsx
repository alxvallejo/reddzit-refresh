import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';
import { reddit_host, RedditAuth } from '../helpers/RedditAuth';
import Reddit from '../helpers/Reddit';
import { getOptions, setOption } from '../helpers/Options';
import { getContentParamUrl, setHistory } from '../helpers/RedditUtils.jsx';
import {
  getPostType,
  getParsedContentExternal,
} from '../helpers/RedditUtilsExternal.jsx';
import { crawlUrl, getVideoUrl } from '../helpers/UrlCrawler';
import ReadControls from './ReadControls';
import smeagol from '../smeagol.png';
import history from '../history';
import SignUpHeader from './SignUpHeader';

import ReactGA from 'react-ga';

import queryString from 'query-string';

class RedditExternal extends Component {
  constructor(props) {
    super(props);

    let options = getOptions();

    this.state = {
      loading: true,
      contentLoading: true,
      fontSize: options.fontSize || 18,
      selectedContent: null,
      contentParam: props.contentParam,
      title: null,
      name: props.name,
    };
    this.reddit = null;

    this.setSize = this.setSize.bind(this);
  }

  async componentDidMount() {
    const { contentParam } = this.state;
    // deactivate rendering of content for now,
    // since we can't get the title
    // let postType = await getPostType(contentParam.url);
    // this.handlePostType(postType);
    this.setState({
      loading: false,
    });
  }

  async handlePostType(postType) {
    let selectedContent;
    // Convert to something our parser can understand
    switch (postType.type) {
      case 'video':
        selectedContent = {
          video: postType.url,
        };
        break;

      case 'image':
        selectedContent = {
          img: postType.url,
        };
        break;

      default:
        let article = await crawlUrl(postType.url);
        selectedContent = article.content;
    }

    this.setState({
      selectedContent,
      contentLoading: false,
    });
  }

  redditLink(title) {
    const { name, url } = this.state;

    return (
      <a href={url} target='_blank' rel='noopener noreferrer'>
        {title}
      </a>
    );
  }

  setSize(newSize) {
    this.setState({
      fontSize: newSize,
    });

    setOption({ fontSize: newSize });
  }

  noContent() {
    const redditLink = <a href='https://reddit.com'>Reddit</a>;

    return (
      <div className='no-content-wrapper'>
        <h2>No Reddit Posts Saved Yet!</h2>
        <p>
          Head to your {redditLink}, start saving stuff that you like or want to
          read later, and then check back!
        </p>
      </div>
    );
  }

  headerSubreddit() {}

  render() {
    const { loading, fontSize, contentLoading, selectedContent, url, name } =
      this.state;
    const showDrawer = !contentLoading && selectedContent;

    if (loading) {
      return (
        <div className='container'>
          <div className='loading loading-lg' />
        </div>
      );
    }

    if (!selectedContent) {
      return (
        <div className='container sign-up-container'>
          <SignUpHeader />
        </div>
      );
    }

    return (
      <div className='container'>
        <ul className='navigation'>
          <div className='read-content'>
            {showDrawer && (
              <div className='read-controls-wrapper'>
                <ReadControls fontSize={fontSize} setSize={this.setSize} />
                {selectedContent && url && (
                  <div className='post-title'>
                    <h2>Some shit</h2>
                  </div>
                )}

                <label
                  htmlFor='nav-trigger'
                  className='nav-trigger-label'
                  onClick={() => this.setContent(null)}
                >
                  <h3>Reddzit</h3>
                  <button className='btn btn-primary btn-action btn-lg'>
                    <i className='icon icon-cross' />
                  </button>
                </label>
              </div>
            )}
            {showDrawer && (
              <div className='read-content-inner' style={{ fontSize }}>
                <SignUpHeader />
                {getParsedContentExternal(selectedContent)}
              </div>
            )}
          </div>
        </ul>

        <input
          type='checkbox'
          id='nav-trigger'
          className='nav-trigger'
          checked={showDrawer}
        />

        <div className='site-wrap'>
          <div className='header'>
            <div className='banner-img'>
              <img className='img-fit-contain' src={smeagol} alt='reddzit' />
              <div className='site-name'>
                <h1>Reddzit</h1>
                <div className='caption'>Review your Saved Reddit Posts</div>
              </div>
            </div>

            <div className='reddzit-nav'>
              <Link className='txt-primary' to='/'>
                Back to Home
              </Link>
            </div>
          </div>
          <div className='external'>Hey thanks for visiting</div>
        </div>
      </div>
    );
  }
}

export default RedditExternal;
