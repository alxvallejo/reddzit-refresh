import React, { Component } from 'react';
import { BrowserRouter as Router, Route, Link } from 'react-router-dom';
import { reddit_host, RedditAuth } from '../helpers/RedditAuth';
import Reddit from '../helpers/Reddit';
import { getOptions, setOption } from '../helpers/Options';
import {
  setHistory,
  getUrlContent,
  getPostType,
  getPreviewImage,
} from '../helpers/RedditUtils';
import { isComment, mapCommentToFeedItem, getDisplayTitle, getCommentSnippet } from '../helpers/RedditUtils';

import RedditExternal from './RedditExternal';
import NoContent from './NoContent';
import smeagol from '../smeagol.png';
import history from '../history';
import ReactGA from 'react-ga';
import { crawlUrl } from '../helpers/UrlCrawler';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { fadeOut } from 'react-animations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome,
  faAlignLeft,
  faFeatherAlt,
  faCoffee,
} from '@fortawesome/free-solid-svg-icons';

import { Helmet } from 'react-helmet';
import OffCanvas from './OffCanvas';
import Modal from './Modal';
import {
  disableBodyScroll,
  enableBodyScroll,
  clearAllBodyScrollLocks,
} from 'body-scroll-lock';
import _ from 'lodash';

import queryString from 'query-string';

const midBreakPoint = 922;

class RedditLogin extends Component {
  constructor(props) {
    super(props);

    let options = getOptions();

    this.state = {
      loading: true,
      saved: [],
      contentLoading: false,
      selectedContent: null,
      selectedIndex: null,
      fontSize: options.fontSize || 18,
      page: 0, // Internal trakcing used to reset url params
      signedIn: false,
      name: null, // Ext urls
      contentParam: null,
      showSavedOpacity: false,
      darkMode: options.darkMode || false,
      showEarliestLink: !!options.earliest,
    };

    this.targetElement = null;

    this.redditAuth = new RedditAuth();
    this.reddit = null;

    this.setSize = this.setSize.bind(this);
    this.pageUp = this.pageUp.bind(this);
    this.pageDown = this.pageDown.bind(this);
    this.toggleDarkMode = this.toggleDarkMode.bind(this);

    this.saveButton = this.saveButton.bind(this);
    this.copyButton = this.copyButton.bind(this);
    this.resetSelected = this.resetSelected.bind(this);
    this.isModalModal = this.isModalModal.bind(this);
  }

  async componentDidMount() {
    const parsed = queryString.parse(history.location.search);
    const name = parsed.name;
    const after = parsed.after;
    const contentParam = getUrlContent(parsed);

    let accessToken = await this.redditAuth.handleAuth();

    this.targetElement = document.querySelector('#modal-container');

    // if (!accessToken && (name && contentParam)) {
    if (!accessToken && name) {
      // Render will handle ext name
      this.setState({
        name,
        after,
        //contentParam
      });
    } else {
      this.setState({
        signedIn: true,
      });
      this.reddit = new Reddit({ accessToken: accessToken });

      ReactGA.pageview('/reddit');

      try {
        await this.reddit.getMe();
        if (parsed.name) {
          await this.handleUrlQuery(parsed);
        }
        await this.getSaved();
        //await this.reddit.getSubReddits();
      } catch (err) {
        console.log(err);
      }
    }
  }

  async getSaved(params = {}) {
    params = _.isEmpty(params)
      ? queryString.parse(history.location.search)
      : params;
    let { saved } = await this.reddit.getSaved(params);
    if (!saved) {
      history.push({
        pathname: history.location.pathname,
        search: null,
      });
      this.setState({
        loading: false,
      });
    } else {
      // Log mapping for Reddit comments for debugging/verification
      try {
        saved
          .filter((p) => isComment(p))
          .forEach((p) => {
            const mapped = mapCommentToFeedItem(p);
            // eslint-disable-next-line no-console
            console.log('Comment mapping → feed item', mapped);
          });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Unable to log comment mappings', e);
      }
      this.setState({
        loading: false,
        saved,
      });
    }
  }

  redditLink(post, title = null, classes = null) {
    const permalink =
      (post && (post.permalink || post.link_permalink || post.link_url)) || '';
    if (!permalink) {
      // eslint-disable-next-line no-console
      console.warn('No permalink available for post', post);
      const linkTitle = title || getDisplayTitle(post);
      return (
        <span className={classes || undefined}>{linkTitle}</span>
      );
    }
    // If it's already an absolute URL, keep it; otherwise prefix host
    const href = permalink.startsWith('http')
      ? permalink
      : reddit_host + permalink;
    let linkTitle = title || getDisplayTitle(post);
    return (
      <a
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        className={classes}
      >
        {linkTitle}
      </a>
    );
  }

  async getArticle(post, i) {
    const { after, saved } = this.state;
    ReactGA.event({
      category: 'Navigation',
      action: 'Get Content',
      label: post.url || 'n/a',
    });

    // Compare and record earliest date if necessary
    const savedItem = saved[i];
    const options = getOptions();
    const earliest = options.earliest;
    const savedCreated = savedItem ? savedItem.created_utc : null;

    if (
      savedCreated &&
      (!earliest || (earliest && savedCreated < earliest.date))
    ) {
      let newOption = { earliest: { date: savedCreated, name: post.name } };
      setOption(newOption);

      this.setState({
        showEarliestLink: true,
      });
    }

    this.setState({
      contentLoading: true,
    });
    if (this.isModalModal()) {
      disableBodyScroll(this.targetElement);
    }

    try {
      // Allow comments and self-posts that may not have a direct url
      if (!post.url && !isComment(post) && !(post.is_self && (post.selftext_html || post.selftext))) {
        // eslint-disable-next-line no-console
        console.log('Skipping item without content url', post);
        return;
      }

      let postType = await getPostType(post);
      this.handlePostType(postType);
      this.handleIndex(i);

      setHistory(post.name, after);
    } catch (error) {
      console.log('error at get content', error);
      return;
    }
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

      case 'reddit_self':
        // Reddit self-post - use the content from the API
        selectedContent = {
          content: postType.content,
          title: postType.title,
        };
        break;

      case 'reddit_link':
        // Reddit link to another Reddit post - show basic info
        selectedContent = {
          content: `<h2>${postType.title}</h2><p><a href="${postType.url}" target="_blank">View on Reddit</a></p>`,
          title: postType.title,
        };
        break;

      default:
        // External links - use crawlUrl
        let article = await crawlUrl(postType.url);
        // console.log('article retrieved', article);
        selectedContent = article;
    }

    this.setState({
      selectedContent,
      contentLoading: false,
    });
  }

  handleIndex(i = null) {
    const { saved } = this.state;
    let selectedPost = saved[i];

    this.setState({
      selectedIndex: i,
      selectedPost,
    });
  }

  resetSelected() {
    const { after } = this.state;
    enableBodyScroll(this.targetElement);
    this.setState({
      selectedIndex: null,
      selectedPost: null,
      selectedContent: null,
      showSavedOpacity: false,
    });

    setHistory(null, after);
  }

  copyButton(buttonClass = null) {
    let { selectedPost, saved, selectedIndex, showSavedOpacity } = this.state;
    let pathname = window.location.pathname;
    let copyUrl =
      'https://' +
      window.location.hostname +
      pathname +
      '?name=' +
      selectedPost.name;
    let btnClass = buttonClass ? buttonClass + ' btn' : 'btn';

    let newSaved = saved.map((s, i) => {
      return {
        ...s,
        copiedToClipboard: !!(selectedIndex === i),
      };
    });

    // const opacityText = showSavedOpacity === true ? 1 : 0;

    // const copyClass = showSavedOpacity === true ? 'copied-text fadeOut' : 'copied-text';

    return (
      <div className='copy-wrapper'>
        {/* <span className={copyClass}>Copied!</span> */}
        <CopyToClipboard
          text={copyUrl}
          onCopy={() =>
            this.setState({
              saved: newSaved,
              //showSavedOpacity: true
            })
          }
        >
          <button className={btnClass}>Copy Link</button>
        </CopyToClipboard>
      </div>
    );
  }

  getContentButton() {
    const width = this.props.windowWidth;

    if (width > 922) {
      return (
        <button className='btn'>
          <FontAwesomeIcon icon={faAlignLeft} />
        </button>
      );
    } else {
      return <FontAwesomeIcon icon={faAlignLeft} inverse />;
    }
  }

  async handleUrlQuery(urlParams) {
    this.setState({
      contentLoading: true,
    });
    const name = urlParams.name;
    let post = await this.reddit.getById(name);
    await this.getArticle(post, null);
    this.setState({
      selectedPost: post,
    });
  }

  async unsaveContent() {
    let { selectedPost, selectedIndex, saved } = this.state;
    // selectedPost = selectedIndex ? saved[selectedIndex] : selectedPost;
    ReactGA.event({
      category: 'Unsave',
      action: 'Unsave Content',
    });
    try {
      let resp = await this.reddit.unsave(selectedPost.name);

      if (resp.status === 200) {
        if (selectedIndex || selectedIndex === 0) {
          saved.splice(selectedIndex, 1);
          this.setState({
            saved,
          });
        }

        this.resetSelected();
      }
    } catch (error) {
      console.log(error);
      let accessToken = await this.redditAuth.handleAuth();
      await this.reddit.refreshToken(accessToken);
      this.unsaveContent();
    }
  }

  async saveContent() {
    let { selectedPost } = this.state;

    ReactGA.event({
      category: 'Save',
      action: 'Save Content',
    });

    try {
      let resp = await this.reddit.save(selectedPost.name);

      if (resp.status === 200) {
        this.setState({
          selectedPost: {
            ...selectedPost,
            saved: true,
          },
        });
      }
    } catch (error) {
      console.log(error);
      let accessToken = await this.redditAuth.handleAuth();
      await this.reddit.refreshToken(accessToken);
      this.saveContent();
    }
  }

  saveButton(buttonClass = null) {
    let { selectedPost } = this.state;
    let btnClass = buttonClass ? buttonClass + ' btn' : 'btn';
    if (selectedPost.saved) {
      return (
        <button className={btnClass} onClick={() => this.unsaveContent()}>
          Unsave
        </button>
      );
    } else {
      return (
        <button className={btnClass} onClick={() => this.saveContent()}>
          Save
        </button>
      );
    }
  }

  goToEarliest() {
    const options = getOptions();
    const earliest = options.earliest;

    if (!earliest) {
      return null;
    }
    // Set params
    let params = {
      after: earliest.name,
    };

    this.getSaved(params);
  }

  resetEarliest() {
    setOption({ earliest: null });
    this.setState({
      showEarliestLink: false,
    });
  }

  setSize(newSize) {
    this.setState({
      fontSize: newSize,
    });

    setOption({ fontSize: newSize });
  }

  async pageDown() {
    let { saved, page } = this.state;

    console.log('saved', saved);

    if (saved) {
      let firstItem = saved[0].name,
        nextSearchParams = '?before=' + firstItem;
      // history.push({
      //     pathname: window.location.pathname,
      //     search: nextSearchParams
      // });
      await this.getSaved({ after: firstItem });
      this.setState({
        page: page > 0 ? page - 1 : 0,
        after: firstItem,
      });
    } else {
      await this.getSaved();
    }
  }

  async pageUp() {
    let { saved, page } = this.state;
    if (saved) {
      let lastSaved = saved.pop().name;
      history.push({
        pathname: window.location.pathname,
        search: '?after=' + lastSaved,
      });
      this.setState({
        page: page + 1,
        after: lastSaved,
      });
    }
    await this.getSaved();
    window.scrollTo(0, 0);
  }

  toggleDarkMode() {
    let newOption = {
      darkMode: !this.state.darkMode,
    };
    setOption(newOption);
    this.setState({
      ...this.state,
      darkMode: !this.state.darkMode,
    });
  }

  isModalModal() {
    const width = this.props.windowWidth;
    return !!(width <= midBreakPoint);
  }

  render() {
    const {
      signedIn,
      loading,
      saved,
      selectedContent,
      selectedIndex,
      fontSize,
      contentLoading,
      selectedPost,
      contentParam,
      name,
      darkMode,
      showEarliestLink,
    } = this.state;

    const modalMode = this.isModalModal();

    if (loading) {
      if (!signedIn && name) {
        return <RedditExternal name={name} />;
      }

      return (
        <div className='container'>
          <div className='loading loading-lg' />
        </div>
      );
    }

    const showDrawer = !!selectedContent || !!contentLoading;

    // console.log('modalMode', modalMode);
    // console.log('selectedContent', selectedContent);

    return (
      <div className='container'>
        {modalMode && (
          <Modal
            showDrawer={showDrawer}
            selectedContent={selectedContent}
            selectedPost={selectedPost}
            darkMode={darkMode}
            setSize={this.setSize}
            fontSize={fontSize}
            contentLoading={contentLoading}
            toggleDarkMode={this.toggleDarkMode}
            redditLink={this.redditLink}
            saveButton={this.saveButton}
            copyButton={this.copyButton}
            resetSelected={this.resetSelected}
          />
        )}
        {!modalMode && showDrawer && (
          <OffCanvas
            showDrawer={showDrawer}
            selectedContent={selectedContent}
            selectedPost={selectedPost}
            darkMode={darkMode}
            setSize={this.setSize}
            fontSize={fontSize}
            contentLoading={contentLoading}
            toggleDarkMode={this.toggleDarkMode}
            redditLink={this.redditLink}
            saveButton={this.saveButton}
            copyButton={this.copyButton}
            resetSelected={this.resetSelected}
          />
        )}
        {modalMode && <div className='mask' role='dialog' />}

        <div className='site-wrap'>
          <div className='header'>
            <div className='reddzit-nav'>
              <Link className='txt-primary' to='/'>
                <FontAwesomeIcon icon={faHome} />
              </Link>
              {/* <Link className="txt-primary" to="/about">
                                <FontAwesomeIcon icon={faFeatherAlt} />
                            </Link> */}
              <a
                className='txt-primary'
                href='https://www.buymeacoffee.com/reddzit'
                target='_blank'
              >
                <FontAwesomeIcon icon={faCoffee} /> Buy me a coffee
              </a>
            </div>
            <div className='banner-img'>
              <img className='img-fit-contain' src={smeagol} alt='reddzit' />
              <div className='site-name'>
                <h1>Reddzit</h1>
                <div className='caption'>Review your Saved Reddit Posts</div>
              </div>
            </div>
          </div>

          <div className='content'>
            {showEarliestLink && (
              <div className='filter-wrapper'>
                <button
                  className='btn btn-link'
                  onClick={() => this.goToEarliest()}
                >
                  Skip to earliest
                </button>
              </div>
            )}

            {saved.length === 0 && <NoContent />}

            {saved.map((post, i) => (
              <div className='columns col-oneline' key={i}>
                <div className='column col-2'>
                  {getPreviewImage(post) ? (
                    <img
                      className='img-responsive img-fit-cover'
                      src={getPreviewImage(post)}
                      alt=''
                    />
                  ) : null}
                </div>
                <div className='column col-9'>
                  <div className='chip'>{post.subreddit}</div>
                  <h5 onClick={() => this.getArticle(post, i)}>
                    {getDisplayTitle(post)}
                  </h5>
                  {isComment(post) && (
                    <div className='comment-snippet'>
                      <span className='comment-text'>
                        {getCommentSnippet(post, 500)}
                      </span>
                      <span className='comment-author'>u/{post.author}</span>
                    </div>
                  )}
                  {/* <div role="button" className="button-wrapper" onClick={() => this.getArticle(post, i)}>
                                     {this.getContentButton()}
                                 </div> */}
                </div>
              </div>
            ))}

            {saved.length > 0 && (
              <div className='pagination-wrapper'>
                <button
                  className='btn btn-primary'
                  onClick={() => this.pageDown()}
                >
                  <i className='icon icon-arrow-left' />
                </button>
                <button
                  className='btn btn-primary'
                  onClick={() => this.pageUp()}
                >
                  <i className='icon icon-arrow-right' />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default RedditLogin;
