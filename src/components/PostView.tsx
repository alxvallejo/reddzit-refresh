import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

type Post = any;

export default function PostView() {
  const { fullname } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Try to fetch via public Reddit JSON for unauthenticated users
        const r = await fetch(`https://www.reddit.com/by_id/${fullname}.json`);
        if (r.ok) {
          const json = await r.json();
          const p = json?.data?.children?.[0]?.data;
          if (!cancelled) setPost(p || null);
          return;
        }
      } catch (_) {}
      if (!cancelled) setError('Unable to load post');
    }

    if (fullname) {
      load();
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
  
  if (!post) return (
    <div className="container">
      <p>Loading post…</p>
    </div>
  );

  const image = post?.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, '&');

  return (
    <div className="container">
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
        <a href="/" style={{ textDecoration: 'none', color: '#5755d9' }}>
          <h1 style={{ margin: 0 }}>Reddzit</h1>
        </a>
      </header>
      
      <article>
        <h2>{post.title}</h2>
        <p style={{ color: '#666' }}>
          <a href={`https://www.reddit.com/r/${post.subreddit}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            r/{post.subreddit}
          </a>
          {' • by '}
          <a href={`https://www.reddit.com/u/${post.author}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            u/{post.author}
          </a>
        </p>
        {image && (
          <div style={{ maxWidth: 720, marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <img src={image} style={{ width: '100%', borderRadius: '4px' }} alt={post.title} />
          </div>
        )}
        {post.selftext && (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            {post.selftext}
          </div>
        )}
        <p style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
          <a href={`https://www.reddit.com${post.permalink}`} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ marginRight: '0.5rem' }}>
            View on Reddit →
          </a>
          <a href="/" className="btn">
            Open Reddzit App
          </a>
        </p>
      </article>
    </div>
  );
}
