import type { ReactNode } from 'react';
import type { TrendingPostTopComment } from '../helpers/DailyService';
import { decodeHtmlEntities } from '../helpers/htmlEntities';

interface CommentQuoteProps {
  comment: TrendingPostTopComment;
  size?: 'sm' | 'lg';
}

const linkClass =
  'underline decoration-[var(--theme-primary)]/40 underline-offset-2 hover:decoration-[var(--theme-primary)] hover:text-[var(--theme-primary)] transition-colors';

// Inline tokens, tried left-to-right. Longer markers (e.g. `**`) come before
// shorter ones (`*`) so bold wins over italic on the same characters.
const INLINE_REGEX =
  /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)|\*\*([^*\n]+)\*\*|(?<![*\w])\*([^*\n]+)\*(?!\w)|~~([^~\n]+)~~|`([^`\n]+)`/g;

interface InlineResult {
  nodes: ReactNode[];
  hasLinks: boolean;
}

function renderInline(text: string, keyPrefix: string): InlineResult {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let hasLinks = false;
  let key = 0;
  INLINE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INLINE_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const [, mdText, mdHref, bareUrl, bold, italic, strike, code] = match;
    const k = `${keyPrefix}-${key++}`;
    if (mdText && mdHref) {
      nodes.push(
        <a
          key={k}
          href={mdHref}
          target="_blank"
          rel="noreferrer noopener"
          className={linkClass}
          onClick={(e) => e.stopPropagation()}
        >
          {mdText}
        </a>,
      );
      hasLinks = true;
    } else if (bareUrl) {
      nodes.push(
        <a
          key={k}
          href={bareUrl}
          target="_blank"
          rel="noreferrer noopener"
          className={linkClass}
          onClick={(e) => e.stopPropagation()}
        >
          {bareUrl}
        </a>,
      );
      hasLinks = true;
    } else if (bold) {
      nodes.push(
        <strong key={k} className="font-semibold">
          {bold}
        </strong>,
      );
    } else if (italic) {
      nodes.push(<em key={k}>{italic}</em>);
    } else if (strike) {
      nodes.push(<s key={k}>{strike}</s>);
    } else if (code) {
      nodes.push(
        <code
          key={k}
          className="px-1 py-0.5 rounded bg-[var(--theme-text)]/10 text-[0.95em] font-mono"
        >
          {code}
        </code>,
      );
    }
    lastIndex = INLINE_REGEX.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  if (nodes.length === 0) nodes.push(text);
  return { nodes, hasLinks };
}

interface Block {
  type: 'p' | 'quote';
  text: string;
}

function parseBlocks(body: string): Block[] {
  const lines = body.split('\n');
  const blocks: Block[] = [];
  let current: Block | null = null;
  for (const raw of lines) {
    const isQuote = /^>\s?/.test(raw);
    const text = isQuote ? raw.replace(/^>\s?/, '') : raw;
    const type: Block['type'] = isQuote ? 'quote' : 'p';
    if (current && current.type === type) {
      current.text += '\n' + text;
    } else {
      if (current) blocks.push(current);
      current = { type, text };
    }
  }
  if (current) blocks.push(current);
  // Trim leading/trailing empty paragraph blocks created by surrounding blank lines.
  while (blocks.length && blocks[0].type === 'p' && blocks[0].text.trim() === '') {
    blocks.shift();
  }
  while (
    blocks.length &&
    blocks[blocks.length - 1].type === 'p' &&
    blocks[blocks.length - 1].text.trim() === ''
  ) {
    blocks.pop();
  }
  return blocks;
}

function renderBody(body: string, bodyClass: string): { nodes: ReactNode[]; hasLinks: boolean } {
  const blocks = parseBlocks(body);
  let hasLinks = false;
  const nodes: ReactNode[] = blocks.map((block, idx) => {
    const { nodes: inline, hasLinks: blockHasLinks } = renderInline(block.text, `b${idx}`);
    if (blockHasLinks) hasLinks = true;
    if (block.type === 'quote') {
      return (
        <div
          key={`q${idx}`}
          className={`border-l-2 border-[var(--theme-primary)]/40 pl-3 italic opacity-80 whitespace-pre-wrap break-words ${bodyClass}`}
        >
          {inline}
        </div>
      );
    }
    return (
      <div
        key={`p${idx}`}
        className={`whitespace-pre-wrap break-words ${bodyClass}`}
      >
        {inline}
      </div>
    );
  });
  return { nodes, hasLinks };
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

  const { nodes: bodyNodes, hasLinks } = renderBody(body, bodyClass);

  const figureInner = (
    <>
      <span
        aria-hidden
        className={`block ${glyphClass} leading-none select-none text-[var(--theme-primary)] opacity-40 mb-1 -ml-0.5`}
      >
        “
      </span>
      <blockquote className="m-0 text-[var(--theme-text)] space-y-3">
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
