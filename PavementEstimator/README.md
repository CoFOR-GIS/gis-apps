# Pavement Estimator - City of Fair Oaks Ranch (staff only)

| Field | Value |
|---|---|
| Work order | WO-0016 (Pavement Treatment History), decision D-060, Ref PAVEST-APP-20261117 |
| Users | City staff (read); group "Pavement Estimator Editors" adds and retires rate overrides |
| Served at | https://cofor-gis.github.io/gis-apps/PavementEstimator/ (GitHub Pages, https; deployed by merging to `main`) |
| Internal entry point | a link and/or redirect on a gis.local section home page, chosen and installed by ChatGPT (rule R1) |
| Status | v1.0.0-rc1: pull request open; awaiting Ernie's review, merge, redirect URI registration and live test |

> **Staff only, advisory.** Estimates are planning numbers, not bids. Cartegraph (maintained by Legacy) is the system of record. Do not copy this app, its exports or its rates into `CoFOR-GIS/gis-maps` or any public page.

## 1. Purpose
Prices planned pavement work from the annual Cartegraph rate snapshot, so staff can see what a list of planned treatments costs and where every number came from. It applies the approved design (gis-ops `handoff/PavementHistory/APPROVED_20261117.md`, D-060):
- Rates come from the current annual snapshot. Only rates marked **Confirmed** are used; anything else shows as unavailable and is left out of the total.
- Staff overrides are kept separately. An active override replaces the snapshot rate and is labelled **override** on the line and in the export.
- Cartegraph calculated square yards is the default area; the traced polygon area (whole polygon) is an explicit alternative where the task has one.
- The protocol's OCI trigger range is shown as guidance only.

## 2. Location
```
PavementEstimator/
  index.html   single-file app (ArcGIS Maps SDK for JavaScript 4.31); CONFIG block at the top of the script
  logo.svg     City seal (copy of LUAEditor/logo.svg); also the favicon
  README.md    this file
  tests/       offline tests (fake data only; not used by the app)
    rules.test.js   32 cases for the RULES block in index.html (Node 18+, no packages)
    ui.test.js      44 browser checks against mock-sdk.js (Playwright + Chromium): editor, non-editor, 390 px phone
    mock-sdk.js     fake ArcGIS SDK, fake segments, tasks and rates
```
- **Hosting (rule R1, Ernie 2026-11-02):** apps that sign in to ArcGIS Online run from GitHub Pages over https. gis.local only links to this URL.
- **Auth:** OAuth 2.0 redirect, app ID `DhZk7VoirUPP4Sa2`. The redirect URI `https://cofor-gis.github.io/gis-apps/PavementEstimator/` (exact, trailing slash) must be registered on that app.
- **Public repo:** the code is public; it holds item IDs and field names only. Who can read and who can edit comes from ArcGIS Online sharing.

## 3. Data sources
| Item | ID | Access | Used for |
|---|---|---|---|
| City of Fair Oaks Ranch Pavement Treatment Planned (Internal) | `7ac95a464345448aaeddb17755801920` | private view (staff) | Segments (map, Cartegraph SY) and Treatment_Events with Status = Planned |
| City of Fair Oaks Ranch Pavement Estimator Rates (Internal View) | `4a0fbf8bca804ef1b7f6067a924c3c9d` | Organization, Query only | Rate_Snapshots, Rate_Overrides (read) |
| City of Fair Oaks Ranch Pavement Estimator Rates (Internal Editing) | `df344bfe14084239b70fe457322bfe13` | group "Pavement Estimator Editors", add + update, no delete | Rate_Overrides (add, retire) |
| Source service CoFORPW_PavementEstimator_Rates | `a056427b83e14c20bc3e4bd6f2f048aa` | private, Query only, editor tracking on | not opened by the app |

- Layers and tables are found by name (Segments, Treatment_Events, Rate_Snapshots, Rate_Overrides), not by layer id.
- Planned treatments join to rates on the Cartegraph activity name (`Treatment_Events.WorkTypeRaw` = `Rate_Snapshots.Activity`).
- First snapshot: `FOR2027PPP-20261116`, 18 rates read from Cartegraph on 2026-11-16 (FOR 2027 PPP protocol formulas; activity library where the protocol has no rate). Cartegraph areas are ft2; rates were set in $/SY, so $/SY = $/ft2 x 9 (Ernie, 2026-11-17).
- Parties: Ernie Martz (requester, GIS); Public Works (owns the estimator workflow; Steve Fried and the FOR Maintenance account are price editors with Ernie); Legacy (engineering consultant, maintains Cartegraph and its cost model); Claude (built the app and tables); ChatGPT (gis.local entry point).

## 4. Procedure
### Use (staff)
1. Open https://cofor-gis.github.io/gis-apps/PavementEstimator/ and sign in with your City ArcGIS account.
2. Filter the planned work by year, treatment or street. Tick tasks, click **Add all shown**, or click a segment on the map. A segment click adds or removes all of that segment's planned tasks.
3. In each estimate line you can change the treatment (what-if) and the area basis. The line shows the square yards, the rate, where the rate came from (**snapshot**, **override** or **unavailable**) and the cost. Unavailable lines say why and are left out of the total.
4. Click **Export CSV**. The file records the snapshot, the rate source, any override (OBJECTID, approver, reason, date) and the cost of every line. It saves to this PC; keep it on City storage.

### Add or retire an override (price editors only)
1. Click **Rates**. Editors see the override form under the rate table; everyone else sees the table read only.
2. Choose the activity, enter the rate in $ per SY, the effective date (and an end date if it is temporary), the approver and the reason. Click **Save override** and confirm. Expected result: the rate table shows the override, and estimates reprice.
3. To stop using an override, click **Retire** in the override history. It stays in the history with Status = Retired and End_Date = today. Overrides are never deleted.

### Deploy or update (Ernie; no command line needed)
1. Changes come as a pull request into `main` of `CoFOR-GIS/gis-apps`. Review the **Files changed** tab, click **Merge pull request**, then **Confirm merge**.
2. Open the **Actions** tab and wait for the newest **pages build and deployment** run to show a green tick (1-3 minutes).
3. First deployment only: register the redirect URI. At https://fairoaksranch.maps.arcgis.com open **Content**, open the OAuth application item with App ID `DhZk7VoirUPP4Sa2`, go to **Settings** > **Registered info** > **Update** (newer versions: **Credentials** > **Redirect URLs**), add `https://cofor-gis.github.io/gis-apps/PavementEstimator/` exactly, and save.
4. Open the app URL and press Ctrl+F5. Expected result: sign-in, then the planned work list and the snapshot line under **Estimate**.
5. Ask ChatGPT for the gis.local entry point through `gis-ops/log/AI_COORDINATION.md`.

### Annual refresh
When Cartegraph's protocol changes (about January/February, after council approval), a new snapshot is added to Rate_Snapshots with a new Snapshot_ID and Effective_Date by a script Ernie runs (pattern: `PavEstRates_20261117.py` in gis-ops records). The app uses the snapshot with the latest Effective_Date on or before today; older snapshots stay for reproducing past estimates.

## 5. Verification
- Offline: `node PavementEstimator/tests/rules.test.js` (32 passed) and `node PavementEstimator/tests/ui.test.js` (44 passed, needs Playwright and Chromium).
- Live, after merge: sign in as a price editor and as a staff member who is not one. The editor sees the override form; the other account sees the rate table read only. Price one planned task by hand (SY x rate) and compare with the line.

## 6. Rollback
- Code: on GitHub open the merged pull request and click **Revert**, then merge the revert pull request. Pages republishes the previous version.
- Data: the app only adds and updates rows in Rate_Overrides. To undo an override, retire it in the app. Rows are never deleted.

## 7. Change log
- 2026-11-17 v1.0.0-rc1 (PAVEST-APP-20261117): first version (Claude, Cowork). Tests: 32 rule cases and 44 browser checks against a fake SDK (editor, non-editor, 390 px); a mock bug (layer identity on map click) found and fixed in the test, not the app.
