document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const resultsEl = document.getElementById('results');
  const openReddzitBtn = document.getElementById('open-reddzit');

  // URL to open when "Open Reddzit" is clicked
  const REDDZIT_URL = 'https://reddzit.com'; 

  // Open Reddzit button
  openReddzitBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: REDDZIT_URL });
  });

  try {
    // Get current tab URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
      statusEl.textContent = 'Cannot check this page.';
      return;
    }

    const currentUrl = tab.url;
    
    // Check Reddit API
    // We fetch as JSON. Note that Reddit API might require User-Agent, but browsers set it automatically.
    const response = await fetch(`https://www.reddit.com/api/info.json?url=${encodeURIComponent(currentUrl)}`);
    
    if (!response.ok) {
        if (response.status === 429) {
             throw new Error('Rate limited by Reddit. Please try again later.');
        }
        throw new Error(`Reddit API error: ${response.status}`);
    }

    const data = await response.json();
    const posts = data.data && data.data.children ? data.data.children : [];

    if (posts.length === 0) {
      statusEl.innerHTML = `
        <p>Not found on Reddit.</p>
        <a href="https://www.reddit.com/submit?url=${encodeURIComponent(currentUrl)}" target="_blank" class="submit-link">Submit this link to Reddit</a>
      `;
    } else {
      statusEl.style.display = 'none';
      renderPosts(posts, resultsEl);
    }

  } catch (error) {
    console.error('Error checking Reddit:', error);
    statusEl.innerHTML = `<span class="error">Error: ${error.message}</span>`;
  }
});

function renderPosts(posts, container) {
  const list = document.createElement('div');
  
  // Sort posts by score (descending)
  posts.sort((a, b) => b.data.score - a.data.score);

  posts.forEach(post => {
    const p = post.data;
    const item = document.createElement('a');
    item.className = 'result-item';
    item.href = `https://www.reddit.com${p.permalink}`;
    item.target = '_blank';
    
    const date = new Date(p.created_utc * 1000).toLocaleDateString();
    
    item.innerHTML = `
      <div class="post-title">${escapeHtml(p.title)}</div>
      <div class="post-meta">
        <span>r/${escapeHtml(p.subreddit)}</span>
        <span>⬆️ ${p.score} • ${date}</span>
      </div>
    `;
    
    list.appendChild(item);
  });
  
  container.appendChild(list);
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
