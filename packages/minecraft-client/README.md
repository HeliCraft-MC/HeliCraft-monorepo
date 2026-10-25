[Русский](README_RU.md) | [Repository](../../README.md)

# Minecraft service client

Java 25 Gradle library shared by Rigel and Deneb, containing minimal typed Antares DTOs and bounded asynchronous HTTP. It is not an application runtime dependency between plugins and never accesses PostgreSQL, S3 or browser cookies. Gson 2.13.2 is shaded/relocated by each consuming plugin.

Build/check: `./gradlew :minecraft-client:build`. Root `build:java`, `test:java`, `lint:java`, `format:java` and `format:check:java` include this library. JUnit uses a real loopback HTTP test server for malformed-response and authentication error mapping; there is no Minecraft server mock.

Keep DTOs synchronized with [Minecraft OpenAPI contracts](../../apps/antares/src/modules/minecraft/contracts.ts), regenerate Alhena when those contracts change, then run `bun run test:minecraft:contracts` and `bun run test:minecraft`. Request errors and DTO `toString()` must not reveal service tokens, challenge codes, verifiers or response bodies. See [architecture](../../docs/architecture/minecraft-integration.md) and [development](../../docs/development/minecraft-plugins.md).
