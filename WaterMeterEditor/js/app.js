/**
 * City of Fair Oaks Ranch - Water Meter Editor
 * Main Application
 *
 * Mirrors the proven Parcel Exemption Editor auth and layer loading pattern.
 * Provides the Utility Clerk with a streamlined editing interface for
 * water meter point features.
 */
require([
  "esri/portal/Portal",
  "esri/identity/OAuthInfo",
  "esri/identity/IdentityManager",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/widgets/Search",
  "esri/widgets/Editor",
  "esri/widgets/Zoom",
  "esri/widgets/BasemapToggle",
  "esri/widgets/Locate",
  "esri/popup/content/AttachmentsContent",
  "esri/popup/content/FieldsContent",
  "esri/core/reactiveUtils"
], function (
  Portal, OAuthInfo, IdentityManager,
  MapView, FeatureLayer, Search, Editor,
  Zoom, BasemapToggle, Locate,
  AttachmentsContent, FieldsContent, reactiveUtils
) {

  var cfg = APP_CONFIG;

  // -- State --
  var view, meterLayer, editor;

  // -- DOM --
  var statusEl     = document.getElementById("statusText");
  var countEl      = document.getElementById("featureCount");
  var userEl       = document.getElementById("userName");
  var sidebarEl    = document.getElementById("sidebar");
  var toggleBtn    = document.getElementById("sidebarToggle");
  var editorPanel  = document.getElementById("editorContainer");
  var welcomePanel = document.getElementById("welcomePanel");

  // -- Helpers --
  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.className = isError ? "status-error" : "";
  }

  function updateCount() {
    meterLayer.queryFeatureCount().then(function (count) {
      countEl.textContent = count.toLocaleString() + " meters";
    }).catch(function () {
      countEl.textContent = "-";
    });
  }

  // -- Sidebar Toggle --
  toggleBtn.addEventListener("click", function () {
    sidebarEl.classList.toggle("collapsed");
    toggleBtn.textContent = sidebarEl.classList.contains("collapsed") ? "\u2630" : "\u2715";
  });


  // ================================================================
  //  AUTHENTICATION (matches Parcel Editor pattern)
  // ================================================================
  async function initAuth() {
    var oauthInfo = new OAuthInfo({
      appId: cfg.OAUTH_APP_ID,
      portalUrl: cfg.PORTAL_URL,
      popup: false
    });
    IdentityManager.registerOAuthInfos([oauthInfo]);

    try {
      return await IdentityManager.checkSignInStatus(cfg.PORTAL_URL + "/sharing");
    } catch (e) {
      return await IdentityManager.getCredential(cfg.PORTAL_URL + "/sharing");
    }
  }

  async function loadUserInfo() {
    try {
      var portal = new Portal({ url: cfg.PORTAL_URL });
      await portal.load();
      userEl.textContent = portal.user.fullName || portal.user.username;
    } catch (e) {
      userEl.textContent = "Authenticated";
    }
  }


  // ================================================================
  //  MAP SETUP
  // ================================================================
  async function initMap() {

    // Jurisdictional Boundaries - used for centering only
    var boundaryLayer = new FeatureLayer({
      url: "https://services6.arcgis.com/Cnwpb7mZuifVHE6A/arcgis/rest/services/FOR_Jurisdictional/FeatureServer",
      visible: false
    });

    view = new MapView({
      container: "viewDiv",
      map: {
        basemap: cfg.MAP_BASEMAP,
        layers: [boundaryLayer, meterLayer]
      },
      center: [-98.69, 29.74],
      zoom: 14,
      popup: {
        dockEnabled: true,
        dockOptions: { position: "bottom-right", breakpoint: false }
      }
    });

    await view.when();

    // Center on city limits
    try {
      var result = await boundaryLayer.queryExtent();
      if (result && result.extent) {
        await view.goTo(result.extent.expand(1.1));
      }
    } catch (e) {
      console.warn("Could not zoom to boundary extent:", e);
    }

    return view;
  }


  // ================================================================
  //  POPUP TEMPLATE
  // ================================================================
  function buildPopupTemplate() {
    var fieldsContent = new FieldsContent({
      fieldInfos: [
        { fieldName: "AccntNo",          label: "Account No." },
        { fieldName: "Mod_Acc",          label: "Short Account" },
        { fieldName: "MeterNo",          label: "Meter No.",
          format: { digitSeparator: false, places: 0 } },
        { fieldName: "FlexNetNo",        label: "FlexNet No.",
          format: { digitSeparator: false, places: 0 } },
        { fieldName: "ServiceType",      label: "Service Type" },
        { fieldName: "AccntName",        label: "Account Name" },
        { fieldName: "AccntAddress",     label: "Service Address" },
        { fieldName: "InstallDate",      label: "Service Start Date",
          format: { dateFormat: "short-date" } },
        { fieldName: "MeterInstallDate", label: "Meter Install Date",
          format: { dateFormat: "short-date" } }
      ]
    });

    var attachmentsContent = new AttachmentsContent({
      displayType: "auto"
    });

    return {
      title: "Meter {MeterNo} - {AccntAddress}",
      outFields: ["*"],
      content: [fieldsContent, attachmentsContent]
    };
  }


  // ================================================================
  //  FORM TEMPLATE
  // ================================================================
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
              description: "Full billing account number (e.g. 01-0234-01)"
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


  // ================================================================
  //  WIDGETS
  // ================================================================
  function setupWidgets() {

    // Search
    new Search({
      view: view,
      container: "searchContainer",
      includeDefaultSources: false,
      allPlaceholder: "Search meters by account, address, meter #...",
      sources: [
        {
          layer: meterLayer,
          searchFields: cfg.SEARCH_FIELDS,
          displayField: "AccntAddress",
          exactMatch: false,
          outFields: ["*"],
          name: "Water Meters",
          placeholder: "Account #, Meter #, FlexNet #, Address...",
          suggestionTemplate: "{AccntAddress} - Meter {MeterNo}",
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

    // Toggle welcome panel based on editor state
    reactiveUtils.watch(
      function () { return editor.viewModel.state; },
      function (state) {
        welcomePanel.style.display = (state === "ready") ? "block" : "none";
      }
    );

    // Zoom
    view.ui.add(new Zoom({ view: view }), "bottom-right");

    // Basemap Toggle
    view.ui.add(new BasemapToggle({
      view: view,
      nextBasemap: "satellite"
    }), "bottom-right");

    // Locate
    view.ui.add(new Locate({ view: view }), "bottom-right");
  }


  // ================================================================
  //  BOOT (matches Parcel Editor pattern)
  // ================================================================
  async function boot() {
    try {
      setStatus("Authenticating...");
      await initAuth();
      await loadUserInfo();

      setStatus("Loading meter layer...");

      // Load layer via portal item ID (proven pattern)
      meterLayer = new FeatureLayer({
        portalItem: { id: cfg.LAYER_ITEM_ID },
        layerId: cfg.LAYER_ID,
        outFields: ["*"],
        title: "Water Meters",
        popupTemplate: buildPopupTemplate(),
        editingEnabled: true
      });

      try {
        await meterLayer.load();
      } catch (layerErr) {
        setStatus("Layer failed: " + layerErr.message, true);
        console.error("Layer load error:", layerErr);
        return;
      }

      setStatus("Loading map...");
      await initMap();

      setupWidgets();
      updateCount();

      // Refresh count after edits
      meterLayer.on("edits", function () {
        updateCount();
        setStatus("Edit saved");
      });

      setStatus("Ready");

    } catch (err) {
      setStatus("Error: " + err.message, true);
      console.error("Boot error:", err);
    }
  }

  boot();

});
