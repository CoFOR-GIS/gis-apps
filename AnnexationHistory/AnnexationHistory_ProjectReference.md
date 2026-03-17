# Annexation History Interactive Map — Project Reference

> **Project:** City of Fair Oaks Ranch Annexation History (Public-Facing Interactive Map)  
> **Date:** March 17, 2026  
> **Status:** Ready for GitHub Pages deployment + CivicPlus iframe embed  

---

## Layer Reference

| Property | Value |
|---|---|
| Item ID | `dbb249dafb134b28a4ebaac2c531783e` |
| Service URL | `https://services6.arcgis.com/Cnwpb7mZuifVHE6A/arcgis/rest/services/City_of_Fair_Oaks_Ranch_Annexation_History_(Public_View)/FeatureServer/0` |
| Geometry | Polygon |
| Feature Count | 86 |
| WKID | 2278 (NAD83 TX South Central, US Survey Feet) |
| Capabilities | Query only (public view) |
| Display Field | `PropertyName` |

### Key Fields Used

| Field | Type | Purpose in App |
|---|---|---|
| `AnnexDate` | Date | Era coloring, labels, time slider filtering, sidebar stats |
| `OrdinanceNum` | String | Labels, popup display, sidebar list, fallback title |
| `PropertyName` | String | Popup title (with fallback logic for unnamed records) |
| `RecordedAcreage` | Double | Primary acreage source in popup and sidebar |
| `Shape__Area` | Double | Fallback acreage calculation (`Shape__Area / 43560`) |
| `CivicPlusID` | String | Builds ordinance document link: `fairoaksranchtx.org/DocumentCenter/View/{CivicPlusID}` |
| `County` | String | Popup detail |
| `AnnexationType` | String | Popup detail |
| `Mayor` | String | Popup detail |
| `EffectiveDate` | Date | Popup detail (shown when populated) |
| `Description` | String | Popup detail |
| `Notes` | String | Popup detail |
| `ColorTheorom` | Integer | Not used in app — available for static cartographic coloring if needed |

### Supporting Layer

| Property | Value |
|---|---|
| Layer | Parcels (Public View) |
| Item ID | `bd5079b30310433998c6a54652074dd6` |
| Purpose | Subtle reference outline beneath annexations; address search target |
| Address Field | `SiteAddress` (verify against REST endpoint — may be `Site_Address` or `Address_Num_`) |

---

## App Features (v2)

### Era-Based Symbology

Annexations are color-coded by decade using an Arcade `valueExpression` on `AnnexDate`:

| Era | Fill Color | Hex |
|---|---|---|
| 1970s | Blue | `#5B9BD5` |
| 1980s | Amber | `#D49A4E` |
| 1990s | Emerald | `#5AAE8C` |
| 2000s | Terracotta | `#C87A6E` |
| 2010s | Sage | `#8D956C` |
| 2020s | Purple | `#9B7EB8` |
| Unknown | Gray | `#AAAAAA` |

### Labels

Arcade expression renders year and ordinance number on two lines. Visible at 1:40,000 and closer. Uses DM Sans bold, 9pt, with white halo.

### Time Slider (Master Controller)

The time slider at the bottom of the map is the primary filter mechanism. When adjusted, it:

1. Sets a `definitionExpression` on the annexation layer (`AnnexDate <= DATE '{year}-12-31' OR AnnexDate IS NULL`)
2. Rebuilds the `visibleFeatures` array in memory
3. Updates all four stat cards (count, earliest, latest, total acres)
4. Updates era legend counts (dims eras with zero features in the filtered range)
5. Re-renders the annexation list
6. Preserves any active era filter or search text on top of the time filter

"Show All" button resets slider, era filter, and entire sidebar.

### Dual-Mode Search

Two tabs in the search bar:

**Ordinance / Year** — Filters the sidebar annexation list by text match against `OrdinanceNum`, `Ordinance`, `Description`, `County`, `Mayor`, `AnnexationType`, `Notes`, and the year portion of `AnnexDate`.

**Address Lookup** — Debounced (400ms) typeahead query against the parcel layer's `SiteAddress` field. Selecting a result zooms to the parcel, runs a spatial intersection against annexation polygons, and opens the matching popup. Shows "Outside Annexed Area" if no annexation contains the parcel centroid.

### Popup

- **Title logic:** `PropertyName` (if not blank/unnamed) → `"Ordinance {OrdinanceNum}"` → `"Annexation — {year}"` → `"Annexation #{OBJECTID}"`
- **Fields displayed:** Ordinance, Annexation Date, Effective Date (if populated), Acreage (with calculated indicator), County, Type, Mayor, Description, Notes
- **Acreage fallback:** If `RecordedAcreage` is null/zero, calculates from `Shape__Area / 43560`. Displays "(from geometry)" label in popup, asterisk (*) in sidebar list
- **Document link:** Gold (`#C8A94E`) high-contrast CTA button. Links to `fairoaksranchtx.org/DocumentCenter/View/{CivicPlusID}`. Shows "Ordinance document not yet linked" when `CivicPlusID` is empty

### Document Viewer Modal

Clicking the document link opens an in-page modal with:

- iframe loading the CivicPlus document URL
- Loading indicator
- "Open in New Tab" fallback link
- Close via × button, backdrop click, or Escape key

**Known limitation:** CivicPlus may set `X-Frame-Options` headers that block iframe loading. When embedded on the CivicPlus site itself, this creates an iframe-within-iframe situation that browsers may reject. Recommendation: switch to direct new-tab link for the deployed version if iframe loading fails during testing.

### Parcels Reference Layer

Loaded beneath annexation polygons at 35% opacity with transparent fill and thin gray outlines. Popup disabled. Hidden from layer list. Provides spatial context and serves as the data source for address search.

### UI/UX Details

- **Theme:** Public-facing CoFOR profile — Playfair Display (headings) + DM Sans (body), forest green `#1B3A2D` / cream `#FAF6EE`
- **Basemap:** `gray-vector` with satellite toggle (top-right)
- **Widgets:** Zoom (bottom-right), Home (bottom-right), ScaleBar dual ruler (bottom-left), BasemapToggle (top-right)
- **Default ESRI UI:** Suppressed (`ui: { components: ["attribution"] }`)
- **Mobile:** Panel collapses to off-screen drawer at 860px breakpoint, toggled via hamburger button (hidden on desktop)
- **Loading screen:** Forest green overlay with animated progress bar, dismissed after feature query completes

---

## Deployment

### Target Path

```
cofor-gis/gis-apps/
  AnnexationHistory/
    index.html
```

**Live URL:** `https://cofor-gis.github.io/gis-apps/AnnexationHistory/`

### CivicPlus Embed

CivicPlus HTML widgets strip `<script>` tags and inline JavaScript for security. The workaround is hosting on GitHub Pages and embedding via iframe:

```html
<iframe 
  src="https://cofor-gis.github.io/gis-apps/AnnexationHistory/" 
  title="City of Fair Oaks Ranch Annexation History Map"
  width="100%" 
  height="800" 
  style="border:none; border-radius:8px;" 
  loading="lazy"
  allow="fullscreen">
</iframe>
```

CivicPlus allows `<iframe>` tags — this is the standard pattern for embedding AGOL maps, dashboards, and Experience Builder apps on municipal sites.

### Embed Considerations

- **Height:** `800px` is a starting point. Adjust based on page layout.
- **Narrow content columns:** If the CivicPlus page column is narrow, the 380px side panel may feel cramped. Options: reduce panel width to 320px, or test whether the 860px mobile breakpoint triggers properly inside the iframe.
- **Document modal:** Constrained to iframe viewport height (800px). May feel tight. Consider switching to new-tab links for the deployed version.
- **Iframe-in-iframe:** Loading CivicPlus DocumentCenter PDFs inside a modal iframe that is itself inside a CivicPlus iframe may be blocked by `X-Frame-Options`. New-tab link is the safer path for production.

---

## Schema Observations and Recommendations

### Duplicate Legacy Fields

The annexation layer contains old/new field pairs where the newer fields have cleaner aliases:

| Legacy Field | New Field | Recommendation |
|---|---|---|
| `Date` | `AnnexDate` | Hide legacy in public view |
| `Ordinance` | `OrdinanceNum` | Hide legacy in public view |
| `Recorded_Ac` | `RecordedAcreage` | Hide legacy in public view |
| `Lot_Acreage` | `RecordedAcreage` | Hide legacy in public view |
| `Addit_Descr` | `Description` | Hide legacy in public view |

If the new fields are fully populated, hiding legacy fields from the public view reduces confusion. The app's popup and title logic already checks both old and new fields as fallback.

### Field Name Typo

`ColorTheorom` should be `ColorTheorem`. If editing access exists on the authoritative layer, renaming improves schema quality. The app does not use this field.

### CivicPlusID Coverage

The document link feature depends on `CivicPlusID` being populated. Run an audit query to assess coverage:

```
CivicPlusID IS NULL OR CivicPlusID = ''
```

Records missing this value show "Ordinance document not yet linked" in the popup. Backfilling improves the public-facing experience significantly since the document link is the primary call-to-action.

### Parcel Address Field Verification

The address search queries `SiteAddress` on the parcel layer. This field name should be confirmed against the parcel REST endpoint:

```
https://services6.arcgis.com/Cnwpb7mZuifVHE6A/arcgis/rest/services/ParcelStatus/FeatureServer/0?f=json
```

If the field is named differently (e.g. `Site_Address`, `Address_Num_`, `SITEADDRESS`), update the `searchAddress()` function's `where` clause and `outFields` array accordingly.

---

## Technical Notes

### SDK and Library Stack

- ArcGIS JS SDK 4.31 (CDN)
- Google Fonts: Playfair Display, DM Sans
- No additional libraries required (no Chart.js, no jsPDF)
- Single HTML file, no build step, static hosting

### Load Order

No AMD conflict risk in this app — ArcGIS SDK is the only library using `require()`. No Chart.js or jsPDF needed.

### Acreage Calculation Logic

```
if RecordedAcreage > 0 → use as-is (official ordinance value)
else if Shape__Area > 0 → Shape__Area / 43,560 (sq ft to acres, WKID 2278 is US Survey Feet)
else → display "—"
```

Calculated values are marked with "(from geometry)" in popups and asterisk (*) in sidebar. This ensures every feature shows acreage without requiring manual data entry, while clearly distinguishing official vs calculated values.

### Map Initialization

```
center: [-98.69, 29.745], zoom: 13
→ then queryExtent() on annexation layer → view.goTo(extent.expand(1.15))
```

Follows established CoFOR pattern: safe initial center/zoom, then fit to layer extent.

---

## File Inventory

| File | Purpose |
|---|---|
| `annexation-map.html` | Complete interactive map application (single file) |
| `Fair_Oaks_Annexations_llm_context.md` | Layer schema reference (35 fields, exported via Field Schema Extractor) |
| This file | Project documentation and deployment reference |
