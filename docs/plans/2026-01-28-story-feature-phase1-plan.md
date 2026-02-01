# Story Feature Phase 1: Model & Basic CRUD Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Story model with CRUD, update Quote model with optional storyId, add User profile fields, and build basic story management pages with a simple textarea editor.

**Architecture:** Express.js backend with Prisma ORM + PostgreSQL. React 18 frontend with TypeScript, React Router v6, Tailwind CSS. Auth via Reddit OAuth Bearer tokens validated against Reddit API. Controllers create their own PrismaClient instances with pg adapter.

**Tech Stack:** Prisma, Express.js, React 18, TypeScript, Tailwind CSS, React Router v6, Axios

---

### Task 1: Add Story model and StoryStatus enum to Prisma schema

**Files:**
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/read-api/prisma/schema.prisma`

**Step 1: Add StoryStatus enum after existing enums (after line 708)**

Add this after the `JobStatus` enum block:

```prisma
// ============ Stories Feature ============

enum StoryStatus {
  DRAFT
  PUBLISHED
}
```

**Step 2: Add Story model after the new enum**

```prisma
model Story {
  id          String      @id @default(uuid())
  userId      String      @map("user_id")
  title       String
  slug        String
  description String?
  content     Json?       @default("{}")
  status      StoryStatus @default(DRAFT)
  publishedAt DateTime?   @map("published_at")
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  user        User        @relation(fields: [userId], references: [id])
  quotes      Quote[]

  @@unique([userId, slug])
  @@index([userId, updatedAt(sort: Desc)])
  @@index([status])
  @@map("stories")
}
```

**Step 3: Add `stories Story[]` relation to User model**

In the User model (line 415-440), add `stories Story[]` to the relations block, after `quotes Quote[]` on line 435:

```prisma
  quotes            Quote[]
  stories           Story[]
```

**Step 4: Add optional storyId FK to Quote model**

In the Quote model (line 712-730), add `storyId` field and the relation:

```prisma
model Quote {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  postId      String?  @map("post_id")
  text        String
  note        String?
  tags        Json     @default("[]")
  sourceUrl   String   @map("source_url")
  subreddit   String
  postTitle   String   @map("post_title")
  author      String
  storyId     String?  @map("story_id")
  isExternal  Boolean  @default(false) @map("is_external")
  pageUrl     String?  @map("page_url")
  pageTitle   String?  @map("page_title")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user        User     @relation(fields: [userId], references: [id])
  story       Story?   @relation(fields: [storyId], references: [id])

  @@index([userId, createdAt(sort: Desc)])
  @@index([storyId])
  @@map("quotes")
}
```

Key changes to existing Quote model:
- `postId` changes from `String` to `String?` (optional for external quotes)
- Add `storyId String? @map("story_id")`
- Add `isExternal Boolean @default(false) @map("is_external")`
- Add `pageUrl String? @map("page_url")`
- Add `pageTitle String? @map("page_title")`
- Add `story Story? @relation(fields: [storyId], references: [id])`
- Add `@@index([storyId])`

**Step 5: Add bio and displayName to User model**

In the User model (line 415-440), add after `isAdmin` (line 423):

```prisma
  bio              String?
  displayName      String?   @map("display_name")
```

**Step 6: Push schema changes to database**

Run: `cd /Users/alexvallejo/Sites/personal/reddzit/read-api && npx prisma db push`

Note: Use `db push` not `migrate dev` due to shadow database permissions on remote PostgreSQL.

**Step 7: Regenerate Prisma client**

Run: `cd /Users/alexvallejo/Sites/personal/reddzit/read-api && npx prisma generate`

**Step 8: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add Story model, update Quote with storyId, add User profile fields"
```

---

### Task 2: Create Stories controller with CRUD + publish/unpublish

**Files:**
- Create: `/Users/alexvallejo/Sites/personal/reddzit/read-api/controllers/storiesController.js`

**Step 1: Create the controller file**

Follow the same pattern as `quotesController.js`: create own PrismaClient with pg adapter, use `getUserFromToken` and `extractToken` helpers.

```javascript
// controllers/storiesController.js
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const USER_AGENT = process.env.USER_AGENT || 'Reddzit/1.0';

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
  } else if (!user.redditId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { redditId: redditUser.id }
    });
  }

  return { user, redditUser };
}

function extractToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return null;
  }
  return auth.slice(7);
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

function serializeStory(s) {
  return {
    id: s.id,
    userId: s.userId,
    title: s.title,
    slug: s.slug,
    description: s.description,
    content: s.content,
    status: s.status,
    publishedAt: s.publishedAt ? s.publishedAt.toISOString() : null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    _count: s._count || undefined
  };
}

// GET /api/stories
async function listStories(req, res) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Authorization required' });

    const { user } = await getUserFromToken(token);

    const stories = await prisma.story.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { quotes: true } } }
    });

    return res.json({
      stories: stories.map(serializeStory),
      count: stories.length
    });
  } catch (error) {
    console.error('listStories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/stories
async function createStory(req, res) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Authorization required' });

    const { user } = await getUserFromToken(token);
    const { title, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    let slug = slugify(title);

    // Ensure slug is unique for this user
    const existing = await prisma.story.findFirst({
      where: { userId: user.id, slug }
    });
    if (existing) {
      slug = slug + '-' + Date.now().toString(36);
    }

    const story = await prisma.story.create({
      data: {
        userId: user.id,
        title: title.trim(),
        slug,
        description: description?.trim() || null,
        content: {},
        status: 'DRAFT'
      },
      include: { _count: { select: { quotes: true } } }
    });

    return res.status(201).json({ story: serializeStory(story) });
  } catch (error) {
    console.error('createStory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/stories/:id
async function getStory(req, res) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Authorization required' });

    const { user } = await getUserFromToken(token);
    const { id } = req.params;

    const story = await prisma.story.findFirst({
      where: { id, userId: user.id },
      include: { _count: { select: { quotes: true } } }
    });

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    return res.json({ story: serializeStory(story) });
  } catch (error) {
    console.error('getStory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// PUT /api/stories/:id
async function updateStory(req, res) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Authorization required' });

    const { user } = await getUserFromToken(token);
    const { id } = req.params;

    const existing = await prisma.story.findFirst({
      where: { id, userId: user.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const { title, description, content } = req.body;
    const data = {};

    if (title !== undefined) {
      data.title = title.trim();
      // Re-slug if title changed and story is still a draft
      if (existing.status === 'DRAFT') {
        let newSlug = slugify(title);
        const slugConflict = await prisma.story.findFirst({
          where: { userId: user.id, slug: newSlug, id: { not: id } }
        });
        if (slugConflict) {
          newSlug = newSlug + '-' + Date.now().toString(36);
        }
        data.slug = newSlug;
      }
    }
    if (description !== undefined) data.description = description?.trim() || null;
    if (content !== undefined) data.content = content;

    const story = await prisma.story.update({
      where: { id },
      data,
      include: { _count: { select: { quotes: true } } }
    });

    return res.json({ story: serializeStory(story) });
  } catch (error) {
    console.error('updateStory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// DELETE /api/stories/:id
async function deleteStory(req, res) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Authorization required' });

    const { user } = await getUserFromToken(token);
    const { id } = req.params;

    const existing = await prisma.story.findFirst({
      where: { id, userId: user.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Unlink quotes from this story before deleting
    await prisma.quote.updateMany({
      where: { storyId: id },
      data: { storyId: null }
    });

    await prisma.story.delete({ where: { id } });

    return res.json({ success: true });
  } catch (error) {
    console.error('deleteStory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/stories/:id/publish
async function publishStory(req, res) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Authorization required' });

    const { user } = await getUserFromToken(token);
    const { id } = req.params;

    const existing = await prisma.story.findFirst({
      where: { id, userId: user.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const story = await prisma.story.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date()
      },
      include: { _count: { select: { quotes: true } } }
    });

    return res.json({ story: serializeStory(story) });
  } catch (error) {
    console.error('publishStory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/stories/:id/unpublish
async function unpublishStory(req, res) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'Authorization required' });

    const { user } = await getUserFromToken(token);
    const { id } = req.params;

    const existing = await prisma.story.findFirst({
      where: { id, userId: user.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Story not found' });
    }

    const story = await prisma.story.update({
      where: { id },
      data: {
        status: 'DRAFT',
        publishedAt: null
      },
      include: { _count: { select: { quotes: true } } }
    });

    return res.json({ story: serializeStory(story) });
  } catch (error) {
    console.error('unpublishStory error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  listStories,
  createStory,
  getStory,
  updateStory,
  deleteStory,
  publishStory,
  unpublishStory
};
```

**Step 2: Commit**

```bash
git add controllers/storiesController.js
git commit -m "feat: add stories controller with CRUD + publish/unpublish"
```

---

### Task 3: Update Quotes controller for storyId support

**Files:**
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/read-api/controllers/quotesController.js`

**Step 1: Update `listQuotes` to support `?storyId=xxx` query param**

In `listQuotes` (line 66), update the `where` clause to support optional storyId filtering:

```javascript
// After getting user (line 73)
const { storyId } = req.query;

const where = { userId: user.id };
if (storyId) {
  where.storyId = storyId;
}

const quotes = await prisma.quote.findMany({
  where,
  orderBy: { createdAt: 'desc' }
});
```

Also add `storyId` to the response mapping (in the `.map()` callback):

```javascript
storyId: q.storyId,
```

**Step 2: Update `createQuote` to accept optional storyId and make postId optional**

In `createQuote` (line 103):
- Change destructuring to include `storyId`
- Relax validation: require `text` and `sourceUrl` always, but `postId`, `subreddit`, `postTitle`, `author` only when not external
- Add `storyId` to the `data` object

```javascript
const { postId, text, sourceUrl, subreddit, postTitle, author, note, tags, storyId, isExternal, pageUrl, pageTitle } = req.body;

// Validate required fields
if (!text || !sourceUrl) {
  return res.status(400).json({
    error: 'Missing required fields: text, sourceUrl'
  });
}

// For non-external quotes, require Reddit fields
if (!isExternal && (!postId || !subreddit || !postTitle || !author)) {
  return res.status(400).json({
    error: 'Missing required fields for Reddit quotes: postId, subreddit, postTitle, author'
  });
}

// If storyId provided, verify story belongs to user
if (storyId) {
  const story = await prisma.story.findFirst({
    where: { id: storyId, userId: user.id }
  });
  if (!story) {
    return res.status(400).json({ error: 'Story not found' });
  }
}

const quote = await prisma.quote.create({
  data: {
    userId: user.id,
    postId: postId || null,
    text,
    sourceUrl,
    subreddit: subreddit || '',
    postTitle: postTitle || '',
    author: author || '',
    note: note || null,
    tags: tags || [],
    storyId: storyId || null,
    isExternal: isExternal || false,
    pageUrl: pageUrl || null,
    pageTitle: pageTitle || null
  }
});
```

Add `storyId` to the create response object as well.

**Step 3: Update `updateQuote` to allow updating storyId**

In `updateQuote` (line 157), add `storyId` to the destructured fields from `req.body` and the update data:

```javascript
const { note, tags, storyId } = req.body;

// If storyId provided, verify story belongs to user
if (storyId !== undefined && storyId !== null) {
  const story = await prisma.story.findFirst({
    where: { id: storyId, userId: user.id }
  });
  if (!story) {
    return res.status(400).json({ error: 'Story not found' });
  }
}

const quote = await prisma.quote.update({
  where: { id },
  data: {
    note: note !== undefined ? note : existingQuote.note,
    tags: tags !== undefined ? tags : existingQuote.tags,
    storyId: storyId !== undefined ? storyId : existingQuote.storyId
  }
});
```

Add `storyId` to the update response object.

**Step 4: Add storyId to response mappings in all handlers**

In all response objects across listQuotes, createQuote, updateQuote, add:
```javascript
storyId: quote.storyId,
```

**Step 5: Commit**

```bash
git add controllers/quotesController.js
git commit -m "feat: update quotes controller with storyId support and optional postId"
```

---

### Task 4: Register Story routes in server.js

**Files:**
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/read-api/server.js`

**Step 1: Add require for storiesController (after line 207)**

```javascript
const storiesController = require('./controllers/storiesController');
```

**Step 2: Add story routes (after quote routes at line 339)**

```javascript
// Story routes
app.get('/api/stories', storiesController.listStories);
app.post('/api/stories', storiesController.createStory);
app.get('/api/stories/:id', storiesController.getStory);
app.put('/api/stories/:id', storiesController.updateStory);
app.delete('/api/stories/:id', storiesController.deleteStory);
app.post('/api/stories/:id/publish', storiesController.publishStory);
app.post('/api/stories/:id/unpublish', storiesController.unpublishStory);
```

**Step 3: Commit**

```bash
git add server.js
git commit -m "feat: register story API routes"
```

---

### Task 5: Create StoryService.ts frontend service

**Files:**
- Create: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/helpers/StoryService.ts`

**Step 1: Create the service file**

Follow the same pattern as `QuoteService.ts`:

```typescript
import axios from 'axios';
import API_BASE_URL from '../config/api';

export interface Story {
  id: string;
  userId: string;
  title: string;
  slug: string;
  description: string | null;
  content: any;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { quotes: number };
}

export interface CreateStoryData {
  title: string;
  description?: string;
}

export interface UpdateStoryData {
  title?: string;
  description?: string;
  content?: any;
}

const StoryService = {
  async listStories(token: string): Promise<{ stories: Story[]; count: number }> {
    const response = await axios.get<{ stories: Story[]; count: number }>(
      `${API_BASE_URL}/api/stories`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async getStory(token: string, id: string): Promise<{ story: Story }> {
    const response = await axios.get<{ story: Story }>(
      `${API_BASE_URL}/api/stories/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async createStory(token: string, data: CreateStoryData): Promise<{ story: Story }> {
    const response = await axios.post<{ story: Story }>(
      `${API_BASE_URL}/api/stories`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async updateStory(token: string, id: string, data: UpdateStoryData): Promise<{ story: Story }> {
    const response = await axios.put<{ story: Story }>(
      `${API_BASE_URL}/api/stories/${id}`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async deleteStory(token: string, id: string): Promise<{ success: boolean }> {
    const response = await axios.delete<{ success: boolean }>(
      `${API_BASE_URL}/api/stories/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async publishStory(token: string, id: string): Promise<{ story: Story }> {
    const response = await axios.post<{ story: Story }>(
      `${API_BASE_URL}/api/stories/${id}/publish`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async unpublishStory(token: string, id: string): Promise<{ story: Story }> {
    const response = await axios.post<{ story: Story }>(
      `${API_BASE_URL}/api/stories/${id}/unpublish`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }
};

export default StoryService;
```

**Step 2: Update QuoteService.ts to support storyId**

In `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/helpers/QuoteService.ts`:

Add `storyId` to the `Quote` interface:
```typescript
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
  storyId: string | null;
  createdAt: string;
  updatedAt: string;
}
```

Add `storyId` to `CreateQuoteData`:
```typescript
export interface CreateQuoteData {
  postId: string;
  text: string;
  note?: string;
  tags?: string[];
  sourceUrl: string;
  subreddit: string;
  postTitle: string;
  author: string;
  storyId?: string;
}
```

Add `storyId` to `UpdateQuoteData`:
```typescript
export interface UpdateQuoteData {
  note?: string;
  tags?: string[];
  storyId?: string | null;
}
```

Add optional `storyId` query param to `listQuotes`:
```typescript
async listQuotes(token: string, storyId?: string): Promise<{ quotes: Quote[]; count: number }> {
  const params = storyId ? { storyId } : {};
  const response = await axios.get<{ quotes: Quote[]; count: number }>(
    `${API_BASE_URL}/api/quotes`,
    { headers: { Authorization: `Bearer ${token}` }, params }
  );
  return response.data;
},
```

**Step 3: Commit**

```bash
git add src/helpers/StoryService.ts src/helpers/QuoteService.ts
git commit -m "feat: add StoryService, update QuoteService with storyId"
```

---

### Task 6: Create StoriesPage component (list view)

**Files:**
- Create: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/components/StoriesPage.tsx`

**Step 1: Create the component**

Follow the same layout/theme patterns as `QuotesPage.tsx`. Show two sections: Drafts and Published. Each card shows title, description, status badge, updated date, and assigned quote count.

```typescript
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import StoryService, { Story } from '../helpers/StoryService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPlus, faPen, faTrash, faGlobe, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { faFileAlt } from '@fortawesome/free-regular-svg-icons';

export default function StoriesPage() {
  const { signedIn, accessToken, redirectForAuth } = useReddit();
  const { themeName } = useTheme();
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn || !accessToken) {
      setLoading(false);
      return;
    }

    async function loadStories() {
      try {
        const { stories } = await StoryService.listStories(accessToken!);
        setStories(stories);
      } catch (err) {
        console.error('Failed to load stories:', err);
        setError('Failed to load stories');
      } finally {
        setLoading(false);
      }
    }

    loadStories();
  }, [signedIn, accessToken]);

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    try {
      await StoryService.deleteStory(accessToken, id);
      setStories(stories.filter(s => s.id !== id));
      setDeletingId(null);
    } catch (err) {
      console.error('Failed to delete story:', err);
    }
  };

  const handlePublishToggle = async (story: Story) => {
    if (!accessToken) return;
    try {
      const { story: updated } = story.status === 'PUBLISHED'
        ? await StoryService.unpublishStory(accessToken, story.id)
        : await StoryService.publishStory(accessToken, story.id);
      setStories(stories.map(s => s.id === updated.id ? updated : s));
    } catch (err) {
      console.error('Failed to toggle publish:', err);
    }
  };

  const drafts = stories.filter(s => s.status === 'DRAFT');
  const published = stories.filter(s => s.status === 'PUBLISHED');

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
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
              Your Stories
            </h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="text-6xl mb-6">
            <FontAwesomeIcon icon={faFileAlt} className="opacity-30" />
          </div>
          <h2 className={`text-2xl font-bold mb-3 ${themeName === 'light' ? 'text-gray-900' : ''}`}>
            Your Stories
          </h2>
          <p className={`mb-8 max-w-md ${themeName === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
            Sign in to create and manage your stories.
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

  const StoryCard = ({ story }: { story: Story }) => (
    <div className={`rounded-xl p-5 ${
      themeName === 'light'
        ? 'bg-white border border-gray-200 hover:border-gray-300'
        : 'bg-white/5 border border-white/10 hover:border-white/20'
    } transition-colors`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              to={`/stories/${story.id}/edit`}
              className={`font-semibold text-lg no-underline hover:underline ${
                themeName === 'light' ? 'text-gray-900' : 'text-white'
              }`}
            >
              {story.title}
            </Link>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              story.status === 'PUBLISHED'
                ? 'bg-green-100 text-green-700'
                : themeName === 'light'
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-white/10 text-gray-400'
            }`}>
              {story.status === 'PUBLISHED' ? 'Published' : 'Draft'}
            </span>
          </div>
          {story.description && (
            <p className={`text-sm mb-2 ${
              themeName === 'light' ? 'text-gray-600' : 'text-gray-400'
            }`}>
              {story.description}
            </p>
          )}
          <div className={`text-xs ${
            themeName === 'light' ? 'text-gray-500' : 'text-gray-500'
          }`}>
            Updated {formatDate(story.updatedAt)}
            {story._count && story._count.quotes > 0 && (
              <span className="ml-3">{story._count.quotes} quote{story._count.quotes !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate(`/stories/${story.id}/edit`)}
            title="Edit"
            className={`p-2 rounded-lg transition-colors border-none cursor-pointer ${
              themeName === 'light'
                ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                : 'text-gray-400 hover:bg-white/10 bg-transparent'
            }`}
          >
            <FontAwesomeIcon icon={faPen} className="text-sm" />
          </button>
          <button
            onClick={() => handlePublishToggle(story)}
            title={story.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
            className={`p-2 rounded-lg transition-colors border-none cursor-pointer ${
              themeName === 'light'
                ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                : 'text-gray-400 hover:bg-white/10 bg-transparent'
            }`}
          >
            <FontAwesomeIcon icon={story.status === 'PUBLISHED' ? faEyeSlash : faGlobe} className="text-sm" />
          </button>
          {deletingId === story.id ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleDelete(story.id)}
                className="text-xs px-2 py-1 rounded bg-red-500 text-white border-none cursor-pointer"
              >
                Confirm
              </button>
              <button
                onClick={() => setDeletingId(null)}
                className={`text-xs px-2 py-1 rounded border-none cursor-pointer ${
                  themeName === 'light' ? 'bg-gray-100 text-gray-700' : 'bg-white/10 text-gray-300'
                }`}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDeletingId(story.id)}
              title="Delete"
              className={`p-2 rounded-lg transition-colors border-none cursor-pointer ${
                themeName === 'light'
                  ? 'text-gray-500 hover:bg-red-50 hover:text-red-500 bg-transparent'
                  : 'text-gray-400 hover:bg-red-500/20 hover:text-red-400 bg-transparent'
              }`}
            >
              <FontAwesomeIcon icon={faTrash} className="text-sm" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

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
              Your Stories
              {stories.length > 0 && (
                <span className={`ml-2 text-sm font-normal ${
                  themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  ({stories.length})
                </span>
              )}
            </h1>
          </div>
          <button
            onClick={() => navigate('/stories/new')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border-none cursor-pointer ${
              themeName === 'light'
                ? 'bg-orange-600 text-white hover:bg-orange-700'
                : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
            }`}
          >
            <FontAwesomeIcon icon={faPlus} />
            New Story
          </button>
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
        ) : stories.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 opacity-30">
              <FontAwesomeIcon icon={faFileAlt} />
            </div>
            <h2 className={`text-xl font-semibold mb-2 ${
              themeName === 'light' ? 'text-gray-800' : 'text-gray-200'
            }`}>
              No stories yet
            </h2>
            <p className={`mb-6 ${themeName === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
              Create your first story to start organizing your research.
            </p>
            <button
              onClick={() => navigate('/stories/new')}
              className={`px-6 py-3 rounded-full font-semibold transition-colors border-none cursor-pointer shadow-lg ${
                themeName === 'light'
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
              }`}
            >
              Create Story
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {drafts.length > 0 && (
              <section>
                <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${
                  themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Drafts ({drafts.length})
                </h2>
                <div className="space-y-3">
                  {drafts.map(story => (
                    <StoryCard key={story.id} story={story} />
                  ))}
                </div>
              </section>
            )}
            {published.length > 0 && (
              <section>
                <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${
                  themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Published ({published.length})
                </h2>
                <div className="space-y-3">
                  {published.map(story => (
                    <StoryCard key={story.id} story={story} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/StoriesPage.tsx
git commit -m "feat: add StoriesPage component with draft/published sections"
```

---

### Task 7: Create StoryNewPage component

**Files:**
- Create: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/components/StoryNewPage.tsx`

**Step 1: Create the component**

Simple form with title and optional description. On submit, creates story via API and navigates to edit page.

```typescript
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import StoryService from '../helpers/StoryService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

export default function StoryNewPage() {
  const { signedIn, accessToken, redirectForAuth } = useReddit();
  const { themeName } = useTheme();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    redirectForAuth();
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !title.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const { story } = await StoryService.createStory(accessToken, {
        title: title.trim(),
        description: description.trim() || undefined
      });
      navigate(`/stories/${story.id}/edit`);
    } catch (err) {
      console.error('Failed to create story:', err);
      setError('Failed to create story. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className={`min-h-screen ${
      themeName === 'light' ? 'bg-[#fcfcfc] text-gray-900' : 'bg-[var(--theme-bg)] text-[var(--theme-text)]'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 ${
        themeName === 'light' ? 'bg-white border-b border-gray-200' : 'bg-[var(--theme-headerBg)] border-b border-[var(--theme-border)]'
      }`}>
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link
            to="/stories"
            className={`flex items-center gap-2 no-underline ${
              themeName === 'light' ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'
            }`}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </Link>
          <h1 className={`font-semibold ${themeName === 'light' ? 'text-gray-900' : 'text-white'}`}>
            New Story
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              themeName === 'light' ? 'text-gray-700' : 'text-gray-300'
            }`}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your story a title..."
              autoFocus
              className={`w-full px-4 py-3 rounded-lg text-lg focus:outline-none focus:ring-2 ${
                themeName === 'light'
                  ? 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-orange-500/50'
                  : 'bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:ring-[#7e87ef]/50'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              themeName === 'light' ? 'text-gray-700' : 'text-gray-300'
            }`}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief summary of what this story is about..."
              rows={3}
              className={`w-full px-4 py-3 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 ${
                themeName === 'light'
                  ? 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-orange-500/50'
                  : 'bg-white/5 border border-white/20 text-white placeholder-gray-500 focus:ring-[#7e87ef]/50'
              }`}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <div className="flex justify-end gap-3">
            <Link
              to="/stories"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors no-underline ${
                themeName === 'light'
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors border-none cursor-pointer disabled:opacity-50 ${
                themeName === 'light'
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-[var(--theme-primary)] text-[#262129] hover:opacity-90'
              }`}
            >
              {saving ? 'Creating...' : 'Create & Start Writing'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/StoryNewPage.tsx
git commit -m "feat: add StoryNewPage component for creating stories"
```

---

### Task 8: Create StoryEditorPage component (textarea for Phase 1)

**Files:**
- Create: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/components/StoryEditorPage.tsx`

**Step 1: Create the component**

Two-column layout: main area with title + textarea editor, sidebar with assigned quotes. Auto-saves content on a debounce. Shows list of quotes assigned to this story, with option to browse all quotes.

```typescript
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useReddit } from '../context/RedditContext';
import { useTheme } from '../context/ThemeContext';
import StoryService, { Story } from '../helpers/StoryService';
import QuoteService, { Quote } from '../helpers/QuoteService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faQuoteLeft, faSave, faCheck, faChevronRight, faChevronLeft } from '@fortawesome/free-solid-svg-icons';

export default function StoryEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { signedIn, accessToken, redirectForAuth } = useReddit();
  const { themeName } = useTheme();
  const navigate = useNavigate();

  const [story, setStory] = useState<Story | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showSidebar, setShowSidebar] = useState(true);

  // Quotes state
  const [assignedQuotes, setAssignedQuotes] = useState<Quote[]>([]);
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  const [showAllQuotes, setShowAllQuotes] = useState(false);
  const [quotesLoading, setQuotesLoading] = useState(true);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!signedIn) {
    redirectForAuth();
    return null;
  }

  // Load story
  useEffect(() => {
    if (!accessToken || !id) return;

    async function loadStory() {
      try {
        const { story } = await StoryService.getStory(accessToken!, id!);
        setStory(story);
        setTitle(story.title);
        setDescription(story.description || '');
        // Content is stored as JSON; for Phase 1 textarea we store { text: "..." }
        setBodyText(story.content?.text || '');
      } catch (err) {
        console.error('Failed to load story:', err);
        setError('Story not found');
      } finally {
        setLoading(false);
      }
    }

    loadStory();
  }, [accessToken, id]);

  // Load quotes
  useEffect(() => {
    if (!accessToken || !id) return;

    async function loadQuotes() {
      try {
        const [assigned, all] = await Promise.all([
          QuoteService.listQuotes(accessToken!, id),
          QuoteService.listQuotes(accessToken!)
        ]);
        setAssignedQuotes(assigned.quotes);
        setAllQuotes(all.quotes.filter(q => q.storyId !== id));
      } catch (err) {
        console.error('Failed to load quotes:', err);
      } finally {
        setQuotesLoading(false);
      }
    }

    loadQuotes();
  }, [accessToken, id]);

  // Auto-save with debounce
  const saveStory = useCallback(async (updates: { title?: string; description?: string; content?: any }) => {
    if (!accessToken || !id) return;
    setSaveStatus('saving');
    try {
      const { story: updated } = await StoryService.updateStory(accessToken, id, updates);
      setStory(updated);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to save:', err);
      setSaveStatus('unsaved');
    }
  }, [accessToken, id]);

  const debouncedSave = useCallback((updates: { title?: string; description?: string; content?: any }) => {
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveStory(updates), 1500);
  }, [saveStory]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    debouncedSave({ title: val, content: { text: bodyText } });
  };

  const handleBodyChange = (val: string) => {
    setBodyText(val);
    debouncedSave({ content: { text: val } });
  };

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    debouncedSave({ description: val, content: { text: bodyText } });
  };

  const handleAssignQuote = async (quoteId: string) => {
    if (!accessToken) return;
    try {
      const { quote } = await QuoteService.updateQuote(accessToken, quoteId, { storyId: id });
      setAssignedQuotes(prev => [quote, ...prev]);
      setAllQuotes(prev => prev.filter(q => q.id !== quoteId));
    } catch (err) {
      console.error('Failed to assign quote:', err);
    }
  };

  const handleUnassignQuote = async (quoteId: string) => {
    if (!accessToken) return;
    try {
      const { quote } = await QuoteService.updateQuote(accessToken, quoteId, { storyId: null });
      setAssignedQuotes(prev => prev.filter(q => q.id !== quoteId));
      setAllQuotes(prev => [quote, ...prev]);
    } catch (err) {
      console.error('Failed to unassign quote:', err);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        themeName === 'light' ? 'bg-[#fcfcfc]' : 'bg-[var(--theme-bg)]'
      }`}>
        <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin opacity-50" />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${
        themeName === 'light' ? 'bg-[#fcfcfc] text-gray-900' : 'bg-[var(--theme-bg)] text-[var(--theme-text)]'
      }`}>
        <h2 className="text-2xl font-bold mb-4">{error || 'Story not found'}</h2>
        <Link to="/stories" className="text-blue-500 hover:underline">Back to Stories</Link>
      </div>
    );
  }

  const QuoteItem = ({ quote, action, actionLabel }: { quote: Quote; action: () => void; actionLabel: string }) => (
    <div className={`p-3 rounded-lg text-sm ${
      themeName === 'light' ? 'bg-gray-50 border border-gray-200' : 'bg-white/5 border border-white/10'
    }`}>
      <p className={`line-clamp-3 mb-2 ${themeName === 'light' ? 'text-gray-700' : 'text-gray-300'}`}>
        "{quote.text.length > 150 ? quote.text.substring(0, 150) + '...' : quote.text}"
      </p>
      <div className="flex items-center justify-between">
        <span className={`text-xs ${themeName === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
          r/{quote.subreddit}
        </span>
        <button
          onClick={action}
          className={`text-xs px-2 py-1 rounded transition-colors border-none cursor-pointer ${
            themeName === 'light'
              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${
      themeName === 'light' ? 'bg-[#fcfcfc] text-gray-900' : 'bg-[var(--theme-bg)] text-[var(--theme-text)]'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 ${
        themeName === 'light' ? 'bg-white border-b border-gray-200' : 'bg-[var(--theme-headerBg)] border-b border-[var(--theme-border)]'
      }`}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/stories"
              className={`no-underline ${
                themeName === 'light' ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-white'
              }`}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </Link>
            <span className={`text-sm ${
              saveStatus === 'saved' ? 'text-green-500' :
              saveStatus === 'saving' ? (themeName === 'light' ? 'text-gray-500' : 'text-gray-400') :
              'text-yellow-500'
            }`}>
              {saveStatus === 'saved' && <><FontAwesomeIcon icon={faCheck} className="mr-1" />Saved</>}
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'unsaved' && 'Unsaved changes'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              story.status === 'PUBLISHED'
                ? 'bg-green-100 text-green-700'
                : themeName === 'light'
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-white/10 text-gray-400'
            }`}>
              {story.status === 'PUBLISHED' ? 'Published' : 'Draft'}
            </span>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className={`p-2 rounded-lg transition-colors border-none cursor-pointer ${
                themeName === 'light'
                  ? 'text-gray-500 hover:bg-gray-100 bg-transparent'
                  : 'text-gray-400 hover:bg-white/10 bg-transparent'
              }`}
              title={showSidebar ? 'Hide quotes' : 'Show quotes'}
            >
              <FontAwesomeIcon icon={faQuoteLeft} />
              <FontAwesomeIcon icon={showSidebar ? faChevronRight : faChevronLeft} className="ml-1 text-xs" />
            </button>
          </div>
        </div>
      </header>

      {/* Editor + Sidebar */}
      <div className="max-w-6xl mx-auto flex">
        {/* Main Editor */}
        <main className={`flex-1 px-4 py-8 ${showSidebar ? 'max-w-3xl' : 'max-w-4xl mx-auto'}`}>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Story title..."
            className={`w-full text-3xl font-bold mb-2 bg-transparent border-none outline-none ${
              themeName === 'light' ? 'text-gray-900 placeholder-gray-400' : 'text-white placeholder-gray-600'
            }`}
          />
          <input
            type="text"
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Brief description (optional)..."
            className={`w-full text-sm mb-6 bg-transparent border-none outline-none ${
              themeName === 'light' ? 'text-gray-600 placeholder-gray-400' : 'text-gray-400 placeholder-gray-600'
            }`}
          />
          <textarea
            value={bodyText}
            onChange={(e) => handleBodyChange(e.target.value)}
            placeholder="Start writing your story..."
            className={`w-full min-h-[60vh] p-0 text-base leading-relaxed bg-transparent border-none outline-none resize-none ${
              themeName === 'light' ? 'text-gray-800 placeholder-gray-400' : 'text-gray-200 placeholder-gray-600'
            }`}
          />
        </main>

        {/* Sidebar */}
        {showSidebar && (
          <aside className={`w-80 flex-shrink-0 border-l p-4 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto ${
            themeName === 'light' ? 'border-gray-200 bg-gray-50/50' : 'border-white/10 bg-white/[0.02]'
          }`}>
            <div className="space-y-6">
              {/* Assigned Quotes */}
              <div>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                  themeName === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  Research ({assignedQuotes.length})
                </h3>
                {quotesLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />
                  </div>
                ) : assignedQuotes.length === 0 ? (
                  <p className={`text-xs ${themeName === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                    No quotes assigned to this story yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {assignedQuotes.map(q => (
                      <QuoteItem
                        key={q.id}
                        quote={q}
                        action={() => handleUnassignQuote(q.id)}
                        actionLabel="Remove"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* All Other Quotes */}
              <div>
                <button
                  onClick={() => setShowAllQuotes(!showAllQuotes)}
                  className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1 border-none bg-transparent cursor-pointer ${
                    themeName === 'light' ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  All Quotes ({allQuotes.length})
                  <FontAwesomeIcon
                    icon={faChevronRight}
                    className={`text-[10px] transition-transform ${showAllQuotes ? 'rotate-90' : ''}`}
                  />
                </button>
                {showAllQuotes && (
                  <div className="space-y-2">
                    {allQuotes.length === 0 ? (
                      <p className={`text-xs ${themeName === 'light' ? 'text-gray-500' : 'text-gray-500'}`}>
                        No other quotes available.
                      </p>
                    ) : (
                      allQuotes.map(q => (
                        <QuoteItem
                          key={q.id}
                          quote={q}
                          action={() => handleAssignQuote(q.id)}
                          actionLabel="Assign"
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/StoryEditorPage.tsx
git commit -m "feat: add StoryEditorPage with textarea editor and quote sidebar"
```

---

### Task 9: Add Story routes to App.tsx and navigation to AppShell.tsx

**Files:**
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/App.tsx`
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/components/AppShell.tsx`

**Step 1: Add imports and routes in App.tsx**

Add imports at the top of App.tsx (after line 12):

```typescript
import StoriesPage from './components/StoriesPage';
import StoryNewPage from './components/StoryNewPage';
import StoryEditorPage from './components/StoryEditorPage';
```

Add routes inside `<Routes>` (after the `/quotes` route on line 31):

```typescript
<Route path='/stories' element={<StoriesPage />} />
<Route path='/stories/new' element={<StoryNewPage />} />
<Route path='/stories/:id/edit' element={<StoryEditorPage />} />
```

**Step 2: Add "Your Stories" link in AppShell.tsx user menu**

In AppShell.tsx, add `faFileAlt` to the imports from `@fortawesome/free-regular-svg-icons` (line 12):

```typescript
import { faFileAlt } from '@fortawesome/free-regular-svg-icons';
```

Add a "Your Stories" link right after the "Your Quotes" link (after line 181):

```typescript
<Link
  to="/stories"
  className={`flex items-center gap-3 px-4 py-2.5 text-sm no-underline ${
    themeName === 'light' ? 'hover:bg-gray-50 text-gray-700' : 'hover:bg-white/10 text-gray-200'
  }`}
  onClick={() => setShowUserMenu(false)}
>
  <FontAwesomeIcon icon={faFileAlt} className="w-4 text-gray-400" />
  Your Stories
</Link>
```

**Step 3: Commit**

```bash
git add src/App.tsx src/components/AppShell.tsx
git commit -m "feat: add story routes and navigation link in user menu"
```

---

### Task 10: Update QuoteModal with optional Story picker

**Files:**
- Modify: `/Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh/src/components/QuoteModal.tsx`

**Step 1: Add Story picker dropdown to QuoteModal**

Update the component to accept an optional `stories` prop and `onSave` to include `storyId`:

Update the interface and component:

```typescript
import StoryService, { Story } from '../helpers/StoryService';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: string, tags: string[], storyId?: string) => Promise<void>;
  selectedText: string;
  sourceUrl: string;
  postTitle: string;
  accessToken?: string;
}
```

Add state for stories and selected story inside the component:

```typescript
const [stories, setStories] = useState<Story[]>([]);
const [selectedStoryId, setSelectedStoryId] = useState<string>('');
const [storiesLoading, setStoriesLoading] = useState(false);
```

Add useEffect to load stories when modal opens:

```typescript
useEffect(() => {
  if (!isOpen || !accessToken) return;
  setStoriesLoading(true);
  StoryService.listStories(accessToken)
    .then(({ stories }) => setStories(stories))
    .catch(() => {})
    .finally(() => setStoriesLoading(false));
}, [isOpen, accessToken]);
```

Add Story picker dropdown in the form (after the Tags input):

```typescript
{/* Story */}
{accessToken && (
  <div>
    <label className={`block text-sm font-medium mb-2 ${
      themeName === 'light' ? 'text-gray-700' : 'text-gray-300'
    }`}>
      Assign to Story (optional)
    </label>
    <select
      value={selectedStoryId}
      onChange={(e) => setSelectedStoryId(e.target.value)}
      disabled={storiesLoading}
      className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 ${
        themeName === 'light'
          ? 'bg-white border border-gray-300 text-gray-900 focus:ring-orange-500/50'
          : 'bg-white/5 border border-white/20 text-white focus:ring-[#7e87ef]/50'
      }`}
    >
      <option value="">No story</option>
      {stories.map(s => (
        <option key={s.id} value={s.id}>{s.title}</option>
      ))}
    </select>
  </div>
)}
```

Update `handleSave` to pass storyId:

```typescript
await onSave(note, tags, selectedStoryId || undefined);
```

Reset `selectedStoryId` in `handleSave` and `handleClose`.

**Step 2: Update PostView.tsx to pass accessToken to QuoteModal and update onSave handler**

In PostView.tsx, update `handleSaveQuote` to accept storyId:

```typescript
const handleSaveQuote = async (note: string, tags: string[], storyId?: string) => {
  // ... existing code
  await QuoteService.createQuote(accessToken, {
    // ... existing fields
    storyId
  });
  // ... rest unchanged
};
```

Add `accessToken` prop to QuoteModal usage:

```typescript
<QuoteModal
  isOpen={showQuoteModal}
  onClose={() => setShowQuoteModal(false)}
  onSave={handleSaveQuote}
  selectedText={selectedText}
  sourceUrl={post?.url || `https://www.reddit.com${post?.permalink}`}
  postTitle={post?.title || ''}
  accessToken={accessToken || undefined}
/>
```

**Step 3: Commit**

```bash
git add src/components/QuoteModal.tsx src/components/PostView.tsx
git commit -m "feat: add optional Story picker to QuoteModal"
```

---

### Task 11: End-to-end test and verify

**Step 1: Restart the backend**

Run: `cd /Users/alexvallejo/Sites/personal/reddzit/read-api && node server.js`

Verify no startup errors.

**Step 2: Test API endpoints with curl**

Test creating a story (replace `TOKEN` with a valid token):
```bash
curl -X POST http://localhost:3001/api/stories \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My First Story","description":"Testing"}'
```

Test listing stories:
```bash
curl http://localhost:3001/api/stories \
  -H "Authorization: Bearer TOKEN"
```

**Step 3: Verify frontend compiles**

Run: `cd /Users/alexvallejo/Sites/personal/reddzit/reddzit-refresh && npm run build`

**Step 4: Manual browser test**

- Navigate to `/stories` - should show empty state with "Create Story" button
- Click "New Story" - should show create form
- Create a story - should redirect to editor
- Type in editor - should auto-save
- Check sidebar - should show quotes
- Navigate back to `/stories` - should see story in Drafts section
- Check user menu - should see "Your Stories" link

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address any issues found during testing"
```
