/**
 * City of Fair Oaks Ranch - Water Meter Editor
 * Main Application
 *
 * Three layers:
 *   1. Water Mains (public view, visualization only)
 *   2. Service Lines (editable, soft delete via Field_Verified)
 *   3. Water Meters (editable, delete disabled)
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
  "esri/widgets/Legend",
  "esri/widgets/LayerList",
  "esri/popup/content/CustomContent",
  "esri/core/reactiveUtils"
], function (
  Portal, OAuthInfo, IdentityManager,
  MapView, FeatureLayer, Search, Editor,
  Zoom, BasemapToggle, Locate, Legend, LayerList,
  CustomContent, reactiveUtils
) {

  var cfg = APP_CONFIG;

  // -- State --
  var view, meterLayer, serviceLineLayer, waterMainLayer, editor;

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
    var mCount = 0, slCount = 0;
    meterLayer.queryFeatureCount().then(function (c) {
      mCount = c;
      return serviceLineLayer.queryFeatureCount();
    }).then(function (c) {
      slCount = c;
      countEl.textContent = mCount.toLocaleString() + " meters | " + slCount.toLocaleString() + " service connections";
    }).catch(function () {
      countEl.textContent = "-";
    });
  }

  // Format number without commas
  function plainNum(val) {
    if (val === null || val === undefined) return "-";
    return String(val);
  }

  // Format date
  function fmtDate(val) {
    if (!val) return "-";
    var d = new Date(val);
    return (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();
  }

  // Format pipe size display
  function fmtPipeSize(val) {
    if (val === null || val === undefined) return "-";
    if (val === 0.75) return '3/4"';
    if (val === 1) return '1"';
    if (val === 1.5) return '1-1/2"';
    if (val === 2) return '2"';
    if (val === 4) return '4"';
    if (val === 6) return '6"';
    if (val === 8) return '8"';
    if (val === 10) return '10"';
    if (val === 12) return '12"';
    return val + '"';
  }

  // Sidebar toggle
  toggleBtn.addEventListener("click", function () {
    sidebarEl.classList.toggle("collapsed");
    toggleBtn.textContent = sidebarEl.classList.contains("collapsed") ? "\u2630" : "\u2715";
  });


  // ================================================================
  //  AUTHENTICATION
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
  //  POPUP TEMPLATES
  // ================================================================

  // -- Shared popup CSS injected once --
  var popupCSS = document.createElement("style");
  popupCSS.textContent = [
    ".wm-popup { font-family: 'Segoe UI', sans-serif; font-size: 12px; color: #2c3e50; }",
    ".wm-popup-section { margin-bottom: 10px; }",
    ".wm-popup-section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; padding: 5px 8px; border-radius: 3px; margin-bottom: 6px; }",
    ".wm-popup-row { display: flex; justify-content: space-between; padding: 4px 8px; border-bottom: 1px solid #f0f0f0; }",
    ".wm-popup-row:last-child { border-bottom: none; }",
    ".wm-popup-label { color: #7f8c8d; font-weight: 500; }",
    ".wm-popup-value { color: #2c3e50; font-weight: 600; text-align: right; max-width: 60%; }",
    ".wm-section-meter .wm-popup-section-title { background: #2e86c1; color: #fff; }",
    ".wm-section-service .wm-popup-section-title { background: #27ae60; color: #fff; }",
    ".wm-section-main .wm-popup-section-title { background: #8e44ad; color: #fff; }",
    ".wm-retire-btn { display: block; width: 100%; margin-top: 8px; padding: 8px; border: 1px solid #c0392b; background: #fff; color: #c0392b; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; text-align: center; transition: all 0.15s; }",
    ".wm-retire-btn:hover { background: #c0392b; color: #fff; }"
  ].join("\n");
  document.head.appendChild(popupCSS);

  // Row helper
  function row(label, value) {
    return '<div class="wm-popup-row"><span class="wm-popup-label">' + label + '</span><span class="wm-popup-value">' + (value || "-") + '</span></div>';
  }

  // -- Water Meter popup --
  function meterPopupTemplate() {
    return {
      title: "Water Meter",
      outFields: ["*"],
      content: function (feature) {
        var a = feature.graphic.attributes;
        var html = '<div class="wm-popup wm-section-meter">';

        html += '<div class="wm-popup-section"><div class="wm-popup-section-title">Account</div>';
        html += row("Account No.", a.AccntNo);
        html += row("Short Account", a.Mod_Acc);
        html += row("Name", a.AccntName);
        html += row("Address", a.AccntAddress);
        html += row("Service Type", a.ServiceType);
        html += '</div>';

        html += '<div class="wm-popup-section"><div class="wm-popup-section-title">Meter & AMI</div>';
        html += row("Meter No.", plainNum(a.MeterNo));
        html += row("FlexNet No.", plainNum(a.FlexNetNo));
        html += '</div>';

        html += '<div class="wm-popup-section"><div class="wm-popup-section-title">Dates</div>';
        html += row("Service Start", fmtDate(a.InstallDate));
        html += row("Meter Installed", fmtDate(a.MeterInstallDate));
        html += '</div>';

        html += '</div>';
        return html;
      }
    };
  }

  // -- Service Line popup --
  function serviceLinePopupTemplate() {
    return {
      title: "Service Line",
      outFields: ["*"],
      content: function (feature) {
        var a = feature.graphic.attributes;
        var html = '<div class="wm-popup wm-section-service">';

        html += '<div class="wm-popup-section"><div class="wm-popup-section-title">Line Information</div>';
        html += row("Type", a.Linetype);
        html += row("Pipe Size", fmtPipeSize(a.Pipe_Size));
        html += row("Material", a.Material);
        html += row("Depth", a.Depth ? a.Depth + " ft" : "-");
        html += '</div>';

        html += '<div class="wm-popup-section"><div class="wm-popup-section-title">Pressure Zone</div>';
        html += row("Zone", a.RefName);
        html += row("Source", a.Main_Line);
        html += row("PSI", a.PSI ? a.PSI + " psi" : "-");
        html += row("Water Type", a.Water_Type);
        html += '</div>';

        html += '<div class="wm-popup-section"><div class="wm-popup-section-title">Verification</div>';
        html += row("Status", a.Field_Verified || "Not Verified");
        html += '</div>';

        // Soft delete button
        html += '<button class="wm-retire-btn" onclick="window._softDeleteServiceLine(\'' + a.GlobalID + '\')">Retire Service Line</button>';

        html += '</div>';
        return html;
      }
    };
  }

  // -- Water Main popup (bare bones) --
  function waterMainPopupTemplate() {
    return {
      title: "Water Main",
      outFields: ["*"],
      content: function (feature) {
        var a = feature.graphic.attributes;
        var html = '<div class="wm-popup wm-section-main">';
        html += '<div class="wm-popup-section"><div class="wm-popup-section-title">Main Details</div>';
        html += row("Pipe Size", fmtPipeSize(a.Pipe_Size));
        html += row("Material", a.Material);
        html += row("Zone", a.RefName);
        html += row("Source", a.Main_Line);
        html += row("Water Type", a.Water_Type);
        html += '</div>';
        html += '</div>';
        return html;
      }
    };
  }


  // ================================================================
  //  SOFT DELETE
  // ================================================================

  // Expose globally for popup button onclick
  window._softDeleteServiceLine = async function (globalId) {
    if (!globalId) return;

    var confirmed = confirm(
      "Retire this service line?\n\n" +
      "The feature will be hidden from the map. " +
      "An administrator can restore it by resetting the Field Verified value."
    );
    if (!confirmed) return;

    try {
      setStatus("Retiring service line...");

      // Query the feature by GlobalID
      var result = await serviceLineLayer.queryFeatures({
        where: "GlobalID = '" + globalId + "'",
        outFields: ["OBJECTID_1", cfg.SOFT_DELETE_FIELD],
        returnGeometry: false
      });

      if (!result.features.length) {
        setStatus("Feature not found", true);
        return;
      }

      var feature = result.features[0];
      feature.attributes[cfg.SOFT_DELETE_FIELD] = cfg.SOFT_DELETE_VALUE;

      var editResult = await serviceLineLayer.applyEdits({
        updateFeatures: [feature]
      });

      if (editResult.updateFeatureResults.length && !editResult.updateFeatureResults[0].error) {
        view.closePopup();
        serviceLineLayer.refresh();
        setStatus("Service line retired");
        updateCount();
      } else {
        setStatus("Retire failed", true);
      }
    } catch (err) {
      setStatus("Retire error: " + err.message, true);
      console.error("Soft delete error:", err);
    }
  };


  // ================================================================
  //  FORM TEMPLATES
  // ================================================================

  function meterFormTemplate() {
    return {
      title: "Water Meter",
      description: "Enter or update meter information below.",
      elements: [
        {
          type: "group",
          label: "Account Information",
          description: "Billing and service identification",
          elements: [
            { type: "field", fieldName: "AccntNo", label: "Account Number", description: "Full billing account number (e.g. 01-0234-01)" },
            { type: "field", fieldName: "Mod_Acc", label: "Short Account (Mod_Acc)", description: "Derived short form (xx-xxxx)" },
            { type: "field", fieldName: "AccntName", label: "Name on Account" },
            { type: "field", fieldName: "AccntAddress", label: "Service Address" },
            { type: "field", fieldName: "ServiceType", label: "Service Type", description: "Water or Well" }
          ]
        },
        {
          type: "group",
          label: "Meter & AMI Details",
          description: "Physical meter and radio identification",
          elements: [
            { type: "field", fieldName: "MeterNo", label: "Meter Number", description: "Number stamped on the meter case or lid" },
            { type: "field", fieldName: "FlexNetNo", label: "FlexNet Endpoint", description: "AMI radio ID paired with this meter" }
          ]
        },
        {
          type: "group",
          label: "Dates",
          description: "Installation and service timeline",
          elements: [
            { type: "field", fieldName: "InstallDate", label: "Service Start Date", description: "Date service was first activated at this location" },
            { type: "field", fieldName: "MeterInstallDate", label: "Meter Install Date", description: "Date the current physical meter was installed (update on change-outs)" }
          ]
        }
      ]
    };
  }

  function serviceLineFormTemplate() {
    return {
      title: "Service Line",
      description: "Enter or update service line attributes.",
      elements: [
        {
          type: "group",
          label: "Line Information",
          description: "Physical characteristics of the service line",
          elements: [
            { type: "field", fieldName: "Linetype", label: "Line Type", description: "Service, Main, or Well Line" },
            { type: "field", fieldName: "Pipe_Size", label: "Pipe Size", description: 'Standard sizes: 0.75 (3/4"), 1 (1"), 1.5 (1-1/2"), 2 (2")' },
            { type: "field", fieldName: "Material", label: "Material", description: "PVC, Copper, Galvanized, PEX, etc." },
            { type: "field", fieldName: "Depth", label: "Depth (ft)", description: "Confirmed line depth - update only when verified in the field" }
          ]
        },
        {
          type: "group",
          label: "Pressure Zone",
          description: "Zone and pressure source information",
          elements: [
            { type: "field", fieldName: "RefName", label: "Pressure Zone", description: "Zone identifier (e.g. Zone A, Zone B, Zone C)" },
            { type: "field", fieldName: "Main_Line", label: "Pressure Source", description: "Pressure or Gravity" },
            { type: "field", fieldName: "PSI", label: "PSI", description: "Known pressure reading - update when confirmed" },
            { type: "field", fieldName: "Water_Type", label: "Water Type", description: "Potable or Non-Potable" }
          ]
        },
        {
          type: "group",
          label: "Verification",
          description: "Field verification tracking",
          elements: [
            { type: "field", fieldName: "Field_Verified", label: "Verification Status", description: "Verified, Not Verified, or Removed (hides feature from map)" }
          ]
        }
      ]
    };
  }


  // ================================================================
  //  MAP SETUP
  // ================================================================
  async function initMap() {

    // Jurisdictional Boundaries - centering only
    var boundaryLayer = new FeatureLayer({
      url: "https://services6.arcgis.com/Cnwpb7mZuifVHE6A/arcgis/rest/services/FOR_Jurisdictional/FeatureServer",
      visible: false
    });

    view = new MapView({
      container: "viewDiv",
      map: {
        basemap: cfg.MAP_BASEMAP,
        layers: [boundaryLayer, waterMainLayer, serviceLineLayer, meterLayer]
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
  //  WIDGETS
  // ================================================================
  function setupWidgets() {

    // Search - across meters and service lines
    new Search({
      view: view,
      container: "searchContainer",
      includeDefaultSources: false,
      allPlaceholder: "Search meters, service connections...",
      sources: [
        {
          layer: meterLayer,
          searchFields: cfg.METER_SEARCH_FIELDS,
          displayField: "AccntAddress",
          exactMatch: false,
          outFields: ["*"],
          name: "Meters",
          placeholder: "Account #, Meter #, FlexNet #, Address...",
          suggestionTemplate: "{AccntAddress} - Meter {MeterNo}",
          suggestionsEnabled: true,
          minSuggestCharacters: 2,
          maxSuggestions: 8,
          zoomScale: 2000
        },
        {
          layer: serviceLineLayer,
          searchFields: cfg.SERVICE_LINE_SEARCH_FIELDS,
          displayField: "RefName",
          exactMatch: false,
          outFields: ["*"],
          name: "Service Connections",
          placeholder: "Zone, Material, Pipe Size...",
          suggestionsEnabled: true,
          minSuggestCharacters: 2,
          maxSuggestions: 6,
          zoomScale: 2000
        }
      ]
    });

    // Editor - meters and service lines only (not water mains)
    editor = new Editor({
      view: view,
      container: editorPanel,
      snappingOptions: {
        enabled: true,
        featureSources: [
          { layer: meterLayer, enabled: true },
          { layer: serviceLineLayer, enabled: true }
        ]
      },
      layerInfos: [
        {
          layer: meterLayer,
          formTemplate: meterFormTemplate(),
          addEnabled: true,
          updateEnabled: true,
          deleteEnabled: false,   // No delete - no suitable status field for soft delete
          attachmentsOnCreateEnabled: true,
          attachmentsOnUpdateEnabled: true
        },
        {
          layer: serviceLineLayer,
          formTemplate: serviceLineFormTemplate(),
          addEnabled: true,
          updateEnabled: true,
          deleteEnabled: false,   // No delete - use "Retire" soft delete instead
          attachmentsOnCreateEnabled: true,
          attachmentsOnUpdateEnabled: true
        }
      ]
    });

    // Toggle welcome panel
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

    // Layer List
    view.ui.add(new LayerList({
      view: view,
      container: document.createElement("div")
    }), "top-right");
  }


  // ================================================================
  //  BOOT
  // ================================================================
  async function boot() {
    try {
      setStatus("Authenticating...");
      await initAuth();
      await loadUserInfo();

      setStatus("Loading layers...");

      // Water Meters (editable, layer 1 from edit view)
      meterLayer = new FeatureLayer({
        portalItem: { id: cfg.EDIT_VIEW_ITEM_ID },
        layerId: cfg.METER_LAYER_ID,
        outFields: ["*"],
        title: "Meters",
        popupTemplate: meterPopupTemplate(),
        editingEnabled: true
      });

      // Service Lines (editable, layer 5 from same edit view)
      serviceLineLayer = new FeatureLayer({
        portalItem: { id: cfg.EDIT_VIEW_ITEM_ID },
        layerId: cfg.SERVICE_LINE_LAYER_ID,
        outFields: ["*"],
        title: "Service Connections",
        popupTemplate: serviceLinePopupTemplate(),
        editingEnabled: true,
        // Soft delete filter: hide retired features
        definitionExpression: cfg.SOFT_DELETE_FIELD + " <> '" + cfg.SOFT_DELETE_VALUE + "' OR " + cfg.SOFT_DELETE_FIELD + " IS NULL"
      });

      // Water Mains (public view, visualization only)
      waterMainLayer = new FeatureLayer({
        portalItem: { id: cfg.WATER_MAIN_ITEM_ID },
        outFields: ["*"],
        title: "Distribution Mains",
        popupTemplate: waterMainPopupTemplate(),
        editingEnabled: false,
        listMode: "show",
        opacity: 0.7
      });

      // Load all layers
      try {
        await Promise.all([
          meterLayer.load(),
          serviceLineLayer.load(),
          waterMainLayer.load()
        ]);
      } catch (layerErr) {
        setStatus("Layer failed: " + layerErr.message, true);
        console.error("Layer load error:", layerErr);
        return;
      }

      // Force display names after load() — service definition overrides constructor titles
      meterLayer.title = "Meters";
      serviceLineLayer.title = "Service Connections";
      waterMainLayer.title = "Distribution Mains";

      setStatus("Loading map...");
      await initMap();

      setupWidgets();
      updateCount();

      // Refresh counts after edits
      meterLayer.on("edits", function () { updateCount(); setStatus("Edit saved"); });
      serviceLineLayer.on("edits", function () { updateCount(); setStatus("Edit saved"); });

      setStatus("Ready");

    } catch (err) {
      setStatus("Error: " + err.message, true);
      console.error("Boot error:", err);
    }
  }

  boot();

});
