[Русский](README_RU.md) | [HeliCraft](../../README.md)

# Deneb

**Make HeliCraft tangible inside Minecraft.**

Java 25 · Paper 26.2 build 129 · Gradle Kotlin DSL · Adventure · JTS · Caffeine

Deneb verifies the exact Antares UUID/name admission forwarded by Velocity before gameplay. It attests real Paper joins, maintains an expiring lease and closes the exact session on quit. Players receive configured server branding, their verified profile and all active citizenships or a neutral message. `/heli`, `/heli status` and `/heli profile` are the small user-facing command surface. Citizenship does not represent physical location.

```sh
bun run build:deneb
bun run test:deneb
bun run dev:deneb
bun run minecraft:up
bun run minecraft:logs deneb
bun run test:minecraft:contracts
bun run test:minecraft
```

Artifact: `apps/deneb/build/libs/deneb.jar`. Use Java 25 and the root Gradle 9.1.0 wrapper. Paper/Adventure are compile-only; JTS, Caffeine and shared-client Gson are bundled/relocated. `WorldGeometry` remains a framework-independent future spatial primitive, not territorial authority. The shared [Java client](../../packages/minecraft-client/README.md) performs bounded REST with private `DENEB_SERVICE_TOKEN` and `ANTARES_URL`. Bukkit/player work returns to the main thread; the explicitly asynchronous pre-login event may wait for a bounded request.

Deneb has no registration/login/password system, direct PostgreSQL/S3 access or economy authority. Future territory/claims use verified local snapshots, not HTTP on each movement/block event. Paper stays private with modern forwarding and a generated secret. The disposable Docker runtime rebuilds fresh source and accepts test EULA under explicit owner authorization. Gradle continuous mode only rebuilds; restart Paper after changes.

[Architecture](../../docs/architecture/minecraft-integration.md) · [development/runtime/debugging](../../docs/development/minecraft-plugins.md) · [authentication](../../docs/development/minecraft-authentication.md) · [verification](../../docs/verification/minecraft-integration-2026-10-25.md) · [agent rules](AGENTS.md)

Run JUnit and root strict TS/Java quality gates plus meaningful real contract/runtime tests; compilation alone does not prove Paper admission. MockBukkit has a 26.2 branch, but V1 tests pure logic and the real Paper runtime instead of adding another mutable snapshot dependency.

## Name

α Cygni, in the constellation Cygnus. [IAU star-name catalogue](https://iauarchive.eso.org/public/themes/naming_stars/).
