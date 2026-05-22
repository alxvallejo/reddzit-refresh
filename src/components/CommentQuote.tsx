import type { TrendingPostTopComment } from '../helpers/DailyService';
import { decodeHtmlEntities } from '../helpers/htmlEntities';

interface CommentQuoteProps {
  comment: TrendingPostTopComment;
  size?: 'sm' | 'lg';
}

export default function CommentQuote({ comment, size = 'lg' }: CommentQuoteProps) {
  const body = decodeHtmlEntities(comment.body);
  const href = comment.permalink ? `https://www.reddit.com${comment.permalink}` : null;

  const bodyClass =
    size === 'lg'
      ? 'text-base md:text-xl leading-relaxed'
      : 'text-sm md:text-base leading-relaxed';
  const glyphClass =
    size === 'lg' ? 'text-5xl md:text-6xl' : 'text-4xl md:text-5xl';

  const figure = (
    <figure className="m-0">
      <span
        aria-hidden
        className={`block ${glyphClass} leading-none select-none text-[var(--theme-primary)] opacity-40 mb-1 -ml-0.5`}
      >
        “
      </span>
      <blockquote
        className={`m-0 italic text-[var(--theme-text)] whitespace-pre-wrap break-words ${bodyClass}`}
      >
        {body}
      </blockquote>
      <figcaption className="mt-3 text-xs text-[var(--theme-textMuted)] not-italic">
        — u/{comment.author} · ▲ {comment.score.toLocaleString()}
      </figcaption>
    </figure>
  );

  if (!href) return figure;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block no-underline text-inherit hover:text-[var(--theme-primary)] transition-colors"
    >
      {figure}
    </a>
  );
}
