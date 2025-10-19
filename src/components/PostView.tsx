import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { getPostType, handlePostType, getParsedContent } from '../helpers/RedditUtils';
import ReadControls from './ReadControls';
import smeagol from '../smeagol.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faCoffee } from '@fortawesome/free-solid-svg-icons';
import { getOptions, setOption } from '../helpers/Options';

type Post = any;
type Content = any;

export default function PostView() {
  const { fullname } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Get saved options for font size and dark mode
  const options = getOptions();
  const [fontSize, setFontSize] = useState(options.fontSize || 18);
  const [darkMode, setDarkMode] = useState(options.darkMode || false);
  
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
    let cancelled = false;

    async function load() {
      try {
        // Fetch post data from Reddit's public JSON API
        const r = await fetch(`https://www.reddit.com/by_id/${fullname}.json`);
        if (r.ok) {
          const json = await r.json();
          const p = json?.data?.children?.[0]?.data;
          if (!p) {
            if (!cancelled) setError('Post not found');
            return;
          }
          if (!cancelled) setPost(p);

          // Extract full article content like the logged-in view
          try {
            const postType = getPostType(p);
            const extractedContent = await handlePostType(postType);
            if (!cancelled) setContent(extractedContent);
          } catch (contentErr) {
            console.warn('Failed to extract content:', contentErr);
            // Still show basic post info even if content extraction fails
          }
          return;
        }
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
  }, [fullname]);

  // Update document title for human visitors once data is loaded
  useEffect(() => {
    if (post?.title) {
      document.title = post.title;
    }
  }, [post?.title]);

  const readContentClass = darkMode ? 'read-content darkMode' : 'read-content';
  const readControlClass = 'read-controls-wrapper';

  if (error) return (
    <div className={`public-post ${darkMode ? 'darkMode' : ''}`}>
      <div className="site-wrap">
        <div className="header">
          <div className="reddzit-nav">
            <Link className="txt-primary" to="/">
              <FontAwesomeIcon icon={faHome} />
            </Link>
            <a className="txt-primary" href="https://www.buymeacoffee.com/reddzit" target="_blank" rel="noreferrer">
              <FontAwesomeIcon icon={faCoffee} /> Buy me a coffee
            </a>
          </div>
          <div className="banner-img">
            <img className="img-fit-contain" src={smeagol} alt="reddzit" />
            <div className="site-name">
              <h1>Reddzit</h1>
              <div className="caption">Review your Saved Reddit Posts</div>
            </div>
          </div>
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
      <div className="site-wrap">
        <div className="header">
          <div className="reddzit-nav">
            <Link className="txt-primary" to="/">
              <FontAwesomeIcon icon={faHome} />
            </Link>
            <a className="txt-primary" href="https://www.buymeacoffee.com/reddzit" target="_blank" rel="noreferrer">
              <FontAwesomeIcon icon={faCoffee} /> Buy me a coffee
            </a>
          </div>
          <div className="banner-img">
            <img className="img-fit-contain" src={smeagol} alt="reddzit" />
            <div className="site-name">
              <h1>Reddzit</h1>
              <div className="caption">Review your Saved Reddit Posts</div>
            </div>
          </div>
        </div>

        {/* Full-bleed purple hero */}
        <section className="post-hero full-bleed">
          <div className="full-bleed__inner">
            <div className={readControlClass}>
              <ReadControls
                fontSize={fontSize}
                setSize={handleSetSize}
                darkMode={darkMode}
                toggleDarkMode={handleToggleDarkMode}
              />
              {post && (
                <div className="post-title">
                  <h2>
                    <a href={`https://www.reddit.com${post.permalink}`} target="_blank" rel="noreferrer">
                      {post.title}
                    </a>
                  </h2>
                  <div className="subtitle">
                    <span className="subreddit">{post.subreddit}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Centered reading column */}
        <main className="content">
          <div className={readContentClass}>
            {getParsedContent(content, loading && !content, post, fontSize)}
            <div className="read-controls-footer" style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
              <a href={`https://www.reddit.com${post.permalink}`} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ marginRight: '0.5rem' }}>
                View on Reddit
              </a>
              <a href="/" className="btn">
                Open Reddzit App
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
