# Radar Sign Editor - City of Fair Oaks Ranch

Edit radar feedback sign locations, facing direction and placements for Public Works.

**URL:** https://cofor-gis.github.io/gis-apps/RadarSignEditor/

Consumes: City of Fair Oaks Ranch Radar Feedback Sign Locations and History (authoritative), layer 0 "Deployment History" (edit) and table 1 "RadarSignInventory" (read only). The public view (Status = 'Fixed') and the gis.local/Traffic dashboard read from the same layer.

## Files

```
RadarSignEditor/
  index.html   single-file app (ArcGIS Maps SDK for JavaScript 4.31)
  logo.svg     City seal (copy of ParcelEditor/logo.svg)
```

Auth: OAuth 2.0 redirect (no popup), app ID DhZk7VoirUPP4Sa2. The redirect URI `https://cofor-gis.github.io/gis-apps/RadarSignEditor/` must be registered on that app. Editing rights come from AGOL sharing of the authoritative layer (owner only at launch).

## Conventions

- **Direction** = compass bearing the sign *faces* (toward oncoming traffic). The map arrow shows the traffic it measures (Direction + 180). A sign facing west (270) measures eastbound traffic.
- **SiteID** = dashboard site ID, `ROAD-DIR-#` (e.g. `OFR-SB-1`). Direction letters follow road naming.
- **Status** = Fixed / Floating / Retired. Only Fixed is public.
- **Record a move** for the floating sign ends the current record (EndDate) and starts a new one; history is never overwritten.
- No deletes. Deleting an inventory row cascades to the sign's whole history.

## Workflows

- Fix a direction: select the sign, drag the dial or use **Aim on map** (click a point the sign faces), Save.
- Correct a location: **Move location**, click the map, Save.
- Floating sign moved: select its current record, **Record a move...**, enter new site ID / direction / time, **Pick new spot on map**, **Save move**. Also record the move in the dashboard admin until the server reads AGOL.
- New sign: **+ Add**, click the map, fill the record, Save.

Project record: Traffic Radar handoff guide, Sections 23-24 (`C:\GIS\Traffic\_project\Traffic_Radar_Handoff_Guide.md`).
