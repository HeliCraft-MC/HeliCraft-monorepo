[Русский](territories_RU.md) | [Documentation](../README.md)

# Territories V1 and political map

Implemented in the repository. Antares owns state jurisdiction; squaremap supplies the actual Minecraft surface. Local verification and remaining manual acceptance are recorded in the [dated report](../verification/territories-2026-10-25.md). This is not evidence of production deployment.

## World connection

For the standard stack, you do not need to find or copy any UUIDs:

1. Start Minecraft together with the site: `bun run minecraft:up`.
2. Open `/admin/territories` on the website using an administrator account. Under **Connected worlds**, wait for **Overworld** to appear. The list refreshes automatically; Deneb checks world registration every five seconds while running.
3. Click **Open map**. The world is available immediately after registration; surface tiles appear as squaremap renders chunks. Registration does not generate terrain or start an unlimited full render.
4. Open the state's **Territory** section, select this world and use the normal Governance/ratification procedure to establish borders. Registration itself does not grant territory.

A normal Minecraft restart preserves the Paper UUID, world record and published borders. Deleting/regenerating the Minecraft world creates a new UUID: Deneb registers a new empty Overworld and retires the previous primary tile binding. Old borders, drafts and published history remain attached to the old world. An old/retired UUID cannot be reactivated by another synchronization request. Keep appropriate world and database backups; automatic registration never restores or transfers them. If reusing an existing squaremap data directory for a regenerated world, regenerate its surface tiles separately; legal registration does not erase renderer caches.

If no world appears, ensure both Deneb and Antares are running, then inspect `bun run minecraft:logs deneb`. The line `Spatial Paper world <UUID> dimension minecraft:overworld` identifies the physical Minecraft world; `Spatial snapshot installed world <UUID> revision 0` identifies its separate Antares registration. These are different identifiers. An API outage is retried during later reconciliation; you do not need to fill the manual form to compensate for it.

**Manual registration (advanced)** remains for preconfigured/custom backend or map settings. Its fields are: a unique permanent logical key (for example `main-world`), the Deneb service account's backend ID (`deneb` in the standard stack), the Paper UUID from the first log line above, a localized display name, and the actual squaremap tile directory key (`minecraft_overworld` by default). This form already fixes the dimension to Overworld; there is no dimension field to fill. Player/account UUIDs and world folder names are not valid substitutes. Existing matching registrations and map configuration are preserved by automatic discovery.

## Legal workflow

An existing ACTIVE state starts without territory and does not need to be founded again. Deneb automatically registers the primary Overworld when Minecraft starts; see the connection steps above. A representative opens the state's **Territory** section in Vega. The current machine-readable Governance must authorize `CHANGE_TERRITORY`; a missing policy is added through the ordinary Governance reform. Office titles, presets and constitution prose cannot grant access.

If the editor reports missing authority, open **Propose governance reform → 9. State decisions → General state decisions → Change territory → Configure procedure**. For a single monarch to decide, choose **Single office** and select the monarch's office. Submit the reform, obtain the approvals/votes required by current amendment rules, then press **Publish approved reform**. Saving a draft does not grant authority. If a procedure already exists, check citizenship and a current appointment to a selected office.

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
