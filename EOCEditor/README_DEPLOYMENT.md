# CoFOR Emergency Notification Landing Page — Deployment

## Order of operations

1. **Run `create_emergency_layers.py`** in the ArcGIS Pro Python window while
   signed in to the CoFOR ArcGIS Online org. It builds a file GDB with three
   feature classes (severity/type/status domains, editor tracking,
   attachments, WKID 2278), adds them to a dedicated `CoFOREM_Publish` map,
   and publishes them to AGOL as one **public** hosted feature service:
   `CoFOREM_Emergency_Operations` (0 = Incidents pts, 1 = Areas polys,
   2 = Road Closures lines).

2. **Verify layer indexes** in the REST directory:
   `https://services6.arcgis.com/Cnwpb7mZuifVHE6A/arcgis/rest/services/CoFOREM_Emergency_Operations/FeatureServer`
   If ordering differs, fix the three URLs in `APP_CONFIG` at the top of the
   HTML file.

3. **Recommended hardening:** keep the source layer org-only + editable by
   EOC staff, and create a read-only *View Layer* shared public; point the
   landing page at the view. Turn on Delete Protection, turn off Export.

4. **Host `emergency_landing_page.html`** anywhere static (city IIS server,
   AGOL-hosted, or GitHub Pages). No backend, no build step, no API key
   needed — all referenced services are public.

5. **Swap the placeholder seal** in the header for the official city logo
   (`<img>` in place of the `.seal` div) per CoFOR branding standards.

## How the severity system works

Every feature carries `Severity` (coded domain):

| Code | Label     | Color   | Page behavior                          |
|------|-----------|---------|----------------------------------------|
| —    | All Clear | Green   | Green banner, empty-state message       |
| 1    | Advisory  | Amber   | Amber banner, card chips                |
| 2    | Watch     | Orange  | Orange banner                           |
| 3    | Warning   | Red     | Red banner                              |
| 4    | Emergency | Crimson | Crimson banner + pulsing beacon + "Take Action Now" |

The banner always reflects the **highest severity among non-resolved
incidents**, queried live every 60 seconds. Set an incident's `Status` to
`RESOLVED` and it drops off the page automatically on the next refresh.

## Existing CoFOR layers wired in as reference context

- `FOR_Jurisdictional` — city limits outline (always on, oak green)
- `ActiveLeak_(public_view)` — active water leaks (on by default)
- `FEMA_NFHL_view` — flood hazard zones (toggle, 45% opacity)
- `Facilities_view` — city facilities (toggle)

Sublayer index `/0` is assumed for each — spot-check in the REST directory
and adjust `APP_CONFIG` if a service exposes multiple layers.

## EOC workflow during an event

1. Edit `CoFOREM_Emergency_Incidents` (Field Maps, Map Viewer, or Pro):
   drop a point, set Type / Severity / Status / Instructions.
2. Optionally sketch the affected polygon and any closure lines.
3. The public page updates itself within 60 seconds — no republish needed.
