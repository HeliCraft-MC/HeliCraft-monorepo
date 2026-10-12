[Русский](README_RU.md) | [HeliCraft](../../README.md)

# Deneb

**Make HeliCraft tangible inside Minecraft.**

Java 25 · Paper 26.2 · Gradle Kotlin DSL · Adventure · JTS · Caffeine

Deneb is the thin Paper adapter for future physical world rules. `/deneb` sends an Adventure greeting; `WorldGeometry` uses JTS and Caffeine in a framework-independent class. `ANTARES_URL` configures the nonblocking HTTP health probe. No database access or gameplay protection is implemented.

```sh
bun run build:deneb
bun run test:deneb
bun run dev:deneb
```

JDK 25 is required. Artifact: `apps/deneb/build/libs/deneb.jar`. Gradle continuous mode rebuilds on source changes; it does not reload a running plugin. Paper API and Adventure are compile-only; JTS/Caffeine are bundled and relocated by Shadow. JUnit 5 tests the spatial primitive. Coordinates here are the Minecraft x/z plane, distinct from the sample PostGIS SRID 4326.

Container build from root: `docker compose -f apps/deneb/compose.yml build deneb`. Compose uses only the Dockerfile `build` stage to build the plugin jar at `/workspace/apps/deneb/build/libs/deneb.jar` inside the image. It does not download or start Minecraft servers and does not start Antares dependencies. Deploy the jar to your separately managed server and restart it after plugin changes.

Future scope: borders, jurisdictions, protected property, physical institutions, geology, deposits and market goods. Gameplay should remain ordinary Minecraft rather than becoming a collection of menus.

From the root: `bun run lint` and `bun run format:check`. Rules and exceptions: [quality setup](../../docs/setup-research.md).

## Name

α Cygni, in the constellation Cygnus. [IAU star-name catalogue](https://iauarchive.eso.org/public/themes/naming_stars/).
