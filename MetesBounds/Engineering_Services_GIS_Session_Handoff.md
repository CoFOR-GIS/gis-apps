# Engineering Services GIS — Session Handoff

> Paste this at the start of a new chat (or into project knowledge) to continue without re-explaining.

## What this thread covered

1. **New department color profile** for Engineering Services, formalized as governance Amendment 01.
2. **Metadata** for the COGO survey source layer and its internal view layer.
3. **A built viewer app** for browsing metes and bounds by survey name.

---

## 1. Engineering Services — "Graphite Steel" color profile (Amendment 01, effective 2026-06-22)

Added as a dedicated profile, replacing the prior practice of folding ENG into Admin green.

| Token | Hex |
| --- | --- |
| Ink | `#23282C` |
| Accent | `#6B757C` |
| Accent strong | `#525B61` |
| Surface | `#ECEEEF` |
| Hairline | `#C3C9CC` |

- Master profile line: `Engineering=#23282C/steel #6B757C`
- Thumbnail code added: **Steel/Slate Gray = Engineering** (joins Orange=PW, Blue=Utilities, Green=Admin)
- Typography: inherits Operations pairing (Bricolage Grotesque + Manrope)
- Hierarchy: ENG is the parent branch (GIS, Environmental, Permitting, Inspections, Planning). Planning keeps its existing gold `#C8A94E` as a sub-discipline.
- File: `CoFOR_GIS_Governance_Amendment_01_Engineering_Color_Profile.md`

---

## 2. Survey layers

**Source layer** — `CoFORENG_Survey_COGOLine`
- COGO-enabled polyline, primary tool for constructing and verifying metes and bounds in ArcGIS Pro.
- Designation: Internal Editing. Not authoritative as a system of record, but its geometry establishes boundaries for annexations, plats, easements and other documents.
- Fields: `Direction` (Double), `Distance` (Double), `Radius` (Double), `ArcLength` (Double), `Radius2` (Double), `Name` (Text 50).
- **Direction is stored as a QUADRANT BEARING**, Esri packed format `Q DD.MMSS` (1=NE 2=SE 3=SW 4=NW). Example `145.3015` = N45-30-15E.

**View layer** — `CoFORENG_Survey_MetesBounds`
- Read-only internal view for cross-department reference. Not public.
- Published view confirmed: `CoFORENG_Survey_COGOLine_view` FeatureServer/0 on `services6.arcgis.com/Cnwpb7mZuifVHE6A`, WKID 102740/2278, 303 features, Query only.
- Recommended hidden fields: editor tracking (`Creator`, `CreationDate`, `Editor`, `EditDate`) and `GlobalID`.

### Open metadata decisions (still pending)
- Final view name confirmed as `CoFORENG_Survey_MetesBounds` (vs `CoFORENG_Survey_COGOLineView`).
- "(Internal View)" designation token — proposed as a fifth official designation alongside Authoritative / Public View / Internal Editing / Legacy. Needs sign-off.
- Exact sharing target — whole organization vs a specific Engineering/Planning group.
- Final field visibility list for the view.

---

## 3. The viewer app — Metes &amp; Bounds Viewer

- Single-file ArcGIS JS SDK 4.31 app, Graphite Steel themed.
- Groups survey lines by `Name`, searchable list with segment counts.
- Select -> zoom to extent, highlight, ArcPro-style two-line labels (quadrant bearing + distance, arc length for curves).
- Quadrant decoder is default, with a bearing-source selector as a safety switch.
- Dashed white-cased line symbol that reads on aerial and on light/topo basemaps.
- Basemap switcher (gray, topo, streets, hybrid, satellite, dark).
- Parcels reference layer (Item `bd5079b30310433998c6a54652074dd6`) with address/subdivision/unit popup.
- OAuth via app `DhZk7VoirUPP4Sa2` (survey view is internal).
- Files: `index.html`, `README.md`.

### Deployment
- Folder-per-app `MetesBounds/` with `index.html` + `logo.svg` + `README.md`.
- Recommended: `gis.local/MetesBounds/` (intranet) or `cofor-gis/gis-apps/MetesBounds/` on GitHub Pages.
- Register the deployment URL as an OAuth redirect URI on `DhZk7VoirUPP4Sa2`.

### App open items
- Verify the quadrant decoding against a known plat (open a survey, confirm the first label).
- Confirm parcel field names if the popup comes up blank for subdivision/unit.

---

## Standing conventions (reference)

- Naming: `CoFOR[Dept]_[Theme]_[Component]` PascalCase. ENG = Engineering Services.
- WKID 2278, NAD83 TX South Central, US Survey Feet. No Oxford commas. stormwater/wastewater single words.
- App stack: ArcGIS JS 4.31 CDN, UMD libs before SDK, redirect OAuth, base64 logo, `logo.svg` favicon, single file.
- AGOL org: `https://fairoaksranch.maps.arcgis.com`
