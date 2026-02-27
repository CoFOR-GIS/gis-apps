/**
 * City of Fair Oaks Ranch — Water Meter Editor
 * Main Application
 *
 * Provides the Utility Clerk with a streamlined editing interface
 * for water meter point features, including search, attribute editing,
 * new meter placement, and attachment management.
 */

require([
  "esri/config",
  "esri/portal/Portal",
  "esri/identity/OAuthInfo",
  "esri/identity/IdentityManager",
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/widgets/Search",
  "esri/widgets/Editor",
  "esri/widgets/Zoom",
  "esri/widgets/BasemapToggle",
  "esri/widgets/Locate",
  "esri/widgets/Legend",
  "esri/popup/content/AttachmentsContent",
  "esri/popup/content/FieldsContent",
  "esri/core/reactiveUtils"
], function (
  esriConfig, Portal, OAuthInfo, IdentityManager,
  Map, MapView, FeatureLayer, Search, Editor,
  Zoom, BasemapToggle, Locate, Legend,
  AttachmentsContent, FieldsContent, reactiveUtils
) {

  // ── State ─────────────────────────────────────────────────────
  let view, meterLayer, editor, searchWidget;
  let featureCount = 0;

  // ── DOM References ────────────────────────────────────────────
  const statusEl     = document.getElementById("statusText");
  const countEl      = document.getElementById("featureCount");
  const userEl       = document.getElementById("userName");
  const sidebarEl    = document.getElementById("sidebar");
  const toggleBtn    = document.getElementById("sidebarToggle");
  const editorPanel  = document.getElementById("editorContainer");
  const welcomePanel = document.getElementById("welcomePanel");

  // ── Helpers ───────────────────────────────────────────────────
  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.className = isError ? "status-error" : "";
  }

  function updateCount() {
    meterLayer.queryFeatureCount().then(function (count) {
      featureCount = count;
      countEl.textContent = count.toLocaleString() + " meters";
    }).catch(function () {
      countEl.textContent = "—";
    });
  }

  // ── Sidebar Toggle ────────────────────────────────────────────
  toggleBtn.addEventListener("click", function () {
    sidebarEl.classList.toggle("collapsed");
    toggleBtn.textContent = sidebarEl.classList.contains("collapsed") ? "☰" : "✕";
  });

  // ── Authentication ────────────────────────────────────────────
  setStatus("Authenticating…");

  var oAuthInfo = new OAuthInfo({
    appId: APP_CONFIG.OAUTH_APP_ID,
    portalUrl: APP_CONFIG.PORTAL_URL,
    popup: false   // Redirect-based: page redirects to AGOL, then back
  });

  IdentityManager.registerOAuthInfos([oAuthInfo]);

  IdentityManager.checkSignInStatus(APP_CONFIG.PORTAL_URL + "/sharing")
    .then(function () {
      return Portal.load ? new Portal({ url: APP_CONFIG.PORTAL_URL }).load() : loadPortal();
    })
    .catch(function () {
      return IdentityManager.getCredential(APP_CONFIG.PORTAL_URL + "/sharing");
    })
    .then(function () {
      var portal = new Portal({ url: APP_CONFIG.PORTAL_URL });
      portal.authMode = "immediate";
      return portal.load();
    })
    .then(function (portal) {
      userEl.textContent = portal.user.fullName || portal.user.username;
      setStatus("Authenticated");
      initializeApp();
    })
    .catch(function (err) {
      setStatus("Authentication failed: " + err.message, true);
      console.error("Auth error:", err);
    });

  // ── Initialize ────────────────────────────────────────────────
  function initializeApp() {
    setStatus("Loading map…");

    // Feature Layer — loaded via portal item ID for auth compatibility
    meterLayer = new FeatureLayer({
      portalItem: {
        id: APP_CONFIG.LAYER_ITEM_ID,
        portal: { url: APP_CONFIG.PORTAL_URL }
      },
      layerId: APP_CONFIG.LAYER_ID,
      outFields: ["*"],
      title: "Water Meters",
      popupTemplate: buildPopupTemplate(),
      editingEnabled: true
    });

    // Jurisdictional Boundaries — used for map centering only (not visible)
    var boundaryLayer = new FeatureLayer({
      url: "https://services6.arcgis.com/Cnwpb7mZuifVHE6A/arcgis/rest/services/FOR_Jurisdictional/FeatureServer",
      visible: false
    });

    // Map
    var map = new Map({
      basemap: APP_CONFIG.MAP_BASEMAP,
      layers: [boundaryLayer, meterLayer]
    });

    // View — starts with a safe initial center; refined by boundary extent
    view = new MapView({
      container: "viewDiv",
      map: map,
      center: [-98.69, 29.74],
      zoom: 14,
      padding: { left: 0 },
      ui: { components: ["attribution"] },
      constraints: { minZoom: 12 },
      popup: {
        dockEnabled: true,
        dockOptions: {
          position: "bottom-right",
          breakpoint: false
        }
      }
    });

    view.when(function () {
      // Query the boundary layer extent to center on city limits
      boundaryLayer.queryExtent().then(function (result) {
        if (result && result.extent) {
          return view.goTo(result.extent);
        }
      }).then(function () {
        setStatus("Ready");
      }).catch(function () {
        setStatus("Ready");
      });

      setupWidgets();
      updateCount();

      // Refresh count after edits
      meterLayer.on("edits", function () {
        updateCount();
        setStatus("Edit saved");
      });
    }).catch(function (err) {
      setStatus("Map load error: " + err.message, true);
    });
  }

  // ── Popup Template ────────────────────────────────────────────
  function buildPopupTemplate() {
    var fieldsContent = new FieldsContent({
      fieldInfos: [
        { fieldName: "AccntNo",           label: "Account No." },
        { fieldName: "Mod_Acc",           label: "Short Account" },
        { fieldName: "MeterNo",           label: "Meter No." },
        { fieldName: "FlexNetNo",         label: "FlexNet No." },
        { fieldName: "ServiceType",       label: "Service Type" },
        { fieldName: "AccntName",         label: "Account Name" },
        { fieldName: "AccntAddress",      label: "Service Address" },
        { fieldName: "InstallDate",       label: "Service Start Date", format: { dateFormat: "short-date" } },
        { fieldName: "MeterInstallDate",  label: "Meter Install Date", format: { dateFormat: "short-date" } }
      ]
    });

    var attachmentsContent = new AttachmentsContent({
      displayType: "auto"
    });

    return {
      title: "Meter {MeterNo} — {AccntAddress}",
      outFields: ["*"],
      content: [fieldsContent, attachmentsContent],
      actions: [
        {
          id: "edit-meter",
          title: "Edit Meter",
          className: "esri-icon-edit"
        }
      ]
    };
  }

  // ── Widgets ───────────────────────────────────────────────────
  function setupWidgets() {

    // Search
    searchWidget = new Search({
      view: view,
      container: "searchContainer",
      includeDefaultSources: false,
      allPlaceholder: "Search meters by account, address, meter #…",
      sources: [
        {
          layer: meterLayer,
          searchFields: APP_CONFIG.SEARCH_FIELDS,
          displayField: "AccntAddress",
          exactMatch: false,
          outFields: ["*"],
          name: "Water Meters",
          placeholder: "Account #, Meter #, FlexNet #, Address…",
          suggestionTemplate: "{AccntAddress} — Meter {MeterNo}",
          suggestionsEnabled: true,
          minSuggestCharacters: 2,
          maxSuggestions: 8,
          zoomScale: 2000
        }
      ]
    });

    // Editor
    editor = new Editor({
      view: view,
      container: editorPanel,
      layer: meterLayer,
      snappingOptions: {
        enabled: true,
        featureSources: [{ layer: meterLayer, enabled: true }]
      },
      visibleElements: {
        snappingControls: true,
        sketchTooltipControls: true
      },
      layerInfos: [
        {
          layer: meterLayer,
          formTemplate: buildFormTemplate(),
          addEnabled: true,
          updateEnabled: true,
          deleteEnabled: true,
          attachmentsOnCreateEnabled: true,
          attachmentsOnUpdateEnabled: true
        }
      ]
    });

    // Show welcome when editor is idle
    reactiveUtils.watch(
      function () { return editor.viewModel.state; },
      function (state) {
        if (state === "ready") {
          welcomePanel.style.display = "block";
        } else {
          welcomePanel.style.display = "none";
        }
      }
    );

    // Zoom
    var zoom = new Zoom({ view: view });
    view.ui.add(zoom, "bottom-right");

    // Basemap Toggle
    var basemapToggle = new BasemapToggle({
      view: view,
      nextBasemap: "satellite"
    });
    view.ui.add(basemapToggle, "bottom-right");

    // Locate
    var locate = new Locate({ view: view });
    view.ui.add(locate, "bottom-right");
  }

  // ── Form Template ─────────────────────────────────────────────
  function buildFormTemplate() {
    return {
      title: "Water Meter",
      description: "Enter or update meter information below.",
      elements: [
        {
          type: "group",
          label: "Account Information",
          description: "Billing and service identification",
          elements: [
            {
              type: "field",
              fieldName: "AccntNo",
              label: "Account Number",
              description: "Full billing account number (e.g. 01-0234-01)",
              requiredExpression: null
            },
            {
              type: "field",
              fieldName: "Mod_Acc",
              label: "Short Account (Mod_Acc)",
              description: "Derived short form (xx-xxxx)"
            },
            {
              type: "field",
              fieldName: "AccntName",
              label: "Name on Account"
            },
            {
              type: "field",
              fieldName: "AccntAddress",
              label: "Service Address"
            },
            {
              type: "field",
              fieldName: "ServiceType",
              label: "Service Type",
              description: "Water or Well"
            }
          ]
        },
        {
          type: "group",
          label: "Meter & AMI Details",
          description: "Physical meter and radio identification",
          elements: [
            {
              type: "field",
              fieldName: "MeterNo",
              label: "Meter Number",
              description: "Number stamped on the meter case or lid"
            },
            {
              type: "field",
              fieldName: "FlexNetNo",
              label: "FlexNet Endpoint",
              description: "AMI radio ID paired with this meter"
            }
          ]
        },
        {
          type: "group",
          label: "Dates",
          description: "Installation and service timeline",
          elements: [
            {
              type: "field",
              fieldName: "InstallDate",
              label: "Service Start Date",
              description: "Date service was first activated at this location"
            },
            {
              type: "field",
              fieldName: "MeterInstallDate",
              label: "Meter Install Date",
              description: "Date the current physical meter was installed (update on change-outs)"
            }
          ]
        }
      ]
    };
  }

});
