# Post View Improvements

**Status:** approved, ready for implementation plan
**File:** `src/components/PostView.tsx`

## Problem

The post view (`/p/:fullname/...`) has three rough edges that pull it out of the rest of the app:

1. **Header is "outside the theme" for logged-out users.** PostView renders a custom `<header>` block whose light-mode background is hardcoded as `bg-[#b6aaf1]/95` (a lavender that doesn't match any theme). It also reimplements the logo, back link, and `ReadControls` instead of using `MainHeader`. There is no theme switcher for logged-out users on this page.
2. **No sign-in promo.** Logged-out users on the home page see a dismissible "Connect with Reddit" promo at the bottom (`StickyPromoFooter`). It is missing on the post view, so logged-out readers get no consistent prompt to connect.
3. **Top comments are dumped at the bottom on desktop.** Even on a wide screen with plenty of right-side real estate, the comments stack below the article. Readers have to scroll past the article to find them.

## Goals

- The header, theme switching, and read controls behave identically for logged-in and logged-out users.
- A dismissible Reddit sign-in promo appears at the bottom for logged-out users, mirroring the home page.
- On desktop (≥768px), top comments appear in a sticky right-hand column so a reader can see them while reading the article. On mobile they stay inline below the article.

## Non-goals

- No auto-rotating carousel or cross-fade transitions on the sidebar. The home carousel uses motion because the carousel *is* the page; on a reading page, sidebar motion is distracting. Comments are presented as a sticky scrollable list.
- No changes to how top comments are fetched. `DailyService.getTopCommentsForPost` continues to lazy-load when `topComments` isn't seeded from navigation state.
- No changes to the action pill's buttons or behaviors. Only its vertical position adjusts when the promo is visible.
- No email subscribe banner on this page (the dismissible Reddit sign-in promo is the only bottom bar added).

## Design

### 1. Header — use `MainHeader` for all users

Delete the custom `<header>` block in `PostView.tsx` (currently around lines 291–318) and the `headerBg` constant. Render `<MainHeader />` unconditionally:

```tsx
<MainHeader />
```

`MainHeader` already handles logged-out users correctly: it renders a "Log in" button where the user menu would go, includes `<ThemeSwitcher />`, and uses `var(--theme-headerBg)` for its background.

`ReadControls` currently lives inside the custom header for logged-out users and inline above the article for signed-in users. Move it to a single inline location above the article (the same position signed-in users already see it in) and render it for everyone — drop the `{signedIn && ...}` gate on that block.

The `isScrolled` state and the `handleScroll` effect that drives the custom header's title-fade behavior become dead code once the custom header is gone. Remove both.

### 2. Two-column layout at md+ with sticky comments

Currently the main container is `<main className="max-w-3xl mx-auto px-4 py-8 pb-32">` containing the article and (at the bottom) the top-comments section.

Restructure to:

```tsx
<main className="max-w-screen-xl mx-auto px-4 py-8 pb-32">
  <div className="md:flex md:gap-8 md:items-start">
    <div className="md:flex-1 md:min-w-0 md:max-w-3xl">
      {/* back link, subreddit tag, title, preview image, ReadControls, article */}
    </div>
    {displayableComments.length > 0 && (
      <aside className="mt-12 md:mt-0 md:w-80 md:flex-shrink-0 md:sticky md:top-24 md:max-h-[calc(100vh-7rem)] md:overflow-y-auto border-t md:border-t-0 border-[var(--theme-border)] pt-8 md:pt-0">
        <h2 className="text-xs uppercase tracking-wider text-[var(--theme-textMuted)] opacity-70 mb-6">
          Top comments
        </h2>
        <ul className="flex flex-col gap-10 list-none p-0 m-0">
          {displayableComments.map(c => (
            <li key={c.id}><CommentQuote comment={c} /></li>
          ))}
        </ul>
      </aside>
    )}
  </div>
</main>
```

Properties of this layout:

- **Single render of the comments section.** Position is purely CSS — `md:sticky md:top-24` for the sidebar, falling back to a stacked block on mobile via `mt-12 border-t pt-8`.
- **Article width preserved.** `max-w-3xl` on the article column keeps reading line-length the same as today. On extra-wide screens the article doesn't stretch.
- **Container widens to `max-w-screen-xl`** so the sidebar has room without forcing a narrower article.
- **`md:top-24` clears the sticky `MainHeader`** (`top-9` + header height ≈ 5.5rem; 6rem gives a small visual gap).
- **`max-h` + `overflow-y-auto`** lets long comment lists scroll inside the column without leaving the viewport.
- **Sidebar is conditional on having comments.** When `displayableComments.length === 0` the sidebar isn't rendered; the article column remains `max-w-3xl` and naturally centers within the wider container.

### 3. Sign-in promo at bottom + action pill lift

Render `<StickyPromoFooter />` at the bottom of `PostView`:

```tsx
<StickyPromoFooter />
```

`StickyPromoFooter` self-hides for signed-in users and when dismissed (`rdz_homepage_promo_dismissed_v1` in localStorage), so no extra gating is needed.

The existing action pill (`PostView.tsx:393`) is `fixed bottom-0` and would otherwise be obscured by the promo. Add a small shared hook `usePromoDismissed` (new file: `src/helpers/usePromoDismissed.ts`) that reads `rdz_homepage_promo_dismissed_v1` from localStorage and subscribes to a `'rdz-promo-dismissed'` custom event on `window`. `StickyPromoFooter` gets one line added inside `handleDismiss` to dispatch that event so same-tab dismissals are observed by other consumers immediately (cross-tab is also free via the native `'storage'` event, which the hook should listen to as well).

PostView computes `promoVisible = !signedIn && !promoDismissed`. When true, apply `mb-20` (5rem ≈ promo height) to the action pill's outer wrapper so it sits above the promo. When the user dismisses, the pill drops to its default position without a reload.

The hook is shared (not local to PostView) because `HomePage` could later use it for similar layout concerns; keeping the contract in one place avoids drift.

## Behavior matrix

| State                       | Header                | Read controls       | Article + comments       | Bottom action pill                       | Promo footer       |
|-----------------------------|-----------------------|---------------------|--------------------------|------------------------------------------|--------------------|
| Logged-out, promo visible   | `MainHeader` (Log in) | Above article, shown| md+: two-col, sticky right| Login to Save · Share · ↗ — **lifted**  | Visible            |
| Logged-out, promo dismissed | `MainHeader` (Log in) | Above article, shown| md+: two-col, sticky right| Login to Save · Share · ↗               | Hidden             |
| Logged-in                   | `MainHeader` (user)   | Above article, shown| md+: two-col, sticky right| Save · Story · Quote · Image · Share · ↗| Hidden (self-hides)|

Mobile (<768px) in all states: comments stack inline below article; sidebar styles do not apply.

## Files touched

- `src/components/PostView.tsx` — primary edits. Remove custom header block + `headerBg` + `isScrolled` state and effect; render `MainHeader` and `StickyPromoFooter`; restructure `<main>` into two-column flex; relocate `ReadControls`; add `promoVisible`-driven margin to action pill.
- `src/components/StickyPromoFooter.tsx` — one-line addition inside `handleDismiss` to `window.dispatchEvent(new CustomEvent('rdz-promo-dismissed'))`.
- `src/helpers/usePromoDismissed.ts` — **new file.** Small hook reading the localStorage flag and listening to `'rdz-promo-dismissed'` (same-tab) and `'storage'` (cross-tab) events.

No new visual components are needed. `MainHeader`, `StickyPromoFooter`, `ThemeSwitcher`, `ReadControls`, `CommentQuote`, and the existing `topComments` fetch logic are all reused.

## Open considerations

- The "Login to Save" button in the action pill and the "Connect with Reddit" button in the promo are both visible to logged-out users with the promo undismissed. Acceptable — the pill is the action for *this* post, the promo is a passive upsell. Revisit only if the duplication feels noisy in practice.

## Verification plan

- Logged-out viewport ≥1024px: header is themed (no lavender), theme switcher present, comments appear in a sticky right column that doesn't scroll off-screen, promo visible at bottom, action pill sits above the promo.
- Logged-out viewport <768px: comments stack below the article, promo at bottom, action pill above the promo.
- Logged-in viewport ≥1024px: same layout but no promo, action pill at default bottom, all signed-in pill buttons present.
- Theme switch (light ↔ dark ↔ etc.) updates the header background live.
- Dismiss the promo → action pill drops to its default bottom position without a reload.
