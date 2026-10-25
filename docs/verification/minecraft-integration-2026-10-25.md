[Русский](minecraft-integration-2026-10-25_RU.md) | [Verification](README.md)

# Minecraft Integration V1 verification — 2026-10-25

Scope: local worktree implementation on base revision `2fcdf31`, not a production deployment. The full supplied foundation task was implemented across Antares, Vega, Rigel, Deneb and a shared Java REST library. [Architecture/contracts](../architecture/minecraft-integration.md), [development and manual acceptance](../development/minecraft-plugins.md), [player sign-in](../development/minecraft-authentication.md).

## Delivered behavior

- Existing Antares account UUID v4 becomes the exact Velocity/Paper UUID. Existing ASCII, case-insensitive unique username is reused; rename retains UUID and invalidates admission. No independent Minecraft user/password table or mandatory link/register command.
- Browser/code confirmation authorizes one connection. Short TTL, hashed code/verifier, attempt limits, account/session checks, scoped service credentials, CSRF, ownership, atomic consumption and disconnect/revocation invalidation fail closed.
- Rigel resolves identity before limbo, waits in pinned LimboAPI, consumes approval before backend transition and guards every backend request. Deneb checks forwarded admission before gameplay, attests joins, shows localized real profile/citizenships and implements `/heli`, `/heli status`, `/heli profile`. Profile commands refresh actual Antares information asynchronously.
- Protected `/app/minecraft` uses generated Alhena and existing Atria controls. It shows identity, pending requests, explicit code approval/rejection, lease-aware private presence, last actual join and recent activity. Request/activity timestamps include time and UTC. No private game data enters public SSR or caches.
- Separate proxy/Paper leases prevent permanent false online status; actual start/end events are immutable, private and idempotent. No territories, claims, physical institutions, economy adapter or World Engine was added.

## Exact versions

| Component             | Version/pin                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Native JDK            | OpenJDK 25.0.4.1; Java toolchain 25                                                                                                              |
| Gradle                | 9.1.0 wrapper                                                                                                                                    |
| Velocity              | 4.2.0 build 30; SHA-256 `35a5596a5468a035d8a32c8de5ebb0dc6b8d8f0cc3ff5169d514aca762af8aa8`                                                       |
| Paper                 | 26.2 build 129, API `26.2.build.129-stable`; SHA-256 `b1d8f6bfa1b6101fa8e947b53041cb3bdf5540e7b83b6547ca19ba7edefeb083`                          |
| LimboAPI              | `1.1.27-SNAPSHOT`, commit `bfef5799f21d73a80155035c3430f6654aa6b9f8`; SHA-256 `5d541984b90ca7a88eb49ca5f8cc3a803f5ecdfa6d7ed30b605b72ff94156e40` |
| Shared Java HTTP/DTO  | Gson 2.13.2, shaded separately by each plugin                                                                                                    |
| Java tests            | JUnit Jupiter 5.13.4 / Platform 1.13.4                                                                                                           |
| Protocol harness      | `minecraft-protocol` 1.68.0; Minecraft 26.1                                                                                                      |
| Test-only translation | ViaVersion 5.12.1 + ViaBackwards 5.12.1, locked SHA-256 in `infra/minecraft/test-adapters.json`                                                  |
| Web/test tools        | Bun 1.4.2, TypeScript 7.0.2, Playwright 1.63.0, Vitest 5.0.3                                                                                     |
| Infrastructure        | Docker 29.9.1 / Compose 5.6.0, PostgreSQL/PostGIS `18-3.6`, SeaweedFS 4.48                                                                       |

LimboAPI was chosen after source/release/license research and real runtime checks. Its API is MIT; separately installed runtime is AGPL-3.0, not bundled in Rigel. LimboAuth was reference only. No custom protocol stack was implemented. MockBukkit's 26.2 branch was investigated; pure logic plus real Paper tests avoided another mutable snapshot dependency. Password `/login` remains deliberately unsupported because command history/interception cannot provide the browser flow's account-secret boundary.

## Executed commands and results

| Command/check                                                                           | Actual result                                                                                                                                                 |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run db:generate`, SQL review                                                       | Additive `0044_uneven_annihilus.sql`: three Minecraft tables, constraints/indexes/FKs, append-only event trigger; applied successfully to isolated PostgreSQL |
| `bun run generate`, `bun run build:ts`                                                  | Passed, including fresh SDK, Antares and production Vega; also executed by `test:minecraft` and `test:e2e`                                                    |
| `bun run typecheck`                                                                     | Passed for root and all four Bun workspaces with TS7                                                                                                          |
| `bun run lint`                                                                          | Passed strict type-aware oxlint; adjacent exceptions documented in quality policy                                                                             |
| `bun run test:unit`                                                                     | 219 tests passed: Antares 133, Vega 61, Atria 24, Alhena 1 (final root command, including generation)                                                         |
| `bun run test:integration`                                                              | 34 files / 90 tests passed, including States, Governance, Voting, Monetary, Taxation, Companies, FX, Diplomacy and initial Minecraft scenarios                |
| `bun run test:minecraft:contracts`                                                      | Extended final Minecraft suite: 13 tests passed on fresh PostgreSQL, including current multilingual citizenship and same-role service scope                   |
| `./gradlew spotlessApply :minecraft-client:build :rigel:build :deneb:build --no-daemon` | Passed; 10 JUnit tests, Checkstyle, Spotless and warnings-as-errors compilation                                                                               |
| `bun run minecraft:config`, `minecraft:up`                                              | Full Compose built/migrated/started; PostgreSQL, storage, Antares, Vega, Deneb and Rigel healthy; migration exited successfully                               |
| `minecraft:logs`, `minecraft:down`, `minecraft:clean`                                   | Exercised; final disposable stack stopped and only its containers/networks/volumes removed                                                                    |
| `bun run test:minecraft`                                                                | Final fresh-build real browser/protocol acceptance passed; expanded negative scenarios passed                                                                 |
| `bun run test:e2e`                                                                      | Final Playwright rerun: 37 passed, one intentionally skipped development-only production-cache check                                                          |
| Isolated `downloadLimbo` negative-pin test                                              | Expected failure: `LimboAPI checksum mismatch`; no incompatible JAR installed                                                                                 |
| Formatting, local links and Compose matrix                                              | Final results recorded below                                                                                                                                  |

The negative-pin test copied the real root Gradle task into `/tmp/helicraft-limbo-pin-negative`, pointed it at the local runtime JAR with an intentionally incorrect SHA-256, and ran `./gradlew -p /tmp/helicraft-limbo-pin-negative downloadLimbo --offline --no-daemon`. It failed at checksum validation before writing the runtime. This verifies prevention of an unreviewed/incompatible artifact replacement, not compatibility of arbitrary old Limbo versions. Evidence: `/tmp/helicraft-limbo-pin-negative.log`.

The first unit command inside restricted worker-process tooling timed out starting Vitest workers. Running with ordinary process access passed; this was an environment failure, not a passing test or a code regression. Existing PostgreSQL tests emit `pg@9` concurrent-query deprecation notices; the suite passed and new Minecraft transactions use sequential reads/writes.

## Real runtime evidence

Final native evidence directory: `/tmp/helicraft-minecraft-v1-ruEawO` (local, untracked). It contains `paper.log`, `velocity.log`, `vega.log`, `minecraft-online.png`, `minecraft-last.png` and successful `result.json`. Screenshots were visually inspected; online/offline and activity were also asserted in the browser. These paths are evidence from this machine, not guaranteed artifacts in a fresh checkout. Runtime directories contain private disposable configuration; do not publish them wholesale.

The real flow verified:

1. Unknown name is rejected with the Vega registration URL. Direct Paper login is rejected with “This server requires you to connect with Velocity.” No unauthenticated playerdata is created.
2. A real Minecraft client receives the stable account UUID in login success, enters virtual limbo, sees the code and cannot use `/server deneb` to enter Paper.
3. A real signed-in Chromium page rejects an incorrect code with a localized error, then enters the correct code and explicitly confirms. Rigel consumes it once; Paper receives the same UUID, and Deneb sends actual profile/citizenship output.
4. `/heli profile` returns the stable UUID through actual game chat. Protected Vega visibly becomes online and records a real start event.
5. Disconnect visibly becomes offline and creates one end event. Paper saves under `disposable-world/players/data/<Antares UUID>.dat` (the 26.2 layout).
6. Reconnect receives the same UUID and a fresh challenge; browser rejection without a code disconnects before Paper and adds no session-start event.
7. Stopping the HTTP API rejects a new known-account connection before login success; no anonymous/offline fallback and no new start event.
8. `SIGKILL` of both live Java servers closes presence through the 45-second lease and records one end event. Real restarts reuse the world and UUID but demand a fresh challenge; an unapproved reconnect cannot enter.
9. Wrong forwarding secret, unavailable Paper, stale Rigel service token and a configured `escape.test` forced host targeting an unapproved backend all fail without another start event. Restoring the configuration permits a new fully approved join/quit. The only saved playerdata UUID belongs to the account.

Healthy initial native/Compose startup logs contain no `ERROR` or exception traces; the native harness asserts this. Deliberate wrong-forwarding/unavailable-Paper fault logs contain the expected Velocity refusal/error evidence, separate from healthy startup logs. Expected offline-proxy, Java `Unsafe` and pinned-Paper-newer-release notices remain. The controlled offline proxy is protected by Antares/Limbo/Deneb admission, private Paper and modern forwarding; it is not an anonymous server.

The complete Compose stack was run separately, using current source-built images and generated private credentials. Actual published ports were loopback web 8096 and proxy 25575. Paper/PostgreSQL/S3 had no published host ports. Native acceptance bound Paper to loopback and exercised protocol-level direct-login denial.

## Security and migration coverage

The real PostgreSQL contract suite checks absent/invalid/wrong-role credentials, rejection of service requests carrying cookies, browser CSRF, unknown/Unicode names, client-selected account UUID rejection, canonical name/account UUID, hashed secrets, foreign account challenges, wrong code, connection mismatch, parallel consumption/replay, parallel challenges, bounded code attempts, rejection/cancellation, expiry, revoked/expired web approval, banned account, rename invalidation, stale proxy polling, actual Paper-only presence, wrong UUID admission, idempotent joins/closes/events, append-only SQL protection, expired Paper lease and password-change invalidation. It also checks same-role proxy/backend isolation, incorrect verifiers, concurrent approvals and all current multilingual citizenships, excluding departed historical founders. Java tests cover late approval after close, UUID mismatch/expiry, normalization, actual HTTP malformed/error/slow responses, no timeout retry and localized multi-citizenship/neutral messages.

No destructive schema push/reset, user database `helicraft`, user balances/states/accounts or persistent user world was used. Migration SQL only adds the Minecraft domain. Antares remains the only database/S3 consumer; Java plugins use scoped REST. Test EULA was accepted automatically under the owner's explicit authorization.

New contracts are the 13 operations listed in the [architecture route table](../architecture/minecraft-integration.md#rest-contract-and-persistence), with `MinecraftChallenge`, issued proof, admission/session/profile and owner read-model schemas. New project guides: `apps/{rigel,deneb,antares,vega}/AGENTS.md`; root AGENTS, paired READMEs, product map, identity reference and GDD amendment were updated. English/Russian architecture, development, authentication, plan and this report are linked from the indexes.

## Corrections during verification and remaining manual scope

Initial startup exposed inherited example forced hosts; an explicit empty table fixed Velocity configuration. Paper's template `_version` was corrected from 32 to its actual supported 31. The pinned protocol library retained unused known-packs listeners across limbo configuration, causing a duplicate reply; the test adapter clears unused listeners at normal phase completion. A test initially looked for the older `playerdata` folder; it now verifies actual 26.2 `players/data`. These early failures are not counted as passing runtime checks.

The first broad Vega E2E run found stale navigation and collapsed-action selectors in `institution-setup`, `state-workspace` and `taxation`. Tests now navigate through the existing Institutions section and open its existing action panels; authority assertions remain. Product state/monetary/taxation behavior was not altered for these selectors. The full repeated suite passed 37 tests with one intentional dev-only skip.

Native Minecraft **26.2** graphical UI/client acceptance was not performed by a human. The automatic test is a real 26.1 protocol connection translated to the actual locked Paper 26.2, not native 26.2 packet/UI coverage. The [manual checklist](../development/minecraft-plugins.md#native-client-acceptance) retains native titles/chat and additional transfer/rotation variations. The automated real-runtime faults cover dual crash/lease expiry/restart, wrong forwarding secret, stopped Paper, stale service token and a forced host leading to another backend. Arbitrary incompatible third-party runtime versions are not supported or claimed tested; deployment accepts only the checksum-locked compatible LimboAPI. Slow HTTP failure is verified with an actual delayed loopback server in Java tests. Custom website skins are not propagated by this foundation.

Future extensions are typed physical facts/events, verified territorial snapshots and local spatial/claim caches. Antares/PostGIS remains authoritative; plugins gain no economic or state-office power from physical events. No additional gameplay systems were implemented.

## Dated completion

The full Vega Playwright rerun passed 37 tests with one intentional dev-only skip. The root and affected per-app Compose matrix passed, including the disposable Minecraft configuration. `bun run format:check` passed on 1479 files; local Markdown files and anchors passed for 105 active documents. `git diff --check` passed. Final root unit rerun passed all 219 tests; final Minecraft contracts passed all 13 cases. Full real-runtime acceptance, including the faults above, exited successfully and cleaned up its processes/container.
