"""
============================================================================
 City of Fair Oaks Ranch — Emergency Operations Layer Builder & Publisher
============================================================================
 Purpose : Creates the three feature classes that drive the CoFOR Emergency
           Notification landing page, then publishes them to ArcGIS Online
           as a single hosted feature service shared with the public.

 Layers created (single service: CoFOREM_Emergency_Operations):
   0  CoFOREM_Emergency_Incidents   (Point)    - notifications / incidents
   1  CoFOREM_Emergency_Areas       (Polygon)  - affected / evac / notice areas
   2  CoFOREM_Road_Closures         (Polyline) - closures & restrictions

 Run from : ArcGIS Pro Python window (recommended) or a Pro notebook,
            inside an open project, signed in to the CoFOR AGOL org.
            The script creates its own map for publishing so your active
            map is not modified.

 Standards: NAD 1983 StatePlane Texas South Central FIPS 4204 (ftUS),
            WKID 2278 — consistent with existing CoFOR services (102740/2278).
            Field/domain naming follows the CoFOREM_ department prefix
            convention (matching CoFORPW_ / CoFORADM_ services already
            in the org).
============================================================================
"""

import arcpy
import os
from datetime import datetime

# ---------------------------------------------------------------------------
# CONFIG — adjust before running if needed
# ---------------------------------------------------------------------------
SERVICE_NAME   = "CoFOREM_Emergency_Operations"
GDB_NAME       = "CoFOREM_EmergencyOps.gdb"
FOLDER         = arcpy.env.scratchFolder  # or a project folder path
SR             = arcpy.SpatialReference(2278)  # NAD83 SP Texas S Central ftUS
PORTAL_FOLDER  = "Emergency Management"        # AGOL content folder
SHARE_PUBLIC   = True                          # landing page requires public
SUMMARY        = ("Active emergency operations, notifications, affected areas, "
                  "and road closures for the City of Fair Oaks Ranch, TX. "
                  "Drives the public Emergency Notification landing page.")
TAGS           = "Fair Oaks Ranch, Emergency, EOC, Notifications, Public Safety"

GDB = os.path.join(FOLDER, GDB_NAME)

print(f"Working geodatabase: {GDB}")

# ---------------------------------------------------------------------------
# 1. FILE GEODATABASE
# ---------------------------------------------------------------------------
if not arcpy.Exists(GDB):
    arcpy.management.CreateFileGDB(FOLDER, GDB_NAME)
    print("Created file geodatabase.")
arcpy.env.workspace = GDB
arcpy.env.overwriteOutput = True

# ---------------------------------------------------------------------------
# 2. DOMAINS
# ---------------------------------------------------------------------------
def make_coded_domain(name, desc, field_type, codes):
    existing = [d.name for d in arcpy.da.ListDomains(GDB)]
    if name not in existing:
        arcpy.management.CreateDomain(GDB, name, desc, field_type, "CODED")
        print(f"Domain created: {name}")
    for code, value in codes.items():
        arcpy.management.AddCodedValueToDomain(GDB, name, code, value)

# Severity is the core of the visual cue system on the landing page.
# 1 -> Advisory (yellow)  2 -> Watch (orange)
# 3 -> Warning (red)      4 -> Emergency (dark red, pulsing banner)
make_coded_domain(
    "CoFOREM_Severity", "Emergency severity level", "SHORT",
    {1: "Advisory", 2: "Watch", 3: "Warning", 4: "Emergency"})

make_coded_domain(
    "CoFOREM_IncidentType", "Type of emergency incident", "TEXT",
    {
        "FLOOD":      "Flooding / High Water",
        "FIRE":       "Fire / Wildfire",
        "WEATHER":    "Severe Weather",
        "WATER":      "Water System (Leak / Boil Notice / Outage)",
        "WASTEWATER": "Wastewater / Sanitary Overflow",
        "ROAD":       "Road Hazard / Closure",
        "POLICE":     "Police / Public Safety Activity",
        "UTILITY":    "Utility Outage (Power / Gas / Comms)",
        "HAZMAT":     "Hazardous Materials",
        "OTHER":      "Other",
    })

make_coded_domain(
    "CoFOREM_Status", "Operational status", "TEXT",
    {
        "ACTIVE":     "Active",
        "MONITORING": "Monitoring",
        "SCHEDULED":  "Scheduled / Planned",
        "RESOLVED":   "Resolved",
    })

make_coded_domain(
    "CoFOREM_ClosureType", "Road closure type", "TEXT",
    {
        "FULL":    "Full Closure",
        "LANE":    "Lane Closure",
        "ALT":     "One-Lane Alternating",
        "LOWWATER":"Low Water Crossing - Impassable",
    })

# ---------------------------------------------------------------------------
# 3. FEATURE CLASSES
# ---------------------------------------------------------------------------
COMMON_FIELDS = [
    # (name, type, alias, length, domain)
    ("IncidentName", "TEXT",   "Incident Name",            120, None),
    ("IncidentType", "TEXT",   "Incident Type",             20, "CoFOREM_IncidentType"),
    ("Severity",     "SHORT",  "Severity Level",          None, "CoFOREM_Severity"),
    ("Status",       "TEXT",   "Status",                    15, "CoFOREM_Status"),
    ("Description",  "TEXT",   "Public Description",      1000, None),
    ("Instructions", "TEXT",   "Protective Action / Instructions", 1000, None),
    ("LocationDesc", "TEXT",   "Location Description",     255, None),
    ("StartDate",    "DATE",   "Start / Effective",       None, None),
    ("EndDate",      "DATE",   "Estimated End",           None, None),
    ("Department",   "TEXT",   "Issuing Department",       100, None),
    ("ContactInfo",  "TEXT",   "Public Contact",           150, None),
    ("MoreInfoURL",  "TEXT",   "More Info Link",           255, None),
]

def build_fc(name, geom, extra_fields=()):
    if arcpy.Exists(os.path.join(GDB, name)):
        arcpy.management.Delete(os.path.join(GDB, name))
    arcpy.management.CreateFeatureclass(GDB, name, geom, spatial_reference=SR)
    fc = os.path.join(GDB, name)
    for fname, ftype, alias, length, domain in list(COMMON_FIELDS) + list(extra_fields):
        arcpy.management.AddField(fc, fname, ftype,
                                  field_length=length if length else None,
                                  field_alias=alias)
        if domain:
            arcpy.management.AssignDomainToField(fc, fname, domain)
    # Editor tracking gives the landing page an honest "last updated" stamp
    arcpy.management.EnableEditorTracking(
        fc, "CreatedBy", "CreatedDate", "UpdatedBy", "UpdatedDate",
        "ADD_FIELDS", "UTC")
    arcpy.management.EnableAttachments(fc)
    print(f"Feature class built: {name} ({geom})")
    return fc

fc_incidents = build_fc("CoFOREM_Emergency_Incidents", "POINT")
fc_areas     = build_fc("CoFOREM_Emergency_Areas", "POLYGON")
fc_closures  = build_fc(
    "CoFOREM_Road_Closures", "POLYLINE",
    extra_fields=[
        ("ClosureType", "TEXT", "Closure Type", 10, "CoFOREM_ClosureType"),
        ("DetourDesc",  "TEXT", "Detour Description", 500, None),
        ("RoadName",    "TEXT", "Road Name", 100, None),
    ])

# ---------------------------------------------------------------------------
# 4. ADD TO A DEDICATED MAP AND PUBLISH TO ARCGIS ONLINE
# ---------------------------------------------------------------------------
aprx = arcpy.mp.ArcGISProject("CURRENT")

# Create (or reuse) a clean map so only these three layers publish
map_name = "CoFOREM_Publish"
pub_map = None
for m in aprx.listMaps():
    if m.name == map_name:
        pub_map = m
        for lyr in m.listLayers():
            if not lyr.isBasemapLayer:
                m.removeLayer(lyr)
        break
if pub_map is None:
    pub_map = aprx.createMap(map_name)

# Draw order in service: last added = index 0? Add in reverse of desired
# index order so the service exposes: 0=Incidents, 1=Areas, 2=Closures.
lyr_closures  = pub_map.addDataFromPath(fc_closures)
lyr_areas     = pub_map.addDataFromPath(fc_areas)
lyr_incidents = pub_map.addDataFromPath(fc_incidents)
aprx.save()
print("Layers added to publish map.")

# --- Sharing draft ---------------------------------------------------------
out_dir = arcpy.env.scratchFolder
sddraft_path = os.path.join(out_dir, f"{SERVICE_NAME}.sddraft")
sd_path      = os.path.join(out_dir, f"{SERVICE_NAME}.sd")
for p in (sddraft_path, sd_path):
    if os.path.exists(p):
        os.remove(p)

draft = pub_map.getWebLayerSharingDraft("HOSTING_SERVER", "FEATURE", SERVICE_NAME)
draft.summary          = SUMMARY
draft.tags             = TAGS
draft.description      = SUMMARY
draft.credits          = "City of Fair Oaks Ranch"
draft.useLimitations   = ("For situational awareness only. Follow official "
                          "instructions from emergency personnel.")
draft.portalFolder     = PORTAL_FOLDER
draft.overwriteExistingService = True

draft.exportToSDDraft(sddraft_path)
print("SD draft exported. Staging...")

arcpy.server.StageService(sddraft_path, sd_path)
print("Staged. Uploading to ArcGIS Online...")

arcpy.server.UploadServiceDefinition(
    in_sd_file=sd_path,
    in_server="My Hosted Services",
    in_folder_type="FROM_SERVICE_DEFINITION",
    in_override="OVERRIDE_DEFINITION",
    in_public="PUBLIC" if SHARE_PUBLIC else "PRIVATE",
    in_organization="SHARE_ORGANIZATION" if SHARE_PUBLIC else "NO_SHARE_ORGANIZATION",
)
print("=" * 70)
print(f"PUBLISHED: {SERVICE_NAME}")
print("Expected REST endpoint:")
print(f"  https://services6.arcgis.com/Cnwpb7mZuifVHE6A/arcgis/rest/services/"
      f"{SERVICE_NAME}/FeatureServer")
print("  Layer 0: Emergency Incidents (points)")
print("  Layer 1: Emergency Areas (polygons)")
print("  Layer 2: Road Closures (polylines)")
print("VERIFY the layer indexes in the REST directory, then paste the")
print("FeatureServer URL into APP_CONFIG in emergency_landing_page.html.")
print("=" * 70)

# ---------------------------------------------------------------------------
# 5. POST-PUBLISH CHECKLIST (manual, in AGOL item settings)
# ---------------------------------------------------------------------------
print("""
POST-PUBLISH CHECKLIST (AGOL item > Settings):
 1. Enable editing on the hosted layer for EOC staff ONLY — then create a
    read-only public VIEW if you prefer edits stay internal:
      Item > Create View Layer > share the VIEW public, keep source org-only.
 2. Enable Sync/Offline only if field staff need it.
 3. Confirm 'Allow others to export' is OFF.
 4. Delete Protection: ON.
 5. Optional: set refresh interval 1 min on the item so Map Viewer honors it.
""")
