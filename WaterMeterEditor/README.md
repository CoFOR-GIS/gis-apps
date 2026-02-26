# Water Meter Editor — City of Fair Oaks Ranch

**Operational editing application for the Utility Clerk to manage water meter inventory.**

Consumes: `Water Meters – Operational Edit View (Utilities – Internal)`

---

## Architecture

```
WaterMeterEditor/
├── index.html          ← Main application
├── logo.svg            ← Fair Oaks Ranch seal (copy from ParcelEditor)
├── css/
│   └── styles.css      ← Application styles (FOR branding)
└── js/
    ├── config.js       ← Configuration (OAuth App ID, service URLs)
    └── app.js          ← Application logic
```

**Technology:** ArcGIS Maps SDK for JavaScript 4.31 (CDN-loaded, no build step)
**Auth:** OAuth 2.0, redirect-based (no popup, no callback page)

---

## Deployment (GitHub Pages)

This app deploys into your existing `gis-apps` repository alongside the Parcel Editor.

### 1. Add to GitHub

Upload the `WaterMeterEditor/` folder to your `gis-apps` repo:

```
gis-apps/
├── ParcelEditor/       ← existing
├── WaterMeterEditor/   ← new
└── README.md
```

Copy the same `logo.svg` from ParcelEditor/ into WaterMeterEditor/.

### 2. OAuth App Registration

You can reuse the existing AGOL OAuth app — just add the new redirect URI:
```
https://<username>.github.io/gis-apps/WaterMeterEditor/
```

Or register a separate app for Utilities if you prefer isolation.

### 3. Configure

Open `js/config.js` and replace `YOUR_APP_ID_HERE` with the App ID.

### 4. Layer Permissions

The view layer must be shared with the Utility Clerk's group and have editing enabled.

### 5. Test

```
https://<username>.github.io/gis-apps/WaterMeterEditor/
```

Redirects to AGOL sign-in, then back to the app.

---

## Features

| Feature | Description |
|---------|-------------|
| Search | Find meters by Account #, Meter #, FlexNet #, Address, or Name |
| Create | Place new meter points with guided form |
| Edit | Update attributes via grouped form fields |
| Delete | Remove erroneous records |
| Attachments | Photos, change-out slips, install docs |
| Basemap Toggle | Gray vector ↔ satellite |
| Locate | GPS for field use |

## Workflows

1. **New Service Activation** — Place meter, fill Account, Meter No., FlexNet, InstallDate, ServiceType
2. **Meter Change-Out** — Update MeterNo + MeterInstallDate, attach documentation
3. **Service Termination** — Document in Notes, avoid deletion unless erroneous

## Coordinate System

NAD 1983 StatePlane Texas South Central (US Feet) — WKID 2278
