import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { getPostType, handlePostType, getParsedContent, getArticlePreviewImage, getDisplayTitle } from '../helpers/RedditUtils';
import ReadControls from './ReadControls';
import smeagol from '../smeagol.png';
import { getOptions, setOption } from '../helpers/Options';

type Post = any;
type Content = any;

export default function PostView() {
  const { fullname } = useParams();
  const location = useLocation();
  const [post, setPost] = useState<Post | null>(location.state?.post || null);
  const [content, setContent] = useState<Content | null>(location.state?.content || null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!location.state?.post);
  
  // Get saved options for font size and dark mode
  const options = getOptions();
  const [fontSize, setFontSize] = useState(options.fontSize || 18);
  const [darkMode, setDarkMode] = useState(options.darkMode !== false);
  const [isScrolled, setIsScrolled] = useState(false);
  const scrollableRef = useRef<HTMLDivElement>(null);
  
  const handleSetSize = (newSize: number) => {
    setFontSize(newSize);
    setOption({ fontSize: newSize });
  };
  
  const handleToggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    setOption({ darkMode: newDarkMode });
  };

  useEffect(() => {
    // If we already have post data from router state, skip the fetch
    if (location.state?.post) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        // Check if this is a comment (t1_) or post (t3_)
        const isComment = fullname?.startsWith('t1_');
        
        let p;
        if (isComment) {
          // For comments, use the info endpoint which works for individual comments
          const r = await fetch(`https://www.reddit.com/api/info.json?id=${fullname}`);
          if (r.ok) {
            const json = await r.json();
            p = json?.data?.children?.[0]?.data;
          }
        } else {
          // For posts, use the by_id endpoint
          const r = await fetch(`https://www.reddit.com/by_id/${fullname}.json`);
          if (r.ok) {
            const json = await r.json();
            p = json?.data?.children?.[0]?.data;
          }
        }
        
        if (!p) {
          if (!cancelled) setError('Post not found');
          return;
        }
        if (!cancelled) setPost(p);

        // Debug: log the post data
        console.log('Fetched post data:', p);
        console.log('Has body?', !!p.body);
        console.log('Has body_html?', !!p.body_html);

        // Extract full article content like the logged-in view
        try {
          const postType = getPostType(p);
          console.log('Post type:', postType);
          const extractedContent = await handlePostType(postType);
          console.log('Extracted content:', extractedContent);
          if (!cancelled) setContent(extractedContent);
        } catch (contentErr) {
          console.warn('Failed to extract content:', contentErr);
          // Still show basic post info even if content extraction fails
        }
        return;
      } catch (err) {
        console.error('Error loading post:', err);
      }
      if (!cancelled) setError('Unable to load post');
    }

    if (fullname) {
      load().finally(() => {
        if (!cancelled) setLoading(false);
      });
    }
    return () => { cancelled = true; };
  }, [fullname, location.state]);

  // Update document title for human visitors once data is loaded
  useEffect(() => {
    if (post?.title) {
      document.title = post.title;
    }
  }, [post?.title]);
  
  // Apply dark mode class to body for full-page background
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('postview-darkmode');
    } else {
      document.body.classList.remove('postview-darkmode');
    }
    return () => {
      document.body.classList.remove('postview-darkmode');
    };
  }, [darkMode]);
  
  // Handle scroll for sticky header collapse
  useEffect(() => {
    const el = scrollableRef.current;
    if (!el) return;
    
    const handleScroll = () => {
      const scrolled = el.scrollTop > 50;
      setIsScrolled(scrolled);
    };
    
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const readContentClass = darkMode ? 'read-content darkMode' : 'read-content';
  const headerClass = `sticky-header ${isScrolled ? 'collapsed' : ''}`;

  if (error) return (
    <div className={`public-post ${darkMode ? 'darkMode' : ''}`}>
      <div className="site-wrap">
        <div className="header">
          <Link to="/" className="banner-img">
            <img className="img-fit-contain" src={smeagol} alt="reddzit" />
            <div className="site-name">
              <h1>Reddzit</h1>
            </div>
          </Link>
        </div>
        <section className="post-hero full-bleed">
          <div className="full-bleed__inner">
            <div className="post-title">
              <h2>Unable to load post</h2>
            </div>
          </div>
        </section>
        <main className="content">
          <p>{error}</p>
          <p><a href="/">← Back to Reddzit</a></p>
        </main>
      </div>
    </div>
  );
  
  if (loading || !post) return (
    <div className="public-post">
      <div className="loading loading-lg" />
    </div>
  );

  return (
    <div className={`public-post ${darkMode ? 'darkMode' : ''}`}>
      <div className="postview-layout">
        {/* Sticky header */}
        <div className={headerClass}>
          <div className="header-inner">
            <Link to="/" className="banner-img">
              <img className="img-fit-contain" src={smeagol} alt="reddzit" />
              {!isScrolled && (
                <div className="site-name">
                  <h1>Reddzit</h1>
                </div>
              )}
            </Link>
            
            {post && (
              <div className="post-title">
                <h2>
                  <a href={`https://www.reddit.com${post.permalink}`} target="_blank" rel="noreferrer">
                    {getDisplayTitle(post) || post.title || 'Reddit Post'}
                  </a>
                </h2>
                {!isScrolled && (
                  <div className="subtitle">
                    <span className="subreddit">{post.subreddit}</span>
                  </div>
                )}
              </div>
            )}
            
            {!isScrolled && (
              <ReadControls
                fontSize={fontSize}
                setSize={handleSetSize}
                darkMode={darkMode}
                toggleDarkMode={handleToggleDarkMode}
              />
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="scrollable-content" ref={scrollableRef}>
          <div className={readContentClass}>
            {post && getArticlePreviewImage(post) && (
              <div className="article-preview-image" style={{ marginBottom: '1rem' }}>
                <img 
                  src={getArticlePreviewImage(post)} 
                  alt="" 
                  className="img-responsive"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>
            )}
            {getParsedContent(content, loading && !content, post, fontSize)}
          </div>
        </div>
        
        {/* Sticky footer */}
        <div className="sticky-footer">
          <div className="read-controls-footer">
            <a href={`https://www.reddit.com${post.permalink}`} target="_blank" rel="noreferrer" className="btn btn-primary">
              View on Reddit
            </a>
            <a href="/" className="btn">
              Get Reddzit
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
