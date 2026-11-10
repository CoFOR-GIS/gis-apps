# CoFOR GIS Design System — reference files

One visual language for the City of Fair Oaks Ranch GIS maps (`CoFOR-GIS/gis-maps`, public, GitHub Pages) and internal ArcGIS Online editors (`CoFOR-GIS/gis-apps`). It uses the seal's navy and sage on a warm cream page, Playfair Display for titles and figures, and DM Sans for everything you read and click.

## 1. Purpose

These files are the reference for every new or edited page in this repository. Decision D-050 (2026-11-10) adopted the design system for gis-maps and gis-apps.

The files are copied into an app; nothing links to them at run time. Each app stays a single self-contained HTML file.

This repository is public and served by GitHub Pages. Internal apps sign in to ArcGIS Online and use the default title bar or their department profile (section 4.4). Section 4.2 is the rule for public gis-maps; it is kept here so both repositories carry the same rules.

## 2. Location

| File | What it is |
|---|---|
| `_design/README.md` | This brand book: rules, the public-map title bar (section 4.2), how to build with it |
| `_design/tokens.json` | The tokens: 53 colours in two themes (Cream, Navy), 12 type styles, spacing, radius, shadow, layout. Each token has a usage note. |
| `_design/tokens.css` | The same tokens as CSS custom properties, generated from `tokens.json`. Type styles are `.cfr-t-<name>` classes. |
| `_design/components.css` | The 13 components as `cfr-` classes. Every value is a token variable. It starts with the Google Fonts import. |
| `_design/logo.svg` | The official city seal (D-007). Same bytes as `gis-apps/*/logo.svg`; the gis-maps copies in CIP, LUA and MapExport differ only by a trailing newline. |

GitHub Pages does not publish folders whose names start with `_` (this repository has no `.nojekyll`). These files are for reading and copying, not for linking from a live page.

## 3. Data sources

- **Built from:** the private review copy of the design system (claude.ai artifact, version 1794335045-9fa6), recorded in work order WO-0020.
- **Extracted from:** a read-only pass over this code on 2026-11-10, at gis-maps e3e034c and gis-apps b24f085.
- **Main sources:**
  - `gis-maps/AcreageByCounty`: the fullest token set;
  - `gis-maps/CIP`: the city palette;
  - `gis-apps/FieldExtractor`: form controls and status colours;
  - `gis-maps/LUA`: the navy theme;
  - `gis-apps/EOCEditor`: the severity scale;
  - `gis-maps/AnnexationHistory` and `MapExport`: the forest-green bar and gold.
- **Decisions:**
  - D-007: the SVG seal is the source; there is no base64 logo;
  - D-011, as read by D-050 Q2: public maps match fairoaksranch.gov through the seal colours, the official seal, a serif display face and the CivicPlus embed standard, not through the CivicPlus fonts or page ground;
  - D-050 Q5: Administration `#1b3a2d` and Emergency `#1c2a40` confirmed;
  - D-050 Q6: other fonts are retired only when an app is next touched;
  - Governance Amendment 01: Engineering "Graphite Steel".
- **Excluded:** no data, exports, credentials or personal information.

## 4. Procedure

### 4.1 Principles

- **The map is the content.** Chrome is quiet: a cream ground, hairlines (`line`) and almost no shadow. Spend colour on the data and the seal.
- **The seal sets the palette.** `brand-navy` `#192737` and `brand-sage` `#8d956c` are the seal's own inks. Navy carries identity and the primary action; sage carries rules, focus and progress.
- **Figures in Playfair, words in DM Sans.** Any number a resident came for is set in the display face, with its unit in DM Sans, muted.
- **Say where numbers come from.** Every rail or panel has an intro line that names the source layer and how fresh it is.
- **Never colour alone.** Status bars lead with an icon, severity levels are written out, and neighbouring categories differ in lightness.

### 4.2 Public gis-maps title bar (D-050 Q2)

Every public map in `gis-maps` that has a title bar uses this one:

- **Ground and accent:** a forest-green `dept-admin` `#1b3a2d` bar with a 2px `brand-gold` `#c8a94e` rule along its bottom edge, as on CIP and Annexation History. Title text is `brand-cream` (11.5:1) and the subtitle is `brand-tan` (7.5:1). In `components.css` this is `.cfr-masthead.cfr-masthead--admin`.
- **Type:** the title in Playfair Display 700 and everything else in DM Sans. Don't use the CivicPlus site fonts.
- **Seal:** the official seal (D-007), from the app's local `logo.svg`, which is also the favicon (`<link rel="icon" href="logo.svg">`). It is 30px tall in the bar and is never base64, recoloured or redrawn.
- **Embedding:** follow the CivicPlus embed standard in the repository README (one Custom HTML widget holding only the iframe, `width="100%"`, height 800, the `cofor-gis.github.io` address pasted directly). Inside the app: a slim title bar, the map and a side panel that scrolls on its own. A documented exception, like LUA's embedded layout, overrides the bar where its README says so.
- **Title length (the ~298 px phone frame):** the title must stay on one line in a 298 px wide frame, without truncation or an ellipsis.
  - At 480 px and below, set the title at 18px and the seal at 30px, with 12px padding and a 10px gap. That leaves **234 px** for the title.
  - Measured in Playfair Display 700 at 18px: "Land Use Assumptions" 188 px and "Emergency Information" 198 px fit; "Capital Improvement Projects" is 248 px and does not.
  - In practice, keep phone titles to about **22 characters**, and measure any title over 18. When the full name is longer, use a short title in the bar and put the full name in the iframe `title` and the page heading.
  - The subtitle ("City of Fair Oaks Ranch · {Department}", `cfr-eyebrow` style: uppercase and letter-spaced) may wrap to two lines on phones; the title may not. Rendered at 298 px, "City of Fair Oaks Ranch · Public Works" wraps to two lines and "Land Use Assumptions" stays on one line at 231 px.
  - Title-bar buttons and filters move to their own row below the title at 480 px and below, so they never take width from the title.

### 4.3 Voice and content

- Plain, civic and exact. Use sentence case for headings and buttons ("Export map"). Use UPPERCASE only in eyebrows, KPI labels and menu group headings, letter-spaced.
- Name the city in full in public titles and subtitles. "CoFOR" is for internal tools and file names.
- Write units as words in the UI (`acres`, `parcels`). Use thousands separators, and the same decimals within a list.
- Errors say what happened and the fix. Never use "Oops".
- Public pages never show internal server addresses, internal-only field names or staff notes.

### 4.4 Colour

There are two themes, set on `<html>`: `data-theme="cream"` (light, the default for public maps and form-style tools) and `data-theme="navy"` (dark, for dashboards and wall displays). Write CSS against the semantic tokens and the theme follows.

| Role | Tokens | Rule |
|---|---|---|
| Ground | `bg-page`, `bg-card`, `bg-sunken`, `bg-inverse` | The page is cream and cards are white. Wells (`bg-sunken`) hold ink text only: muted text is 4.4:1 there. |
| Text | `text-heading`, `text-ink`, `text-muted`, `text-accent`, `text-inverse` | Headings and figures in navy. Sage text is always `text-accent` `#68734d` (4.7:1), never `brand-sage` (2.9:1). |
| Lines | `line`, `line-strong` | 1px. Use `line-strong` only for control borders. |
| Action | `action-primary`, `-hover`, `-text`, `focus-ring` | One primary per view. Focus is a 2px `focus-ring` outline with a 2px offset. |
| Status | `status-success`, `-info`, `-warning`, `-error`, plus `-wash` | Text, border and wash of one hue. **Flagged:** warning text is 3.6:1 in Cream (use it bold with an icon); info is 4.2:1 on `bg-page` (set it on `bg-card`, 4.6:1). |
| City palette | `brand-amber`, `brand-gold`, `brand-tan`, `brand-sky`, `brand-olive-deep`, `brand-brick`, `brand-cream` | For fills, strokes and the title bar, not body text. |

**Department profiles:**

| Department | Ground | Accent |
|---|---|---|
| Administration, and every public gis-maps title bar | `dept-admin` `#1b3a2d` | `brand-gold` |
| Engineering Services, "Graphite Steel" (Amendment 01) | `dept-engineering` `#23282c` | `dept-engineering-steel` `#6b757c` |
| Emergency Management | `dept-emergency` `#1c2a40` on `#101b2d` | `sev-0` … `sev-4` |
| GIS and all others (internal apps) | `bg-card` | `brand-sage` rule |

**Data palettes:**
- `county-*`: Bexar, Kendall, Comal, other;
- `cip-*`: water, wastewater, roadway, drainage, building;
- `sev-*`: EOC severity, always with the level written out.

Each palette is an alias of a brand colour, so one change carries through. In the Navy theme, `county-bexar` and `cip-wastewater` turn cream so they stay visible; map symbology itself stays seal navy.

### 4.5 Type

| Family | Token | Use |
|---|---|---|
| Playfair Display 600/700 | `--font-display` | Titles, panel headings, headline figures |
| DM Sans 400–700 | `--font-sans` | All UI text |
| JetBrains Mono 400/500 | `--font-mono` | Item IDs, field names, tags, status messages in tools |

Google Fonts, one request (the first line of `components.css`):
`https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap`

Scale, in px: `display-xl` 40 · `display-lg` 30 · `display-md` 28 · `heading` 19 · `title-sm` 15 · `body` 13.5 · `label` 13 · `small` 12.5 · `caption` 11.5 · `eyebrow` 11 (uppercase, +0.16em) · `code` 11 and `data` 12 in mono.

Retired when each app is next touched or on request, with no sweep of every app (D-050 Q6): Bricolage Grotesque + Manrope, Public Sans + Barlow Condensed, and Open Sans.

### 4.6 Space, shape and depth

- **Spacing:** `space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-5` 24 (rail and panel padding) · `space-6` 28 (page gutter) · `space-7` 40.
- **Radius:** `radius-xs` 3 · `radius-sm` 6 · `radius-md` 8 · `radius-lg` 10 · `radius-pill`.
- **Shadow:** `shadow-sm` for panels, `shadow-control` for widgets floating on the map, `shadow-overlay` for menus and banners.
- **Layout:** map-left with a rail on the right (`rail-width` 396) for public maps; a panel on the left (`panel-width` 380) for editors. Below `breakpoint-stack` (880px) the rail stacks under the map.
- **Motion:** 150–250ms for controls, 900ms `cubic-bezier(.22,.61,.36,1)` for data bands. Honour `prefers-reduced-motion`.

### 4.7 The seal and icons

- The only mark is the city seal (`logo.svg`; D-007). Use it full colour, 30–42px tall, with alt text "City of Fair Oaks Ranch seal". Never base64-encode it, recolour it, crop it or redraw it.
- There is no icon library. Use a few text glyphs (⤓ ✓ ✕ ! i) in the label colour.

### 4.8 Components (`components.css`)

| Class | Use |
|---|---|
| `cfr-masthead` (`--admin`) | Title bar: seal, eyebrow, title, office. `--admin` is the public-map bar (section 4.2). |
| `cfr-btn` (`--primary`, `--secondary`, `--outline`, `--danger`, `--small`) | Actions. One primary per view. |
| `cfr-segmented` | Two to four exclusive views; `<button aria-pressed>` |
| `cfr-stats` / `cfr-stat` | KPI band under the title bar |
| `cfr-panel` | Card with a Playfair heading and an intro line |
| `cfr-field` | Labelled input with a hint or an error (`aria-invalid`) |
| `cfr-toggle` | Restyled checkbox for layer visibility |
| `cfr-status` (`--info`, `--success`, `--warning`, `--error`) | Inline message with a leading icon |
| `cfr-tag` | Small mono label |
| `cfr-legend`, `cfr-band` | Category keys and share bands |
| `cfr-popcard` | ArcGIS popup content; set `--popcard-accent` |
| `cfr-menu` | Dropdown of grouped actions |
| `cfr-state`, `cfr-spinner`, `cfr-banner`, `cfr-footer` | Loading and empty states, map notices, footer |

Wrap the app in `class="cfr"` for the base font, colour and focus ring.

### 4.9 Building with it

1. Copy `tokens.css` and `components.css` into the app's `<style>`, keeping the Google Fonts `@import` first.
2. Set `data-theme` on `<html>`.
3. Use the token variables and `cfr-` classes; don't type hex values.
4. Theme ArcGIS widgets through Calcite variables mapped to the tokens:

```css
:root {
  --calcite-color-foreground-1: var(--bg-page);
  --calcite-color-text-1: var(--text-ink);
  --calcite-color-text-2: var(--text-muted);
  --calcite-color-border-1: var(--line);
  --calcite-color-brand: var(--brand-sage);
  --calcite-color-brand-hover: var(--brand-sage-hover);
}
```

`tokens.css` is generated from `tokens.json`. Change `tokens.json`, regenerate `tokens.css` and commit both in the same pull request.

## 5. Verification

- **Contrast:** WCAG 2.1 contrast for every text pair named in section 4.4, both themes. The flagged pairs are listed there.
- **Rendering:** every component and the title bar were rendered in both themes.
- **Title widths:** the phone-title figures in section 4.2 were measured in Chromium with Playfair Display 700 and DM Sans 500 loaded from Google Fonts.
- **Each pull request** that uses these files previews the page at desktop width, 390 px, a 990×800 frame and a ~298 px frame, with live data, before it is merged.
- **`logo.svg`** SHA-256 `09c3462e0fb3c7e38ee1ea275b101614a80c658860c69998139ce30a36119006`, the source file of the review copy's seal.

## 6. Rollback

These files are reference only, and no live page loads them. Revert the pull request that added or changed them. An app that copied CSS from them is rolled back by reverting that app's own pull request.

## 7. Change log

- 2026-11-10 Created from the design-system review copy (version 1794335045-9fa6), with the D-050 Q2 public-map title-bar rule. Work order WO-0020, Ref DESIGN-SYSTEM-PROP-20261110, under GITHUB-PROP-STD-20261110. `tokens.json` differs from the review copy in one value: the `code` style's sample text is now `OBJECTID`, because the review copy used an internal field name.
