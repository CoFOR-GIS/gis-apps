# LUA Editor - City of Fair Oaks Ranch (internal)

| Field | Value |
|---|---|
| Work order | WO-0008 step 2, Ref LUA-EDITOR-20261102 |
| Users | AGOL group "LUA Editors" (Public Works, Amanda Wade) |
| Served at | https://cofor-gis.github.io/gis-apps/LUAEditor/ (GitHub Pages, https; deployed by merging to `main`) |
| Internal entry point | a link and/or redirect on a gis.local section home page, chosen and installed by ChatGPT (e.g. gis.local/Utilities/) |
| Replaces | Experience Builder app 1d33d5773a5b439ba742d6e6c4dae2c0 (kept until Amanda accepts) |
| Status | v1.0.0-rc2: awaiting merge to `main`, redirect URI registration and Ernie's live test; not accepted yet |

> **Internal only.** This app shows and edits `Private_Well` / `Private_Well_Basis`, which are internal knowledge (D-018). Do not copy this app, its field list, screenshots or its CSV files into `CoFOR-GIS/gis-maps` or any public page.

## 1. Purpose
This is the place where Public Works maintains the parcel attributes that drive the public LUA viewer and dashboard. It enforces the rules that the Experience Builder app cannot:
- A private-well flag must carry its evidence basis.
- A FORU parcel flagged as a well may not also carry water or sewer connections.
- Every edit records its date.

## 2. Location
```
LUAEditor/
  index.html   single-file app (ArcGIS Maps SDK for JavaScript 4.31); CONFIG block at the top of the script
  logo.svg     City seal (copy of RadarSignEditor/logo.svg); also the favicon
  README.md    this file
  tests/       offline tests (fake data only; not used by the app)
    rules.test.js   38 cases for the rules block in index.html (Node 18+, no packages)
    ui.test.js      23 browser checks against mock-sdk.js (Playwright + Chromium)
    mock-sdk.js     fake ArcGIS SDK and fake parcels for ui.test.js
    smoke.test.js   start screen at 1280 px and 390 px (Playwright)
```
- **Hosting (rule R1, Ernie 2026-11-02):** apps that sign in to ArcGIS Online are served over https from GitHub Pages. ArcGIS Online will not accept `http://gis.local/...` as a redirect URI. GitHub Pages publishes the `main` branch of `CoFOR-GIS/gis-apps`, so this folder is live at https://cofor-gis.github.io/gis-apps/LUAEditor/ once merged.
- **Auth:** OAuth 2.0 redirect (no popup) with app ID `DhZk7VoirUPP4Sa2`. The redirect URI `https://cofor-gis.github.io/gis-apps/LUAEditor/` (exact, with trailing slash) must be registered on that app.
- **gis.local:** no app files on IIS. ChatGPT adds the internal entry point (link and/or redirect page) on the gis.local section home page it chooses.
- **Public repo:** the source is publicly readable. It holds no data, credentials or tokens; the editing view is shared only to LUA Editors, so nobody else can read or edit through it.

## 3. Data sources
- **Edits:** "City of Fair Oaks Ranch LUA (Internal Editing)" view.
  - It is update-only and attribute-only, and shared only to LUA Editors.
  - Its item ID goes in `CONFIG.editItemId`. While it reads `PENDING_...`, the app stops at the start screen.
- **Authoritative layer behind it:** `6745cc198fd3493585aec7119175123a` ParcelStatus/FeatureServer/0 (editor tracking on).
- **What reads the result:** LUA_Parcels_view `3413d637...` feeds the public viewer and dashboard `0c3923c7...`.

| Field | In app |
|---|---|
| ADDRESS, textImproved (Parcel status), LUA, Num__of_Connections_Water, Num__of_Connections_Sewer, MasterWater, MasterWastewater, Private_Well, Private_Well_Basis | edit |
| LotUpdated | automatic: today, on every save that changes something |
| Subdivision, Unit, Lot, COUNTY, Pressure_Zone, Lot_Acreage, PropID, EditDate, Editor | read only |
| Num__Remaining_Water_Connection, Num__Remaining_Sewer_Connection, ImprovedValue | excluded: not loaded, never sent (Ernie 2026-11-02; add back if something relied on them) |

## 4. Procedure
### Deploy or update (Ernie; no command line or script needed)
1. Changes are made on a branch and offered as a pull request into `main` of `CoFOR-GIS/gis-apps`.
2. Open the pull request on GitHub, review the **Files changed** tab, click **Merge pull request**, then **Confirm merge**. Merging is what makes the change live.
3. Open the repo's **Actions** tab. Wait for the newest **pages build and deployment** run to show a green tick (usually 1-3 minutes).
4. Open https://cofor-gis.github.io/gis-apps/LUAEditor/ and press Ctrl+F5. The start screen shows the City seal and "Signing in to ArcGIS Online".
5. First deployment only: register the redirect URI.
   1. Go to https://fairoaksranch.maps.arcgis.com and sign in. Open **Content**.
   2. Open the OAuth application item whose App ID is `DhZk7VoirUPP4Sa2`. It already lists `https://cofor-gis.github.io/gis-apps/RadarSignEditor/` as a redirect URI.
   3. Go to **Settings**. Under **Application settings / Registered info**, click **Update**. In newer ArcGIS Online versions this is **Credentials** then **Redirect URLs**.
   4. Add exactly `https://cofor-gis.github.io/gis-apps/LUAEditor/` (https, trailing slash). Click **Add**, then **Update** / **Save**.
   5. Expected: the URI is listed next to the RadarSignEditor one. Reload the app; the ArcGIS sign-in page opens without an "invalid redirect_uri" error.

### Use
**Find a parcel.** Type an address, a PropID or `#OID`, then press **Find**. You can also click the map.
- Ctrl/Shift-click on the map, or tick the boxes in the list, to select several parcels.

**Edit one parcel.** Change the fields, then **Review and save**. Check the before/after table, then **Save**.

**Batch edit (several parcels).**
- Tick each field you want to set. That field gets the same value on every selected parcel. Unticked fields are not touched.
- Address cannot be batch-edited.
- If any parcel would break a rule, the whole batch is refused and the parcels are listed.

**Rules.**
| Rule | Effect |
|---|---|
| Only fields you changed are sent; blank stays blank (it is never turned into 0) | — |
| Connections and master-plan values: whole number 0 or more, or blank | blocks save |
| Parcel status and LUA: a value from the list | blocks save |
| Private well = Yes needs a basis: Meter analysis, Billing verified, Staff confirmed or Owner reported | blocks save |
| Private well set to No clears the basis | automatic |
| FORU + private well Yes + water or sewer connections > 0 (LUA viewer rule; Ernie 2026-11-02) | blocks save |
| Private well Yes on a non-FORU parcel | warning you must acknowledge |
| Address changes are highlighted, because other apps search by address | shown in review |

**Safety on save.**
- Right before saving, the app re-reads the parcels. If anyone changed one since you opened it, nothing is saved and the parcel reloads.
- After saving, the app reads the values back and reports any parcel that failed or differs.
- **Before/after CSV.** Each save downloads `LUAEditor_save_YYYYMMDD-HHMMSS.csv` with these columns: OBJECTID, PropID, ADDRESS, field, before, after, result, editor, saved_at.
  - It is the only record of the old values, so keep it on City storage. It contains internal well data.
  - To undo a save, enter the `before` values again in the app.

## 5. Verification
**Offline (whoever changes the code, every change; developer machine, not the City workstation):**
- Prerequisites: Node 18+ and, for the browser tests, `npm i playwright` then `npx playwright install chromium`.
- From the repo root run each of these; all must pass:
```bash
node LUAEditor/tests/rules.test.js
```
```bash
node LUAEditor/tests/ui.test.js
```
```bash
node LUAEditor/tests/smoke.test.js
```
- Expected: `38 passed, 0 failed`; `23 passed, 0 failed; page errors: []`; the smoke test prints the start-screen text and `hscroll: false` at both widths.
- The rules test reads the block between `RULES-START` and `RULES-END` in index.html; keep those markers.

**Live (with Ernie's account and go-ahead):**
1. Startup checks pass. The view is update-only with no geometry edits; otherwise a yellow bar says so.
2. Each blocking rule refuses the save.
3. A real edit appears in LUA_Parcels_view and moves the viewer and dashboard counts as expected. LotUpdated, EditDate and Editor all update.
4. A parcel edited elsewhere is refused as stale.
5. An account outside LUA Editors cannot open the view.

## 6. Rollback
- **App:** on GitHub, open the merged pull request and click **Revert**, then merge the revert pull request. Pages republishes the previous version in 1-3 minutes. ChatGPT removes or hides the gis.local link. The Experience Builder app stays available until Amanda accepts this one.
- **Data:** this does not undo AGOL edits. Use the per-save CSV `before` values and the editor tracking fields (EditDate, Editor) to find and re-enter old values.

## 7. Change log
- 2026-11-02 v1.0.0-pre: first build (Claude, WO-0008 step 2). Editing view item ID is pending.
- 2026-11-02 v1.0.0-rc1: CONFIG.editItemId set to the WO-0008 step 1 editing view 225859c291a94a23b8b9b0a0ddd1c1aa (Ernie). Shows a clear message if the SDK cannot load. Tagged for a test install at gis.local.
- 2026-11-02 v1.0.0-rc2: offline tests committed in tests/ (rule R3). Hosting moved to GitHub Pages (https://cofor-gis.github.io/gis-apps/LUAEditor/) under rule R1 (Ernie: ArcGIS Online needs an https redirect URI; gis.local is http only). gis.local keeps only a link/redirect, installed by ChatGPT. No logic change.
