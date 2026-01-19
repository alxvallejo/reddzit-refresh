# For You - Subreddit Discovery

## Goal

Add subreddit discovery directly to the For You tab. Remove the separate Discover tab.

## Design

### For You Tab Layout

1. **"Suggested Subreddits" Section** (top of For You feed)
   - List of subreddit cards using same styling as For You post cards
   - Each card shows: subreddit name, brief description, member count
   - Clicking a card navigates to `/r/:subreddit`

2. **Main For You Feed** (below suggestions)
   - Continues as normal with personalized posts

### Subreddit Page (`/r/:subreddit`)

- New route showing posts from a single subreddit
- Same grid layout as For You feed (consistent UX)
- Posts fetched via RSS (free) or Reddit API
- **"Not Interested" button** at top to dismiss entire subreddit
- Clicking a post opens PostView (user can save → builds affinity)

### Suggestion Logic

Subreddits to suggest come from:
1. **Related to existing interests** - If user likes r/javascript, suggest r/typescript, r/node
2. **Popular curated list** - Maintained list of quality subreddits by category
3. **Exclude**: Already-followed subreddits, blocked subreddits (5+ Not Interested)

### Persona Training

- **Save a post** from suggested subreddit → adds affinity (existing logic)
- **"Not Interested" on subreddit** → records dismissal:
  - 3+ dismissals = deprioritize in suggestions
  - 5+ dismissals = block from suggestions and For You feed

## Changes Required

### Remove

- Discover tab from navigation (AppShell.tsx)
- `/discover` route (App.tsx)
- DiscoverFeed.tsx component (or repurpose)
- DiscoverService.ts (or repurpose relevant parts)

### Backend (read-api)

1. Create `/api/foryou/suggestions` endpoint
   - Returns 5-10 suggested subreddits with name, description, member count
   - Based on user's persona (related interests) + popular curated list
   - Excludes already-followed and blocked subreddits
2. Create `/api/subreddit/:name/posts` endpoint
   - Returns posts from a subreddit (via RSS)
3. Create `/api/foryou/subreddit-not-interested` endpoint
   - Records subreddit-level dismissal for persona training

### Frontend (reddzit-refresh)

1. Remove Discover tab from AppShell navigation
2. Remove `/discover` route
3. Add SuggestedSubreddits section to ForYouFeed (top of page)
4. Create SubredditFeed component for `/r/:subreddit` route
5. Add `/r/:subreddit` route to App.tsx
6. Add "Not Interested" button to SubredditFeed header

## API Usage

- **Suggestions endpoint**: Light query against persona data
- **Subreddit posts**: Fetch via RSS (free) when user clicks to expand
- **Reddit API**: Minimal, only for subreddit metadata if needed
