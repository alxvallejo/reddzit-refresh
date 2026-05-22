import type { ReactNode } from 'react';
import type { TrendingPostTopComment } from '../helpers/DailyService';
import { decodeHtmlEntities } from '../helpers/htmlEntities';

interface CommentQuoteProps {
  comment: TrendingPostTopComment;
  size?: 'sm' | 'lg';
}

// Matches markdown link `[text](url)` OR a bare http(s) URL.
const LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;

const linkClass =
  'underline decoration-[var(--theme-primary)]/40 underline-offset-2 hover:decoration-[var(--theme-primary)] hover:text-[var(--theme-primary)] transition-colors';

function renderBodyWithLinks(body: string): { nodes: ReactNode[]; hasLinks: boolean } {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let hasLinks = false;
  let key = 0;
  LINK_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = LINK_REGEX.exec(body)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(body.slice(lastIndex, match.index));
    }
    const text = match[1] ?? match[3];
    const href = match[2] ?? match[3];
    nodes.push(
      <a
        key={`lnk-${key++}`}
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className={linkClass}
        onClick={(e) => e.stopPropagation()}
      >
        {text}
      </a>,
    );
    hasLinks = true;
    lastIndex = LINK_REGEX.lastIndex;
  }
  if (lastIndex < body.length) {
    nodes.push(body.slice(lastIndex));
  }
  if (nodes.length === 0) nodes.push(body);
  return { nodes, hasLinks };
}

export default function CommentQuote({ comment, size = 'lg' }: CommentQuoteProps) {
  const body = decodeHtmlEntities(comment.body);
  const href = comment.permalink ? `https://www.reddit.com${comment.permalink}` : null;
  const { nodes: bodyNodes, hasLinks } = renderBodyWithLinks(body);

  const bodyClass =
    size === 'lg'
      ? 'text-base md:text-xl leading-relaxed'
      : 'text-sm md:text-base leading-relaxed';
  const glyphClass =
    size === 'lg' ? 'text-5xl md:text-6xl' : 'text-4xl md:text-5xl';

  const figureInner = (
    <>
      <span
        aria-hidden
        className={`block ${glyphClass} leading-none select-none text-[var(--theme-primary)] opacity-40 mb-1 -ml-0.5`}
      >
        “
      </span>
      <blockquote
        className={`m-0 text-[var(--theme-text)] whitespace-pre-wrap break-words ${bodyClass}`}
      >
        {bodyNodes}
      </blockquote>
    </>
  );

  // When the body contains inline links, the outer permalink anchor would nest
  // <a> tags (invalid HTML). Move the permalink onto the attribution line instead.
  if (hasLinks && href) {
    return (
      <figure className="m-0">
        {figureInner}
        <figcaption className="mt-3 text-xs text-[var(--theme-textMuted)] not-italic">
          —{' '}
          <a
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="hover:text-[var(--theme-primary)] transition-colors"
          >
            u/{comment.author}
          </a>{' '}
          · ▲ {comment.score.toLocaleString()}
        </figcaption>
      </figure>
    );
  }

  const figure = (
    <figure className="m-0">
      {figureInner}
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
