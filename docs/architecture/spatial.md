[Русский](spatial_RU.md) | [Architecture](README.md)

# Spatial architecture

Implemented in the repository; no production deployment is implied. [Territories](../states/territories.md) describes the user workflow; the [dated report](../verification/territories-2026-10-25.md) records actual checks and separate manual acceptance.

## Ownership and coordinates

Antares/PostGIS owns legal state territory. squaremap renders actual Minecraft surface tiles and never owns territorial data. Vega composes these tiles and political layers; Deneb derives physical jurisdiction from verified local JTS snapshots. Private claims, block protection, PvP enforcement, geology, buildings and diplomatic land transfers are outside V1.

Geometry is planar Polygon/MultiPolygon with holes, in Minecraft blocks, serialized as GeoJSON coordinate arrays `[X, Z]`. PostgreSQL geometry uses SRID 0 (local, unspecified Cartesian coordinates), never geography or EPSG:4326. Bounds are ±29,999,984; rings must close and have positive area. No repair may silently fill holes. PostGIS validates topology, payload/vertex/area limits and positive-area overlaps; a shared edge is legal. Jurisdiction uses strict interior containment: boundary points, including shared edges and hole boundaries, resolve to Wilderness in both PostGIS and JTS. Height does not change jurisdiction.

Each registered world has an immutable logical ID, backend instance, Paper world UUID, dimension and lifecycle status. The Paper UUID must match before geometry applies; a recreated world with the same name is a different world. V1 permits territorial editing only for explicitly registered active Overworlds. Nether and End remain commons. Public map configuration explicitly identifies the squaremap world key and coordinate/zoom conventions after inspection of the pinned renderer.

## Legal changes and concurrency

Existing active states may have no territory; no founding date, historical decision or default polygon is rewritten. A versioned draft pins its state, world and base active territorial revision. Saving uses optimistic concurrency. Submission freezes geometry, reason and hash into an immutable proposal.

Reuse the existing state directive engine, office signatures, revision pinning and generic Voting through `CHANGE_TERRITORY`, which is already a typed Governance action. The storage/API historically named monetary directives is already shared by taxation, diplomacy, companies and FX. Do not introduce another authority engine or territorial ballots. Missing policy denies submission; existing states add it through the ordinary Governance reform. Presets and office titles grant no new capability.

Successful state procedure places the immutable proposal in administrative review; it never activates geometry. A reasoned administrator decision ratifies or rejects the exact submitted geometry. Publication rechecks active state, unchanged Governance revision, uninterrupted current office authority, closed successful votes, base territory and current geometric conflicts. Administrators cannot edit approved geometry. Approval appends a territorial revision/event, swaps the active pointer and increments the world snapshot version atomically. Identical retries are idempotent; conflicting reuse of a key fails.

Publication serializes by world under a PostgreSQL transaction lock, with SQL guards on active geometry and immutable history. This prevents concurrent overlapping publications while allowing neighbors and independent worlds. Historical revisions, reasons and legal evidence are retained. Spatial events remain separate from editorial content and private Minecraft session events.

## Map and runtime

Vega uses a browser-only, lazy Leaflet map with its flat coordinate reference system and squaremap-compatible projection, not Web Mercator or an iframe. The 512px tiles use `[lat,lng]=[-Z/2^maxZoom,X/2^maxZoom]`; the inverse preserves negative coordinates. Public geometry loads by visible bounding box; the SSR catalog omits geometry. Geoman Free provides editing for polygons, components, holes and vertex editing; Vega owns undo/redo and draft autosave. Atria owns reusable controls; Vega owns territorial workflow. Public SSR includes branding-derived metadata, world descriptions and state links without cookies, private drafts or service credentials. Protected editor and administration reads repeat authority checks in Antares. Public tile access allows only registered worlds and bounded numeric coordinates; it must not proxy arbitrary URLs or paths, forward cookies or expose player files/markers.

Deneb polls versions asynchronously using the scoped DENEB Minecraft service API, downloads a bounded complete snapshot when either version or integrity changes, validates schema, identity, integrity and geometry off the main thread, builds a JTS STRtree and atomically swaps one immutable snapshot. Periodic reconciliation recovers missed changes and API outages. There is no HTTP or database access in movement/teleport/join hot paths. All Bukkit/player access and Adventure notifications run on the main thread. Login, teleport, world change, vehicles and stationary players after snapshot replacement use the same jurisdiction evaluator. Debounce prevents border notification spam; `/heli whereami` reports physical jurisdiction independently of citizenship, with versions restricted to debug permission.

Spatial outages retain the last verified snapshot with explicit stale diagnostics or unknown jurisdiction before the first snapshot. They cannot invent new state or block the main thread. Existing fail-closed identity admission remains governed by the Minecraft authentication contract; this feature does not weaken it. Player language uses the existing locale convention, with English then configured supported-language fallback for official state names.

## Snapshot, limits and migrations

Scoped DENEB endpoints bind the service actor to backend and actual Paper UUID. A canonical UTF-8 snapshot core has schema version 1 and SHA-256 integrity; the envelope is verified before JTS geometry/index construction. The reference is replaced atomically per world. Polling compares integrity as well as the integer world version, so official localized state names/colors refresh without rewriting legal geometry. No movement HTTP is issued. After 30 seconds without verification, the last known snapshot is explicitly stale; before first download jurisdiction is unknown. Retired bindings are removed. There is no local authority fallback.

`0045_sour_baron_strucker.sql` introduces the spatial schema. Reviewed `0046_spatial_integrity.sql` supplies world locks, immutable revision/review/event guards, matching state/world pointers, deferred publication completeness and frozen localized reasons, including missing-locale insertion after sealing. `0047_minecraft_approval_locale.sql` records the site locale on successful connection-bound browser approval. Deneb uses this verified preference, then client locale, then English. Locale changes neither identity nor admission authority.

Limits and REST entry points are in [Territories](../states/territories.md). Implementation: `apps/antares/src/modules/spatial`, `apps/vega/src/spatial`, Atria `FlatMap` and Deneb `SpatialEngine`/`SpatialSnapshot`/`TerritorialRuntime`. The shared PostGIS/JTS fixture fixes exact edge, hole, MultiPolygon, narrow and maximum-coordinate semantics. [Development](../development/minecraft-plugins.md) describes pinned runtime artifacts, safe tile delivery and disposable-only migration/renderer operations.
