# Parcel Exemption Editor — City of Fair Oaks Ranch

Batch and single-parcel Land Use classification editor for the City Planner.  
Consumes the `CoFORADM_Parcel_Exemption_Internal` hosted feature layer view.

---

## Prerequisites

- **IIS** with URL Rewrite module installed (for OAuth callback routing)
- **ArcGIS Online** named user account in the `fairoaksranch` organization
- The view layer `4e596e6f2c1d437f841f0af65598c07a` must grant edit privileges to the target user/group

---

## Setup Steps

### 1. Register an OAuth Application in ArcGIS Online

1. Sign in to [fairoaksranch.maps.arcgis.com](https://fairoaksranch.maps.arcgis.com)
2. Go to **Content** → **My Content** → **New Item** → **Application**
3. Select **Application** type, and register it
4. Under **Settings** → **Application** → **Registered Info**:
   - **App Type**: Browser
   - **Redirect URI**: Add your IIS deployment URL, e.g.:
     ```
     https://gis.fairoaksranchtx.gov/ParcelExemptionEditor/
     ```
     Also add `http://localhost/ParcelExemptionEditor/` for local testing
5. Copy the **App ID** (Client ID)

### 2. Configure the Application

Open `js/config.js` and replace:

```javascript
OAUTH_APP_ID: "YOUR_APP_ID_HERE",
```

with your registered App ID, e.g.:

```javascript
OAUTH_APP_ID: "a1b2c3d4e5f6...",
```

### 3. Verify Layer Edit Permissions

The view layer must allow attribute editing for Jessica's account:

1. In AGOL, go to the view layer item page
2. Under **Settings** → **Editing**, confirm:
   - "Enable editing" is checked
   - "Only allow updates to existing features" is the editing constraint
3. Share the layer with the "Planning & Development" group (or whatever group Jessica belongs to)

### 4. Deploy to IIS

1. Create a new site or virtual directory in IIS Manager:
   - **Physical Path**: Point to the `ParcelExemptionEditor` folder
   - **Application Pool**: Use DefaultAppPool (.NET CLR Version = No Managed Code)
2. Ensure the **URL Rewrite** module is installed:
   - Download from [iis.net](https://www.iis.net/downloads/microsoft/url-rewrite) if not present
   - This is needed for the OAuth callback route in `web.config`
3. Set up HTTPS — OAuth 2.0 requires HTTPS in production. Use an existing certificate or configure Let's Encrypt
4. Test by navigating to `https://your-server/ParcelExemptionEditor/`

### 5. Local Testing (Optional)

For quick local testing without IIS:

```bash
# Using Python
cd ParcelExemptionEditor
python -m http.server 8080

# Then open http://localhost:8080
```

Make sure `http://localhost:8080/` is added as a redirect URI in the AGOL app registration.

---

## File Structure

```
ParcelExemptionEditor/
├── index.html          Main application page
├── web.config          IIS configuration (rewrite rules, MIME types)
├── css/
│   └── styles.css      Application styles
├── js/
│   ├── config.js       Configuration constants (edit this)
│   └── app.js          Main application logic
└── README.md           This file
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Spatial Selection** | Draw a polygon (lasso) or rectangle on the map to select intersecting parcels |
| **Attribute Filter** | Select parcels by Subdivision and/or current Land Use classification |
| **Search** | Find parcels by address, Property ID, or subdivision name and add to selection |
| **Click Selection** | Click individual parcels on the map to toggle them in/out of the selection |
| **Batch Edit** | Apply a Land Use classification (Ag / Wildlife / As is) to all selected parcels at once |
| **Undo** | Revert the last batch edit, restoring previous Land Use values |
| **Audit Trail** | EditDate and Editor fields are auto-stamped by AGOL on every save |
| **Geometry Protection** | The view layer blocks all geometry changes — only attributes can be edited |

---

## Troubleshooting

**"Startup failed" or blank screen after sign-in**
- Check browser console (F12) for errors
- Verify the App ID in `config.js` matches your AGOL registration
- Confirm the redirect URI matches your deployment URL exactly (including trailing slash)

**"Edit errors" on batch apply**
- Verify the view layer has editing enabled (Settings → Editing on the item page)
- Confirm Jessica's account has edit permissions via group sharing
- Check that the `Land_Use` field accepts the coded values being submitted

**Subdivisions dropdown is empty**
- The layer query for distinct `Subdivision_1` values may have timed out
- Check that the field name matches exactly (case-sensitive)

**OAuth redirect loop**
- Ensure IIS URL Rewrite module is installed
- Confirm HTTPS is properly configured — OAuth will fail over plain HTTP in production
- Clear browser cookies/cache for the site

---

## Next Steps

- [ ] Register OAuth App and paste App ID into config.js
- [ ] Test applyEdits via REST endpoint (manual 2-3 parcel test)
- [ ] Deploy to IIS and verify auth flow
- [ ] Sit with Jessica to validate selection workflow priorities
- [ ] After editing workflow is stable, proceed with Dashboard build
