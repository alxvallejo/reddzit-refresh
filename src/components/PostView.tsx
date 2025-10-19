import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPostType, handlePostType, getParsedContent } from '../helpers/RedditUtils';

type Post = any;
type Content = any;

export default function PostView() {
  const { fullname } = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (error) return (
    <div className="container">
      <h2>Unable to load post</h2>
      <p>{error}</p>
      <p><a href="/">← Back to Reddzit</a></p>
    </div>
  );
  
  if (loading || !post) return (
    <div className="container">
      <p>Loading post…</p>
    </div>
  );

  const fontSize = 18; // Default font size from RedditLogin

  return (
    <div className="container">
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
        <a href="/" style={{ textDecoration: 'none', color: '#5755d9' }}>
          <h1 style={{ margin: 0 }}>Reddzit</h1>
        </a>
      </header>
      
      <article>
        <div className="post-title">
          <h2>
            <a href={`https://www.reddit.com${post.permalink}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
              {post.title}
            </a>
          </h2>
          <div className="subtitle">
            <span className="subreddit">
              r/{post.subreddit} • u/{post.author}
            </span>
          </div>
        </div>

        {/* Use the same content renderer as OffCanvas */}
        <div className="read-content">
          {getParsedContent(content, loading && !content, post, fontSize)}
        </div>

        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
          <a href={`https://www.reddit.com${post.permalink}`} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ marginRight: '0.5rem' }}>
            View on Reddit →
          </a>
          <a href="/" className="btn">
            Open Reddzit App
          </a>
        </div>
      </article>
    </div>
  );
}
