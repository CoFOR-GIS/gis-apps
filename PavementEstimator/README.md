# Pavement Estimator - City of Fair Oaks Ranch (staff only)

| Field | Value |
|---|---|
| Work order | WO-0016 (Pavement Treatment History), decision D-060, Ref PAVEST-APP-20261117 |
| Users | City staff (read); group "Pavement Estimator Editors" adds and retires rate overrides |
| Served at | https://cofor-gis.github.io/gis-apps/PavementEstimator/ (GitHub Pages, https; deployed by merging to `main`) |
| Internal entry point | a link and/or redirect on a gis.local section home page, chosen and installed by ChatGPT (rule R1) |
| Status | v1.1.0: rework after Ernie's live review of v1.0.0 (2026-11-17); pull request open. v1.0.0 live since 2026-11-17 (PR #7), redirect URI registered |

> **Staff only, advisory.** Estimates are planning numbers, not bids. Cartegraph (maintained by Legacy) is the system of record. Do not copy this app, its exports or its rates into `CoFOR-GIS/gis-maps` or any public page.

## 1. Purpose
Prices pavement treatments from the annual Cartegraph rate snapshot, so staff can see what a set of roads and treatments costs and where every number came from. Staff pick any City road segments, add one or more treatments to each, and get a total. It applies the approved design (gis-ops `handoff/PavementHistory/APPROVED_20261117.md`, D-060) as refined by Ernie on 2026-11-17:
- Roads are picked individually from every Cartegraph segment (no grouping by year); the list shows road name and square yards only. Segment details sit behind "Road details" on each card.
- Several treatments per road (for example Fog Seal plus Rejuvenation); "Add to all roads" adds one treatment to every selected road.
- Rates come from the current annual snapshot. Only rates marked **Confirmed** (or with an active override) are offered as treatments.
- Staff overrides are kept separately and labelled **override** on screen and in the export.
- Area is Cartegraph's calculated square yards; a user may type a different figure, marked **edited**. The traced-polygon option was dropped because those polygons are whole project areas, not per segment (Ernie, 2026-11-17).
- The protocol's OCI trigger range is a hover tip on the treatment name (guidance only).
- A walk-through guide opens on first visit and from "How it works".
- Look: the gis.local theme (light paper, navy ink, amber accent), because staff reach the app from gis.local.

## 2. Location
```
PavementEstimator/
  index.html   single-file app (ArcGIS Maps SDK for JavaScript 4.31); CONFIG block at the top of the script
  logo.svg     City seal (copy of LUAEditor/logo.svg); also the favicon
  README.md    this file
  tests/       offline tests (fake data only; not used by the app)
    rules.test.js   33 cases for the RULES block in index.html (Node 18+, no packages)
    ui.test.js      52 browser checks against mock-sdk.js (Playwright + Chromium): guide, editor, non-editor, 390 px phone
    mock-sdk.js     fake ArcGIS SDK, fake roads and rates
```
- **Hosting (rule R1, Ernie 2026-11-02):** apps that sign in to ArcGIS Online run from GitHub Pages over https. gis.local only links to this URL.
- **Auth:** OAuth 2.0 redirect, app ID `DhZk7VoirUPP4Sa2`. The redirect URI `https://cofor-gis.github.io/gis-apps/PavementEstimator/` (exact, trailing slash) must be registered on that app.
- **Public repo:** the code is public; it holds item IDs and field names only. Who can read and who can edit comes from ArcGIS Online sharing.

## 3. Data sources
| Item | ID | Access | Used for |
|---|---|---|---|
| City of Fair Oaks Ranch Pavement Treatment History (Public View) | `1c715100f896408697119d73def08461` | Everyone, read only | Segments: every Cartegraph segment (map, street, Cartegraph SY, details) |
| City of Fair Oaks Ranch Pavement Estimator Rates (Internal View) | `4a0fbf8bca804ef1b7f6067a924c3c9d` | Organization, Query only | Rate_Snapshots, Rate_Overrides (read) |
| City of Fair Oaks Ranch Pavement Estimator Rates (Internal Editing) | `df344bfe14084239b70fe457322bfe13` | group "Pavement Estimator Editors", add + update, no delete | Rate_Overrides (add, retire) |
| Source service CoFORPW_PavementEstimator_Rates | `a056427b83e14c20bc3e4bd6f2f048aa` | private, Query only, editor tracking on | not opened by the app |

- Layers and tables are found by name (Segments, Treatment_Events, Rate_Snapshots, Rate_Overrides), not by layer id.
- v1.0.0 read the private planned view `7ac95a46...`, which staff outside GIS cannot open; v1.1.0 no longer uses it.
- Treatments are the Cartegraph activity names in `Rate_Snapshots.Activity`; the screen drops the "FOR - " prefix, the export keeps the full name.
- First snapshot: `FOR2027PPP-20261116`, 18 rates read from Cartegraph on 2026-11-16 (FOR 2027 PPP protocol formulas; activity library where the protocol has no rate). Cartegraph areas are ft2; rates were set in $/SY, so $/SY = $/ft2 x 9 (Ernie, 2026-11-17).
- Parties: Ernie Martz (requester, GIS); Public Works (owns the estimator workflow; Steve Fried and the FOR Maintenance account are price editors with Ernie); Legacy (engineering consultant, maintains Cartegraph and its cost model); Claude (built the app and tables); ChatGPT (gis.local entry point).

## 4. Procedure
### Use (staff)
1. Open https://cofor-gis.github.io/gis-apps/PavementEstimator/ and sign in with your City ArcGIS account. The first time, a short walk-through opens; reopen it any time with **How it works**.
2. Find roads with **Find a road** and tick them, or click roads on the map (click again to remove). Clicking a road name zooms to it.
3. Add treatments: **Add to all roads** puts one treatment on every selected road; each road card also has its own **Add a treatment** list, so a road can have several (for example Fog Seal plus Rejuvenation). Remove a treatment with its ×.
4. If the real area differs from Cartegraph, type it in the road's **Area** box (marked **edited**; "use Cartegraph" puts it back). Roads with no Cartegraph area are left out of the total until an area is typed.
5. Click **Export CSV**. The file lists every road and treatment with its square yards, area source, rate, rate source, snapshot and any override (OBJECTID, approver, reason, date). It saves to this PC; keep it on City storage.

### Add or retire an override (price editors only)
1. Click **Rates**. It lists each treatment and its price per square yard. Editors also see the **Change a rate** form; everyone else sees the table only.
2. Choose the treatment, enter the rate in $ per SY, the effective date (and an end date if it is temporary), the approver and the reason. Click **Save override** and confirm. Expected result: the rate table shows the override, and estimates reprice.
3. To stop using an override, click **Retire** next to it in the rate table. It stays on record with Status = Retired and End_Date = today. Overrides are never deleted.

### Deploy or update (Ernie; no command line needed)
1. Changes come as a pull request into `main` of `CoFOR-GIS/gis-apps`. Review the **Files changed** tab, click **Merge pull request**, then **Confirm merge**.
2. Open the **Actions** tab and wait for the newest **pages build and deployment** run to show a green tick (1-3 minutes).
3. First deployment only: register the redirect URI. At https://fairoaksranch.maps.arcgis.com open **Content**, open the OAuth application item with App ID `DhZk7VoirUPP4Sa2`, go to **Settings** > **Registered info** > **Update** (newer versions: **Credentials** > **Redirect URLs**), add `https://cofor-gis.github.io/gis-apps/PavementEstimator/` exactly, and save.
4. Open the app URL and press Ctrl+F5. Expected result: sign-in, then the road list, the map and the empty estimate (first visit: the walk-through opens).
5. Ask ChatGPT for the gis.local entry point through `gis-ops/log/AI_COORDINATION.md`.

### Annual refresh
When Cartegraph's protocol changes (about January/February, after council approval), a new snapshot is added to Rate_Snapshots with a new Snapshot_ID and Effective_Date by a script Ernie runs (pattern: `PavEstRates_20261117.py` in gis-ops records). The app uses the snapshot with the latest Effective_Date on or before today; older snapshots stay for reproducing past estimates.

## 5. Verification
- Offline: `node PavementEstimator/tests/rules.test.js` (33 passed) and `node PavementEstimator/tests/ui.test.js` (52 passed, needs Playwright and Chromium).
- Live, after merge: sign in as a price editor and as a staff member who is not one. The editor sees the override form; the other account sees the rate table read only. Price one road by hand (SY x rate for each treatment) and compare with the card.

## 6. Rollback
- Code: on GitHub open the merged pull request and click **Revert**, then merge the revert pull request. Pages republishes the previous version.
- Data: the app only adds and updates rows in Rate_Overrides. To undo an override, retire it in the app. Rows are never deleted.

## 7. Change log
- 2026-11-17 v1.0.0-rc1 (PAVEST-APP-20261117): first version (Claude, Cowork). Tests: 32 rule cases and 44 browser checks against a fake SDK (editor, non-editor, 390 px); a mock bug (layer identity on map click) found and fixed in the test, not the app.
- 2026-11-17 v1.0.0 merged (PR #7) and redirect URI registered on the OAuth app item; live check by Claude in Ernie's browser: sign-in, snapshot FOR2027PPP-20261116, two lines priced correctly.
- 2026-11-17 v1.1.0 (PAVEST-APP-20261117, Ernie's live review): roads picked individually from all segments (public Segments view instead of the private planned view, which staff could not open); several treatments per road and "Add to all roads"; list shows road name + SY only, details behind "Road details"; editable SY replaces the traced-polygon option; Rates window reduced to treatment and $/SY (status column removed; unconfirmed rates simply not offered); OCI range as hover tip; walk-through guide; gis.local theme. Tests: 33 rule cases, 52 browser checks.
