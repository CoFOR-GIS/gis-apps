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
  OAUTH_APP_ID: "YOUR_APP_ID_HERE",

  // -- Data Source --
  // Water Meters - Operational Edit View (Utilities - Internal)
  LAYER_ITEM_ID: "d3f51dc1392f483abfa74eec072f972d",
  LAYER_ID: 1,

  // -- Search Configuration --
  SEARCH_FIELDS: ["MeterNo", "AccntNo", "FlexNetNo", "AccntAddress", "AccntName"],

  // -- Field Configuration --
  EDIT_FIELDS: [
    "MeterNo", "AccntNo", "FlexNetNo", "ServiceType",
    "AccntName", "AccntAddress", "Mod_Acc",
    "InstallDate", "MeterInstallDate"
  ],

  // -- Map Defaults --
  MAP_CENTER: [-98.69, 29.74],
  MAP_ZOOM: 14,
  MAP_BASEMAP: "gray-vector",

  // -- UI --
  SELECTION_HIGHLIGHT_COLOR: [0, 200, 255, 0.4],
  SELECTION_OUTLINE_COLOR: [0, 200, 255, 1]
};
