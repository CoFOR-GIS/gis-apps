# Layer Schema: CoFOREM_Emergency_Incidents

> Auto-extracted on 2026-07-15 by CoFOR Field Schema Extractor

## Service Overview

| Property | Value |
| --- | --- |
| URL | `https://services6.arcgis.com/Cnwpb7mZuifVHE6A/arcgis/rest/services/CoFOREM_Emergency_Operations/FeatureServer/0` |
| Geometry | Point |
| Spatial Reference (WKID) | 102740 (latest: 2278) |
| Feature Count | 0 |
| Max Record Count | 2000 |
| Object ID Field | `OBJECTID` |
| Global ID Field | `—` |
| Display Field | `IncidentName` |
| Capabilities | Query |
| Has Attachments | Yes |
| Has Z | No |
| Has M | No |

## Editor Tracking

| Role | Field |
| --- | --- |
| Creator | `CreatedBy` |
| Creation Date | `CreatedDate` |
| Editor | `UpdatedBy` |
| Edit Date | `UpdatedDate` |

## Renderer

- Type: `simple`

## Query Capabilities

Statistics: Yes · Pagination: Yes · Distinct: Yes · OrderBy: Yes · SQL: Yes

## Indexes

| Name | Fields | Unique |
| --- | --- | --- |
| PK__COFOREM___F4B70D85C84748A7 | `OBJECTID` | Yes |
| user_47476.COFOREM_EMERGENCY_OPERATIONS_COFOREM_EMERGENCY_INCIDENTS_Shape_sidx | `Shape` | No |
| CreatedDateIndex | `CreatedDate` | No |
| CreatedByIndex | `CreatedBy` | No |
| UpdatedDateIndex | `UpdatedDate` | No |
| UpdatedByIndex | `UpdatedBy` | No |

## Feature Templates

### CoFOREM_Emergency_Incidents

All defaults null.

## Field Schema (17 fields)

| # | Field Name | Alias | Type | Length | Nullable | Editable | Default Value | Domain |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `OBJECTID` | OBJECTID | OID | — | No | No |  | — |
| 2 | `IncidentName` | Incident Name | String | 120 | Yes | Yes |  | — |
| 3 | `IncidentType` | Incident Type | String | 20 | Yes | Yes |  | CoFOREM_IncidentType: FLOOD=Flooding / High Water, FIRE=Fire / Wildfire, WEATHER=Severe Weather, WATER=Water System (Leak / Boil Notice / Outage), WASTEWATER=Wastewater / Sanitary Overflow, ROAD=Road Hazard / Closure, POLICE=Police / Public Safety Activity, UTILITY=Utility Outage (Power / Gas / Comms), HAZMAT=Hazardous Materials, OTHER=Other |
| 4 | `Severity` | Severity Level | SmallInt | — | Yes | Yes |  | CoFOREM_Severity: 1=Advisory, 2=Watch, 3=Warning, 4=Emergency |
| 5 | `Status` | Status | String | 15 | Yes | Yes |  | CoFOREM_Status: ACTIVE=Active, MONITORING=Monitoring, SCHEDULED=Scheduled / Planned, RESOLVED=Resolved |
| 6 | `Description` | Public Description | String | 1000 | Yes | Yes |  | — |
| 7 | `Instructions` | Protective Action / Instructions | String | 1000 | Yes | Yes |  | — |
| 8 | `LocationDesc` | Location Description | String | 255 | Yes | Yes |  | — |
| 9 | `StartDate` | Start / Effective | Date | 8 | Yes | Yes |  | — |
| 10 | `EndDate` | Estimated End | Date | 8 | Yes | Yes |  | — |
| 11 | `Department` | Issuing Department | String | 100 | Yes | Yes |  | — |
| 12 | `ContactInfo` | Public Contact | String | 150 | Yes | Yes |  | — |
| 13 | `MoreInfoURL` | More Info Link | String | 255 | Yes | Yes |  | — |
| 14 | `CreatedBy` | CreatedBy | String | 255 | Yes | No |  | — |
| 15 | `CreatedDate` | CreatedDate | Date | 8 | Yes | No |  | — |
| 16 | `UpdatedBy` | UpdatedBy | String | 255 | Yes | No |  | — |
| 17 | `UpdatedDate` | UpdatedDate | Date | 8 | Yes | No |  | — |

## Domain Dictionary

### CoFOREM_IncidentType

Used by: `IncidentType`

| Code | Name |
| --- | --- |
| FLOOD | Flooding / High Water |
| FIRE | Fire / Wildfire |
| WEATHER | Severe Weather |
| WATER | Water System (Leak / Boil Notice / Outage) |
| WASTEWATER | Wastewater / Sanitary Overflow |
| ROAD | Road Hazard / Closure |
| POLICE | Police / Public Safety Activity |
| UTILITY | Utility Outage (Power / Gas / Comms) |
| HAZMAT | Hazardous Materials |
| OTHER | Other |

### CoFOREM_Severity

Used by: `Severity`

| Code | Name |
| --- | --- |
| 1 | Advisory |
| 2 | Watch |
| 3 | Warning |
| 4 | Emergency |

### CoFOREM_Status

Used by: `Status`

| Code | Name |
| --- | --- |
| ACTIVE | Active |
| MONITORING | Monitoring |
| SCHEDULED | Scheduled / Planned |
| RESOLVED | Resolved |

