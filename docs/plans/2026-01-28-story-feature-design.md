# Story Feature Design

Turn Reddzit into a research-to-publish platform where users collect quotes, organize them into Stories, write with a rich text editor, and publish to their public Reddzit profile.

## Overview

**Goal:** Users can create Stories, assign quotes to them as research, write articles with a rich text editor that lets them insert quotes as citations, and publish to a public author profile.

**User Flow:**
1. Collect quotes from Reddit posts, external websites (via Chrome extension), or within Reddzit
2. Optionally assign quotes to a Story at save time, or leave in inbox
3. Create a Story, see assigned quotes in a sidebar while editing
4. Write using rich text editor, insert quotes as styled blockquotes
5. Inserted quotes auto-populate a Sources section
6. Publish to `reddzit.com/u/username/story-slug`

## Data Models

### Story

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| userId | String | FK to User |
| title | String | Story title |
| slug | String | URL-friendly, unique per user |
| description | String? | Short summary for listings |
| content | JSON | Rich text editor content (TipTap JSON) |
| status | Enum | 'draft' or 'published' |
| publishedAt | DateTime? | When story was published |
| createdAt | DateTime | Created timestamp |
| updatedAt | DateTime | Last modified |

### Quote Model Changes

| Field | Change |
|-------|--------|
| storyId | Add: String? (optional FK to Story) |
| isExternal | Add: Boolean (true for non-Reddit sources) |
| postId | Change: Make optional (null for external quotes) |
| pageUrl | Add: String? (source page URL for external quotes) |
| pageTitle | Add: String? (scraped page title for external quotes) |

### User Model Changes

| Field | Change |
|-------|--------|
| bio | Add: String? (author bio for public profile) |
| displayName | Add: String? (public display name) |

### Quote Insertion

When a quote is inserted into a Story's content, it's **snapshotted** — copied into the rich text JSON as a special blockquote node. The original Quote record remains in the library but isn't linked. This means:
- Editing the original quote doesn't affect inserted copies
- A Story can have many quotes assigned (research) but fewer actually inserted (cited)

## Pages & Routes

### Authenticated Routes

| Route | Description |
|-------|-------------|
| `/stories` | List of user's stories (drafts + published) |
| `/stories/new` | Create new story |
| `/stories/:id/edit` | Rich text editor for drafting |

### Public Routes

| Route | Description |
|-------|-------------|
| `/u/:username` | Public author profile (bio + published stories) |
| `/u/:username/:slug` | Published story view |

### Page Details

**Stories List (`/stories`)**
- Two sections: Drafts, Published
- Card shows: title, description, status, date, assigned quote count
- Actions: Edit, Delete, Publish/Unpublish

**Story Editor (`/stories/:id/edit`)**
- Rich text editor (TipTap)
- Sidebar to browse & insert quotes (assigned to this story + all quotes)
- "Insert Quote" creates styled blockquote node with source metadata
- Auto-generated Sources section at bottom
- Save (auto-save) and Publish buttons

**Public Profile (`/u/:username`)**
- Display name, bio
- Grid/list of published stories

**Published Story (`/u/:username/:slug`)**
- Clean article view
- Blockquotes styled as citations
- Sources section at bottom

## API Endpoints

### Story Endpoints (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stories` | List user's stories |
| POST | `/api/stories` | Create new story |
| GET | `/api/stories/:id` | Get story for editing |
| PUT | `/api/stories/:id` | Update story |
| DELETE | `/api/stories/:id` | Delete story |
| POST | `/api/stories/:id/publish` | Publish story |
| POST | `/api/stories/:id/unpublish` | Unpublish story |

### Public Endpoints (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/u/:username` | Get public profile |
| GET | `/api/u/:username/stories` | List published stories |
| GET | `/api/u/:username/:slug` | Get published story |

### Quote Endpoint Changes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quotes?storyId=xxx` | Filter quotes by Story |
| PUT | `/api/quotes/:id` | Add storyId to updatable fields |

### User Profile Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/user/profile` | Update bio, displayName |

## Chrome Extension Changes

### New Capabilities

- Content script on all pages detects text selection
- Floating "Save Quote" button appears on highlight
- Modal includes: quoted text, note, tags, Story picker dropdown
- Auth flow: if not logged in, opens reddzit.com for OAuth, bridges token back to extension

### Manifest Changes

```json
{
  "permissions": ["tabs", "storage", "activeTab"],
  "host_permissions": [
    "https://reddzit.com/*",
    "https://read-api.reddzit.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"]
    },
    {
      "matches": ["https://reddzit.com/*"],
      "js": ["auth-bridge.js"]
    }
  ]
}
```

### New Files

| File | Purpose |
|------|---------|
| content.js | Selection detection, floating button, modal (shadow DOM) |
| content.css | Styles for injected UI |
| auth-bridge.js | Reads token from reddzit.com localStorage, sends to background worker |

### Save Flow

1. User highlights text on any webpage
2. Floating "Save Quote" button appears
3. Click opens modal with text, page URL, page title pre-filled
4. User adds note, tags, optionally selects a Story
5. Save calls `/api/quotes` with `isExternal: true`, `pageUrl`, `pageTitle`

## Implementation Phases

### Phase 1: Story Model & Basic CRUD

- Add Story model to Prisma schema
- Add `storyId`, `isExternal`, `pageUrl`, `pageTitle` to Quote model
- Story API endpoints (create, list, update, delete)
- `/stories` list page
- `/stories/new` and `/stories/:id/edit` with simple textarea (rich editor later)
- Update Quote API to support `storyId` filter and update

### Phase 2: Rich Text Editor

- Integrate TipTap editor into Story editor page
- Create custom "quote" node type for inserted citations
- Quote picker sidebar (assigned quotes + all quotes)
- Insert quote action creates blockquote node with metadata
- Auto-generated Sources section from inserted quote nodes

### Phase 3: Publishing & Public Profiles

- Publish/unpublish API endpoints
- Add `bio`, `displayName` to User model
- Profile settings page to edit bio/displayName
- `/u/:username` public profile page
- `/u/:username/:slug` public story view
- SEO meta tags for public pages

### Phase 4: Chrome Extension

- Content script for text selection detection
- Shadow DOM UI for floating button and modal
- Auth bridge between reddzit.com and chrome.storage
- Story picker dropdown in save modal
- External quote support with `isExternal`, `pageUrl`, `pageTitle`
