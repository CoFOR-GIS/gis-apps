/**
 * City of Fair Oaks Ranch — Parcel Exemption Editor
 * Configuration
 *
 * Hosted on ArcGIS Online as a registered Web Application.
 * OAuth uses popup-based authentication.
 */
var APP_CONFIG = {

  // ── ArcGIS Online Organization ──────────────────────────────────
  PORTAL_URL: "https://fairoaksranch.maps.arcgis.com",

  // ── OAuth 2.0 ───────────────────────────────────────────────────
  OAUTH_APP_ID: "DhZk7VoirUPP4Sa2",

  // ── Data Source ─────────────────────────────────────────────────
  // Hosted Feature Layer View — Parcel Exemptions (Internal)
  LAYER_ITEM_ID: "4e596e6f2c1d437f841f0af65598c07a",

  // ── Batch Edit Settings ─────────────────────────────────────────
  // AGOL applyEdits cap per request (safe margin under 2000 limit)
  BATCH_CHUNK_SIZE: 1000,

  // ── Field Configuration ─────────────────────────────────────────
  EDIT_FIELD: "Land_Use",
  SEARCH_FIELDS: ["ADDRESS", "PropID", "Subdivision_1"],
  DISPLAY_FIELDS: ["ADDRESS", "PropID", "Subdivision_1", "Land_Use", "OWNER"],

  // ── Land Use Domain Values ──────────────────────────────────────
  DEFAULT_UNCLASSIFIED: "As is",

  // ── Map Defaults ────────────────────────────────────────────────
  MAP_CENTER: [-98.69, 29.74],   // Fair Oaks Ranch approximate center
  MAP_ZOOM: 14,

  // ── UI ──────────────────────────────────────────────────────────
  SELECTION_HIGHLIGHT_COLOR: [0, 255, 255, 0.35],
  SELECTION_OUTLINE_COLOR: [0, 255, 255, 1]
};
