# Metes &amp; Bounds Viewer — Engineering Services

Internal ArcGIS JS viewer for the City of Fair Oaks Ranch COGO survey lines. Staff can browse recorded surveys grouped by name, zoom to a survey, and read its courses labeled as quadrant bearings and distances the same way they appear in ArcGIS Pro.

Single HTML file. No build step. IIS or GitHub Pages compatible.

---

## Overview

- Groups every survey line by the `Name` field into a searchable list with a per-survey segment count.
- Selecting a survey (from the list or by clicking a line) zooms to the combined extent of its courses, highlights them, and labels each segment.
- Labels are two lines, matching ArcGIS Pro: line 1 is the quadrant bearing `N/S DD-MM-SS E/W`, line 2 is the distance in feet (curves fall back to arc length, marked `(arc)`).
- Bearings are computed from the `Direction` field, not from geometry, so they match the recorded survey.
- Dashed survey symbol with a white casing so lines stand out on aerial imagery and on light or topographic basemaps.
- Parcels reference layer with an auto-built popup (address, subdivision, unit when present).

---

## Layer dependencies

| Layer | Source | Access |
| --- | --- | --- |
| Survey COGO lines | `CoFORENG_Survey_COGOLine_view` FeatureServer/0 (`services6.arcgis.com/Cnwpb7mZuifVHE6A`) | Internal — requires sign-in |
| Parcels | Item `bd5079b30310433998c6a54652074dd6` (public view, L0) | Public view |

WKID 102740 / 2278 — NAD83 State Plane Texas South Central, US Survey Feet.

---

## Bearing labels

The survey direction type is **quadrant bearing**. The viewer decodes the Esri packed format `Q DD.MMSS`, where the leading digit is the quadrant:

| Code | Quadrant |
| --- | --- |
| 1 | NE |
| 2 | SE |
| 3 | SW |
| 4 | NW |

Example: `145.3015` decodes to `N45-30-15E`.

A **Bearing source** selector in the panel can switch the interpretation (quadrant, north azimuth, south azimuth, polar) in case any course was stored as decimal degrees. Default is quadrant. To verify, open a survey whose plat is known and confirm the first label matches the recorded course.

---

## Tech stack

- ArcGIS JS SDK 4.31 (CDN)
- Single file, static, no backend, no localStorage
- Redirect-based OAuth (no popups), SDK-managed tokens
- Engineering Services "Graphite Steel" theme (Governance Amendment 01)
- Operations type pairing: Bricolage Grotesque + Manrope

---

## Deployment

Folder-per-app. Drop these three files together:

```
MetesBounds/
├── index.html
├── logo.svg        # CoFOR logo, viewBox 0 0 954.59 861.88 — also the favicon
└── README.md
```

Target one of:

- **Intranet (recommended, matches Drainage / Floodplain / Traffic):** `gis.local/MetesBounds/`
- **GitHub Pages:** `cofor-gis/gis-apps` repo, folder `MetesBounds/` -> `https://cofor-gis.github.io/gis-apps/MetesBounds/`

**OAuth redirect URI:** whichever URL you deploy to must be registered as a redirect URI on OAuth app `DhZk7VoirUPP4Sa2` in AGOL, or sign-in will fail.

The favicon and header logo both reference `logo.svg` in the same folder. If it is absent the header falls back to an `ES` monogram and the page still works.

---

## Configuration

All settings live in the `APP_CONFIG` object at the top of the script in `index.html`:

- `oauthAppId` — registered OAuth app id
- `surveyUrl` — COGO view FeatureServer/0
- `parcelsItemId` — parcels portal item
- `center` / `zoom` — initial extent
- `theme` — Graphite Steel tokens

---

## Parcel fields

The parcel popup is built at run time from whatever fields exist on the layer, matching common patterns for address, subdivision and unit. If the parcel layer uses non-obvious field names, set them explicitly in `configureParcelPopup()`.

---

## Maintenance notes

- The survey layer is read-only (Query capability only). The viewer never edits it.
- Switching the bearing source rebuilds the label class and the popup expression together.
- Highlight and selection use the layer view, so the map must finish loading before selection works (handled by the load gate).
