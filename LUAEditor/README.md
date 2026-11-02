# LUA Editor - City of Fair Oaks Ranch (internal)

| Field | Value |
|---|---|
| Work order | WO-0008 step 2, Ref LUA-EDITOR-20261102 |
| Users | AGOL group "LUA Editors" (Public Works, Amanda Wade) |
| Served at | http://gis.local/LUAEditor/ (City network only) |
| Replaces | Experience Builder app 1d33d5773a5b439ba742d6e6c4dae2c0 (kept until Amanda accepts) |
| Status | built; awaiting editing view item ID (WO-0008 step 1) and live testing |

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
```
- **Auth:** OAuth 2.0 redirect (no popup) with app ID `DhZk7VoirUPP4Sa2`. The redirect URI `http://gis.local/LUAEditor/` must be registered on that app (WO-0008 step 5, Ernie).
- **IIS install:** ChatGPT installs from a tagged GitHub release (WO-0008 step 4).
- **No web.config needed.** The app uses only `.html` and `.svg`.

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
**Offline (Claude, every change):**
- The rules block (`RULES-START` to `RULES-END` in index.html) has a 38-case Node test.
- A mocked-SDK browser test covers sign-in, search, block and save, stale refusal, batch, and the CSV.

**Live (with Ernie's account and go-ahead):**
1. Startup checks pass. The view is update-only with no geometry edits; otherwise a yellow bar says so.
2. Each blocking rule refuses the save.
3. A real edit appears in LUA_Parcels_view and moves the viewer and dashboard counts as expected. LotUpdated, EditDate and Editor all update.
4. A parcel edited elsewhere is refused as stale.
5. An account outside LUA Editors cannot open the view.

## 6. Rollback
- **App:** remove `FORWeb\LUAEditor` (ChatGPT's install script) and keep using the Experience Builder app.
- **Data:** this does not undo AGOL edits. Use the per-save CSV `before` values and the editor tracking fields (EditDate, Editor) to find and re-enter old values.

## 7. Change log
- 2026-11-02 v1.0.0-pre: first build (Claude, WO-0008 step 2). Editing view item ID is pending.
