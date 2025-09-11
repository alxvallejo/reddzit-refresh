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
      // For human users, navigate to the app route that expects the `name` query.
      // Bots won’t execute JS, so they will see SSR’d meta from the server for /p/:fullname.
      const to = `/reddit?name=${fullname}`;
      // Slight delay so the page renders something before navigation, in case of slow routers.
      const t = setTimeout(() => navigate(to, { replace: true }), 150);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
    return () => { cancelled = true; };
  }, [fullname, navigate]);

  if (error) return <div className="container"><p>{error}</p></div>;
  if (!post) return (
    <div className="container">
      <p>Loading…</p>
      {fullname && (
        <p>
          If not redirected, open in app: <a href={`/reddit?name=${fullname}`}>/reddit?name={fullname}</a>
        </p>
      )}
    </div>
  );

  const image = post?.preview?.images?.[0]?.source?.url?.replace(/&amp;/g, '&');

  return (
    <div className="container">
      <h2>{post.title}</h2>
      <p>r/{post.subreddit} • by u/{post.author}</p>
      {image && (
        <div style={{ maxWidth: 720 }}>
          <img src={image} style={{ width: '100%' }} alt={post.title} />
        </div>
      )}
      {post.selftext && <p style={{ whiteSpace: 'pre-wrap' }}>{post.selftext}</p>}
      <p>
        <a href={`https://www.reddit.com${post.permalink}`} target="_blank" rel="noreferrer">View on Reddit</a>
      </p>
    </div>
  );
}
