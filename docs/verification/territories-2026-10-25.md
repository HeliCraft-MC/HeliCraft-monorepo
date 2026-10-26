[Русский](territories-2026-10-25_RU.md) | [Verification](README.md)

# Territories & Political Map V1 verification — 2026-10-25

Status: implemented in the repository; required automated acceptance completed on 2026-10-26. No production deployment was performed. Earlier dated failures and follow-ups are retained below; the final matrix and preserved evidence are at the end. Human graphical Minecraft 26.3 acceptance remains a separate pending check.

## Official artifact verification

The official [Paper Downloads Service](https://fill.papermc.io/v3/projects/paper/versions/26.3/builds) returned stable build **223**, published 2026-10-25 12:46:54 UTC, newer than the task's build 222. Exact [Paper API POM](https://artifactory.papermc.io/artifactory/universe/io/papermc/paper/paper-api/26.3.build.223-stable/paper-api-26.3.build.223-stable.pom) and the running server confirm `26.3.build.223-stable`; runtime Java is 25. Server and plugin locks retain the exact artifact URLs.

| Artifact        | Exact version                                                                             | SHA-256                                                            |
| --------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Paper           | 26.3 build 223 stable                                                                     | `f8e684a4fef2a8b46d03aac049b49d59275e9ce5367dba7c6075cb5780f38470` |
| Velocity        | 4.2.0 build 30 stable                                                                     | `35a5596a5468a035d8a32c8de5ebb0dc6b8d8f0cc3ff5169d514aca762af8aa8` |
| LimboAPI        | 1.1.27-SNAPSHOT, commit `bfef5799f21d73a80155035c3430f6654aa6b9f8`                        | `5d541984b90ca7a88eb49ca5f8cc3a803f5ecdfa6d7ed30b605b72ff94156e40` |
| squaremap Paper | 1.4.3 / mc26.3, [Modrinth release 6wmZVQBO](https://api.modrinth.com/v2/version/6wmZVQBO) | `d13331799cd5ace6c02b7e625eda40f0fb69c4f89c3778324758bf6f25f49f08` |

The downloaded squaremap JAR also matched Modrinth's SHA-512 `8e3fde14937a8ff7776a37f43385942ff76bab4d2a5f9e9d5290a22c5dc26b21fbde666439e48b0f128e09083ac06b96e56263e2ee740e8550bc5c61e408a4c1`. Its embedded source map and official v1.4.3 Java source confirm tile paths `tiles/{world-key}/{zoom}/{tile-x}_{tile-z}.png`, 512px tiles, `minecraft_overworld`, maximum native zoom 3, extra zoom 2, and Leaflet `CRS.Simple` with `[lat,lng]=[-Z/2^maxZoom,X/2^maxZoom]`.

Direct locked sources: [Paper JAR](https://fill-data.papermc.io/v1/objects/f8e684a4fef2a8b46d03aac049b49d59275e9ce5367dba7c6075cb5780f38470/paper-26.3-223.jar), [Velocity JAR](https://fill-data.papermc.io/v1/objects/35a5596a5468a035d8a32c8de5ebb0dc6b8d8f0cc3ff5169d514aca762af8aa8/velocity-4.2.0-30.jar), [LimboAPI artifact](https://github.com/Elytrium/LimboAPI/releases/download/dev-build/limboapi-1.1.27-SNAPSHOT.jar), [squaremap JAR](https://cdn.modrinth.com/data/PFb7ZqK6/versions/6wmZVQBO/squaremap-paper-mc26.3-1.4.3.jar). The LimboAPI dev-build URL is mutable; the pinned checksum deliberately rejects replacement. Native test codec: [OpenCollab MCProtocolLib 26.3](https://repo.opencollab.dev/maven-releases/org/geysermc/mcprotocollib/protocol/26.3/).

## Initial executed checks

- `./gradlew :minecraft-client:build :rigel:build :deneb:build --no-daemon`: passed after switching Deneb to exact Paper API 26.3. Subsequent native test-client compilation, JUnit and Checkstyle/Spotless for the shared client passed.
- `bun run build:ts`: passed before the spatial API additions; it is not final spatial UI/build verification.
- `bun run test:minecraft:contracts`: **13 passed**, disposable PostGIS and current migrations at that run.
- `bun run --cwd apps/antares test:integration tests/spatial.integration.test.ts`: initial **4 passed**, including actual Governance reform, optimistic drafts, immutable submission, single-office directive, separate admin authorization/ratification, immutable revision/event, strict boundary policy, Polygon/MultiPolygon/holes, invalid/degenerate geometry, area limit, neighboring edges, overlaps and independent worlds. Coverage is being expanded; this does not establish the full required concurrency/Voting matrix.
- `bun --no-env-file scripts/minecraft.ts config`: passed. Container image build, readiness, map delivery through Vega and external-port acceptance remain to be checked.
- Alhena generation and root TS compilation after the initial spatial APIs: passed. Full per-workspace quality gates remain pending.

## Native Minecraft and real squaremap

A fresh disposable world in `/tmp/helicraft-native-26.3-K7eLGI` booted Paper 26.3-223 with Deneb and squaremap 1.4.3 on Java 25. Both plugins enabled, the game port bound loopback and the renderer HTTP endpoint bound `127.0.0.1:8081`. Nether/End rendering and live player tracking were disabled. The test server was stopped after the check.

A radius render of 48 blocks around X/Z 0/0 processed 49 chunks. Replacing a 32×32 surface at Y=300 from red to blue concrete, saving and repeating the bounded render changed the real HTTP PNG `tiles/minecraft_overworld/3/0_0.png`:

- Before: `b05c7d7d9f45e1339e33fc07e989eacabefcd4ac2db54dcaffeb633a60f89f8f`.
- After: `b67e4cffaf6ae34e02c4129a406367a5949dce831f66ca0451af55b9de629408`.

The PNG was visually inspected and contains actual terrain plus the changed surface. This confirms renderer startup, generation and explicit bounded re-render after block changes; automatic background update, browser transform and Vega map/editor acceptance are still pending.

The maintained **MCProtocolLib 26.3** release uses native protocol **777**. It is a test-only dependency; no protocol implementation or translation plugin is bundled into production. The existing Minecraft harness now consumes its private IPC events instead of `minecraft-protocol` 26.1. The first full run reached browser approval but Paper rejected gameplay because its newly generated properties defaulted to an empty enabled whitelist. The explicit configuration now uses Antares admission and private modern forwarding with `white-list=false`.

The second run, evidence `/tmp/helicraft-minecraft-v1-J1H55f/result.json`, **passed** native lobby → explicit browser code confirmation → unchanged UUID → Paper welcome/profile/presence → disconnect. It also passed unknown-name rejection, direct Paper rejection, pre-auth `/server`, reconnect, browser rejection, API outage, crash lease expiry, real proxy/Paper restarts, wrong forwarding secret, unavailable Paper, stale service token, forced-host/other-backend denial and recovery. No ViaVersion/ViaBackwards JAR was installed. The browser recorded no page errors.

| Acceptance                                                  | Evidence at that stage                                                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Native Paper 26.3 runtime                                   | Passed                                                                                      |
| Native Minecraft 26.3 protocol client, identity flow        | Passed using MCProtocolLib 26.3 / 777                                                       |
| Existing Velocity 4.2.0 + pinned LimboAPI compatibility     | Passed in that native identity flow                                                         |
| Human graphical Minecraft 26.3 acceptance                   | Pending                                                                                     |
| Territory movement notifications and `/heli whereami`       | Passed in the native spatial run below                                                      |
| R1→R2 without restart; spatial outage/reconciliation        | Passed in the native spatial run below                                                      |
| Actual Vega political map/editor screenshots and Playwright | Passed in the live renderer/browser run below; broader keyboard/error/history checks remain |

No user database `helicraft`, persistent user world or old chunks were accessed. Test EULA acceptance followed the explicit authorization. Temporary directories contain private local runtime configuration; do not publish them wholesale.

## Native territorial acceptance and live map browser flow

The completed native run `/tmp/helicraft-minecraft-v1-asRVeW/result.json` passed the existing identity/security/fault suite plus actual spatial gameplay. Its `spatial-result.json` records native protocol 777, Paper 26.3-223, two states, world revision 2→3→4, and no Paper restart between territorial changes. Ordinary physical movement entered Loria at X=17/Z=0.5; the private movement evidence records the server’s `/heli whereami` response. Teleports exercised Wilderness, Aurora and an interior hole. Sub-500ms shared-edge jitter produced no repeated title, while standing exactly at X=16 produced Wilderness. Ordinary users received no snapshot debug identifiers.

Publishing a reduction through the real Antares draft→Governance→administrative workflow reclassified a stationary player as Wilderness. A test-only outage of the spatial namespace retained the last verified snapshot and did not terminate independently valid game admission. Another revision was published during the outage; reconciliation installed it after recovery and reclassified the stationary player without a plugin reload. Existing identity failures still fail closed.

This run installed no ViaVersion/ViaBackwards. The native test client uses the standard 26.3 client tick-end packet after movement; an earlier acceptance attempt exposed this requirement and disconnected before that correction. A subsequent attempt used short physical steps rather than a single large move. Those failures are not recorded as passing movement evidence.

The later run `/tmp/helicraft-minecraft-v1-sOvNda` passed the real Vega browser journey against its running Paper/squaremap and disposable PostGIS: create authorized state draft, draw polygon with the pointer, drag a vertex, cut a hole, supply localized reasoning, save/PostGIS preview, reload the saved geometry, submit the existing Governance decision, independently ratify as administrator, and load the published public SSR map. The server HTML contained the published state and omitted private reasoning. Desktop and 390px mobile passed without page errors or horizontal document overflow. Its spatial gameplay/hot-update/outage stage also passed; its final `result.json` also confirms the complete identity/security/fault suite passed and all disposable processes stopped. World revisions were 3→4→5, including the browser-published third state. The real tile SHA-256 changed from `78376a94b5e4276fa9a476273d69dea0ab894579473ef5a0cc48528ff4b18484` to `39ba81f06ff8c821c8c106f575eb0e9d75c1293c0d0336832f630fb2464293cb`.

- [Real public map, desktop](assets/territories-2026-10-25/political-map-desktop.png).
- [Real public map, mobile](assets/territories-2026-10-25/political-map-mobile.png).
- [Real editor after pointer edits and persisted reload](assets/territories-2026-10-25/territory-editor-desktop.png).

The initial renderer test covers a deliberately small area, so unrendered surrounding terrain is explicitly shown as unavailable. These are actual renderer tiles, not the neutral Storybook fixture. Leaflet 1.9.4 and Geoman Free 2.20.4 are exactly pinned. The shared component’s separate browser check passed pointer vertex editing, another hole, MultiPolygon creation and desktop/mobile inspection. Five transform unit cases passed, including negative and maximum Minecraft coordinates and non-default native zoom. Storybook and Vega production builds, Atria/Vega types and strict lint for the new map/editor files passed at that stage.

At that stage, remaining release gates included expanded territorial authority/concurrency cases, revision-history browser acceptance, language-preference integration, full regression/quality checks, final Compose image/readiness/port acceptance, canonical documentation and background renderer-update acceptance. That stage did not complete the whole task.

## Follow-up quality and persistence checks

After adding public immutable revision history and protected ratification-status DTOs, the spatial suite passed **15 tests across four files**. The direct SQL case uses independent connections without the global service authorization lock: exactly one overlapping publication commits, the other rolls back with no orphan review/revision/event. A deferred constraint rejects approval without publication; direct event insertion and active state/world rebinding are rejected. Published history remains readable after world retirement. The first new PL/pgSQL attempt failed migration parsing at an unparenthesized CASE expression; the corrected migration was applied afresh by the passing suites.

The full Antares integration regression then passed **109 tests in 38 files** using disposable PostgreSQL/PostGIS (477.89s). `build:ts`, root `typecheck`, root strict `lint`, and all unit suites passed at that stage: Antares 133, Vega 61, Atria 29, Alhena 1. Gradle shared-client/Rigel/Deneb build, JUnit, Checkstyle and Spotless passed. Autosave, reset and coordinate-copy follow-ups were subsequently added; their final browser acceptance and repeated release gates remain pending.

The existing Minecraft Compose project was built and started with no pre-existing project containers or volumes. All services reached healthy, including squaremap HTTP readiness at `/tiles/settings.json`; the initial wrong `/settings.json` readiness URL was corrected after an actual 404. Antares migrations ran against `helicraft_minecraft_test`. Docker port bindings expose only loopback Vega 8096 and Velocity 25575; Paper 25566, squaremap 8081, PostgreSQL 5432 and storage have no host publications. The real `/map` HTML returned HTTP 200 and its SSR title/empty-world guidance. This Compose build preceded the final autosave follow-up.

## Expanded native and persistence acceptance

The later complete run `/tmp/helicraft-minecraft-v1-Xx1Egk/result.json` passed native protocol 777 and the full identity/fault suite. `spatial-result.json` records world versions 3→4→5 without a Paper restart, actual ordinary movement, teleports, shared-edge dwell/jitter, a vanilla powered minecart across state borders, Nether/End commons and return, and recognition of the browser-drawn third state's territory. R2 and R3 were submitted, validated and independently ratified through Vega. A spatial-only outage lasted over 30 seconds: the previous verified jurisdiction was explicitly stale, and recovery installed the missed revision. Official localized state-name changes refreshed by integrity while the geometry/version remained unchanged. A reconnect approved in Russian on the actual Vega page produced Russian welcome, title and `/heli whereami` at the persisted player location. No ViaVersion/ViaBackwards was installed and no browser page errors occurred.

The real renderer tile hashes were `ff46b0e8f34cfd10866fe4f44b90840f2ad41ba4703a4152fd08021a8afa0e16` before, `1d499769524845cb4a235d40c33e0b39add72fa932c9f97b83ce0df44b1d613d` after explicit render, and `cce4d3498d5dc0bf32352734612b4529ada1b8ced94df8fa21a42b7227de27b0` after the next block change updated automatically in the background, without another render command. The bounded platform used 24 chunks; no persistent world was opened.

Browser acceptance also passed geometry undo/redo, autosave, keyboard reset, saved reload, revision history, name/terrain toggles and coordinate copying with an exact negative X/Z assertion. The first expanded attempt exposed headless clipboard fallback; explicit context permissions and page focus resolved it. The next attempt passed browser/vehicle/dimension checks but timed out expecting a duplicate title on a same-jurisdiction teleport; the corrected assertion requires no notification spam. These attempts are retained as failures, not counted as passing complete runs.

Afterward the full Antares regression passed **112 tests in 38 files** (514.58s). A focused current PostGIS/API run passed **10 tests**, including the new geometry-free catalog, bounding-box exclusion/inclusion and revocation followed by reappointment of the same office holder. Sealed reasons reject adding a previously missing translation. All current unit suites passed: Antares 133, Vega 63, Atria 29, Alhena 1. Java build/JUnit/Checkstyle/Spotless, TS build/typecheck and strict lint passed. The nine root/affected Compose descriptions and 833 local Markdown links/images passed validation at this stage. Viewport browser acceptance, final Compose startup and broader browser regression are recorded in the follow-up below when completed.

## Final Compose and component checks

A new clean Compose start initially failed before any migration SQL: socket-based `pg_isready` declared PostgreSQL ready while its temporary initialization server had no TCP listener. The test project's healthcheck now uses `-h 127.0.0.1`. After removing only this run's disposable volumes, the corrected fresh start passed: 48 migrations applied to `helicraft_minecraft_test`, all six persistent services healthy, squaremap `/tiles/settings.json` HTTP 200, and `/map?lang=en` HTTP 200 with SSR title and registration guidance. Inspection confirmed only `127.0.0.1:8096` and `127.0.0.1:25575` published. The main Compose API now forwards the optional server-only `SQUAREMAP_TILE_SOURCES` environment; all nine Compose definitions validate.

The final Atria Storybook build and its real browser vertex/hole/MultiPolygon desktop/mobile check passed. Separate browser regressions passed **22 companies/workspace tests** and **14 public-gallery tests**, across development and production. They use independent typed fixtures and supplement the full real PostGIS suites.

## Continuation — 2026-10-26

A host/session restart removed the earlier `/tmp` runtime directories and interrupted the pending follow-up. Their dated outcomes above remain historical evidence, not newly inspected files. The user restarted the stopped Docker daemon. Current follow-up logs are retained in ignored `build/territories-verification/`.

Fresh checks passed: `build:ts`, `typecheck`, strict `lint`, `format:check`, all **226 unit tests**, and `./gradlew build spotlessCheck --rerun-tasks` (28 tasks executed, including JUnit). The complete current spatial PostGIS/API/SQL/shared-fixture suite passed **17 tests in four files** (27.28s).

The earlier main Playwright run completed with 36 passing, one intentional development-only skip and one production taxation failure. The failure was independently reproduced in a bare Chromium input: `datetime-local` canonicalizes `.060` to `.06`, while Playwright fill checks the exact supplied value. The existing test helper now obtains the browser's canonical date value before filling, preserving millisecond timing and leaving production taxation unchanged. Both complete development/production tax journeys then passed (**2 tests**, 1.2m). The separate Companies/FX run was intentionally interrupted to serialize Docker network changes before browser activity; it is not counted as a passing run. Its complete rerun and the final native viewport acceptance are recorded below when finished.

## Final native acceptance and completion audit — 2026-10-26

`bun run test:minecraft:territories` completed successfully against the final application code in `/tmp/helicraft-minecraft-v1-cBlSjb`. Its [sanitized result](assets/territories-2026-10-26/acceptance.json) and [spatial result](assets/territories-2026-10-26/spatial-result.json) are preserved in the repository. No tokens, verifiers, challenge codes or private runtime configuration were copied. The complete native/browser/identity/fault suite passed, with no page errors, native protocol 777 and no translation plugin. All child processes and disposable test containers stopped in cleanup.

The new viewport browser test verifies four bounded X/Z query parameters, a changed query after keyboard pan, negative coordinate copying, mobile layout and SPA unmount immediately after resize. Its first run exposed a delayed Leaflet moveend listener reading a removed map (`_leaflet_pos`). The runtime now detaches its bounds listener, marks disposal and ignores queued ResizeObserver work before removal; the full rerun passed without suppressing errors. The current Storybook build and real vertex/hole/MultiPolygon desktop/mobile browser check also passed.

Companies/FX completed **4 browser tests** in development and production (2.5m). Logs retain non-fatal SSR AbortError messages when clients close connections, and existing PostgreSQL concurrent-query deprecation warnings; neither is counted as a browser page error or silently suppressed. The corrected tax repeat, the other 36 successful main-suite cases, 22 companies/workspace and 14 public-gallery cases establish the corresponding regressions. The main suite's development copy of its production-assets-only test is intentionally skipped; its production copy passed.

The final audit added a genuine sovereign enclave: two independent states complete their own Governance and administrative ratification, with the inner state exactly filling the outer state's hole. PostGIS and JTS both resolve `(8,24)` to the outer state, `(24,24)` to the enclave and exact shared edges `(16,24)`/`(32,24)` to Wilderness. The first fixture reused an already registered active tile binding and was correctly rejected; its distinct world tile key then passed the full **10-case spatial lifecycle file**. Deneb JUnit now has **14 tests** (shared client 5, Rigel 3; **22 Java tests total**), all passing with Checkstyle/Spotless. The separate four-file spatial run passed 17 cases before this added enclave case. The earlier complete Antares regression remains the dated 112-case run; it is not relabelled as a new full run.

| Acceptance criteria from task §18                                                  | Authoritative evidence                                                                                                                              |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–4: native Paper/Deneb/Rigel/Limbo/squaremap                                      | Exact locks and SHA-256 above; native startup and protocol-777 result                                                                               |
| 5–8: actual public map, state draft, polygon/holes editor                          | Real renderer PNGs, pointer/keyboard/autosave/reload Playwright flow and preserved screenshots                                                      |
| 9, 14–15: PostGIS validity, concurrent overlap prevention, legal shared edges      | Spatial geometry/API/lifecycle and direct independent SQL-writer suites; shared JTS fixtures                                                        |
| 10: initial territory for existing active states                                   | Explicit Governance reform and INITIAL draft on an existing ACTIVE state; no refounding or invented polygon                                         |
| 11–13: real Governance, separate approval/rejection, immutable publication/history | Single office, combined Voting, stale revision/revoked mandate/replay tests; ratification and SQL completeness/immutability; public history         |
| 16–19: verified snapshot, actual player entry/exit, whereami                       | Native ordinary movement, teleport, hole/shared-edge dwell, minecart, dimensions and persisted-location reconnect                                   |
| 20: changed geometry without Paper restart                                         | R1=3 → R2=4 through Vega and independent administrator; stationary reclassification and whereami                                                    |
| 21–22: availability and missed-revision recovery                                   | Spatial outage retains explicitly stale verified R2; recovery installs version 5; independent identity failures still fail closed                   |
| 23–24: actual 26.3 and automated tests                                             | Maintained MCProtocolLib 26.3/protocol 777, actual Paper 26.3-223, complete native/browser automation                                               |
| 25: user data preserved                                                            | Only disposable named databases/worlds and isolated Compose volumes; no user `helicraft` connection or persistent-world migration; cleanup verified |
| 26: agent rules and bilingual references                                           | Root and four app AGENTS; EN/RU architecture, territorial workflow, development, product/readme and verification references; local-link checks      |

The final source includes generated Alhena/OpenAPI and reviewed migrations 0045–0047. Build, typecheck, strict lint, formatting, 226 unit tests, Java build/JUnit/style, spatial SQL/API, existing domain integrations, native/browser tests, nine Compose definitions and documentation links were exercised. This table does not claim graphical human acceptance or production deployment.

Preserved and visually inspected current screenshots:

- [Political map — desktop](assets/territories-2026-10-26/political-map-desktop.png) and [mobile](assets/territories-2026-10-26/political-map-mobile.png).
- [Territory editor — desktop](assets/territories-2026-10-26/territory-editor-desktop.png) and [mobile](assets/territories-2026-10-26/territory-editor-mobile.png).
- Actual squaremap tile [before](assets/territories-2026-10-26/squaremap-before.png), [after explicit render](assets/territories-2026-10-26/squaremap-after.png) and [after automatic background update](assets/territories-2026-10-26/squaremap-background.png). SHA-256 respectively: `40b49735ebac0e9fb565d82078d6026b608715e98724ca0236b28786d3800083`, `2c6cc6ad5c1cb356bee7f57dfc8bc4298c5f1e3bac1c190e23b5e67397372ecd`, `ab7a8ebda4d048724bb146a5b692d9035805d08acfed5c79176737ce398e25bc`.

Human follow-up: use the normal 26.3 graphical client with the [isolated acceptance guide](../development/minecraft-plugins.md#native-client-acceptance), visually inspect titles and terrain, and repeat the map→ratification→border journey. Persistent-world backup/restore/migration and large-world fullrender TPS benchmarking are operator procedures, not tests performed here. The test world covers a bounded area; missing surrounding tiles are expected and explicitly labelled. V1 remains Overworld jurisdiction and notifications; private claims, protection/enforcement and automatic territorial taxation remain outside scope. Spatial degradation does not weaken connection-bound fail-closed authentication.

Final documentation verification checked 859 local Markdown links/images and heading targets; all resolved after correcting the new manual-acceptance anchor. Root formatting and `git diff --check` passed.

## Follow-up — automatic Overworld registration, 2026-10-26

Scope: current working tree based on `3feabab`, including the confirmation-link changes. Deneb now explicitly requests discovery of its primary Overworld during reconciliation. No manual administrative registration was used in the native test: `tests/minecraft/territories.ts` read the public world list, asserted exactly one automatically registered Overworld and matched its Paper UUID to the real Deneb startup log before the full legal/map/movement flow.

Executed successfully: root `build:ts` (through `test:minecraft`), TS7 `typecheck`, strict `lint`, `format:check`, `test:unit` (229 tests), Gradle builds/checks for minecraft-client, Rigel and Deneb, and the targeted world-discovery/spatial API integration suites (4 tests). The new integration cases verify credential/role/cookie restrictions, no registration for read-only reports or Nether/End, invalid/duplicate primary identities, concurrent idempotency without a human account, preservation of existing map settings, immutable service audit, separate UUIDs for recreated worlds, empty initial geometry, stale-retired reports and backend isolation. Migration `0049_spatial_world_discovery.sql` was reviewed and applied to the fresh test databases; no schema push was used.

Full `bun run test:minecraft` passed. Evidence: `/tmp/helicraft-minecraft-v1-CfjqWe`, with an [exact saved result](assets/territories-2026-10-26/world-discovery-result.json). Real Paper 26.3/protocol 777, squaremap tiles, browser editing/Governance/ratification/public SSR/mobile, movement/vehicles/dimensions, live revision recovery, confirmation links, admission rejection, crash expiry, restarts and recovery all passed with no page errors. The persistent Minecraft Compose project was not started and user worlds/databases were not changed. Human graphical-client acceptance and production deployment remain separate checks.

Current [step-by-step world connection instructions](../states/territories.md#world-connection) replace the old requirement to copy UUID/dimension manually for the standard primary Overworld. The advanced manual form remains available; a new physical UUID never receives previous borders.

## Follow-up — editable territory procedure, 2026-10-26

A reported configuration failure exposed a missing `CHANGE_TERRITORY` entry in Vega's policy catalog. The backend already enforced the action, but the reform UI could not configure it. The action is now present under **9. State decisions → General state decisions → Change territory**. The policy catalog and optional-policy list share one definition; no procedure is silently added to existing governance. The blocked editor distinguishes inactive states, missing procedures and missing office/citizenship authority and explains the full reform publication path.

Fresh verification for this UI fix: `build:ts`, TS7 `typecheck`, strict `lint`, `test:unit` (230 tests), plus `playwright test tests/e2e/territory-policy.spec.ts` (development and production, 2 passed). The real browser scenario starts with an active state lacking the action, configures a single actual office through the reform UI, waits for autosave, reloads, verifies the backend still returns 403 before publication, obtains the current office approval, publishes the reform, then verifies editor access and HTTP 200. The existing native Minecraft results above are separate earlier runs; native tests were not rerun for this frontend-only change.
