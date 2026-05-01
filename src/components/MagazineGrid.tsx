import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faForward } from '@fortawesome/free-solid-svg-icons';
import type { TrendingPost } from '../helpers/DailyService';
import { useTheme } from '../context/ThemeContext';
import { getDisplayTitle } from '../helpers/RedditUtils';

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
  if (post.topComment) {
    return (
      <p className="text-xs italic text-[var(--theme-textMuted)] line-clamp-3 mt-2">
        “{post.topComment.body}” <span className="not-italic">— u/{post.topComment.author}</span>
      </p>
    );
  }
  if (post.selftext) {
    return (
      <p className="text-xs text-[var(--theme-textMuted)] line-clamp-3 mt-2">
        {post.selftext}
      </p>
    );
  }
  return null;
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

const HeroCard = ({ post, onClick, onSkip }: CardProps) => (
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
