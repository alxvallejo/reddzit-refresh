# Quote Feature Design

Save highlighted text from articles as quotes with personal notes and tags.

## Overview

Users can highlight text in any content (external articles, Reddit self-posts, comments) and save it as a Quote. Each quote captures the highlighted text, an optional note, optional tags, and metadata about the source. Quotes are accessible via a dedicated `/quotes` page.

**Requirements:**
- Logged-in users only
- Works on all text content in PostView
- Quotes stored in backend database, synced across devices

## Data Model

### Quote

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| userId | String | Reddit username (indexed) |
| postId | String | Reddit fullname (e.g., "t3_abc123") |
| text | String | The highlighted content |
| note | String? | User's commentary (optional) |
| tags | String[] | Optional array of tag strings |
| sourceUrl | String | Original article or Reddit permalink |
| subreddit | String | e.g., "programming" |
| postTitle | String | Title of the source post |
| author | String | Post author |
| createdAt | DateTime | When quote was saved |
| updatedAt | DateTime | Last modification |

## API Endpoints

All endpoints require authentication and scope quotes to the current user.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quotes` | List user's quotes (paginated, newest first) |
| POST | `/api/quotes` | Create a new quote |
| PUT | `/api/quotes/:id` | Update quote (note/tags only) |
| DELETE | `/api/quotes/:id` | Delete a quote |

## Frontend Components

### QuoteSelectionButton

Floating button that appears when user highlights text in PostView.

- Positioned near the text selection (above or below)
- Only visible to signed-in users
- Disappears when selection is cleared or user clicks elsewhere
- Opens QuoteModal when clicked

### QuoteModal

Modal form for creating or editing quotes.

**Fields:**
- Quoted text (read-only, scrollable if long)
- Source link (auto-filled, displayed as truncated URL with link)
- Note (textarea, optional)
- Tags (text input, comma-separated, optional)

**Actions:**
- Save - submits to API, closes on success
- Cancel - closes without saving

### QuotesPage

Route: `/quotes` (requires authentication)

- Header with "Your Quotes" and total count
- List of QuoteCard components in reverse chronological order
- Empty state: "No quotes yet. Highlight text in any article to save your first quote."

### QuoteCard

Individual quote display.

**Content:**
- Quoted text (truncated to ~200 chars, expandable)
- User's note (if present, styled differently)
- Tags as chips/badges
- Metadata: subreddit · post title (linked) · saved date

**Actions:**
- Edit (inline or modal, note/tags only)
- Delete (with confirmation prompt)

## User Flow

### Saving a Quote

1. User views content in PostView
2. User highlights text
3. "Save Quote" button appears near selection
4. User clicks button, QuoteModal opens
5. User optionally adds note and tags
6. User clicks Save
7. Quote saved to backend, modal closes
8. Toast confirmation shown

### Viewing Quotes

1. User clicks "Quotes" in user menu
2. QuotesPage loads with list of saved quotes
3. User can expand, edit, or delete quotes

## Files to Create/Modify

### Backend (read-api)

| File | Action |
|------|--------|
| `migrations/xxx-create-quotes.js` | Create |
| `models/Quote.js` | Create |
| `routes/quotes.js` | Create |

### Frontend (reddzit-refresh)

| File | Action |
|------|--------|
| `src/services/QuoteService.ts` | Create |
| `src/components/QuoteSelectionButton.tsx` | Create |
| `src/components/QuoteModal.tsx` | Create |
| `src/pages/QuotesPage.tsx` | Create |
| `src/components/QuoteCard.tsx` | Create |
| `src/components/PostView.tsx` | Modify - add selection listener |
| `src/App.tsx` | Modify - add /quotes route |
| `src/components/AppShell.tsx` | Modify - add Quotes nav link |

## Edge Cases

- Long selections (>1000 chars): Truncate display with "...", store full text
- Anonymous users: Hide selection button entirely
- Network errors: Show error toast, keep modal open for retry
