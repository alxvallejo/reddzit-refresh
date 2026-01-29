# Quote Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to highlight text in articles and save quotes with notes and tags.

**Architecture:** Backend stores quotes in PostgreSQL via Prisma. Frontend adds text selection detection in PostView, a floating save button, modal for input, and a dedicated /quotes page. All quote endpoints require Bearer token auth.

**Tech Stack:** Express.js, Prisma (PostgreSQL), React 18, TypeScript, Tailwind CSS, Axios

---

## Task 1: Add Quote Model to Prisma Schema

**Files:**
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/read-api/prisma/schema.prisma`

**Step 1: Add Quote model to schema**

Add after the existing models (around line 700):

```prisma
model Quote {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  postId      String   @map("post_id")
  text        String
  note        String?
  tags        Json     @default("[]")
  sourceUrl   String   @map("source_url")
  subreddit   String
  postTitle   String   @map("post_title")
  author      String
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user        User     @relation(fields: [userId], references: [id])

  @@index([userId, createdAt(sort: Desc)])
  @@map("quotes")
}
```

**Step 2: Add relation to User model**

Find the User model and add to its relations:

```prisma
  quotes            Quote[]
```

**Step 3: Run migration**

Run: `cd /Users/alexvallejo/Sites/personal/reddzit/read-api && npx prisma migrate dev --name add_quotes_table`

Expected: Migration created and applied successfully.

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Quote model to Prisma schema"
```

---

## Task 2: Create Quotes Controller (Backend)

**Files:**
- Create: `/Users/alexvallejo/Sites/personal/reddzit/read-api/controllers/quotesController.js`

**Step 1: Create the controller file**

```javascript
// controllers/quotesController.js
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const USER_AGENT = process.env.USER_AGENT || 'Reddzit/1.0';

// Extract Bearer token from Authorization header
function extractToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return null;
  }
  return auth.slice(7);
}

// Get user from Reddit OAuth token
async function getUserFromToken(token) {
  const response = await fetch('https://oauth.reddit.com/api/v1/me', {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': USER_AGENT
    }
  });

  if (!response.ok) {
    throw new Error('Invalid token');
  }

  const redditUser = await response.json();

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { redditId: redditUser.id },
        { redditUsername: redditUser.name }
      ]
    }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        redditId: redditUser.id,
        redditUsername: redditUser.name
      }
    });
  }

  return { user, redditUser };
}

// GET /api/quotes
async function listQuotes(req, res) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const { user } = await getUserFromToken(token);

    const quotes = await prisma.quote.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      quotes: quotes.map(q => ({
        id: q.id,
        postId: q.postId,
        text: q.text,
        note: q.note,
        tags: q.tags,
        sourceUrl: q.sourceUrl,
        subreddit: q.subreddit,
        postTitle: q.postTitle,
        author: q.author,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString()
      })),
      count: quotes.length
    });
  } catch (error) {
    console.error('listQuotes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/quotes
async function createQuote(req, res) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const { postId, text, note, tags, sourceUrl, subreddit, postTitle, author } = req.body;

    if (!postId || !text || !sourceUrl || !subreddit || !postTitle || !author) {
      return res.status(400).json({ error: 'Missing required fields: postId, text, sourceUrl, subreddit, postTitle, author' });
    }

    const { user } = await getUserFromToken(token);

    const quote = await prisma.quote.create({
      data: {
        userId: user.id,
        postId,
        text,
        note: note || null,
        tags: tags || [],
        sourceUrl,
        subreddit,
        postTitle,
        author
      }
    });

    return res.status(201).json({
      quote: {
        id: quote.id,
        postId: quote.postId,
        text: quote.text,
        note: quote.note,
        tags: quote.tags,
        sourceUrl: quote.sourceUrl,
        subreddit: quote.subreddit,
        postTitle: quote.postTitle,
        author: quote.author,
        createdAt: quote.createdAt.toISOString(),
        updatedAt: quote.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('createQuote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// PUT /api/quotes/:id
async function updateQuote(req, res) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const { id } = req.params;
    const { note, tags } = req.body;

    const { user } = await getUserFromToken(token);

    // Verify quote belongs to user
    const existing = await prisma.quote.findFirst({
      where: { id, userId: user.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const quote = await prisma.quote.update({
      where: { id },
      data: {
        note: note !== undefined ? note : existing.note,
        tags: tags !== undefined ? tags : existing.tags
      }
    });

    return res.json({
      quote: {
        id: quote.id,
        postId: quote.postId,
        text: quote.text,
        note: quote.note,
        tags: quote.tags,
        sourceUrl: quote.sourceUrl,
        subreddit: quote.subreddit,
        postTitle: quote.postTitle,
        author: quote.author,
        createdAt: quote.createdAt.toISOString(),
        updatedAt: quote.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('updateQuote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// DELETE /api/quotes/:id
async function deleteQuote(req, res) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const { id } = req.params;

    const { user } = await getUserFromToken(token);

    // Verify quote belongs to user
    const existing = await prisma.quote.findFirst({
      where: { id, userId: user.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    await prisma.quote.delete({ where: { id } });

    return res.json({ success: true });
  } catch (error) {
    console.error('deleteQuote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  listQuotes,
  createQuote,
  updateQuote,
  deleteQuote
};
```

**Step 2: Commit**

```bash
git add controllers/quotesController.js
git commit -m "feat: add quotes controller with CRUD endpoints"
```

---

## Task 3: Register Quote Routes in Server

**Files:**
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/read-api/server.js`

**Step 1: Import the controller**

Add near other controller imports (around line 30):

```javascript
const quotesController = require('./controllers/quotesController');
```

**Step 2: Add routes**

Add after the forYou routes (around line 335):

```javascript
// Quote routes
app.get('/api/quotes', quotesController.listQuotes);
app.post('/api/quotes', quotesController.createQuote);
app.put('/api/quotes/:id', quotesController.updateQuote);
app.delete('/api/quotes/:id', quotesController.deleteQuote);
```

**Step 3: Commit**

```bash
git add server.js
git commit -m "feat: register quote API routes"
```

---

## Task 4: Create QuoteService (Frontend)

**Files:**
- Create: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/helpers/QuoteService.ts`

**Step 1: Create the service file**

```typescript
import axios from 'axios';
import API_BASE_URL from '../config/api';

export interface Quote {
  id: string;
  postId: string;
  text: string;
  note: string | null;
  tags: string[];
  sourceUrl: string;
  subreddit: string;
  postTitle: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuoteData {
  postId: string;
  text: string;
  note?: string;
  tags?: string[];
  sourceUrl: string;
  subreddit: string;
  postTitle: string;
  author: string;
}

export interface UpdateQuoteData {
  note?: string;
  tags?: string[];
}

const QuoteService = {
  async listQuotes(token: string): Promise<{ quotes: Quote[]; count: number }> {
    const response = await axios.get<{ quotes: Quote[]; count: number }>(
      `${API_BASE_URL}/api/quotes`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async createQuote(token: string, data: CreateQuoteData): Promise<{ quote: Quote }> {
    const response = await axios.post<{ quote: Quote }>(
      `${API_BASE_URL}/api/quotes`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async updateQuote(token: string, id: string, data: UpdateQuoteData): Promise<{ quote: Quote }> {
    const response = await axios.put<{ quote: Quote }>(
      `${API_BASE_URL}/api/quotes/${id}`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async deleteQuote(token: string, id: string): Promise<{ success: boolean }> {
    const response = await axios.delete<{ success: boolean }>(
      `${API_BASE_URL}/api/quotes/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }
};

export default QuoteService;
```

**Step 2: Commit**

```bash
git add src/helpers/QuoteService.ts
git commit -m "feat: add QuoteService for API calls"
```

---

## Task 5: Create QuoteModal Component

**Files:**
- Create: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/components/QuoteModal.tsx`

**Step 1: Create the modal component**

```tsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faQuoteLeft, faLink } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: string, tags: string[]) => Promise<void>;
  selectedText: string;
  sourceUrl: string;
  postTitle: string;
}

export default function QuoteModal({
  isOpen,
  onClose,
  onSave,
  selectedText,
  sourceUrl,
  postTitle
}: QuoteModalProps) {
  const { themeName } = useTheme();
  const [note, setNote] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      await onSave(note, tags);
      setNote('');
      setTagsInput('');
      onClose();
    } catch (err) {
      setError('Failed to save quote. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setNote('');
    setTagsInput('');
    setError(null);
    onClose();
  };

  const truncatedUrl = sourceUrl.length > 50
    ? sourceUrl.substring(0, 50) + '...'
    : sourceUrl;

  const displayText = selectedText.length > 500
    ? selectedText.substring(0, 500) + '...'
    : selectedText;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-lg rounded-xl shadow-2xl ${
        themeName === 'light'
          ? 'bg-white'
          : 'bg-[#3d3466] border border-[#7e87ef]/30'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${
          themeName === 'light' ? 'border-gray-200' : 'border-white/10'
        }`}>
          <h2 className={`text-lg font-semibold ${
            themeName === 'light' ? 'text-gray-900' : 'text-white'
          }`}>
            Save Quote
          </h2>
          <button
            onClick={handleClose}
            className={`p-1 rounded-lg transition-colors border-none cursor-pointer ${
              themeName === 'light'
                ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                : 'text-gray-400 hover:bg-white/10 bg-transparent'
            }`}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          {/* Quoted Text */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              themeName === 'light' ? 'text-gray-700' : 'text-gray-300'
            }`}>
              <FontAwesomeIcon icon={faQuoteLeft} className="mr-2 opacity-60" />
              Selected Text
            </label>
            <div className={`p-3 rounded-lg text-sm max-h-32 overflow-y-auto ${
              themeName === 'light'
                ? 'bg-gray-50 text-gray-700 border border-gray-200'
                : 'bg-white/5 text-gray-300 border border-white/10'
            }`}>
              {displayText}
            </div>
          </div>

          {/* Source */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              themeName === 'light' ? 'text-gray-700' : 'text-gray-300'
            }`}>
              <FontAwesomeIcon icon={faLink} className="mr-2 opacity-60" />
              Source
            </label>
            <div className={`text-sm ${
              themeName === 'light' ? 'text-gray-600' : 'text-gray-400'
            }`}>
              <div className="font-medium truncate">{postTitle}</div>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline"
              >
                {truncatedUrl}
              </a>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              themeName === 'light' ? 'text-gray-700' : 'text-gray-300'
            }`}>
              Your Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add your thoughts..."
              rows={3}
              className={`w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 ${
                themeName === 'light'
                  ? 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-orange-500/50'
                  : 'bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:ring-[#7e87ef]/50'
              }`}
            />
          </div>

          {/* Tags */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              themeName === 'light' ? 'text-gray-700' : 'text-gray-300'
            }`}>
              Tags (optional, comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g., programming, inspiration, todo"
              className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 ${
                themeName === 'light'
                  ? 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-orange-500/50'
                  : 'bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:ring-[#7e87ef]/50'
              }`}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex justify-end gap-3 px-5 py-4 border-t ${
          themeName === 'light' ? 'border-gray-200' : 'border-white/10'
        }`}>
          <button
            onClick={handleClose}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border-none cursor-pointer ${
              themeName === 'light'
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border-none cursor-pointer disabled:opacity-50 ${
              themeName === 'light'
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-[#7e87ef] text-white hover:bg-[#6b74e0]'
            }`}
          >
            {saving ? 'Saving...' : 'Save Quote'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/QuoteModal.tsx
git commit -m "feat: add QuoteModal component"
```

---

## Task 6: Create QuoteSelectionButton Component

**Files:**
- Create: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/components/QuoteSelectionButton.tsx`

**Step 1: Create the floating button component**

```tsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuoteLeft } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

interface QuoteSelectionButtonProps {
  position: { top: number; left: number };
  onClick: () => void;
}

export default function QuoteSelectionButton({ position, onClick }: QuoteSelectionButtonProps) {
  const { themeName } = useTheme();

  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: 'translateX(-50%)',
        zIndex: 60
      }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium shadow-lg transition-all border-none cursor-pointer animate-fade-in ${
        themeName === 'light'
          ? 'bg-orange-600 text-white hover:bg-orange-700'
          : 'bg-[#7e87ef] text-white hover:bg-[#6b74e0]'
      }`}
    >
      <FontAwesomeIcon icon={faQuoteLeft} className="text-xs" />
      Save Quote
    </button>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/QuoteSelectionButton.tsx
git commit -m "feat: add QuoteSelectionButton component"
```

---

## Task 7: Add Text Selection to PostView

**Files:**
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/components/PostView.tsx`

**Step 1: Add imports**

Add at the top with other imports:

```tsx
import QuoteSelectionButton from './QuoteSelectionButton';
import QuoteModal from './QuoteModal';
import QuoteService from '../helpers/QuoteService';
```

**Step 2: Add state for selection and modal**

Add after existing useState declarations (around line 28):

```tsx
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState<{ top: number; left: number } | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteSaved, setQuoteSaved] = useState(false);
```

**Step 3: Add accessToken from context**

Update the useReddit destructuring (around line 16) to include:

```tsx
  const {
    fontSize, setFontSize,
    darkMode, toggleDarkMode,
    savePost, unsavePost,
    signedIn, redirectForAuth,
    accessToken
  } = useReddit();
```

**Step 4: Add selection handler effect**

Add after the scroll handler useEffect (around line 50):

```tsx
  // Handle text selection for quote feature
  useEffect(() => {
    if (!signedIn) return;

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 0) {
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();

        if (rect) {
          setSelectedText(text);
          setSelectionPosition({
            top: rect.top - 45,
            left: rect.left + rect.width / 2
          });
        }
      } else {
        setSelectedText('');
        setSelectionPosition(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [signedIn]);
```

**Step 5: Add quote save handler**

Add after the handleShare function (around line 111):

```tsx
  const handleSaveQuote = async (note: string, tags: string[]) => {
    if (!accessToken || !post) return;

    await QuoteService.createQuote(accessToken, {
      postId: post.name || `t3_${post.id}`,
      text: selectedText,
      note: note || undefined,
      tags: tags.length > 0 ? tags : undefined,
      sourceUrl: post.url || `https://www.reddit.com${post.permalink}`,
      subreddit: post.subreddit,
      postTitle: post.title,
      author: post.author
    });

    setSelectedText('');
    setSelectionPosition(null);
    setQuoteSaved(true);
    setTimeout(() => setQuoteSaved(false), 2000);
  };

  const openQuoteModal = () => {
    setShowQuoteModal(true);
    setSelectionPosition(null);
  };
```

**Step 6: Add components to JSX**

Add before the closing `</div>` of the main container (before line 246):

```tsx
        {/* Quote Selection Button */}
        {signedIn && selectionPosition && selectedText && (
          <QuoteSelectionButton
            position={selectionPosition}
            onClick={openQuoteModal}
          />
        )}

        {/* Quote Modal */}
        <QuoteModal
          isOpen={showQuoteModal}
          onClose={() => setShowQuoteModal(false)}
          onSave={handleSaveQuote}
          selectedText={selectedText}
          sourceUrl={post?.url || `https://www.reddit.com${post?.permalink}`}
          postTitle={post?.title || ''}
        />

        {/* Quote Saved Toast */}
        {quoteSaved && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-green-500 text-white text-sm font-medium shadow-lg">
            Quote saved!
          </div>
        )}
```

**Step 7: Commit**

```bash
git add src/components/PostView.tsx
git commit -m "feat: add text selection and quote saving to PostView"
```

---

## Task 8: Create QuoteCard Component

**Files:**
- Create: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/components/QuoteCard.tsx`

**Step 1: Create the card component**

```tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faCheck, faTimes, faQuoteLeft } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { Quote } from '../helpers/QuoteService';

interface QuoteCardProps {
  quote: Quote;
  onUpdate: (id: string, note: string, tags: string[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function QuoteCard({ quote, onUpdate, onDelete }: QuoteCardProps) {
  const { themeName } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editNote, setEditNote] = useState(quote.note || '');
  const [editTags, setEditTags] = useState(quote.tags.join(', '));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const displayText = expanded || quote.text.length <= 200
    ? quote.text
    : quote.text.substring(0, 200) + '...';

  const handleSave = async () => {
    setLoading(true);
    try {
      const tags = editTags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      await onUpdate(quote.id, editNote, tags);
      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete(quote.id);
    } finally {
      setLoading(false);
    }
  };

  const postSlug = quote.postTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
  const postLink = `/p/${quote.postId}/${postSlug}`;

  const formattedDate = new Date(quote.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className={`rounded-xl p-4 ${
      themeName === 'light'
        ? 'bg-white border border-gray-200 shadow-sm'
        : 'bg-[#3d3466] border border-[#7e87ef]/20'
    }`}>
      {/* Quoted Text */}
      <div className={`mb-3 ${themeName === 'light' ? 'text-gray-800' : 'text-gray-200'}`}>
        <FontAwesomeIcon icon={faQuoteLeft} className="mr-2 opacity-40" />
        <span className="italic">{displayText}</span>
        {quote.text.length > 200 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className={`ml-2 text-sm font-medium border-none bg-transparent cursor-pointer ${
              themeName === 'light' ? 'text-orange-600' : 'text-[#7e87ef]'
            }`}
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {/* Note */}
      {editing ? (
        <div className="mb-3 space-y-2">
          <textarea
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="Your note..."
            rows={2}
            className={`w-full px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 ${
              themeName === 'light'
                ? 'bg-gray-50 border border-gray-300 text-gray-900 focus:ring-orange-500/50'
                : 'bg-white/5 border border-white/20 text-white focus:ring-[#7e87ef]/50'
            }`}
          />
          <input
            type="text"
            value={editTags}
            onChange={(e) => setEditTags(e.target.value)}
            placeholder="Tags (comma-separated)"
            className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 ${
              themeName === 'light'
                ? 'bg-gray-50 border border-gray-300 text-gray-900 focus:ring-orange-500/50'
                : 'bg-white/5 border border-white/20 text-white focus:ring-[#7e87ef]/50'
            }`}
          />
        </div>
      ) : quote.note ? (
        <div className={`mb-3 pl-4 border-l-2 ${
          themeName === 'light' ? 'border-orange-300 text-gray-600' : 'border-[#7e87ef]/50 text-gray-400'
        }`}>
          {quote.note}
        </div>
      ) : null}

      {/* Tags */}
      {!editing && quote.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {quote.tags.map((tag, i) => (
            <span
              key={i}
              className={`px-2 py-0.5 rounded-full text-xs ${
                themeName === 'light'
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-white/10 text-gray-300'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Metadata */}
      <div className={`flex items-center justify-between text-xs ${
        themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
      }`}>
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#ff4500]">r/{quote.subreddit}</span>
          <span>·</span>
          <Link
            to={postLink}
            className={`hover:underline truncate max-w-[200px] ${
              themeName === 'light' ? 'text-gray-600' : 'text-gray-300'
            }`}
          >
            {quote.postTitle}
          </Link>
          <span>·</span>
          <span>{formattedDate}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={loading}
                className={`p-1.5 rounded transition-colors border-none cursor-pointer ${
                  themeName === 'light'
                    ? 'text-green-600 hover:bg-green-50 bg-transparent'
                    : 'text-green-400 hover:bg-green-500/20 bg-transparent'
                }`}
              >
                <FontAwesomeIcon icon={faCheck} />
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditNote(quote.note || '');
                  setEditTags(quote.tags.join(', '));
                }}
                className={`p-1.5 rounded transition-colors border-none cursor-pointer ${
                  themeName === 'light'
                    ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                    : 'text-gray-400 hover:bg-white/10 bg-transparent'
                }`}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </>
          ) : confirmDelete ? (
            <>
              <span className="text-red-500 mr-1">Delete?</span>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="p-1.5 rounded text-red-500 hover:bg-red-500/20 transition-colors border-none cursor-pointer bg-transparent"
              >
                <FontAwesomeIcon icon={faCheck} />
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className={`p-1.5 rounded transition-colors border-none cursor-pointer ${
                  themeName === 'light'
                    ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                    : 'text-gray-400 hover:bg-white/10 bg-transparent'
                }`}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className={`p-1.5 rounded transition-colors border-none cursor-pointer ${
                  themeName === 'light'
                    ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                    : 'text-gray-400 hover:bg-white/10 bg-transparent'
                }`}
              >
                <FontAwesomeIcon icon={faEdit} />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className={`p-1.5 rounded transition-colors border-none cursor-pointer ${
                  themeName === 'light'
                    ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                    : 'text-gray-400 hover:bg-white/10 bg-transparent'
                }`}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/QuoteCard.tsx
git commit -m "feat: add QuoteCard component"
```

---

## Task 9: Create QuotesPage Component

**Files:**
- Create: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/components/QuotesPage.tsx`

**Step 1: Create the page component**

```tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import QuoteService, { Quote } from '../helpers/QuoteService';
import QuoteCard from './QuoteCard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuoteLeft, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

export default function QuotesPage() {
  const { signedIn, accessToken, redirectForAuth } = useReddit();
  const { themeName } = useTheme();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn || !accessToken) {
      setLoading(false);
      return;
    }

    async function loadQuotes() {
      try {
        const { quotes } = await QuoteService.listQuotes(accessToken!);
        setQuotes(quotes);
      } catch (err) {
        console.error('Failed to load quotes:', err);
        setError('Failed to load quotes');
      } finally {
        setLoading(false);
      }
    }

    loadQuotes();
  }, [signedIn, accessToken]);

  const handleUpdate = async (id: string, note: string, tags: string[]) => {
    if (!accessToken) return;
    const { quote } = await QuoteService.updateQuote(accessToken, id, { note, tags });
    setQuotes(quotes.map(q => q.id === id ? quote : q));
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    await QuoteService.deleteQuote(accessToken, id);
    setQuotes(quotes.filter(q => q.id !== id));
  };

  // Not signed in
  if (!signedIn) {
    return (
      <div className={`min-h-screen ${
        themeName === 'light' ? 'bg-[#fcfcfc] text-gray-900' : 'bg-[var(--theme-bg)] text-[var(--theme-text)]'
      }`}>
        <header className={`sticky top-0 z-50 ${
          themeName === 'light' ? 'bg-white border-b border-gray-200' : 'bg-[var(--theme-headerBg)] border-b border-[var(--theme-border)]'
        }`}>
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 no-underline">
              <img src="/favicon.png" alt="Reddzit" className="w-8 h-8" />
            </Link>
            <h1 className={`font-semibold ${themeName === 'light' ? 'text-gray-900' : 'text-white'}`}>
              Your Quotes
            </h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="text-6xl mb-6">
            <FontAwesomeIcon icon={faQuoteLeft} className="opacity-30" />
          </div>
          <h2 className={`text-2xl font-bold mb-3 ${themeName === 'light' ? 'text-gray-900' : ''}`}>
            Your Quotes
          </h2>
          <p className={`mb-8 max-w-md ${themeName === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
            Sign in to save and view your highlighted quotes from articles.
          </p>
          <button
            onClick={redirectForAuth}
            className={`px-6 py-3 rounded-full font-semibold transition-colors border-none cursor-pointer shadow-lg ${
              themeName === 'light'
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
            }`}
          >
            Connect with Reddit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${
      themeName === 'light' ? 'bg-[#fcfcfc] text-gray-900' : 'bg-[var(--theme-bg)] text-[var(--theme-text)]'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 ${
        themeName === 'light' ? 'bg-white border-b border-gray-200' : 'bg-[var(--theme-headerBg)] border-b border-[var(--theme-border)]'
      }`}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className={`flex items-center gap-2 no-underline ${
                themeName === 'light' ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'
              }`}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              <img src="/favicon.png" alt="Reddzit" className="w-8 h-8" />
            </Link>
            <h1 className={`font-semibold ${themeName === 'light' ? 'text-gray-900' : 'text-white'}`}>
              Your Quotes
              {quotes.length > 0 && (
                <span className={`ml-2 text-sm font-normal ${
                  themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  ({quotes.length})
                </span>
              )}
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin opacity-50" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 opacity-30">
              <FontAwesomeIcon icon={faQuoteLeft} />
            </div>
            <h2 className={`text-xl font-semibold mb-2 ${
              themeName === 'light' ? 'text-gray-800' : 'text-gray-200'
            }`}>
              No quotes yet
            </h2>
            <p className={themeName === 'light' ? 'text-gray-600' : 'text-gray-400'}>
              Highlight text in any article to save your first quote.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {quotes.map(quote => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/QuotesPage.tsx
git commit -m "feat: add QuotesPage component"
```

---

## Task 10: Add Quotes Route to App

**Files:**
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/App.tsx`

**Step 1: Import QuotesPage**

Add with other imports:

```tsx
import QuotesPage from './components/QuotesPage';
```

**Step 2: Add route**

Add inside `<Routes>` after the admin route:

```tsx
            <Route path='/quotes' element={<QuotesPage />} />
```

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add /quotes route"
```

---

## Task 11: Add Quotes Link to User Menu

**Files:**
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/components/AppShell.tsx`

**Step 1: Import faQuoteLeft icon**

Update the FontAwesome import to include faQuoteLeft:

```tsx
import { faChevronDown, faUser, faCoffee, faSignOutAlt, faTimes, faQuoteLeft } from '@fortawesome/free-solid-svg-icons';
```

**Step 2: Add Quotes link to user menu**

Find the user menu dropdown (around line 160) and add after the Reddit Profile link:

```tsx
                    <Link
                      to="/quotes"
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm no-underline ${
                        themeName === 'light' ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/10 text-gray-200'
                      }`}
                      onClick={() => setShowUserMenu(false)}
                    >
                      <FontAwesomeIcon icon={faQuoteLeft} className="w-4 text-gray-400" />
                      Your Quotes
                    </Link>
```

**Step 3: Commit**

```bash
git add src/components/AppShell.tsx
git commit -m "feat: add Quotes link to user menu"
```

---

## Task 12: Export accessToken from RedditContext

**Files:**
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/context/RedditContext.tsx`

**Step 1: Check if accessToken is already exported**

Read the file to verify the context exports accessToken. If not, add it to the context value.

**Step 2: Commit (if changes needed)**

```bash
git add src/context/RedditContext.tsx
git commit -m "feat: export accessToken from RedditContext"
```

---

## Task 13: Final Integration Test

**Step 1: Start the backend**

Run: `cd /Users/alexvallejo/Sites/personal/reddzit/read-api && npm run dev`

**Step 2: Start the frontend**

Run: `cd /Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh && npm run dev`

**Step 3: Test the flow**

1. Sign in with Reddit
2. Navigate to an article in PostView
3. Highlight some text
4. Verify the "Save Quote" button appears
5. Click the button, verify modal opens
6. Add a note and tags, click Save
7. Verify "Quote saved!" toast appears
8. Navigate to /quotes via user menu
9. Verify the quote appears
10. Test edit and delete functionality

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete quote highlight feature"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add Quote model to Prisma | schema.prisma |
| 2 | Create quotes controller | quotesController.js |
| 3 | Register API routes | server.js |
| 4 | Create QuoteService | QuoteService.ts |
| 5 | Create QuoteModal | QuoteModal.tsx |
| 6 | Create QuoteSelectionButton | QuoteSelectionButton.tsx |
| 7 | Add text selection to PostView | PostView.tsx |
| 8 | Create QuoteCard | QuoteCard.tsx |
| 9 | Create QuotesPage | QuotesPage.tsx |
| 10 | Add /quotes route | App.tsx |
| 11 | Add user menu link | AppShell.tsx |
| 12 | Export accessToken | RedditContext.tsx |
| 13 | Integration test | - |
