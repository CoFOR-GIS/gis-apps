# CoFOREM Emergency Operations — Deployment & Usage Guide
**City of Fair Oaks Ranch, TX · GIS / Emergency Management**
*Reference document for standing up the public Emergency Notification landing page and operating it during incidents. Last revised 2026-07-15, matching published service schema.*

---

## 1. System Overview

Three components work together. The **hosted feature service** is the single source of truth; EOC staff edit it, and the **landing page** reads it live — no republishing, no web developer in the loop during an event.

```
 EOC staff edits                    Public reads
 (Field Maps / Map Viewer / Pro)    (any browser, phone or desktop)
        │                                   ▲
        ▼                                   │  auto-refresh every 60 s
 ┌──────────────────────────────┐           │
 │ CoFOREM_Emergency_Operations │───────────┘
 │  0 Incidents (Point)         │
 │  1 Road_Closures (Polyline)  │   + existing reference services:
 │  2 Emergency_Areas (Polygon) │     FOR_Jurisdictional, ActiveLeak,
 └──────────────────────────────┘     FEMA_NFHL_view, Facilities_view
```

### Service reference (verified against published schema)

| Layer | Index | Geometry | Purpose |
|---|---|---|---|
| CoFOREM_Emergency_Incidents | **/0** | Point | The notification itself — one point per incident. Drives the banner and the incident list. |
| CoFOREM_Road_Closures | **/1** | Polyline | Closed or restricted road segments, with closure type and detour text. |
| CoFOREM_Emergency_Areas | **/2** | Polygon | Affected footprint — boil-water zone, evacuation area, outage area. |

Base URL: `https://services6.arcgis.com/Cnwpb7mZuifVHE6A/arcgis/rest/services/CoFOREM_Emergency_Operations/FeatureServer`

Spatial reference 2278 (NAD83 StatePlane Texas S Central ftUS), consistent with all other CoFOR services. Editor tracking is enabled (`CreatedBy/CreatedDate/UpdatedBy/UpdatedDate`), attachments are enabled on all three layers.

---

## 2. Current Sharing State & Required Hardening

**As published, the service is shared PUBLIC with Query-only capabilities.** That is safe (the public cannot edit) but it also means **staff cannot edit yet** — Field Maps and Map Viewer editing require the Editing capability.

Do **one** of the following before the first real incident:

### Option A — View-layer pattern (recommended)
1. On the `CoFOREM_Emergency_Operations` item: **Settings → Feature layer → Enable editing** (Add, update, and delete features).
2. Change the item's **sharing to Organization** (or an "EOC Editors" group). The editable source is now internal only.
3. Item page → **Create View Layer** → name it `CoFOREM_Emergency_Operations_public`. Leave the view Query-only and **share it Public**.
4. In `emergency_landing_page.html`, update the three URLs in `APP_CONFIG` to the view's FeatureServer (indexes stay 0/1/2).

This gives you an editable internal layer and a locked public feed, and edits flow to the view instantly.

### Option B — Keep single public layer
Leave the item public and Query-only. Staff edit only through ArcGIS Pro against the source (owner/admin credentials). Simpler, but no Field Maps in the field and one settings mistake away from public editing. Use only as an interim state.

### In either case
On the item **Settings**: turn **Delete Protection ON**, leave **Allow others to export OFF**, and set **Refresh Interval = 1 minute** (helps Map Viewer users; the landing page has its own 60-second refresh).

---

## 3. Deploying the Landing Page

1. `emergency_landing_page.html` is fully static — host it on the city IIS server, GitHub Pages, or as AGOL-hosted content. No backend, build step, or API key.
2. Everything site-specific lives in `APP_CONFIG` at the top of the file: service URLs, map center/zoom, refresh interval, and the active-incident filter (`Status <> 'RESOLVED'`).
3. Replace the placeholder "FOR" seal in the header with the official city logo (swap the `.seal` div for an `<img>`), keeping CoFOR branding standards.
4. Link the footer "Sign up for emergency alerts" to the city's actual alert registration page.
5. Suggested URL: `emergency.fairoaksranchtx.org` or `fairoaksranchtx.org/emergency`, and link it from the city homepage alert bar during events.

### How the page behaves

The **condition banner** always shows the *highest severity among non-resolved incidents*, using the CoFOREM_Severity domain:

| Severity | Label | Banner | Behavior |
|---|---|---|---|
| — (no active incidents) | All Clear | Green | Reassuring empty state |
| 1 | Advisory | Amber | Informational tone |
| 2 | Watch | Orange | Heightened attention |
| 3 | Warning | Red | Action expected |
| 4 | Emergency | Crimson | Pulsing beacon + "Take Action Now" |

Incident cards list severity chip, name, location, effective time, status, last-updated stamp (from editor tracking), and the Instructions text in a highlighted "What to do" block. Clicking a card zooms the map and opens the popup. Resolved incidents disappear automatically on the next refresh.

---

## 4. Incident Operations SOP

### 4.1 Opening an incident

1. Open the editable layer in **Field Maps** (mobile) or **Map Viewer** (desktop) — or Pro against the source.
2. On **Emergency_Incidents (/0)**, place a point at the incident location (or the most representative spot for area-wide events).
3. Fill fields — public-facing wording, plain language, no radio codes:
   - **IncidentName** — headline the resident sees, e.g. `Boil Water Notice — Pressure Zone 2`.
   - **IncidentType** — pick from domain (FLOOD, FIRE, WEATHER, WATER, WASTEWATER, ROAD, POLICE, UTILITY, HAZMAT, OTHER).
   - **Severity** — per the matrix in §4.4. This sets the banner color citywide.
   - **Status** — `ACTIVE` (or `SCHEDULED` for planned work, `MONITORING` for developing situations).
   - **Description** — what happened, 1–3 sentences.
   - **Instructions** — the protective action, imperative voice: *"Boil tap water for 2 minutes before drinking or cooking until further notice."* This renders in the highlighted block — it is the most important field on the page.
   - **LocationDesc** — human-readable area: `Ammann Rd at Cibolo Creek crossing`.
   - **StartDate / EndDate** — effective time and honest estimate (leave EndDate blank if unknown).
   - **Department / ContactInfo / MoreInfoURL** — issuing department, the non-emergency line (830-249-8645) or utilities line, and a link to the full notice on fairoaksranchtx.org if one exists.
4. If the incident has a footprint, sketch it on **Emergency_Areas (/2)** with the same name/severity/status so the map shades the affected zone.
5. If roads are affected, trace segments on **Road_Closures (/1)**: set **ClosureType** (FULL / LANE / ALT / LOWWATER), **RoadName**, and **DetourDesc**.
6. Verify on the public page within ~60 seconds: banner color, card text, geometry.

### 4.2 Updating

Edit the same features — never create duplicates for the same event. Editor tracking stamps `UpdatedDate` automatically and the card shows "Updated" time. Escalate or de-escalate by changing **Severity**; the banner follows on the next refresh.

### 4.3 Resolving

Set **Status = RESOLVED** on the incident point *and* any related area/closure features. Everything drops off the public page automatically; the banner returns to green All Clear when no active incidents remain. Do not delete features — the resolved records are your incident history (query `Status = 'RESOLVED'` for after-action review, with full editor-tracking timestamps).

### 4.4 Severity assignment matrix

| Use | Typical examples |
|---|---|
| **1 – Advisory** | Planned road work, scheduled utility maintenance, minor leak with no service impact, heat advisory reminders |
| **2 – Watch** | Flood watch on Cibolo/Balcones Creek, developing weather, water pressure issues under monitoring, lane closures |
| **3 – Warning** | Boil water notice, impassable low water crossing, active flooding of roads, extended utility outage, wildfire in the area |
| **4 – Emergency** | Evacuation ordered, shelter-in-place, life-safety threat, major hazmat, citywide system failure |

Rule of thumb: Severity 4 makes the entire page pulse crimson — reserve it for events where a resident should stop what they're doing.

### 4.5 Worked examples

**Boil water notice:** Incident point at the affected zone centroid — Type `WATER`, Severity 3, Status `ACTIVE`, Instructions with the boil guidance; polygon on Emergency_Areas tracing the pressure zone (Water_System_Pressure_Zones_(view) is a good tracing reference); resolve both when the notice lifts.

**Flooded low water crossing:** Closure line over the crossing — Type `FLOOD`, ClosureType `LOWWATER`, Severity 3, Instructions *"Turn around, don't drown. Use Fair Oaks Parkway as an alternate."*; incident point at the crossing so it appears in the list.

**Planned road preservation work:** Incident point + closure line, Type `ROAD`, Severity 1, Status `SCHEDULED` with Start/End dates. Flip to `ACTIVE` when work begins.

---

## 5. Maintenance, Testing & Troubleshooting

**Quarterly test:** create a test incident (`IncidentName: TEST — disregard`, Severity 1), confirm the page updates, then set it RESOLVED. Verify on a phone as well as desktop.

**Page shows "Live incident feed unavailable":** the incidents URL in `APP_CONFIG` is wrong or the layer isn't shared public — open the FeatureServer/0 URL in a private browser window; it should load without a sign-in prompt.

**Banner color wrong:** check for a forgotten non-resolved feature — the banner is the max severity of *everything* not RESOLVED, including scheduled items. Query `Status <> 'RESOLVED'` on layer 0.

**Edits not appearing:** confirm you edited the source layer the public view points at (Option A), and that the browser tab has completed a refresh cycle (footer says every 60 s; the "Last updated" stamp in the panel confirms).

**Adding a reference layer to the map:** add a `FeatureLayer` in the layers section of the HTML and a matching checkbox in the `#layers` block — the pattern for ActiveLeak/FEMA/Facilities can be copied directly.

**Schema changes:** if fields are added or domains change, regenerate the LLM context docs and update the popup `fieldInfos` and card template in the HTML to match.
