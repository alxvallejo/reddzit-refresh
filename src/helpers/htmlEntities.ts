// Reddit's JSON API HTML-entity-encodes characters in `body`/`selftext` fields
// (e.g. markdown blockquote `>` comes through as `&gt;`). Decode before display.
export const decodeHtmlEntities = (input: string): string => {
  if (!input) return input;
  if (typeof document !== 'undefined') {
    const el = document.createElement('textarea');
    el.innerHTML = input;
    return el.value;
  }
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x200B;/g, '');
};
