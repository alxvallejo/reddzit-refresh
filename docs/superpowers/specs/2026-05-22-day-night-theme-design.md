# Day/Night Theme Slots

## Goal

Replace the single-theme model with two slots — a day theme and a night theme — driven by the OS `prefers-color-scheme` setting. The user never picks "day vs night" explicitly; whichever mode the OS reports is the active slot, and any theme change the user makes writes into that slot only.

Defaults:
- Day → `light`
- Night → `classic` (Classic Purple, restored to its pre-`35a1e97` lighter shade)

## Motivation

Recent commit `35a1e97` darkened Classic Purple substantially (`#4a3f7a` → `#221f36`) and shipped a new `noir` theme as the dark-mode default. Users currently get a near-black purple as their default look regardless of time of day. Goal: respect OS preference so the light theme appears during the day and a vibrant purple appears at night, with the user's own picks remembered separately for each mode.

## Storage Model

Two localStorage keys, each holding a JSON-stringified `ThemeSlot`:

```ts
interface ThemeSlot {
  themeName: ThemeName;
  bgShade: string | null;
  accentShade: string | null;
}
```

- `reddzit_theme_day` — defaults to `{ themeName: 'light', bgShade: null, accentShade: null }`
- `reddzit_theme_night` — defaults to `{ themeName: 'classic', bgShade: null, accentShade: null }`

Reading: a missing or malformed key falls back to the default for that slot.

Writing: any user action that currently updates `themeName`, `bgShade`, or `accentShade` writes the full updated slot to the active key. Only the active slot is touched.

The legacy keys `reddzit_theme`, `reddzit_bg_shade`, `reddzit_accent_shade` are removed after the one-shot migration described below.

## Mode Resolution

Active mode is derived, not stored:

```ts
const mql = window.matchMedia('(prefers-color-scheme: dark)');
const mode: 'day' | 'night' = mql.matches ? 'night' : 'day';
```

The `ThemeProvider` subscribes to `mql.addEventListener('change', …)` so a macOS / iOS auto-schedule flipping at sunset swaps the active slot in real time without a reload. The subscription is cleaned up on unmount.

SSR / no-`window` environments: default to `mode: 'day'`. Matches the current SSR-safe fallback.

## Writes Go to the Active Slot

The `ThemeContext` retains its public surface: `setTheme(name)`, `setBgShade(hex|null)`, `setAccentShade(hex|null)`. Implementation:

- `setTheme(name)` — clears `bgShade`/`accentShade` in the active slot and sets `themeName = name`, then persists the active slot. (Mirrors current behavior: picking a base theme resets overrides.)
- `setBgShade(color)` / `setAccentShade(color)` — updates that field on the active slot and persists.

The "active theme" exposed via `useTheme()` is composed from the active slot every render:

```ts
const slot = mode === 'night' ? nightSlot : daySlot;
const theme = themes[slot.themeName];
const effectiveBg = slot.bgShade ?? theme.colors.bg;
// …same derivation as today
```

Saved palettes (`reddzit_palettes`, the named presets list) remain unchanged. A `SavedPalette` is `{ name, bg, accent, baseTheme }`; applying one calls `setTheme(baseTheme)` then `setBgShade(bg)` and `setAccentShade(accent)`, so the active slot ends up as `{ themeName: baseTheme, bgShade: bg, accentShade: accent }`.

Font (`reddzit_font`) and content-font (`reddzit_content_font`) selections remain global. They are not day/night-scoped — typography preferences don't feel mode-specific and splitting them would be noise.

The `toggleTheme()` function on the context (currently a no-arg light↔noir toggle, unused outside `ThemeContext.tsx`) is removed.

## Migration (One-Shot)

On `ThemeProvider` mount, if `localStorage.getItem('reddzit_theme')` is non-null:

1. Read the legacy state: `themeName = reddzit_theme`, `bgShade = reddzit_bg_shade`, `accentShade = reddzit_accent_shade`.
2. Validate `themeName` against the `themes` map; if invalid, skip migration entirely (treat as fresh user).
3. Compute the effective bg: `bgShade ?? themes[themeName].colors.bg`.
4. Compute `luminance(effectiveBg)` using the existing helper in `src/utils/deriveColors.ts`.
5. If `luminance ≥ 0.2` (same threshold `isLight` uses), write `{ themeName, bgShade, accentShade }` to `reddzit_theme_day` and leave `reddzit_theme_night` at default. Otherwise write to `reddzit_theme_night` and leave day at default.
6. Remove the three legacy keys.

This means a user who had `noir` or `dusk` keeps it as their night theme but gets `light` during the day. A user who had `light` keeps it for day and gets `classic` (restored) at night.

Migration runs once. After the legacy keys are gone, subsequent loads read the new slots directly.

## Classic Purple Color Revert

Restore `themes.classic.colors` to the pre-`35a1e97` values:

| Key | New (current) | Restore |
|---|---|---|
| `bg` | `#221f36` | `#4a3f7a` |
| `bgSecondary` | `#1a1828` | `#3d3466` |
| `text` | `#ece9f5` | `#f0eef5` |
| `textMuted` | `#a89dc4` | `#c4b8e8` |
| `border` | `rgba(182,170,241,0.18)` | `rgba(182,170,241,0.3)` |
| `cardBg` | `rgba(255,255,255,0.05)` | `rgba(255,255,255,0.08)` |
| `headerBg` | `rgba(26,24,40,0.85)` | `rgba(38,33,41,0.85)` |
| `bannerBg` | `#1a1828` | `#3d3466` |
| `bannerText` | `#ece9f5` | `#f0eef5` |
| `bannerButtonText` | `#1a1828` | `#262129` |
| `bannerInputBg` | `rgba(255,255,255,0.12)` | `rgba(255,255,255,0.15)` |
| `bannerInputText` | `#ece9f5` | `#f0eef5` |
| `bannerInputPlaceholder` | `#8d83a8` | `#a89cc4` |

`primary`, `primaryHover`, `accent`, `bannerButtonBg`, and `bannerErrorText` are unchanged by this revert — they weren't touched in `35a1e97`.

The `noir` theme stays as-is and remains selectable from the menu.

## UI Changes — `ThemeSwitcher`

Minimal. In the dropdown, the existing `THEME` section header gains a mode suffix:

- `THEME · DAY` when `mode === 'day'`
- `THEME · NIGHT` when `mode === 'night'`

No new toggles, no manual override UI. The OS drives the switch. This single label makes it discoverable that selections are mode-scoped.

The `Customize Colors`, `Saved Palettes`, and `Font` sections are unchanged.

## Edge Cases

- **No OS dark preference set**: media query reports `matches: false` → `mode = 'day'` → light theme. Same as today's "default to light if no `prefers-color-scheme: dark`" behavior.
- **User picks a light theme while in night mode**: respected. Their night slot becomes light. Unusual but valid.
- **Media query unsupported**: defaults to `mode: 'day'`.
- **localStorage disabled / write fails**: state lives in React only for the session; theme still works, just doesn't persist. (Matches current behavior — no try/catch hardening required beyond what exists.)
- **Multiple tabs**: not addressed. If a user changes their theme in one tab, other open tabs won't sync until reload. Same as today.

## Out of Scope

- A `mode` override toggle in the UI ("force night even if OS is light"). The OS-only signal was chosen explicitly.
- Time-based switching independent of OS.
- Day/night-scoped font selection.
- Day/night-scoped saved-palette presets.

## Files Touched

- `src/context/ThemeContext.tsx` — main rewrite of provider; remove `toggleTheme`; revert `themes.classic.colors`.
- `src/components/ThemeSwitcher.tsx` — append mode suffix to the `Theme` section header.
- `docs/superpowers/specs/2026-05-22-day-night-theme-design.md` — this document.
