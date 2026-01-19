# Discover Page Redesign

## Goal

Redesign the Discover page to help users find new subreddits and build their For You persona through organic saves.

## Architecture

### Smart Detection

- **New users** (< 3 subreddit affinities): Show header "Explore communities and save posts you like to build your personalized feed"
- **Established users** (≥ 3 affinities): Show header "Find new communities"

### Subreddit Row Layout

Each row displays:
- Subreddit name (bold)
- Description (muted, one line, truncated)
- Member count badge
- 5 clickable post titles from daily RSS fetch

Tapping a post title opens it in PostView. User can save posts they find interesting, which naturally builds their For You persona through existing weighting logic.

### Row Ordering (Smart)

1. **Recommended** - Related to user's existing interests (if any)
2. **Popular** - High subscriber count subreddits
3. **Remaining** - Other curated subreddits

### No Explicit "Add" Button

The persona builds organically through saves. This keeps the system simpler and lets users judge by actual content rather than committing to an entire subreddit blindly.

## Backend

### Daily RSS Job

For each curated subreddit (~50-100):
1. Fetch `reddit.com/r/{subreddit}/hot.rss`
2. Extract top 5 post titles + Reddit post IDs
3. Store in `SubredditBriefing` table

### Database: `SubredditBriefing`

| Field | Type | Description |
|-------|------|-------------|
| id | string | Primary key |
| subredditName | string | e.g., "programming" |
| description | string | Subreddit description |
| subscriberCount | number | Member count |
| iconUrl | string | Subreddit icon (nullable) |
| featuredPosts | JSON | Array of {redditPostId, title} |
| generatedAt | datetime | When briefing was created |

### Subreddit Metadata

Reddit API used sparingly for:
- Subreddit description
- Subscriber count
- Icon URL

Cached weekly to minimize API usage.

### API Endpoint

`GET /api/discover/briefings`

Returns all subreddit briefings for the current day. Optionally accepts user ID to return smart-ordered results based on existing persona.

## Frontend Changes

### DiscoverFeed.tsx

1. Change heading from "Reddit Briefing" to "Discover"
2. Replace current briefing view with subreddit rows
3. Each row: subreddit info + 5 post titles
4. Post titles link to PostView
5. Smart ordering based on user's persona state

### Visual Design

- Card-style rows matching current theme
- Subreddit name in bold, description muted
- Post titles as a simple list within each row
- Responsive: works on mobile and desktop

## Implementation Tasks

### Backend (read-api)

1. Create `SubredditBriefing` Prisma model
2. Create daily RSS fetch job
3. Seed curated subreddit list
4. Create `/api/discover/briefings` endpoint
5. Add smart ordering logic based on user affinities

### Frontend (reddzit-refresh)

1. Update DiscoverFeed heading to "Discover"
2. Create SubredditRow component
3. Fetch briefings from new endpoint
4. Implement smart ordering display
5. Wire post title clicks to PostView

## API Usage

- **RSS**: Unlimited, free (daily fetch per subreddit)
- **Reddit API**: Minimal (weekly metadata refresh only)
