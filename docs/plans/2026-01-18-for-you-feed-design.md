# For You Feed - Design Document

*Created: 2026-01-18*

## Overview

A personalized curation feed that builds a user persona from saved posts, surfaces content from subscriptions and AI-recommended subreddits, and lets users curate posts before generating reports.

**Key principle:** You curate first, then generate a report from your intentional selections.

---

## Core Workflow

1. User clicks "Refresh persona" to analyze their last 20-50 saved posts
2. AI builds a taste profile from keywords, topics, subreddits
3. Feed populates with posts from:
   - User's subscribed subreddits (via their OAuth)
   - 2-3 AI-recommended subreddits (expandable on request)
4. User triages posts: **Save**, **Already Read**, or **Not Interesting**
5. Saved posts accumulate toward a **hard cap of 20**
6. Once at 20, user must generate a report before saving more

---

## Tab & UI

**Location:** New "For You" tab alongside existing tabs (Top, Discover, Reddit/Saved)

**Layout:** Grid layout (consistent with Discover/Saved)

**Post cards show:**
- Thumbnail, title, subreddit, score, comment count
- No visible distinction between subscription vs AI-recommended posts

**Triage actions (visible on hover/tap):**
- **Save** - Adds to curated collection, saves to Reddit via OAuth
- **Already Read** - Hides from feed, tracked (neutral signal)
- **Not Interesting** - Hides + filters similar from current feed, tracked (negative signal)

**Progress indicator:**
- Persistent display: "8/20 posts curated"
- At 20/20: "Ready to generate report" with CTA button

**Empty/blocked states:**
- No persona yet: "Refresh your persona to get started"
- At cap: "You've curated 20 posts! Generate your report to continue."

---

## Persona System

**Analysis source:** Last 20-50 saved posts

**Extracts:**
- Keywords and topics
- Subreddit affinities
- Content type preferences (articles, discussions, images)

**Refresh:** On-demand via "Refresh Persona" button

**Negative signals:** "Not Interesting" actions feed back to refine persona over time

**Filtering behavior:**
- "Not Interested" immediately filters similar posts from current feed
- Full persona rebuild stays on-demand

**Persona visibility:** Users can view their persona (interests, keywords, preferences)

---

## Settings Page: For You Settings

**Persona view:**
- Interest summary (keywords, topics, content preferences)
- Last refreshed timestamp
- "Refresh Persona" button

**Subreddit breakdown:**
- Shows top subreddits derived from saved posts analysis
- Star/unstar to boost priority in feed
- Example:
  ```
  Your Top Subreddits
  ★ r/programming (weighted higher)
  ★ r/startups (weighted higher)
  ○ r/philosophy
  ○ r/indiegaming
  ```

**AI-recommended subreddits:**
- Shows current 2-3 recommendations
- "Show more suggestions" to expand
- Option to dismiss/block specific recommendations

---

## Data & Sync

**Reddit sync (two-way):**
- Reddzit reads user's Reddit saved list via OAuth
- Saving in Reddzit also saves to Reddit via OAuth

**Source tracking:** `savedVia: 'reddzit' | 'reddit'`

**Saved posts cap:**
- Hard limit of 20 saved posts before generating report
- Count includes posts saved via both Reddzit and Reddit
- UI shows progress: "12/20 posts curated"

---

## Database Schema

### `curated_posts`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | FK → users | Who curated it |
| reddit_post_id | string | Reddit's post ID (e.g., `t3_abc123`) |
| subreddit | string | Which subreddit |
| title | string | Post title |
| url | string | Post URL |
| action | enum | `saved`, `already_read`, `not_interested` |
| saved_via | enum | `reddzit`, `reddit` |
| created_at | timestamp | When curated |
| report_id | FK → reports (nullable) | Which report included this (null = still in queue) |

**Cap logic:**
- Posts with `action = 'saved'` and `report_id = null` count toward the 20 cap
- After report generation, posts get `report_id` set → no longer count toward cap
- `already_read` and `not_interested` don't count toward cap

### `user_personas`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | FK → users | User this persona belongs to |
| keywords | jsonb | Extracted keywords/topics |
| subreddit_affinities | jsonb | Subreddit weights |
| starred_subreddits | jsonb | User-boosted subreddits |
| negative_signals | jsonb | Patterns from "Not Interested" |
| last_refreshed_at | timestamp | When persona was last rebuilt |

---

## Report Generation

**Trigger:** User hits 20/20 saved posts, clicks "Generate Report"

**Options:**
- Model picker: GPT-4o-mini, GPT-4o, GPT-5.2
- Optional: Web search toggle for enrichment

**After generation:**
- Report saved to database (linked to user)
- Curated posts get `report_id` set → cap resets to 0/20
- Previous posts archived (not deleted)
- User can start curating fresh

**Report history:**
- View past reports in "My Reports" section
- Each report shows: date, post count, topics covered

---

## Future Enhancements

- **Flexible cap / search curation:** Revisit the 20-post hard cap. Allow users to search through all saved posts and curate separate 20-max-post reports from their full history.
- **BYOK (Bring Your Own Key):** Users supply their own OpenAI API key for report generation.
- **Newsletter distribution:** Export reports to HTML/Markdown, integrate with email services.
- **Post-level related content:** For a specific post, use OpenAI to find related web content.

---

## Related Documents

- [Discover Feature Ideas](./2026-01-18-discover-feature-ideas.md) - Other feature ideas including Newsletter Generator, Persona-Based Discovery, etc.
