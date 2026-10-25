[Русский](minecraft-plugins_RU.md) | [Documentation](../README.md)

# How to develop Minecraft plugins in HeliCraft

Use this guide for the isolated Minecraft Integration V1 environment. It never attaches a user database or persistent Minecraft world. See [architecture](../architecture/minecraft-integration.md), [authentication](minecraft-authentication.md) and the [dated verification report](../verification/minecraft-integration-2026-10-25.md).

## Prerequisites and pinned versions

Bun 1.4.2+, Docker/Compose and Java 25 are required for native tests. The checked-in wrapper downloads Gradle 9.1.0. Rigel uses Velocity 4.2.0 build 30; Deneb uses Paper 26.2 build 129. Server locks contain download URL and SHA-256. LimboAPI `1.1.27-SNAPSHOT` is pinned to commit `bfef5799f21d73a80155035c3430f6654aa6b9f8` and checksum in `infra/minecraft/limboapi.properties`; mutable upstream replacement fails verification. Chromium is needed for browser acceptance: `bunx --bun playwright install chromium` (Linux may also need system libraries).

Install once at repository root with `bun install --frozen-lockfile`. Do not use npm for JavaScript scripts or downgrade TS7. Docker provides Java for the Compose runtime; local JDK is needed for explicit Gradle/native tests. No Minecraft client mod is required.

## Disposable full stack

```sh
bun run minecraft:prepare
bun run minecraft:config
bun run minecraft:up
bun run minecraft:logs
bun run minecraft:logs rigel
bun run minecraft:logs deneb
bun run minecraft:down
```

The fixed Compose project is `helicraft-minecraft-v1-test`, defined in root `compose.minecraft.yml`. Preparation creates random private credentials in ignored `infra/minecraft/run/.env` with mode 0600; the adjacent `.env.example` lists fields. It does not consume production credentials or root `.env`. The database is `helicraft_minecraft_test` on a dedicated PostgreSQL container/volume, with separate S3 and Minecraft volumes. Antares explicitly enables disposable database configuration. Migrations run before API startup.

Only `127.0.0.1:8096` (Vega) and `127.0.0.1:25575` (Velocity) are published. Paper, PostgreSQL and S3 have no host ports. Paper is reachable within the isolated project and requires the generated modern-forwarding secret plus Deneb admission. Do not attach unrelated containers to this project's networks or publish Paper. The additional game network is internal; API traffic remains inside the project network.

The owner explicitly authorized automatically accepting the Minecraft EULA for local/test HeliCraft servers. This environment writes `eula=true` at creation/recreation and requires no repeated EULA prompt. This permission does not authorize changes to production servers or user worlds.

`minecraft:up` rebuilds Docker images from current sources and restarts changed services. Entrypoints always replace the plugin/config from the current image before launching Java. JARs are never manually copied from an older host build. Authentication hot reload is unsupported; rebuild and restart instead. A complete test stack may take several minutes on its first download/world generation.

Remove **only this disposable project's data** with:

```sh
bun run minecraft:clean
```

`minecraft:down` preserves its test volumes. Cleanup never runs destructive SQL or deletes an external world. Removing/rotating the ignored credential file requires cleaning/recreating its disposable database volume to avoid a PostgreSQL password mismatch. Preserve any evidence you need before cleanup.

## Build, install and quality gates

```sh
bun run build:rigel
bun run build:deneb
bun run test:java
bun run lint:java
bun run format:check:java
./gradlew :minecraft-client:build
bun run generate
bun run build:ts
bun run typecheck
bun run lint
bun run format:check
bun run test:unit
bun run test:integration
bun run test:minecraft:contracts
bun run test:minecraft
bun run test:e2e
```

Artifacts: `apps/rigel/build/libs/rigel.jar`, `apps/deneb/build/libs/deneb.jar`; common DTO/HTTP code is the Gradle library `packages/minecraft-client`. Shadow relocates Gson separately in each plugin. LimboAPI remains separately installed, never shaded. Gradle downloads its checksum-verified compile-only artifact; Docker builds use the same pin. Native script `dev:rigel`/`dev:deneb` continuously rebuilds but does not update live servers.

`test:minecraft:contracts` runs real Antares HTTP/security scenarios on disposable PostgreSQL through Testcontainers. `test:minecraft` builds current Java and TS sources, starts a fresh PostgreSQL, real local Velocity/Paper and production Vega, then drives browser confirmation and real Minecraft protocol traffic. It also kills/restarts the Java servers, waits for lease expiry, rejects wrong forwarding/stale service credentials/unavailable Paper/another forced-host backend, and verifies recovery with the same UUID. Native servers bind loopback only. It prints a unique `/tmp/helicraft-minecraft-v1-*` evidence directory containing logs, screenshots and successful `result.json`; processes and the container stop in `finally`. No user DB/world is touched. Preserve that directory for investigation; it may contain private local runtime configuration and should not be published wholesale.

The available protocol library is `minecraft-protocol` 1.68.0 with Minecraft 26.1. The automated disposable Paper installs pinned ViaVersion/ViaBackwards 5.12.1 solely to translate this real protocol to Paper 26.2. Both JARs are checksum-verified in `infra/minecraft/test-adapters.json`. These are test adapters, not part of the ordinary Compose stack. Do not claim native 26.2 UI acceptance from that test.

Run container-heavy integration suites before browser suites. On this host, changing Docker interfaces can make Chromium fail with `ERR_NETWORK_CHANGED`; rerun the browser suite after infrastructure settles and keep the initial failure attributable. Missing Docker, worker-process access, Chromium/system libraries, Java or network downloads are environment failures, distinct from code regressions. Never suppress application page errors to hide them.

## Native-client acceptance

1. Start `minecraft:up`; open [Vega](http://localhost:8096), register a disposable account and keep its browser session.
2. In an ordinary Minecraft **26.2** client, set its player name to that account username and connect to `localhost:25575`. An account name alone grants no ownership. Do not use a different person's name.
3. Confirm that the isolated waiting space shows configured branding, a code and `/app/minecraft`. No gameplay backend/playerdata should exist before approval.
4. Open `/app/minecraft`, inspect name/time, enter the code from your own game and confirm. Check the Paper welcome, every actual citizenship or neutral status, `/heli`, `/heli status`, `/heli profile`, matching account UUID and online presence.
5. Disconnect; check offline status and one end event. Reconnect requires a new code; rejection/expiry/wrong code/another browser account cannot admit the player.
6. Check another unknown name, `/server`/forced-host/transfer attempts before auth, blocked account, revoked web session, API outage/slow response, stopped Paper, wrong forwarding secret, outdated service token and proxy/Paper restart. All must fail closed or close presence through TTL. Never test against production worlds.

Native clients must support the chosen account-based offline proxy entry; official-account profile names alone do not authenticate Antares. Microsoft linking, premium bypass and password `/login` are outside V1.

## Diagnostics and recovery

Expected startup evidence: exact Velocity/Paper/Limbo versions, `Rigel ready:`, `Deneb ready:`, no plugin initialization/fatal exceptions and a healthy API. For a successful connection: `Rigel profile assigned account`, `Rigel auth lobby entered account`, `Rigel login admitted account`, `Rigel backend admitted account`, `Deneb joined account`, all with the same UUID. These lines intentionally contain no challenge code/verifier/token.

- Invalid forced hosts: keep an explicit empty `[forced-hosts]` table; do not inherit example backend names. Backend guards still apply to configured forced hosts.
- Wrong profile/order: verify `rigel` in LimboAPI's pre-limbo profile list and a compatible locked artifact. Never patch UUID after entering Paper.
- API unavailable/token rejected: inspect origin/role/backend binding without printing credentials. Use HTTPS outside local/container origins, rotate environment and restart. Do not enable anonymous fallback.
- Paper forwarding failure: compare private secrets and proxy online-mode settings, keep Paper `online-mode=false` with Velocity forwarding enabled. A directly connected client should be rejected before join.
- Stale online: both 45-second leases must live; proxy heartbeat cannot replace Paper heartbeat. Scheduler/account reads close stale sessions. Reconnect after cleanup; never reset account UUID or user data.
- Old JAR: rebuild/restart through the documented command and inspect startup timestamps/version. Continuous Gradle build alone does not reload plugins.

For debugging use disposable logs and scoped DTO/state-machine tests first. Remote Java debugging may be enabled explicitly for a loopback-only local process; do not publish debug ports or secret-bearing HTTP traces. Never log password commands or full auth bodies.

Plugin HTTP timeout: `MINECRAFT_HTTP_TIMEOUT_MS` defaults to 4000 and is restricted to 1000–10000 ms. Mutation retries are deliberately disabled; an ambiguous consumption is resolved by disconnect/expiry, never by another admission request. The protocol harness clears leftover known-packs/code-of-conduct listeners at normal configuration completion because the pinned client otherwise sends duplicate replies when leaving limbo. Native 26.2 clients need no such adapter.
