# CoFOR EOC Incident Editor

Internal web app for City of Fair Oaks Ranch Emergency Operations staff to
create, update, and resolve emergency incidents, affected areas, and road
closures. Edits publish to the public [Emergency Notification landing
page](https://cofor-gis.github.io/Emergency/) within about 60 seconds.

> **Internal use only.** The app is gated by ArcGIS Online sign-in and
> membership in the **CoFOR EOC Editors** group. The code being public is
> fine — the data is not reachable without credentials.

## Contents

| File | Purpose |
|---|---|
| `eoc_editor_map.html` | The editor app (ArcGIS JS SDK 4.31, single file, no build step) |
| `eoc_editor_guide.html` | Staff operation guide — opened by the **Guide** button in the app header |

## How it works

- Signs staff in via ArcGIS Online OAuth (full-page redirect).
- Edits the **source** hosted service `CoFOREM_Emergency_Operations`
  (shared to the CoFOR EOC Editors group only).
- The public landing page reads a separate Query-only view
  (`CoFOREM_Emergency_Operations_public`), so nothing here is publicly
  writable.
- Field pick-lists (Type, Severity, Status, Closure Type) come from the
  service domains — no code changes needed if domain values are edited
  in ArcGIS Online.

## Configuration

Everything lives in `APP_CONFIG` at the top of `eoc_editor_map.html`:

| Key | Value |
|---|---|
| `oauthAppId` | App ID from the registered AGOL Application item (**required** — app will not sign in without it) |
| `portalUrl` | `https://www.arcgis.com` or the org URL |
| `incidentsUrl / closuresUrl / areasUrl` | Source FeatureServer layers 0 / 1 / 2 |

**OAuth redirect URIs** on the AGOL Application item must exactly match
every URL the app is served from, e.g.:

```
https://cofor-gis.github.io/EOCEditor/eoc_editor_map.html
https://<iis-host>/EOCEditor/eoc_editor_map.html
```

If the app path or filename changes, add the new URI or sign-in will fail
with `redirect_uri mismatch`.

## Hosting

Static files only — served from GitHub Pages and mirrored on the city IIS
server. **HTTPS is required** on IIS for OAuth. To update: edit the HTML,
commit, push; Pages redeploys automatically. Copy the same files to IIS.

## Access control

Grant access by adding a user to the **CoFOR EOC Editors** group in
ArcGIS Online. The user's role must include *feature editing* privileges.
Remove from the group to revoke. No code changes are ever needed for
access changes.
