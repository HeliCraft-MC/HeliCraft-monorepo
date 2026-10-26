[Русский](territories_RU.md) | [Documentation](../README.md)

# Territories V1 and political map

Implemented in the repository. Antares owns state jurisdiction; squaremap supplies the actual Minecraft surface. Local verification and remaining manual acceptance are recorded in the [dated report](../verification/territories-2026-10-25.md). This is not evidence of production deployment.

## Legal workflow

An existing ACTIVE state starts without territory and does not need to be founded again. An administrator first registers the actual Overworld identity. A representative opens the state's **Territory** section in Vega. The current machine-readable Governance must authorize `CHANGE_TERRITORY`; a missing policy is added through the ordinary Governance reform. Office titles, presets and constitution prose cannot grant access.

Create a draft for the selected world. An initial proposal starts empty; a replacement starts with that state's published geometry. Draw a Polygon, add components to form a MultiPolygon, drag vertices, cut holes or remove components. Undo/redo works across geometry changes. Labelled coordinate navigation and the optional keyboard GeoJSON control complement pointer editing. The published neighboring geometry stays read-only.

Choose INITIAL, EXPAND, REDUCE or RESHAPE and supply localized reasoning. Changes autosave after one second, using the exact saved draft version. Conflicting saves return a conflict rather than overwrite another edit. Reset restores the last saved values; reload restores the persisted draft. Save and validate runs PostGIS and displays total, added and removed area, conflicts and warnings. Narrow or disconnected forms can require human judgment; they are not categorically forbidden.

Submission freezes geometry, reason translations, base revision and hash. It creates the existing state directive, with the configured single-office, multiple-office, citizen vote, combined or manual procedure. Generic Voting provides ballots and frozen eligibility. Eligible decision readers see the exact submitted geometry. Successful state execution only creates an administrative application.

At `/admin/territories`, an administrator inspects the immutable proposal, legal evidence and geometric analysis, and records a reasoned APPROVE or REJECT. Approval repeats current authority, Governance revision, uninterrupted office membership, successful votes, base revision and overlap checks. The administrator cannot change the proposal. A stale or rejected application requires a new draft/procedure. Exact retries return the original result; conflicting retries fail.

Publication atomically appends an immutable revision and event, changes the active pointer and increments the world version. SQL serializes publication by world and prevents positive-area overlap, including concurrent independent writers. Shared edges remain legal. Public revision history retains geometry, previous revision, author, ratifier, state decision, reasoning, area and effective date, including after world retirement.

## Public map

`/map` serves branding-derived SEO, permitted world metadata, state names and links in cookie-free SSR. Leaflet/Geoman loads only in the browser. The public state catalog contains no geometry; geometry requests use a padded visible X/Z bounding box and refresh after pan/zoom. Count and payload limits apply. Names, boundaries and terrain have separate controls; selection exposes immutable history. Coordinate clicks can be copied and a coordinate/world/zoom URL can be shared. Missing or unrendered terrain is explicitly reported while legal layers remain independent.

The map never publishes player coordinates, sessions, drafts or unratified proposals. Player tracking is disabled in squaremap. Tiles pass through a fixed registered-world PNG route, with server-only allowlisted renderer origins. Paper and squaremap ports remain private.

## Runtime meaning and limits

Deneb determines physical jurisdiction from local verified JTS snapshots. Entering a state or Wilderness shows a localized notification after a short dwell; exact exterior/shared/hole boundaries are Wilderness. `/heli whereami` shows world, X/Z and current jurisdiction; `/heli borders` summarizes the boundary policy. Snapshot identifiers require debug permission. Login, ordinary movement, teleport, dimensions, vehicles and stationary players after an update use the same evaluator. Citizenship remains independent of physical location.

State territory grants no block ownership or protection. Private claims, block protection, territorial taxation/enforcement, PvP rules, police, crimes, war, annexation and diplomatic land transfers are outside this release. Existing taxation citizenship proxies are not silently changed by this spatial feature.

## Contracts and limits

GeoJSON uses `[X,Z]` in blocks, planar SRID 0, Polygon/MultiPolygon with holes. Limits: ±29,999,984 coordinates, 4,096 total vertices, 32 components, 256 rings, 1,000,000,000 blocks², 512 KiB geometry, 1,000 territories and 8 MiB snapshot. PostGIS is authoritative; no silent geometry repair is performed.

REST under `/api/v1` includes public spatial worlds, `/worlds/{id}/states` catalog, bounded `/worlds/{id}/territories`, fixed numeric tiles and published state history; protected account draft list/create/detail/save/preview/submit; administrative world registration/retirement and application review; and scoped internal DENEB version/snapshot endpoints. Generated Alhena is the TS contract. See [Spatial architecture](../architecture/spatial.md) and [development](../development/minecraft-plugins.md) for identity, integrity, migration and renderer operations.
