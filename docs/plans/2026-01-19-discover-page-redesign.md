# For You - Subreddit Discovery

## Goal

Add subreddit discovery directly to the For You tab. Remove the separate Discover tab.

## Design

### For You Tab Layout

1. **Suggested Subreddits Section** (top of page)
   - Horizontal scrollable row of subreddit chips
   - Each chip: subreddit name + "Not Interested" (X) button
   - Clicking a chip expands to show top 10 posts from that subreddit

2. **Expanded Subreddit View**
   - When user clicks a subreddit chip, show inline preview:
     - Subreddit name, description, member count
     - List of 10 post titles (clickable → opens PostView)
     - "Not Interested" button to dismiss entire subreddit
     - "Collapse" button to close preview
   - User can save posts they like → builds positive affinity
   - User can dismiss subreddit → builds negative signal

3. **Main For You Feed** (below suggestions)
   - Continues as normal with personalized posts

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
   - Returns 5-10 suggested subreddits based on user's persona
   - Excludes already-followed and blocked subreddits
2. Create `/api/foryou/subreddit/:name/posts` endpoint
   - Returns top 10 posts from a subreddit (via RSS or Reddit API)
3. Extend existing Not Interested logic to work at subreddit level

### Frontend (reddzit-refresh)

1. Remove Discover tab from AppShell navigation
2. Remove `/discover` route
3. Add SuggestedSubreddits component to ForYouFeed
4. Add SubredditPreview component (expanded view with 10 posts)
5. Wire up Not Interested for subreddit dismissal

## API Usage

- **Suggestions endpoint**: Light query against persona data
- **Subreddit posts**: Fetch via RSS (free) when user clicks to expand
- **Reddit API**: Minimal, only for subreddit metadata if needed
