import http from 'http';
import fs from 'fs/promises';
import { createReadStream, statSync } from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');

// Configure public base URL for absolute links in meta tags
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || '';

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.ico': return 'image/x-icon';
    case '.json': return 'application/json; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function readIndexTemplate() {
  return fs.readFile(INDEX_HTML_PATH, 'utf8');
}

function pickPreviewImage(post) {
  try {
    const preview = post?.preview?.images?.[0];
    if (preview?.source?.url) {
      // Reddit returns HTML-escaped URLs
      return preview.source.url.replace(/&amp;/g, '&');
    }
  } catch (_) {}
  const thumb = post?.thumbnail;
  if (thumb && thumb.startsWith('http')) return thumb;
  return `${PUBLIC_BASE_URL}/favicon.png`;
}

async function fetchPost(fullname) {
  // Prefer public Reddit JSON to avoid needing OAuth for bots
  const endpoint = `https://www.reddit.com/by_id/${encodeURIComponent(fullname)}.json`;
  const r = await fetch(endpoint, { headers: { 'User-Agent': 'Reddzit/preview' } });
  if (!r.ok) throw new Error(`Fetch failed ${r.status}`);
  const json = await r.json();
  const post = json?.data?.children?.[0]?.data;
  return post || null;
}

function injectMeta(html, meta) {
  const headOpen = html.indexOf('<head>');
  if (headOpen === -1) return html; // fallback

  const before = html.slice(0, headOpen + '<head>'.length);
  const after = html.slice(headOpen + '<head>'.length);

  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta property="og:title" content="${escapeHtml(meta.ogTitle)}">`,
    `<meta property="og:description" content="${escapeHtml(meta.ogDescription)}">`,
    `<meta property="og:image" content="${escapeHtml(meta.ogImage)}">`,
    `<meta property="og:url" content="${escapeHtml(meta.ogUrl)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(meta.ogTitle)}">`,
    `<meta name="twitter:description" content="${escapeHtml(meta.ogDescription)}">`,
    `<meta name="twitter:image" content="${escapeHtml(meta.ogImage)}">`,
    `<link rel="canonical" href="${escapeHtml(meta.ogUrl)}">`,
  ].join('\n    ');

  return `${before}\n    ${tags}\n${after}`;
}

async function handleShareRoute(reqUrl, res) {
  const u = new URL(reqUrl, 'http://localhost');
  const parts = u.pathname.split('/').filter(Boolean); // [ 'p', ':fullname' ]
  const fullname = parts[1];
  if (!fullname) return sendIndex(res); // fallback

  let post = null;
  try {
    post = await fetchPost(fullname);
  } catch (e) {
    // continue with defaults
  }

  const titleText = post?.title || 'Reddzit: Review your saved Reddit posts';
  const imageUrl = pickPreviewImage(post);
  const ogUrl = `${PUBLIC_BASE_URL}${u.pathname}`;

  const html = await readIndexTemplate();
  const injected = injectMeta(html, {
    title: `Reddzit: Review your saved Reddit posts — ${titleText}`,
    ogTitle: titleText,
    ogDescription: post?.selftext ? post.selftext.slice(0, 200) : 'Review your saved Reddit posts with Reddzit.',
    ogImage: imageUrl,
    ogUrl,
  });

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(injected);
}

async function sendIndex(res) {
  try {
    const stream = createReadStream(INDEX_HTML_PATH);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    stream.pipe(res);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Server error');
  }
}

async function sendStatic(filePath, res) {
  try {
    const st = statSync(filePath);
    if (!st.isFile()) return false;
    res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
    createReadStream(filePath).pipe(res);
    return true;
  } catch (_) {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url, 'http://localhost');
    const pathname = reqUrl.pathname;

    // Serve assets from dist
    if (pathname.startsWith('/assets/') || path.extname(pathname)) {
      const filePath = path.join(DIST_DIR, pathname.replace(/^\/+/, ''));
      const served = await sendStatic(filePath, res);
      if (!served) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
      }
      return;
    }

    // Share route: /p/:fullname
    if (/^\/p\/.+/.test(pathname)) {
      await handleShareRoute(req.url, res);
      return;
    }

    // Fallback to SPA index.html
    await sendIndex(res);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Server error');
  }
});

const PORT = process.env.PORT || 5174;
server.listen(PORT, () => {
  console.log(`SSR server listening on :${PORT}`);
});

