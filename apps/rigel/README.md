[Русский](README_RU.md) | [HeliCraft](../../README.md)

# Rigel

**Know who enters the world and protect player identity.**

Java 25 · Velocity 4.2.0 build 30 · pinned LimboAPI · Gradle Kotlin DSL

Rigel resolves the existing Antares account, assigns its immutable UUID before the auth lobby, waits for explicit browser/code confirmation and consumes a connection-bound approval once. `LoginEvent` and every backend transition fail closed. LimboAPI supplies the virtual waiting space; no unauthenticated player enters Paper. No separate registration, mandatory `/link`, password database, premium bypass or password `/login` exists.

```sh
bun run build:rigel
bun run test:rigel
bun run dev:rigel
bun run minecraft:up
bun run minecraft:logs rigel
bun run test:minecraft:contracts
bun run test:minecraft
```

Artifact: `apps/rigel/build/libs/rigel.jar`. Java 25 and the root Gradle 9.1.0 wrapper are used. The Velocity annotation processor generates the descriptor. The shared Java [client](../../packages/minecraft-client/README.md) provides bounded asynchronous REST. Configure private `RIGEL_SERVICE_TOKEN`, `ANTARES_URL` and `SITE_ORIGIN`; service role/backend binding is owned by Antares. Never use user cookies or expose secrets through Vite.

LimboAPI `1.1.27-SNAPSHOT` is pinned by commit/checksum in `infra/minecraft/limboapi.properties`. Its MIT API is compile-only; the AGPL-3.0 runtime is installed separately, never shaded. Keep `rigel` in the pre-limbo profile handler list. Use private modern-forwarding Paper and matching secrets; offline mode is safe only with the complete documented admission boundary. Do not hot-reload authentication; rebuild/restart. The disposable Docker runtime rebuilds current source and automatically accepts test EULA under explicit owner authorization.

[Architecture](../../docs/architecture/minecraft-integration.md) · [development/runtime/debugging](../../docs/development/minecraft-plugins.md) · [authentication](../../docs/development/minecraft-authentication.md) · [verification](../../docs/verification/minecraft-integration-2026-10-25.md) · [agent rules](AGENTS.md)

Mandatory root quality gates include `build:ts`, `typecheck`, `lint`, `format:check`, `test:unit`, `lint:java`, `format:check:java` and relevant integration/browser/runtime tests. A successful JAR build alone does not establish working login.

## Name

β Orionis, in the constellation Orion. [IAU star-name catalogue](https://iauarchive.eso.org/public/themes/naming_stars/).
