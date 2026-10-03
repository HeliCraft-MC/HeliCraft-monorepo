[Русский](README_RU.md) | [HeliCraft](../../README.md)

# Rigel

**Know who enters the world and protect player identity.**

Java 25 · Velocity 4.2.0 · Gradle Kotlin DSL

Rigel is a Velocity plugin foundation for permanent HeliCraft identity. It logs initialization and checks Antares asynchronously. The framework-independent `Identity` record separates a stable UUID from an entry credential. It does **not** authenticate unofficial clients, link accounts, implement MFA or authorize logins yet. Keep Velocity `online-mode=true` and Paper modern forwarding enabled.

```sh
bun run build:rigel
bun run test:rigel
bun run dev:rigel
```

JDK 25 is required. Artifact: `apps/rigel/build/libs/rigel.jar`. The Velocity API is compile-only; its annotation processor generates `velocity-plugin.json`. JUnit 5 checks identity invariants. Continuous build rebuilds jars without proxy hot reload. `ANTARES_URL` sets the health probe destination.

Production from root: `docker compose --env-file .env -f apps/rigel/compose.yml up -d --build`. This uses the paired Deneb/Rigel stack and requires accepted Minecraft EULA for Paper. Only Velocity exposes 25565. The random alphanumeric forwarding secret is shared with Paper and stored in the private volume. Velocity server jar/build/checksum are pinned in `server-lock.json`. Restart the proxy after plugin changes.

Future credentials include official Minecraft accounts, additional factors, confirmation through Vega and optional Altair. A player can later link an official account without changing HeliCraft identity, assets, citizenship or history. This requires an Antares identity API and an explicit secure login flow before disabling official-account checks.

From the root: `bun run lint` and `bun run format:check`. Rules and exceptions: [quality setup](../../docs/setup-research.md).

## Name

β Orionis, in the constellation Orion. [IAU star-name catalogue](https://iauarchive.eso.org/public/themes/naming_stars/).
