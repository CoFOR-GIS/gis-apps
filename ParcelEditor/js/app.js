/**
 * City of Fair Oaks Ranch — Parcel Exemption Editor
 * Main Application — v2
 */
require([
  "esri/portal/Portal",
  "esri/identity/OAuthInfo",
  "esri/identity/IdentityManager",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/widgets/Sketch/SketchViewModel",
  "esri/Graphic",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/Color"
], function (
  Portal, OAuthInfo, IdentityManager, MapView,
  FeatureLayer, GraphicsLayer, SketchViewModel,
  Graphic, SimpleFillSymbol, SimpleLineSymbol, Color
) {

  // ════════════════════════════════════════════════════════════════
  //  SELECTION MANAGER
  // ════════════════════════════════════════════════════════════════
  class SelectionManager {
    constructor(view, featureLayer, highlightLayer) {
      this._view = view;
      this._featureLayer = featureLayer;
      this._highlightLayer = highlightLayer;
      this._selected = new Map();
      this._highlightHandles = new Map();
      this._listeners = [];
      this._layerFields = [];

      this._highlightSymbol = new SimpleFillSymbol({
        color: new Color(APP_CONFIG.SELECTION_HIGHLIGHT_COLOR),
        outline: new SimpleLineSymbol({
          color: new Color(APP_CONFIG.SELECTION_OUTLINE_COLOR),
          width: 2
        })
      });
    }

    setLayerFields(fields) {
      this._layerFields = fields.map(function (f) { return f.name; });
    }

    // Build a safe outFields array — only include fields that actually exist
    _safeOutFields() {
      var requested = ["OBJECTID", "Shape__Area"].concat(
        APP_CONFIG.DISPLAY_FIELDS
      );
      var available = this._layerFields;
      if (!available.length) return ["*"];
      return requested.filter(function (f) {
        return available.indexOf(f) !== -1;
      });
    }

    get count() { return this._selected.size; }
    get objectIds() { return Array.from(this._selected.keys()); }
    get features() { return Array.from(this._selected.values()); }

    onChange(fn) { this._listeners.push(fn); }
    _notify() { this._listeners.forEach(function (fn) { fn(); }); }

    async addByQuery(where) {
      var result = await this._featureLayer.queryFeatures({
        where: where,
        outFields: this._safeOutFields(),
        returnGeometry: true
      });
      this._addFeatures(result.features);
    }

    async addBySpatialQuery(geometry) {
      var result = await this._featureLayer.queryFeatures({
        geometry: geometry,
        spatialRelationship: "intersects",
        outFields: this._safeOutFields(),
        returnGeometry: true
      });
      this._addFeatures(result.features);
    }

    async addById(objectId) {
      if (this._selected.has(objectId)) return;
      var result = await this._featureLayer.queryFeatures({
        objectIds: [objectId],
        outFields: this._safeOutFields(),
        returnGeometry: true
      });
      this._addFeatures(result.features);
    }

    remove(objectId) {
      if (!this._selected.has(objectId)) return;
      this._selected.delete(objectId);
      var g = this._highlightHandles.get(objectId);
      if (g) {
        this._highlightLayer.remove(g);
        this._highlightHandles.delete(objectId);
      }
      this._notify();
    }

    clear() {
      this._selected.clear();
      this._highlightLayer.removeAll();
      this._highlightHandles.clear();
      this._notify();
    }

    toggle(objectId) {
      if (this._selected.has(objectId)) {
        this.remove(objectId);
      } else {
        this.addById(objectId);
      }
    }

    _addFeatures(features) {
      var self = this;
      features.forEach(function (f) {
        var oid = f.attributes.OBJECTID;
        if (self._selected.has(oid)) return;

        self._selected.set(oid, {
          attributes: f.attributes,
          geometry: f.geometry
        });

        var graphic = new Graphic({
          geometry: f.geometry,
          symbol: self._highlightSymbol,
          attributes: { OBJECTID: oid }
        });
        self._highlightLayer.add(graphic);
        self._highlightHandles.set(oid, graphic);
      });
      self._notify();
    }
  }


  // ════════════════════════════════════════════════════════════════
  //  BATCH EDITOR
  // ════════════════════════════════════════════════════════════════
  class BatchEditor {
    constructor(featureLayer) {
      this._featureLayer = featureLayer;
      this._undoStack = [];
    }

    get canUndo() { return this._undoStack.length > 0; }
    get lastBatchInfo() {
      if (!this._undoStack.length) return null;
      return { count: this._undoStack[this._undoStack.length - 1].length };
    }

    async apply(objectIds, newValue, onProgress) {
      var featureLayer = this._featureLayer;
      var editField = APP_CONFIG.EDIT_FIELD;

      // Cache current values for undo
      var cacheResult = await featureLayer.queryFeatures({
        objectIds: objectIds,
        outFields: ["OBJECTID", editField],
        returnGeometry: false
      });

      var undoEntry = cacheResult.features.map(function (f) {
        return {
          objectId: f.attributes.OBJECTID,
          previousValue: f.attributes[editField]
        };
      });

      // Chunk and submit
      var chunks = this._chunk(objectIds, APP_CONFIG.BATCH_CHUNK_SIZE);
      var completed = 0;

      for (var i = 0; i < chunks.length; i++) {
        var updates = chunks[i].map(function (oid) {
          var attrs = { OBJECTID: oid };
          attrs[editField] = newValue;
          return new Graphic({ attributes: attrs });
        });

        var result = await featureLayer.applyEdits({ updateFeatures: updates });
        var errors = result.updateFeatureResults.filter(function (r) { return r.error; });
        if (errors.length > 0) {
          console.error("Edit errors:", errors);
          throw new Error(errors.length + " features failed to update.");
        }

        completed += chunks[i].length;
        if (onProgress) onProgress(completed, objectIds.length);
      }

      this._undoStack.push(undoEntry);
      return { success: true, count: objectIds.length };
    }

    async undo(onProgress) {
      if (!this._undoStack.length) throw new Error("Nothing to undo.");
      var undoEntry = this._undoStack.pop();
      var editField = APP_CONFIG.EDIT_FIELD;
      var featureLayer = this._featureLayer;
      var objectIds = undoEntry.map(function (e) { return e.objectId; });
      var lookup = new Map(undoEntry.map(function (e) { return [e.objectId, e.previousValue]; }));
      var chunks = this._chunk(objectIds, APP_CONFIG.BATCH_CHUNK_SIZE);
      var completed = 0;

      for (var i = 0; i < chunks.length; i++) {
        var updates = chunks[i].map(function (oid) {
          var attrs = { OBJECTID: oid };
          attrs[editField] = lookup.get(oid);
          return new Graphic({ attributes: attrs });
        });
        await featureLayer.applyEdits({ updateFeatures: updates });
        completed += chunks[i].length;
        if (onProgress) onProgress(completed, objectIds.length);
      }

      return { success: true, count: objectIds.length };
    }

    _chunk(arr, size) {
      var result = [];
      for (var i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
      }
      return result;
    }
  }


  // ════════════════════════════════════════════════════════════════
  //  APPLICATION
  // ════════════════════════════════════════════════════════════════

  var cfg = APP_CONFIG;
  var view, parcelLayer, highlightLayer, selectionMgr, batchEditor;
  var sketchViewModel, sketchLayer;
  var domainValues = [];
  var activeMode = null;

  // ── DOM References ──────────────────────────────────────────
  // NOTE: mode buttons and search button use distinct names to avoid collisions
  var dom = {
    userLabel:        document.getElementById("user-label"),
    signOutBtn:       document.getElementById("btn-sign-out"),
    selectionCount:   document.getElementById("selection-count"),
    selectionAcreage: document.getElementById("selection-acreage"),
    statusMessage:    document.getElementById("status-message"),

    // Mode toggle buttons
    btnModeSpatial:   document.getElementById("btn-mode-spatial"),
    btnModeFilter:    document.getElementById("btn-mode-filter"),
    btnModeSearch:    document.getElementById("btn-mode-search"),

    // Spatial tools
    spatialPanel:     document.getElementById("panel-spatial"),
    btnLasso:         document.getElementById("btn-lasso"),
    btnRectangle:     document.getElementById("btn-rectangle"),
    btnCancelSketch:  document.getElementById("btn-cancel-sketch"),

    // Filter tools
    filterPanel:          document.getElementById("panel-filter"),
    subdivisionSelect:    document.getElementById("select-subdivision"),
    landUseFilterSelect:  document.getElementById("select-landuse-filter"),
    btnApplyFilter:       document.getElementById("btn-apply-filter"),

    // Search tools
    searchPanel:     document.getElementById("panel-search"),
    searchInput:     document.getElementById("search-input"),
    btnSearchGo:     document.getElementById("btn-search-go"),
    searchResults:   document.getElementById("search-results"),

    // Selection list
    selectionList:     document.getElementById("selection-list"),
    btnClearSelection: document.getElementById("btn-clear-selection"),

    // Batch edit
    editLandUseSelect: document.getElementById("select-landuse-edit"),
    btnApplyEdit:      document.getElementById("btn-apply-edit"),
    btnUndo:           document.getElementById("btn-undo"),
    progressBar:       document.getElementById("progress-bar"),
    progressFill:      document.getElementById("progress-fill"),
    progressLabel:     document.getElementById("progress-label")
  };


  // ── Authentication ──────────────────────────────────────────
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
      dom.userLabel.textContent = portal.user.fullName || portal.user.username;
    } catch (e) {
      dom.userLabel.textContent = "Authenticated";
    }
  }


  // ── Map Setup ───────────────────────────────────────────────
  async function initMap() {
    highlightLayer = new GraphicsLayer({ title: "Selection Highlights" });
    sketchLayer = new GraphicsLayer({ title: "Sketches" });

    view = new MapView({
      container: "viewDiv",
      map: {
        basemap: "gray-vector",
        layers: [parcelLayer, highlightLayer, sketchLayer]
      },
      center: cfg.MAP_CENTER,
      zoom: cfg.MAP_ZOOM,
      popup: {
        dockEnabled: true,
        dockOptions: { position: "bottom-right", breakpoint: false }
      }
    });

    await view.when();

    // Zoom to the parcel layer's extent once it draws
    try {
      var extent = await parcelLayer.queryExtent();
      if (extent && extent.extent) {
        await view.goTo(extent.extent.expand(1.1));
      }
    } catch (e) {
      console.warn("Could not zoom to layer extent:", e);
    }

    return view;
  }


  // ── Load Domain + Subdivision Dropdowns ─────────────────────
  function loadDomainValues() {
    var field = parcelLayer.fields.find(function (f) {
      return f.name === cfg.EDIT_FIELD;
    });

    if (field && field.domain && field.domain.codedValues) {
      domainValues = field.domain.codedValues;
    } else {
      domainValues = [
        { name: "Ag", code: "Ag" },
        { name: "Wildlife", code: "Wildlife" },
        { name: "As is", code: "As is" }
      ];
    }

    // Edit dropdown
    dom.editLandUseSelect.innerHTML = '<option value="" disabled selected>Select classification…</option>';
    domainValues.forEach(function (d) {
      var opt = document.createElement("option");
      opt.value = d.code;
      opt.textContent = d.name;
      dom.editLandUseSelect.appendChild(opt);
    });

    // Filter dropdown
    dom.landUseFilterSelect.innerHTML = '<option value="">All classifications</option>';
    domainValues.forEach(function (d) {
      var opt = document.createElement("option");
      opt.value = d.code;
      opt.textContent = d.name;
      dom.landUseFilterSelect.appendChild(opt);
    });
  }

  async function loadSubdivisions() {
    try {
      // Find the actual subdivision field name on the layer
      var subField = parcelLayer.fields.find(function (f) {
        return f.name === "Subdivision_1" || f.name === "SUBDIVISION_1" || f.name === "subdivision_1";
      });
      var fieldName = subField ? subField.name : "Subdivision_1";

      var result = await parcelLayer.queryFeatures({
        where: "1=1",
        outFields: [fieldName],
        returnDistinctValues: true,
        returnGeometry: false,
        orderByFields: [fieldName + " ASC"]
      });

      var names = result.features
        .map(function (f) { return f.attributes[fieldName]; })
        .filter(function (s) { return s && s.toString().trim() !== ""; });

      dom.subdivisionSelect.innerHTML = '<option value="">All subdivisions</option>';
      names.forEach(function (name) {
        var opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        dom.subdivisionSelect.appendChild(opt);
      });
    } catch (e) {
      console.warn("Could not load subdivisions:", e);
      dom.subdivisionSelect.innerHTML = '<option value="">Unavailable</option>';
    }
  }


  // ── Spatial Selection ───────────────────────────────────────
  function initSpatialSelection() {
    sketchViewModel = new SketchViewModel({
      view: view,
      layer: sketchLayer,
      defaultCreateOptions: { hasZ: false },
      polygonSymbol: new SimpleFillSymbol({
        color: new Color([0, 120, 215, 0.15]),
        outline: new SimpleLineSymbol({
          color: new Color([0, 120, 215, 0.9]),
          width: 2,
          style: "dash"
        })
      })
    });

    sketchViewModel.on("create", async function (event) {
      if (event.state === "complete") {
        setStatus("Querying parcels in selection area…");
        try {
          await selectionMgr.addBySpatialQuery(event.graphic.geometry);
          setStatus(selectionMgr.count + " parcels selected.");
        } catch (e) {
          setStatus("Spatial query failed: " + e.message, true);
          console.error("Spatial query error:", e);
          console.error("Error details:", e.details || "none");
        }
        sketchLayer.removeAll();
      }
    });

    dom.btnLasso.addEventListener("click", function () {
      sketchLayer.removeAll();
      sketchViewModel.create("polygon");
      setStatus("Draw a polygon. Double-click to finish.");
    });

    dom.btnRectangle.addEventListener("click", function () {
      sketchLayer.removeAll();
      sketchViewModel.create("rectangle");
      setStatus("Draw a rectangle around parcels.");
    });

    dom.btnCancelSketch.addEventListener("click", function () {
      sketchViewModel.cancel();
      sketchLayer.removeAll();
      setStatus("");
    });
  }


  // ── Attribute Filter ────────────────────────────────────────
  function initFilterSelection() {
    dom.btnApplyFilter.addEventListener("click", async function () {
      var subdivision = dom.subdivisionSelect.value;
      var landUse = dom.landUseFilterSelect.value;

      // Find actual field names from the layer
      var subField = parcelLayer.fields.find(function (f) {
        return f.name === "Subdivision_1" || f.name === "SUBDIVISION_1";
      });
      var subFieldName = subField ? subField.name : "Subdivision_1";

      var clauses = [];
      if (subdivision) clauses.push(subFieldName + " = '" + subdivision.replace(/'/g, "''") + "'");
      if (landUse) clauses.push(cfg.EDIT_FIELD + " = '" + landUse.replace(/'/g, "''") + "'");

      if (clauses.length === 0) {
        setStatus("Select at least one filter criterion.", true);
        return;
      }

      var where = clauses.join(" AND ");
      setStatus("Querying parcels by filter…");
      console.log("Filter query:", where);

      try {
        await selectionMgr.addByQuery(where);
        setStatus(selectionMgr.count + " parcels selected.");
      } catch (e) {
        setStatus("Filter query failed: " + e.message, true);
        console.error("Filter error:", e);
        console.error("Filter details:", e.details || "none");
      }
    });
  }


  // ── Search ──────────────────────────────────────────────────
  function initSearch() {
    // Determine which search fields actually exist on the layer
    var availableFields = parcelLayer.fields.map(function (f) { return f.name; });
    var searchFields = cfg.SEARCH_FIELDS.filter(function (f) {
      return availableFields.indexOf(f) !== -1;
    });
    console.log("Available search fields:", searchFields);

    if (searchFields.length === 0) {
      console.warn("No search fields found on layer. Available fields:", availableFields);
      searchFields = availableFields.filter(function (f) {
        return f.toLowerCase().indexOf("address") !== -1 ||
               f.toLowerCase().indexOf("prop") !== -1 ||
               f.toLowerCase().indexOf("subdiv") !== -1;
      });
      console.log("Fallback search fields:", searchFields);
    }

    var doSearch = async function () {
      var term = dom.searchInput.value.trim();
      if (!term) return;

      var escaped = term.replace(/'/g, "''");
      var clauses = searchFields.map(function (f) {
        return "UPPER(" + f + ") LIKE UPPER('%" + escaped + "%')";
      });
      var where = clauses.join(" OR ");

      setStatus("Searching…");
      dom.searchResults.innerHTML = "";
      console.log("Search query:", where);

      try {
        var result = await parcelLayer.queryFeatures({
          where: where,
          outFields: ["*"],
          returnGeometry: false,
          num: 100
        });

        if (result.features.length === 0) {
          dom.searchResults.innerHTML = '<div class="search-empty">No parcels found.</div>';
          setStatus("");
          return;
        }

        result.features.forEach(function (f) {
          var oid = f.attributes.OBJECTID;
          var addr = f.attributes.ADDRESS || f.attributes.address || "No address";
          var sub = f.attributes.Subdivision_1 || f.attributes.SUBDIVISION_1 || "";
          var pid = f.attributes.PropID || f.attributes.PROPID || "";
          var lu = f.attributes[cfg.EDIT_FIELD] || "As is";

          var isSelected = selectionMgr.objectIds.indexOf(oid) !== -1;

          var div = document.createElement("div");
          div.className = "search-result-item";
          div.innerHTML =
            '<div class="search-result-info">' +
              '<span class="search-result-addr">' + addr + '</span>' +
              '<span class="search-result-sub">' + sub + ' · ' + pid + '</span>' +
              '<span class="search-result-lu">' + lu + '</span>' +
            '</div>' +
            '<button class="btn-add-to-selection ' + (isSelected ? 'already-selected' : '') + '"' +
            ' data-oid="' + oid + '">' +
            (isSelected ? '✓ Selected' : '+ Add') +
            '</button>';

          dom.searchResults.appendChild(div);
        });

        dom.searchResults.querySelectorAll(".btn-add-to-selection").forEach(function (btn) {
          btn.addEventListener("click", async function () {
            var oid = parseInt(btn.dataset.oid);
            await selectionMgr.addById(oid);
            btn.textContent = "✓ Selected";
            btn.classList.add("already-selected");
          });
        });

        setStatus(result.features.length + " results found.");
      } catch (e) {
        setStatus("Search failed: " + e.message, true);
        console.error("Search error:", e);
        console.error("Search details:", e.details || "none");
      }
    };

    dom.btnSearchGo.addEventListener("click", doSearch);
    dom.searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") doSearch();
    });
  }


  // ── Map Click Selection ─────────────────────────────────────
  function initClickSelection() {
    view.on("click", async function (event) {
      if (sketchViewModel && sketchViewModel.state === "active") return;

      var response = await view.hitTest(event, { include: [parcelLayer] });
      if (response.results.length > 0) {
        var graphic = response.results[0].graphic;
        var oid = graphic.attributes ? graphic.attributes.OBJECTID : null;
        if (oid != null) {
          selectionMgr.toggle(oid);
          setStatus(selectionMgr.count + " parcels selected.");
        }
      }
    });
  }


  // ── Batch Edit Controls ─────────────────────────────────────
  function initBatchEditor() {
    batchEditor = new BatchEditor(parcelLayer);

    dom.btnApplyEdit.addEventListener("click", async function () {
      var newValue = dom.editLandUseSelect.value;
      if (!newValue) {
        setStatus("Select a Land Use classification first.", true);
        return;
      }
      if (selectionMgr.count === 0) {
        setStatus("No parcels selected.", true);
        return;
      }

      var count = selectionMgr.count;
      var confirmed = confirm(
        'Apply "' + newValue + '" to ' + count + ' parcel' + (count > 1 ? 's' : '') + '?\n\n' +
        'This will update the Land_Use field. You can undo this action.'
      );
      if (!confirmed) return;

      showProgress(0, count);
      setStatus("Applying edits…");
      disableEditControls(true);

      try {
        await batchEditor.apply(
          selectionMgr.objectIds,
          newValue,
          function (done, total) { showProgress(done, total); }
        );
        parcelLayer.refresh();
        setStatus('Updated ' + count + ' parcels to "' + newValue + '".');
        updateUndoButton();
        selectionMgr.clear();
      } catch (e) {
        setStatus("Edit failed: " + e.message, true);
        console.error(e);
      } finally {
        hideProgress();
        disableEditControls(false);
      }
    });

    dom.btnUndo.addEventListener("click", async function () {
      if (!batchEditor.canUndo) return;
      var info = batchEditor.lastBatchInfo;
      var confirmed = confirm('Undo the last edit (' + info.count + ' parcels)?');
      if (!confirmed) return;

      showProgress(0, info.count);
      setStatus("Undoing last edit…");
      disableEditControls(true);

      try {
        var result = await batchEditor.undo(
          function (done, total) { showProgress(done, total); }
        );
        parcelLayer.refresh();
        setStatus("Reverted " + result.count + " parcels.");
        updateUndoButton();
      } catch (e) {
        setStatus("Undo failed: " + e.message, true);
        console.error(e);
      } finally {
        hideProgress();
        disableEditControls(false);
      }
    });

    dom.btnClearSelection.addEventListener("click", function () {
      selectionMgr.clear();
      setStatus("Selection cleared.");
    });
  }


  // ── Selection List Rendering ────────────────────────────────
  function initSelectionList() {
    selectionMgr.onChange(function () {
      var count = selectionMgr.count;
      var features = selectionMgr.features;

      dom.selectionCount.textContent = count;

      // Acreage — Shape__Area is sq feet for WKID 2278
      var totalSqFt = features.reduce(function (sum, f) {
        return sum + (f.attributes.Shape__Area || 0);
      }, 0);
      dom.selectionAcreage.textContent = (totalSqFt / 43560).toFixed(2);

      dom.btnApplyEdit.disabled = (count === 0);

      var listEl = dom.selectionList;
      listEl.innerHTML = "";

      if (count === 0) {
        listEl.innerHTML = '<div class="selection-empty">No parcels selected.<br>Use the tools above to select parcels.</div>';
        return;
      }

      var display = features.slice(0, 200);
      display.forEach(function (f) {
        var oid = f.attributes.OBJECTID;
        var addr = f.attributes.ADDRESS || f.attributes.address || "No address";
        var lu = f.attributes[cfg.EDIT_FIELD] || "As is";
        var sub = f.attributes.Subdivision_1 || f.attributes.SUBDIVISION_1 || "";

        var div = document.createElement("div");
        div.className = "selection-item";
        div.innerHTML =
          '<div class="selection-item-info">' +
            '<span class="selection-item-addr">' + addr + '</span>' +
            '<span class="selection-item-detail">' + lu + ' · ' + sub + '</span>' +
          '</div>' +
          '<button class="btn-remove-from-selection" data-oid="' + oid + '" title="Remove">✕</button>';
        listEl.appendChild(div);
      });

      if (features.length > 200) {
        var more = document.createElement("div");
        more.className = "selection-overflow";
        more.textContent = "+ " + (features.length - 200) + " more parcels";
        listEl.appendChild(more);
      }

      listEl.querySelectorAll(".btn-remove-from-selection").forEach(function (btn) {
        btn.addEventListener("click", function () {
          selectionMgr.remove(parseInt(btn.dataset.oid));
        });
      });
    });
  }


  // ── Mode Switching ──────────────────────────────────────────
  function initModeSwitching() {
    var panels = {
      spatial: dom.spatialPanel,
      filter:  dom.filterPanel,
      search:  dom.searchPanel
    };
    var buttons = {
      spatial: dom.btnModeSpatial,
      filter:  dom.btnModeFilter,
      search:  dom.btnModeSearch
    };

    function activate(mode) {
      Object.values(panels).forEach(function (p) { p.classList.remove("active"); });
      Object.values(buttons).forEach(function (b) { b.classList.remove("active"); });

      if (activeMode === mode) {
        activeMode = null;
        if (sketchViewModel) sketchViewModel.cancel();
        sketchLayer.removeAll();
        return;
      }

      activeMode = mode;
      panels[mode].classList.add("active");
      buttons[mode].classList.add("active");

      if (mode !== "spatial" && sketchViewModel) {
        sketchViewModel.cancel();
        sketchLayer.removeAll();
      }
    }

    dom.btnModeSpatial.addEventListener("click", function () { activate("spatial"); });
    dom.btnModeFilter.addEventListener("click",  function () { activate("filter"); });
    dom.btnModeSearch.addEventListener("click",   function () { activate("search"); });
  }


  // ── UI Helpers ──────────────────────────────────────────────
  function setStatus(msg, isError) {
    dom.statusMessage.textContent = msg;
    dom.statusMessage.className = isError ? "status-error" : "";
  }

  function showProgress(done, total) {
    dom.progressBar.style.display = "block";
    var pct = Math.round((done / total) * 100);
    dom.progressFill.style.width = pct + "%";
    dom.progressLabel.textContent = done + " / " + total;
  }

  function hideProgress() {
    dom.progressBar.style.display = "none";
    dom.progressFill.style.width = "0%";
    dom.progressLabel.textContent = "";
  }

  function updateUndoButton() {
    dom.btnUndo.disabled = !batchEditor.canUndo;
  }

  function disableEditControls(disabled) {
    dom.btnApplyEdit.disabled = disabled;
    dom.btnUndo.disabled = disabled;
    dom.editLandUseSelect.disabled = disabled;
    dom.btnClearSelection.disabled = disabled;
  }

  function initSignOut() {
    dom.signOutBtn.addEventListener("click", function () {
      IdentityManager.destroyCredentials();
      window.location.reload();
    });
  }


  // ════════════════════════════════════════════════════════════════
  //  BOOT
  // ════════════════════════════════════════════════════════════════
  async function boot() {
    try {
      setStatus("Authenticating…");
      await initAuth();
      await loadUserInfo();
      initSignOut();

      setStatus("Loading parcel layer…");

      parcelLayer = new FeatureLayer({
        portalItem: { id: cfg.LAYER_ITEM_ID },
        outFields: ["*"],
        title: "Parcels"
      });

      try {
        await parcelLayer.load();
      } catch (layerErr) {
        setStatus("Layer failed: " + layerErr.message, true);
        console.error("Layer load error:", layerErr);
        dom.selectionList.innerHTML =
          '<div class="selection-empty" style="color:#e55c5c;">' +
          '<strong>Layer could not be loaded.</strong><br><br>' +
          'Error: ' + layerErr.message + '</div>';
        return;
      }

      // Log available fields so we can debug field name mismatches
      console.log("=== LAYER LOADED SUCCESSFULLY ===");
      console.log("Layer title:", parcelLayer.title);
      console.log("Layer URL:", parcelLayer.url);
      console.log("Fields:", parcelLayer.fields.map(function (f) {
        return f.name + " (" + f.type + ")";
      }));
      console.log("Geometry type:", parcelLayer.geometryType);
      console.log("Capabilities:", JSON.stringify(parcelLayer.capabilities));

      setStatus("Initializing map…");
      await initMap();

      // Disable the default popup — we handle selection ourselves
      parcelLayer.popupEnabled = false;

      // Initialize selection manager with known fields
      selectionMgr = new SelectionManager(view, parcelLayer, highlightLayer);
      selectionMgr.setLayerFields(parcelLayer.fields);

      // Load dropdowns
      loadDomainValues();
      await loadSubdivisions();

      // Wire up UI
      initSelectionList();
      initSpatialSelection();
      initFilterSelection();
      initSearch();
      initClickSelection();
      initBatchEditor();
      initModeSwitching();

      updateUndoButton();
      setStatus("Ready. " + parcelLayer.fields.length + " fields loaded.");
      setTimeout(function () { setStatus(""); }, 3000);

    } catch (e) {
      setStatus("Startup failed: " + e.message, true);
      console.error("Boot error:", e);
      console.error("Error details:", e.details || "none");
    }
  }

  boot();
});
