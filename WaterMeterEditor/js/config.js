/**
 * City of Fair Oaks Ranch - Water Meter Editor
 * Configuration
 *
 * DEPLOYMENT:
 * 1. Drop this folder into your gis-apps GitHub repo as "WaterMeterEditor/"
 * 2. Register (or reuse) an OAuth App in AGOL
 * 3. Add redirect URI: https://<username>.github.io/gis-apps/WaterMeterEditor/
 * 4. Paste the App ID below
 */
var APP_CONFIG = {

  // -- ArcGIS Online Organization --
  PORTAL_URL: "https://fairoaksranch.maps.arcgis.com",

  // -- OAuth 2.0 (redirect-based, no popup) --
  OAUTH_APP_ID: "DhZk7VoirUPP4Sa2",

  // -- Data Sources --

  // Water Meters + Service Lines (Operational Edit View - Internal)
  // Meters = Layer 1, Service Lines = Layer 5
  EDIT_VIEW_ITEM_ID: "d3f51dc1392f483abfa74eec072f972d",
  METER_LAYER_ID: 1,
  SERVICE_LINE_LAYER_ID: 5,

  // Water Main Distribution (Public View - visualization only)
  WATER_MAIN_ITEM_ID: "add610c5a4694af1b34bd2c9cf4af56d",

  // -- Search Configuration --
  METER_SEARCH_FIELDS: ["MeterNo", "AccntNo", "FlexNetNo", "AccntAddress", "AccntName"],
  SERVICE_LINE_SEARCH_FIELDS: ["RefName", "Material", "Pipe_Size"],

  // -- Soft Delete --
  // Service Lines: Field_Verified = "Removed" hides the feature
  // Meters: delete disabled (no suitable status field on view)
  SOFT_DELETE_FIELD: "Field_Verified",
  SOFT_DELETE_VALUE: "Removed",

  // -- Map Defaults --
  MAP_BASEMAP: "gray-vector"
};
