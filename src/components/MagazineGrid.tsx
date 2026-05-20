import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faForward } from '@fortawesome/free-solid-svg-icons';
import type { TrendingPost, TrendingPostTopComment } from '../helpers/DailyService';
import { useTheme } from '../context/ThemeContext';
import { getDisplayTitle } from '../helpers/RedditUtils';

const QUOTE_ROTATE_MS = 12000;
const QUOTE_FADE_MS = 400;
const QUOTE_SLOT_CLASS = 'mt-2 min-h-[3rem]';

const shuffleComments = (comments: TrendingPostTopComment[]): TrendingPostTopComment[] => {
  const arr = [...comments];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

type TileSize = 'hero' | 'tall' | 'standard';

const tileSizeForIndex = (index: number): TileSize => {
  if (index === 0) return 'hero';
  if (index > 0 && (index - 1) % 4 === 0) return 'tall';
  return 'standard';
};

const formatTimeAgo = (dateString: string | undefined) => {
  if (!dateString) return '';
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const formatScore = (n: number | undefined) => {
  if (typeof n !== 'number') return '';
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

interface CardProps {
  post: TrendingPost;
  onClick: () => void;
  onSkip: () => void;
}

const SubredditBadge = ({ subreddit }: { subreddit: string }) => (
  <span className="inline-block px-2 py-0.5 rounded text-[0.7rem] font-semibold bg-[var(--theme-primary)]/15 text-[var(--theme-primary)]">
    r/{subreddit}
  </span>
);

const MetaRow = ({ post }: { post: TrendingPost }) => {
  const score = formatScore(post.score);
  const comments = formatScore(post.numComments);
  return (
    <div className="flex items-center gap-3 text-[0.7rem] text-[var(--theme-textMuted)]">
      <span>{formatTimeAgo(post.pubDate)}</span>
      {score && <span>▲ {score}</span>}
      {comments && <span>💬 {comments}</span>}
    </div>
  );
};

const Quote = ({ post }: { post: TrendingPost }) => {
  const comments = useMemo(
    () => (post.topComments?.length ? shuffleComments(post.topComments) : []),
    [post.topComments]
  );

  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (comments.length <= 1) return;
    const stagger = (post.id.charCodeAt(0) % 5) * 700;
    let interval: ReturnType<typeof setInterval> | null = null;
    let fadeTimeout: ReturnType<typeof setTimeout> | null = null;
    const startTimeout = setTimeout(() => {
      interval = setInterval(() => {
        setVisible(false);
        fadeTimeout = setTimeout(() => {
          setIndex((i) => (i + 1) % comments.length);
          setVisible(true);
        }, QUOTE_FADE_MS);
      }, QUOTE_ROTATE_MS);
    }, stagger);
    return () => {
      clearTimeout(startTimeout);
      if (fadeTimeout) clearTimeout(fadeTimeout);
      if (interval) clearInterval(interval);
    };
  }, [comments.length, post.id]);

  if (comments.length === 0) {
    if (post.selftext) {
      return (
        <div className={QUOTE_SLOT_CLASS}>
          <p className="text-xs text-[var(--theme-textMuted)] line-clamp-3">
            {post.selftext}
          </p>
        </div>
      );
    }
    return <div className={QUOTE_SLOT_CLASS} aria-hidden="true" />;
  }

  const current = comments[index];
  const innerClass = 'block text-xs italic text-[var(--theme-textMuted)] line-clamp-3 transition-opacity';
  const style = { opacity: visible ? 1 : 0, transitionDuration: `${QUOTE_FADE_MS}ms` };
  const inner = (
    <>
      “{current.body}” <span className="not-italic">— u/{current.author}</span>
    </>
  );

  return (
    <div className={QUOTE_SLOT_CLASS}>
      {current.permalink ? (
        <a
          href={`https://www.reddit.com${current.permalink}`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`${innerClass} hover:text-[var(--theme-primary)] no-underline`}
          style={style}
        >
          {inner}
        </a>
      ) : (
        <p className={innerClass} style={style}>
          {inner}
        </p>
      )}
    </div>
  );
};

const SkipButton = ({ onSkip }: { onSkip: () => void }) => {
  const { isLight } = useTheme();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onSkip();
      }}
      title="Skip post"
      aria-label="Skip post"
      className={`absolute right-2 top-2 z-10 p-1.5 rounded-md backdrop-blur-sm transition ${
        isLight ? 'text-blue-700 bg-white/80 hover:bg-blue-100' : 'text-blue-200 bg-black/60 hover:bg-blue-500/30'
      }`}
    >
      <FontAwesomeIcon icon={faForward} className="w-3 h-3" />
    </button>
  );
};

const ImageArea = ({ post, aspect }: { post: TrendingPost; aspect: string }) => {
  const [errored, setErrored] = useState(false);
  if (!post.imageUrl || errored) {
    return (
      <div
        className={`${aspect} w-full bg-[var(--theme-cardBg)] flex items-center justify-center`}
        aria-hidden="true"
      >
        <span className="text-2xl opacity-40">📝</span>
      </div>
    );
  }
  return (
    <img
      src={post.imageUrl}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
      className={`${aspect} w-full object-cover`}
    />
  );
};

const handleCardKeyDown = (event: React.KeyboardEvent, onClick: () => void) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onClick();
  }
};

export const HeroCard = ({ post, onClick, onSkip }: CardProps) => (
  <article
    onClick={onClick}
    onKeyDown={(e) => handleCardKeyDown(e, onClick)}
    role="button"
    tabIndex={0}
    aria-label={getDisplayTitle(post)}
    className="relative col-span-full cursor-pointer rounded-xl overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-cardBg)] hover:border-[var(--theme-primary)] focus:border-[var(--theme-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] transition"
  >
    <SkipButton onSkip={onSkip} />
    <ImageArea post={post} aspect="aspect-[21/9]" />
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <SubredditBadge subreddit={post.subreddit} />
        <MetaRow post={post} />
      </div>
      <h2 className="text-2xl font-semibold leading-tight text-[var(--theme-text)]">
        {getDisplayTitle(post)}
      </h2>
      <Quote post={post} />
    </div>
  </article>
);

const TallCard = ({ post, onClick, onSkip }: CardProps) => (
  <article
    onClick={onClick}
    onKeyDown={(e) => handleCardKeyDown(e, onClick)}
    role="button"
    tabIndex={0}
    aria-label={getDisplayTitle(post)}
    className="relative md:row-span-2 cursor-pointer rounded-xl overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-cardBg)] hover:border-[var(--theme-primary)] focus:border-[var(--theme-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] transition flex flex-col"
  >
    <SkipButton onSkip={onSkip} />
    <ImageArea post={post} aspect="aspect-[4/5]" />
    <div className="p-3 flex flex-col gap-1.5 flex-1">
      <div className="flex items-center justify-between">
        <SubredditBadge subreddit={post.subreddit} />
        <span className="text-[0.7rem] text-[var(--theme-textMuted)]">{formatTimeAgo(post.pubDate)}</span>
      </div>
      <h3 className="text-base font-medium leading-tight text-[var(--theme-text)]">
        {getDisplayTitle(post)}
      </h3>
      <Quote post={post} />
    </div>
  </article>
);

const StandardCard = ({ post, onClick, onSkip }: CardProps) => (
  <article
    onClick={onClick}
    onKeyDown={(e) => handleCardKeyDown(e, onClick)}
    role="button"
    tabIndex={0}
    aria-label={getDisplayTitle(post)}
    className="relative cursor-pointer rounded-xl overflow-hidden border border-[var(--theme-border)] bg-[var(--theme-cardBg)] hover:border-[var(--theme-primary)] focus:border-[var(--theme-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] transition flex flex-col"
  >
    <SkipButton onSkip={onSkip} />
    <ImageArea post={post} aspect="aspect-video" />
    <div className="p-3 flex flex-col gap-1.5 flex-1">
      <div className="flex items-center justify-between">
        <SubredditBadge subreddit={post.subreddit} />
        <span className="text-[0.7rem] text-[var(--theme-textMuted)]">{formatTimeAgo(post.pubDate)}</span>
      </div>
      <h3 className="text-sm font-medium leading-tight text-[var(--theme-text)]">
        {getDisplayTitle(post)}
      </h3>
      <Quote post={post} />
    </div>
  </article>
);

interface MagazineGridProps {
  posts: TrendingPost[];
  onPostClick: (post: TrendingPost) => void;
  onSkipPost: (postId: string) => void;
}

const MagazineGrid = ({ posts, onPostClick, onSkipPost }: MagazineGridProps) => {
  return (
    <main className="max-w-7xl mx-auto px-4 pt-4 pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 grid-flow-row-dense auto-rows-min">
      {posts.map((post, idx) => {
        const size = tileSizeForIndex(idx);
        const onClick = () => onPostClick(post);
        const onSkip = () => onSkipPost(post.id);
        if (size === 'hero') return <HeroCard key={post.id} post={post} onClick={onClick} onSkip={onSkip} />;
        if (size === 'tall') return <TallCard key={post.id} post={post} onClick={onClick} onSkip={onSkip} />;
        return <StandardCard key={post.id} post={post} onClick={onClick} onSkip={onSkip} />;
      })}
    </main>
  );
};

export default MagazineGrid;
