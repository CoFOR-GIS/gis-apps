/**
 * City of Fair Oaks Ranch — Parcel Exemption Editor
 * Main Application
 *
 * Consumes the CoFORADM_Parcel_Exemption_Internal View Layer
 * and provides batch + single-parcel Land_Use editing for the City Planner.
 */
require([
  "esri/portal/Portal",
  "esri/identity/OAuthInfo",
  "esri/identity/IdentityManager",
  "esri/WebMap",
  "esri/views/MapView",
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/widgets/Sketch/SketchViewModel",
  "esri/widgets/Search",
  "esri/Graphic",
  "esri/geometry/geometryEngine",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/Color",
  "esri/core/reactiveUtils"
], function (
  Portal, OAuthInfo, IdentityManager, WebMap, MapView,
  FeatureLayer, GraphicsLayer, SketchViewModel, Search,
  Graphic, geometryEngine, SimpleFillSymbol, SimpleLineSymbol,
  Color, reactiveUtils
) {

  // ════════════════════════════════════════════════════════════════
  //  SELECTION MANAGER
  //  Maintains the active set of selected parcel OBJECTIDs and
  //  renders highlight graphics on the map.
  // ════════════════════════════════════════════════════════════════
  class SelectionManager {
    constructor(view, featureLayer, highlightLayer) {
      this._view = view;
      this._featureLayer = featureLayer;
      this._highlightLayer = highlightLayer;
      this._selected = new Map();          // OBJECTID → { attributes, geometry }
      this._highlightHandles = new Map();  // OBJECTID → Graphic
      this._listeners = [];

      this._highlightSymbol = new SimpleFillSymbol({
        color: new Color(APP_CONFIG.SELECTION_HIGHLIGHT_COLOR),
        outline: new SimpleLineSymbol({
          color: new Color(APP_CONFIG.SELECTION_OUTLINE_COLOR),
          width: 2
        })
      });
    }

    get count() { return this._selected.size; }
    get objectIds() { return Array.from(this._selected.keys()); }
    get features() { return Array.from(this._selected.values()); }

    onChange(fn) { this._listeners.push(fn); }
    _notify() { this._listeners.forEach(fn => fn(this.count, this.features)); }

    // Add features by querying with a where clause
    async addByQuery(where) {
      const result = await this._featureLayer.queryFeatures({
        where: where,
        outFields: APP_CONFIG.DISPLAY_FIELDS.concat(["OBJECTID", "Shape__Area"]),
        returnGeometry: true
      });
      this._addFeatures(result.features);
    }

    // Add features by spatial intersection
    async addBySpatialQuery(geometry) {
      const result = await this._featureLayer.queryFeatures({
        geometry: geometry,
        spatialRelationship: "intersects",
        outFields: APP_CONFIG.DISPLAY_FIELDS.concat(["OBJECTID", "Shape__Area"]),
        returnGeometry: true
      });
      this._addFeatures(result.features);
    }

    // Add a single feature by OBJECTID
    async addById(objectId) {
      if (this._selected.has(objectId)) return;
      const result = await this._featureLayer.queryFeatures({
        objectIds: [objectId],
        outFields: APP_CONFIG.DISPLAY_FIELDS.concat(["OBJECTID", "Shape__Area"]),
        returnGeometry: true
      });
      this._addFeatures(result.features);
    }

    // Remove a single parcel from selection
    remove(objectId) {
      if (!this._selected.has(objectId)) return;
      this._selected.delete(objectId);
      const g = this._highlightHandles.get(objectId);
      if (g) {
        this._highlightLayer.remove(g);
        this._highlightHandles.delete(objectId);
      }
      this._notify();
    }

    // Clear entire selection
    clear() {
      this._selected.clear();
      this._highlightLayer.removeAll();
      this._highlightHandles.clear();
      this._notify();
    }

    // Toggle a single parcel
    toggle(objectId) {
      if (this._selected.has(objectId)) {
        this.remove(objectId);
      } else {
        this.addById(objectId);
      }
    }

    // ── Internal ────────────────────────────────────────────────
    _addFeatures(features) {
      features.forEach(f => {
        const oid = f.attributes.OBJECTID;
        if (this._selected.has(oid)) return;

        this._selected.set(oid, {
          attributes: f.attributes,
          geometry: f.geometry
        });

        const graphic = new Graphic({
          geometry: f.geometry,
          symbol: this._highlightSymbol,
          attributes: { OBJECTID: oid }
        });
        this._highlightLayer.add(graphic);
        this._highlightHandles.set(oid, graphic);
      });
      this._notify();
    }
  }


  // ════════════════════════════════════════════════════════════════
  //  BATCH EDITOR
  //  Handles applying Land_Use edits in chunked batches
  //  with undo support.
  // ════════════════════════════════════════════════════════════════
  class BatchEditor {
    constructor(featureLayer) {
      this._featureLayer = featureLayer;
      this._undoStack = [];   // Array of { objectId, previousValue }[]
    }

    get canUndo() { return this._undoStack.length > 0; }
    get lastBatchInfo() {
      if (!this._undoStack.length) return null;
      const last = this._undoStack[this._undoStack.length - 1];
      return { count: last.length };
    }

    /**
     * Apply a Land_Use value to a set of OBJECTIDs.
     * Caches previous values for undo. Chunks requests.
     * @param {number[]} objectIds
     * @param {string} newValue
     * @param {function} onProgress - called with (completed, total)
     */
    async apply(objectIds, newValue, onProgress) {
      // 1. Cache current values
      const cacheResult = await this._featureLayer.queryFeatures({
        objectIds: objectIds,
        outFields: ["OBJECTID", APP_CONFIG.EDIT_FIELD],
        returnGeometry: false
      });

      const undoEntry = cacheResult.features.map(f => ({
        objectId: f.attributes.OBJECTID,
        previousValue: f.attributes[APP_CONFIG.EDIT_FIELD]
      }));

      // 2. Chunk and submit
      const chunks = this._chunk(objectIds, APP_CONFIG.BATCH_CHUNK_SIZE);
      let completed = 0;

      for (const chunk of chunks) {
        const updates = chunk.map(oid => ({
          attributes: {
            OBJECTID: oid,
            [APP_CONFIG.EDIT_FIELD]: newValue
          }
        }));

        // Create graphics for applyEdits
        const updateFeatures = updates.map(u => new Graphic({ attributes: u.attributes }));

        const result = await this._featureLayer.applyEdits({
          updateFeatures: updateFeatures
        });

        // Check for errors
        const errors = result.updateFeatureResults.filter(r => r.error);
        if (errors.length > 0) {
          console.error("Edit errors:", errors);
          throw new Error(`${errors.length} features failed to update. Check console for details.`);
        }

        completed += chunk.length;
        if (onProgress) onProgress(completed, objectIds.length);
      }

      // 3. Push to undo stack
      this._undoStack.push(undoEntry);

      return { success: true, count: objectIds.length };
    }

    /**
     * Undo the last batch edit.
     * @param {function} onProgress
     */
    async undo(onProgress) {
      if (!this._undoStack.length) throw new Error("Nothing to undo.");

      const undoEntry = this._undoStack.pop();
      const objectIds = undoEntry.map(e => e.objectId);
      const chunks = this._chunk(objectIds, APP_CONFIG.BATCH_CHUNK_SIZE);

      // Build a lookup for previous values
      const lookup = new Map(undoEntry.map(e => [e.objectId, e.previousValue]));

      let completed = 0;
      for (const chunk of chunks) {
        const updateFeatures = chunk.map(oid => new Graphic({
          attributes: {
            OBJECTID: oid,
            [APP_CONFIG.EDIT_FIELD]: lookup.get(oid)
          }
        }));

        await this._featureLayer.applyEdits({ updateFeatures: updateFeatures });
        completed += chunk.length;
        if (onProgress) onProgress(completed, objectIds.length);
      }

      return { success: true, count: objectIds.length };
    }

    _chunk(arr, size) {
      const result = [];
      for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
      }
      return result;
    }
  }


  // ════════════════════════════════════════════════════════════════
  //  APPLICATION INITIALIZATION
  // ════════════════════════════════════════════════════════════════

  const cfg = APP_CONFIG;
  let view, parcelLayer, highlightLayer, selectionMgr, batchEditor;
  let sketchViewModel, sketchLayer;
  let subdivisionList = [];
  let domainValues = [];
  let activeMode = null;  // 'spatial' | 'filter' | 'search' | null

  // ── DOM References ──────────────────────────────────────────
  const ui = {
    // Status
    userLabel:        document.getElementById("user-label"),
    signOutBtn:       document.getElementById("btn-sign-out"),
    selectionCount:   document.getElementById("selection-count"),
    selectionAcreage: document.getElementById("selection-acreage"),
    statusMessage:    document.getElementById("status-message"),

    // Mode buttons
    btnSpatial:  document.getElementById("btn-mode-spatial"),
    btnFilter:   document.getElementById("btn-mode-filter"),
    btnSearch:   document.getElementById("btn-mode-search"),

    // Spatial tools
    spatialPanel:    document.getElementById("panel-spatial"),
    btnLasso:        document.getElementById("btn-lasso"),
    btnRectangle:    document.getElementById("btn-rectangle"),
    btnCancelSketch: document.getElementById("btn-cancel-sketch"),

    // Filter tools
    filterPanel:         document.getElementById("panel-filter"),
    subdivisionSelect:   document.getElementById("select-subdivision"),
    landUseFilterSelect: document.getElementById("select-landuse-filter"),
    btnApplyFilter:      document.getElementById("btn-apply-filter"),

    // Search tools
    searchPanel:  document.getElementById("panel-search"),
    searchInput:  document.getElementById("search-input"),
    btnSearch:    document.getElementById("btn-search-go"),
    searchResults: document.getElementById("search-results"),

    // Selection list
    selectionList: document.getElementById("selection-list"),
    btnClearSelection: document.getElementById("btn-clear-selection"),

    // Batch editor
    editLandUseSelect: document.getElementById("select-landuse-edit"),
    btnApplyEdit:      document.getElementById("btn-apply-edit"),
    btnUndo:           document.getElementById("btn-undo"),
    progressBar:       document.getElementById("progress-bar"),
    progressFill:      document.getElementById("progress-fill"),
    progressLabel:     document.getElementById("progress-label"),

    // Map
    viewDiv: document.getElementById("viewDiv")
  };


  // ── Authentication ──────────────────────────────────────────
  async function initAuth() {
    const oauthInfo = new OAuthInfo({
      appId: cfg.OAUTH_APP_ID,
      portalUrl: cfg.PORTAL_URL,
      popup: false   // Redirect-based: page redirects to AGOL, then back
    });
    IdentityManager.registerOAuthInfos([oauthInfo]);

    try {
      const credential = await IdentityManager.checkSignInStatus(
        cfg.PORTAL_URL + "/sharing"
      );
      return credential;
    } catch (e) {
      const credential = await IdentityManager.getCredential(
        cfg.PORTAL_URL + "/sharing"
      );
      return credential;
    }
  }

  async function loadUserInfo() {
    try {
      const portal = new Portal({ url: cfg.PORTAL_URL });
      await portal.load();
      ui.userLabel.textContent = portal.user.fullName || portal.user.username;
    } catch (e) {
      ui.userLabel.textContent = "Authenticated";
    }
  }


  // ── Map & Layer Setup ───────────────────────────────────────
  async function initMap() {
    // Graphics layer for selection highlights
    highlightLayer = new GraphicsLayer({ title: "Selection Highlights" });

    // Sketch layer for spatial selection drawing
    sketchLayer = new GraphicsLayer({ title: "Sketches" });

    // The parcel view layer
    parcelLayer = new FeatureLayer({
      portalItem: { id: cfg.LAYER_ITEM_ID },
      outFields: ["*"],
      title: "Parcels"
    });

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
    await parcelLayer.when();

    // Read the coded value domain from the layer
    loadDomainValues();

    // Load unique subdivision names for the filter dropdown
    loadSubdivisions();

    return view;
  }


  // ── Domain & Dropdown Population ────────────────────────────
  function loadDomainValues() {
    const field = parcelLayer.fields.find(f => f.name === cfg.EDIT_FIELD);
    if (field && field.domain && field.domain.codedValues) {
      domainValues = field.domain.codedValues;
    } else {
      // Fallback if domain isn't exposed on the view
      domainValues = [
        { name: "Ag", code: "Ag" },
        { name: "Wildlife", code: "Wildlife" },
        { name: "As is", code: "As is" }
      ];
    }

    // Populate edit dropdown
    ui.editLandUseSelect.innerHTML = '<option value="" disabled selected>Select classification…</option>';
    domainValues.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.code;
      opt.textContent = d.name;
      ui.editLandUseSelect.appendChild(opt);
    });

    // Populate filter dropdown
    ui.landUseFilterSelect.innerHTML = '<option value="">All classifications</option>';
    domainValues.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.code;
      opt.textContent = d.name;
      ui.landUseFilterSelect.appendChild(opt);
    });
  }

  async function loadSubdivisions() {
    try {
      const result = await parcelLayer.queryFeatures({
        where: "1=1",
        outFields: ["Subdivision_1"],
        returnDistinctValues: true,
        returnGeometry: false,
        orderByFields: ["Subdivision_1 ASC"]
      });

      subdivisionList = result.features
        .map(f => f.attributes.Subdivision_1)
        .filter(s => s && s.trim() !== "");

      ui.subdivisionSelect.innerHTML = '<option value="">All subdivisions</option>';
      subdivisionList.forEach(name => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        ui.subdivisionSelect.appendChild(opt);
      });
    } catch (e) {
      console.warn("Could not load subdivisions:", e);
    }
  }


  // ── Sketch (Spatial Selection) ──────────────────────────────
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

    sketchViewModel.on("create", async (event) => {
      if (event.state === "complete") {
        setStatus("Querying parcels in selection area…");
        try {
          await selectionMgr.addBySpatialQuery(event.graphic.geometry);
          setStatus(`${selectionMgr.count} parcels selected.`);
        } catch (e) {
          setStatus("Spatial query failed. See console.", true);
          console.error(e);
        }
        // Clear the sketch graphic
        sketchLayer.removeAll();
      }
    });

    ui.btnLasso.addEventListener("click", () => {
      sketchLayer.removeAll();
      sketchViewModel.create("polygon");
      setStatus("Draw a polygon around the parcels to select. Double-click to finish.");
    });

    ui.btnRectangle.addEventListener("click", () => {
      sketchLayer.removeAll();
      sketchViewModel.create("rectangle");
      setStatus("Draw a rectangle around the parcels to select.");
    });

    ui.btnCancelSketch.addEventListener("click", () => {
      sketchViewModel.cancel();
      sketchLayer.removeAll();
      setStatus("");
    });
  }


  // ── Attribute Filter Selection ──────────────────────────────
  function initFilterSelection() {
    ui.btnApplyFilter.addEventListener("click", async () => {
      const subdivision = ui.subdivisionSelect.value;
      const landUse = ui.landUseFilterSelect.value;

      const clauses = [];
      if (subdivision) clauses.push(`Subdivision_1 = '${subdivision.replace(/'/g, "''")}'`);
      if (landUse) clauses.push(`${cfg.EDIT_FIELD} = '${landUse.replace(/'/g, "''")}'`);

      if (clauses.length === 0) {
        setStatus("Select at least one filter criterion.", true);
        return;
      }

      const where = clauses.join(" AND ");
      setStatus("Querying parcels by filter…");

      try {
        await selectionMgr.addByQuery(where);
        setStatus(`${selectionMgr.count} parcels selected.`);
      } catch (e) {
        setStatus("Filter query failed. See console.", true);
        console.error(e);
      }
    });
  }


  // ── Search ──────────────────────────────────────────────────
  function initSearch() {
    const doSearch = async () => {
      const term = ui.searchInput.value.trim();
      if (!term) return;

      // Build a compound OR across all search fields
      const escaped = term.replace(/'/g, "''");
      const clauses = cfg.SEARCH_FIELDS.map(
        f => `UPPER(${f}) LIKE UPPER('%${escaped}%')`
      );
      const where = clauses.join(" OR ");

      setStatus("Searching…");
      ui.searchResults.innerHTML = "";

      try {
        const result = await parcelLayer.queryFeatures({
          where: where,
          outFields: APP_CONFIG.DISPLAY_FIELDS.concat(["OBJECTID"]),
          returnGeometry: false,
          num: 100
        });

        if (result.features.length === 0) {
          ui.searchResults.innerHTML = '<div class="search-empty">No parcels found.</div>';
          setStatus("");
          return;
        }

        result.features.forEach(f => {
          const oid = f.attributes.OBJECTID;
          const div = document.createElement("div");
          div.className = "search-result-item";

          const isSelected = selectionMgr.objectIds.includes(oid);

          div.innerHTML = `
            <div class="search-result-info">
              <span class="search-result-addr">${f.attributes.ADDRESS || "No address"}</span>
              <span class="search-result-sub">${f.attributes.Subdivision_1 || ""} · ${f.attributes.PropID || ""}</span>
              <span class="search-result-lu">${f.attributes.Land_Use || "As is"}</span>
            </div>
            <button class="btn-add-to-selection ${isSelected ? 'already-selected' : ''}"
                    data-oid="${oid}">
              ${isSelected ? "✓ Selected" : "+ Add"}
            </button>
          `;
          ui.searchResults.appendChild(div);
        });

        // Bind add buttons
        ui.searchResults.querySelectorAll(".btn-add-to-selection").forEach(btn => {
          btn.addEventListener("click", async () => {
            const oid = parseInt(btn.dataset.oid);
            await selectionMgr.addById(oid);
            btn.textContent = "✓ Selected";
            btn.classList.add("already-selected");
          });
        });

        setStatus(`${result.features.length} results found.`);
      } catch (e) {
        setStatus("Search failed. See console.", true);
        console.error(e);
      }
    };

    ui.btnSearch.addEventListener("click", doSearch);
    ui.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });
  }


  // ── Map Click Selection ─────────────────────────────────────
  function initClickSelection() {
    view.on("click", async (event) => {
      // Only handle click selection when no spatial tool is active
      if (sketchViewModel && sketchViewModel.state === "active") return;

      const response = await view.hitTest(event, { include: [parcelLayer] });
      if (response.results.length > 0) {
        const feature = response.results[0].graphic;
        const oid = feature.attributes.OBJECTID;
        if (oid !== undefined) {
          selectionMgr.toggle(oid);
        }
      }
    });
  }


  // ── Batch Edit Controls ─────────────────────────────────────
  function initBatchEditor() {
    batchEditor = new BatchEditor(parcelLayer);

    ui.btnApplyEdit.addEventListener("click", async () => {
      const newValue = ui.editLandUseSelect.value;
      if (!newValue) {
        setStatus("Select a Land Use classification first.", true);
        return;
      }
      if (selectionMgr.count === 0) {
        setStatus("No parcels selected.", true);
        return;
      }

      const count = selectionMgr.count;
      const confirmed = confirm(
        `Apply "${newValue}" to ${count} parcel${count > 1 ? "s" : ""}?\n\n` +
        `This will update the Land_Use field. You can undo this action.`
      );
      if (!confirmed) return;

      showProgress(0, count);
      setStatus("Applying edits…");
      disableEditControls(true);

      try {
        await batchEditor.apply(
          selectionMgr.objectIds,
          newValue,
          (done, total) => showProgress(done, total)
        );

        // Refresh the layer to show updated symbology
        parcelLayer.refresh();

        setStatus(`Successfully updated ${count} parcels to "${newValue}".`);
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

    ui.btnUndo.addEventListener("click", async () => {
      if (!batchEditor.canUndo) return;

      const info = batchEditor.lastBatchInfo;
      const confirmed = confirm(
        `Undo the last edit (${info.count} parcels)?\n\n` +
        `This will restore the previous Land_Use values.`
      );
      if (!confirmed) return;

      showProgress(0, info.count);
      setStatus("Undoing last edit…");
      disableEditControls(true);

      try {
        const result = await batchEditor.undo(
          (done, total) => showProgress(done, total)
        );
        parcelLayer.refresh();
        setStatus(`Reverted ${result.count} parcels to previous values.`);
        updateUndoButton();
      } catch (e) {
        setStatus("Undo failed: " + e.message, true);
        console.error(e);
      } finally {
        hideProgress();
        disableEditControls(false);
      }
    });

    ui.btnClearSelection.addEventListener("click", () => {
      selectionMgr.clear();
      setStatus("Selection cleared.");
    });
  }


  // ── Selection List Rendering ────────────────────────────────
  function initSelectionList() {
    selectionMgr.onChange((count, features) => {
      // Update counters
      ui.selectionCount.textContent = count;

      // Calculate acreage (Shape__Area is in sq feet for WKID 2278)
      const totalSqFt = features.reduce((sum, f) => {
        return sum + (f.attributes.Shape__Area || 0);
      }, 0);
      const acres = (totalSqFt / 43560).toFixed(2);
      ui.selectionAcreage.textContent = acres;

      // Enable/disable edit button
      ui.btnApplyEdit.disabled = count === 0;

      // Render the selection list (max 200 visible for performance)
      const listEl = ui.selectionList;
      listEl.innerHTML = "";

      if (count === 0) {
        listEl.innerHTML = '<div class="selection-empty">No parcels selected.<br>Use the tools above to select parcels.</div>';
        return;
      }

      const displayFeatures = features.slice(0, 200);
      displayFeatures.forEach(f => {
        const oid = f.attributes.OBJECTID;
        const div = document.createElement("div");
        div.className = "selection-item";
        div.innerHTML = `
          <div class="selection-item-info">
            <span class="selection-item-addr">${f.attributes.ADDRESS || "No address"}</span>
            <span class="selection-item-detail">${f.attributes.Land_Use || "As is"} · ${f.attributes.Subdivision_1 || ""}</span>
          </div>
          <button class="btn-remove-from-selection" data-oid="${oid}" title="Remove from selection">✕</button>
        `;
        listEl.appendChild(div);
      });

      if (features.length > 200) {
        const more = document.createElement("div");
        more.className = "selection-overflow";
        more.textContent = `+ ${features.length - 200} more parcels (not shown)`;
        listEl.appendChild(more);
      }

      // Bind remove buttons
      listEl.querySelectorAll(".btn-remove-from-selection").forEach(btn => {
        btn.addEventListener("click", () => {
          const oid = parseInt(btn.dataset.oid);
          selectionMgr.remove(oid);
        });
      });
    });
  }


  // ── Mode Switching ──────────────────────────────────────────
  function initModeSwitching() {
    const panels = {
      spatial: ui.spatialPanel,
      filter:  ui.filterPanel,
      search:  ui.searchPanel
    };
    const buttons = {
      spatial: ui.btnSpatial,
      filter:  ui.btnFilter,
      search:  ui.btnSearch
    };

    function activateMode(mode) {
      // Deactivate all
      Object.values(panels).forEach(p => p.classList.remove("active"));
      Object.values(buttons).forEach(b => b.classList.remove("active"));

      if (activeMode === mode) {
        // Toggle off
        activeMode = null;
        if (sketchViewModel) sketchViewModel.cancel();
        sketchLayer.removeAll();
        return;
      }

      activeMode = mode;
      panels[mode].classList.add("active");
      buttons[mode].classList.add("active");

      // Cancel sketch if switching away from spatial
      if (mode !== "spatial" && sketchViewModel) {
        sketchViewModel.cancel();
        sketchLayer.removeAll();
      }
    }

    ui.btnSpatial.addEventListener("click", () => activateMode("spatial"));
    ui.btnFilter.addEventListener("click",  () => activateMode("filter"));
    ui.btnSearch.addEventListener("click",   () => activateMode("search"));
  }


  // ── UI Helpers ──────────────────────────────────────────────
  function setStatus(msg, isError) {
    ui.statusMessage.textContent = msg;
    ui.statusMessage.className = isError ? "status-error" : "";
  }

  function showProgress(done, total) {
    ui.progressBar.style.display = "block";
    const pct = Math.round((done / total) * 100);
    ui.progressFill.style.width = pct + "%";
    ui.progressLabel.textContent = `${done} / ${total}`;
  }

  function hideProgress() {
    ui.progressBar.style.display = "none";
    ui.progressFill.style.width = "0%";
    ui.progressLabel.textContent = "";
  }

  function updateUndoButton() {
    ui.btnUndo.disabled = !batchEditor.canUndo;
    if (batchEditor.canUndo) {
      const info = batchEditor.lastBatchInfo;
      ui.btnUndo.title = `Undo last edit (${info.count} parcels)`;
    } else {
      ui.btnUndo.title = "Nothing to undo";
    }
  }

  function disableEditControls(disabled) {
    ui.btnApplyEdit.disabled = disabled;
    ui.btnUndo.disabled = disabled;
    ui.editLandUseSelect.disabled = disabled;
    ui.btnClearSelection.disabled = disabled;
  }

  // Sign out handler
  function initSignOut() {
    ui.signOutBtn.addEventListener("click", () => {
      IdentityManager.destroyCredentials();
      window.location.reload();
    });
  }


  // ════════════════════════════════════════════════════════════════
  //  BOOT SEQUENCE
  // ════════════════════════════════════════════════════════════════
  async function boot() {
    try {
      setStatus("Authenticating…");
      await initAuth();
      await loadUserInfo();
      initSignOut();

      setStatus("Loading map…");
      await initMap();

      // Initialize managers
      selectionMgr = new SelectionManager(view, parcelLayer, highlightLayer);

      // Wire up all UI
      initSelectionList();
      initSpatialSelection();
      initFilterSelection();
      initSearch();
      initClickSelection();
      initBatchEditor();
      initModeSwitching();

      updateUndoButton();
      setStatus("Ready.");

      // Clear status after a moment
      setTimeout(() => setStatus(""), 2000);

    } catch (e) {
      setStatus("Startup failed: " + e.message, true);
      console.error("Boot error:", e);
    }
  }

  boot();
});
