# gis-apps — City of Fair Oaks Ranch internal GIS tools

| Field | Value |
|---|---|
| Owner | Ernie Martz, GIS Administrator, City of Fair Oaks Ranch |
| Repo | `CoFOR-GIS/gis-apps` (**public**), GitHub Pages from `main` |
| Site | `https://cofor-gis.github.io/gis-apps/<App>/` |
| Records | Work orders, decisions and handoffs are in the private repo `CoFOR-GIS/gis-ops` (not here) |
| Related | `CoFOR-GIS/gis-maps` = public read-only viewers |

## 1. Purpose
This repo holds staff tools that sign in to ArcGIS Online, mostly editors. Each app is one folder, and GitHub Pages serves each folder over https.

## 2. Location
| Folder | App | Who uses it |
|---|---|---|
| `LUAEditor/` | LUA parcel editor (WO-0008) | Public Works (group "LUA Editors") |
| `RadarSignEditor/` | Radar feedback sign editor | Public Works |
| `ParcelEditor/` | Parcel exemption / land use editor | City Planner |
| `WaterMeterEditor/` | Water meter / distribution editor | Utility Clerk |
| `EOCEditor/` | EOC incident editor | Emergency management |
| `MetesBounds/` | Metes & bounds survey viewer | Engineering Services |
| `cip-locator/` | CIP project locator | CIP editors |
| `FieldExtractor/` | Field schema extractor | GIS admin |

Each app folder has its own README with its URL, layers, sign-in and rules.

## 3. Data sources
- ArcGIS Online org `fairoaksranch`, at https://fairoaksranch.maps.arcgis.com.
- Apps sign in with OAuth app ID `DhZk7VoirUPP4Sa2`, using the redirect flow.
- Access comes from ArcGIS sharing: groups and views. It does not come from this code.

## 4. Procedure

### Rule R1: where an app is hosted (Ernie, 2026-11-02)
1. **Apps that sign in to ArcGIS Online go on GitHub Pages:** `https://cofor-gis.github.io/gis-apps/<App>/`.
   - ArcGIS Online accepts only https redirect URIs (localhost excepted).
   - `gis.local` is http only, so it cannot host these apps.
2. **gis.local carries only the entry point.** That means a link on a section home page (for example gis.local/Utilities/ or gis.local/Planning/) and/or a redirect page to the GitHub Pages URL.
   - ChatGPT chooses the section and the form, installs it, and records it in `C:\FORWeb`. This is the local lane.
3. Apps that need no ArcGIS sign-in may still be hosted on gis.local (IIS).
4. This rule is revisited if gis.local gets https.

### Public-repo rules
- Never commit data, exports, CSVs, credentials, tokens or personal information.
- Item IDs and field names are allowed. Access control comes from ArcGIS sharing.
- Internal-only fields, such as `Private_Well` and `Private_Well_Basis`, may appear in internal editors here.
- Nothing from these apps is copied into `gis-maps` or other public pages.
- `gis.local` links are allowed here. They are not allowed in `gis-maps`.

### Deploy a new app or a change (no command line needed)
1. **Branch.** Work on a branch, never directly on `main`. Open a pull request into `main`.
2. **Merge.** Ernie reviews the **Files changed** tab, then clicks **Merge pull request** and **Confirm merge**. Merging makes the change live.
3. **Wait for the build.** In the **Actions** tab, wait until the newest **pages build and deployment** run shows a green tick (1–3 minutes).
4. **Check the page.** Open `https://cofor-gis.github.io/gis-apps/<App>/` and press Ctrl+F5.
5. **First deployment only: register the redirect URI.**
   1. Go to fairoaksranch.maps.arcgis.com and open **Content**.
   2. Open the application item whose App ID is `DhZk7VoirUPP4Sa2`.
   3. Go to **Settings** → **Registered info** → **Update**. In newer ArcGIS Online versions this is **Credentials** → **Redirect URLs**.
   4. Add the exact app URL, including the trailing slash, and save.
   5. Expected result: the app's sign-in page opens with no "invalid redirect_uri" error.
6. **Ask for the gis.local entry point.** Ask ChatGPT for it through `gis-ops/log/AI_COORDINATION.md`.

### Standards (all projects)
- **R2: instructions.** Every request or direction gives:
  - who does it, and the prerequisites first;
  - numbered steps with exact clicks, URLs and values;
  - the expected result of each step;
  - what to send back, and how to roll back.
  - Any cmd.exe or ArcGIS Pro Python step includes the complete script and a copyable cmd.exe box naming the window, script path, function and arguments. Python only.
  - When no command is needed, the instructions say so.
- **R3: scripts.**
  - A script that is part of a project lives in `<App>/scripts/`, or in `gis-ops/handoff/<project>/scripts/` if it must stay private.
  - The project README documents it: purpose, prerequisites, how to run, outputs and rollback.
  - Scripts never contain credentials.
- **R4: continuity.**
  - Each project keeps an up-to-date pick-up-cold document in `gis-ops/handoff/<project>/README.md`, plus its app README.
  - Write it so a new person or AI can continue without asking: status, IDs, URLs, decisions, next action and owner.
  - Commit messages say what changed, why, and where.
- **R5: references must resolve.** Every file named in an instruction is a full GitHub link to the branch where it exists now (`https://github.com/CoFOR-GIS/<repo>/blob/<branch>/<path>`), plus the plain path for after the merge.
  - If a file is only on an unmerged branch, the instruction says so, and "merge PR #N" comes before any step that uses it.
  - Before sending, the author checks that every cited file exists at that branch and that every cited PR is in the stated state.
- **Docs format.** Purpose, Location, Data sources, Procedure, Verification, Rollback, Change log.

## 5. Verification
- After each merge, the Pages run is green and the app URL loads.
- Sign-in works only once the exact URL is a registered redirect URI.
- `git grep` finds no credentials or data files.

## 6. Rollback
- On GitHub, open the merged pull request and click **Revert**, then merge the revert pull request. Pages republishes the previous version.
- ArcGIS Online data edits are not undone by this. See each app's README.

## 7. Change log
- 2026-11-02 README created. Records rule R1 (https hosting on GitHub Pages; gis.local link/redirect by ChatGPT) and standards R2–R4 (Claude, at Ernie's direction).
- 2026-11-02 Added R5 (references must resolve before sending) after a checklist was named by path while it existed only on an unmerged gis-ops branch (Claude).
