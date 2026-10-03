[Русский](README_RU.md) | English

# HeliCraft

HeliCraft is a persistent social, political and economic Minecraft world. Minecraft is where players physically live; Vega is the other half of the game; Antares keeps every product consistent.

This repository contains the new **foundation**, not the old server features. The runnable example is Vega → Alhena → Antares, an Atria button, a spatial event schema, a Paper greeting command and a Velocity initialization hook. Custom authentication, economy, territory rules and the future World Engine are not implemented.

## Projects

| Product                             | Directory         | Stack                                                                     |
| ----------------------------------- | ----------------- | ------------------------------------------------------------------------- |
| [Vega](apps/vega/README.md)         | `apps/vega`       | React 19 · TypeScript · Vite · TanStack Router/Query · Zod · Atria · PWA  |
| [Antares](apps/antares/README.md)   | `apps/antares`    | TypeScript · Bun · Hono · Zod/OpenAPI · Drizzle · PostgreSQL/PostGIS · S3 |
| [Deneb](apps/deneb/README.md)       | `apps/deneb`      | Java 25 · Paper 26.2 · Gradle Kotlin DSL · Adventure · JTS · Caffeine     |
| [Rigel](apps/rigel/README.md)       | `apps/rigel`      | Java 25 · Velocity 4.2.0 · Gradle Kotlin DSL                              |
| [Atria](packages/atria/README.md)   | `packages/atria`  | React · TypeScript · Tailwind CSS 4 · Base UI · Storybook                 |
| [Alhena](packages/alhena/README.md) | `packages/alhena` | Generated TypeScript SDK · native Fetch · zero runtime dependencies       |
| [Altair](apps/altair/README.md)     | `apps/altair`     | Planned: Tauri 2 · Rust · React · Vite · Atria · Alhena                   |

JavaScript/TypeScript projects share one private Bun workspace, one `bun.lock` and `workspace:*` dependencies. Java plugins share a checked-in Gradle wrapper and Kotlin DSL build. Internal packages do not need publication. Altair contains documentation only and is excluded from workspaces, builds and Compose.

## Quick start

Install **Bun 1.4.2+**, **JDK 25** and Docker with **Compose 2.24.4+** and a running daemon. Gradle 9.1.0 downloads automatically through `./gradlew` (or `gradlew.bat` on Windows). Run commands from the repository root.

```sh
bun install --frozen-lockfile
cp .env.example .env
bun run infra:up
bun run db:migrate
bun run dev
```

Vega: http://localhost:5173. Antares: http://localhost:3000. OpenAPI: http://localhost:3000/openapi.json. S3: http://localhost:8333. `dev` watches/builds Java jars; it does not start Minecraft or accept its EULA. Run `bun run storybook` separately for http://localhost:6006.

For frontend work only: `bun run dev:vega`. For the backend only: `bun run dev:antares`. The Hello World endpoint works without persistence once Antares has valid environment configuration; `/api/ready` checks PostGIS and the S3 bucket.

## Commands

| Command                               | Purpose                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| `bun run dev`                         | Build internal packages, watch Atria/Alhena and Java plugins, run Vega and Antares |
| `bun run dev:vega`                    | Vega with internal package watchers; API must run separately                       |
| `bun run dev:antares`                 | Antares with internal package watchers                                             |
| `bun run dev:atria` / `dev:alhena`    | Watch and rebuild the selected package                                             |
| `bun run dev:deneb` / `dev:rigel`     | Gradle continuous build; no automatic plugin reload                                |
| `bun run storybook`                   | Atria playground on port 6006                                                      |
| `bun run generate`                    | Export OpenAPI and regenerate Alhena                                               |
| `bun run build`                       | All TS applications/packages and both Java plugins                                 |
| `bun run build:ts` / `build:java`     | Build one ecosystem                                                                |
| `bun run build:<name>`                | Build a selected project, except the planned Altair                                |
| `bun run typecheck` / `lint`          | TS7, strict oxlint and Java Checkstyle checks                                      |
| `bun run test`                        | Vitest unit/component tests and JUnit 5 tests                                      |
| `bun run test:<name>`                 | Tests for one project                                                              |
| `bun run test:integration`            | Disposable PostGIS and S3 containers; requires Docker                              |
| `bun run test:e2e`                    | Playwright Chromium, Vega and a real stateless Antares API                         |
| `bun run build:storybook`             | Static Atria documentation                                                         |
| `bun run infra:up` / `infra:down`     | Development PostgreSQL/PostGIS and S3                                              |
| `bun run db:generate` / `db:migrate`  | Generate/apply Drizzle migrations to `helicraft`                                   |
| `bun run compose:up` / `compose:down` | Build/start or stop the production Compose stack                                   |

Use `bun run` for the package.json scripts (the npm-script convention). CLI tools are invoked with `bunx --bun`; Node.js is not required for the implemented JS workflow. Plain `bun test` is not the configured Vitest command. Browser setup: `bunx --bun playwright install chromium` (Linux may also need browser system libraries).

## Production Compose

```sh
cp .env.example .env
# Edit .env: credentials, forwarding secret, and desired bind addresses.
# Set EULA=true only after reading and accepting the Minecraft EULA.
docker compose build
docker compose up -d --wait
```

The root stack builds Vega, Antares, Deneb and Rigel; includes PostGIS and SeaweedFS 4.48; applies migrations before Antares starts; and publishes web port 8080 and Minecraft port 25565. Atria and Alhena are built into Vega. Only Velocity exposes a Minecraft port; Paper remains on the internal network with modern forwarding. Standard online-account authentication stays enabled until Rigel's identity flow exists.

To run only the web stack without Minecraft/EULA: `docker compose up -d --build vega`. The API and storage dependencies start automatically. Production PWA installation needs HTTPS at your reverse proxy; localhost is sufficient for local testing. The Bun static server proxies `/api/*` and `/openapi.json` to Antares; generated clients use the same origin. API responses are not cached by the service worker.

Per-project stacks reuse the same definitions. From the root, for example:

```sh
docker compose --env-file .env -f apps/antares/compose.yml up -d --build
docker compose --env-file .env -f apps/vega/compose.yml up -d --build
docker compose --env-file .env -f apps/deneb/compose.yml up -d --build
```

Deneb/Rigel Compose runs the paired Minecraft services and Antares dependencies. Antares also has `compose.dev.yml` for external services. Libraries have no runtime containers. Different Compose project names create separate data volumes. `down` keeps data; `down -v` deletes it. Back up PostgreSQL, S3 and Minecraft worlds before upgrades.

## Configuration and boundaries

Copy `.env.example` into the ignored `.env`. `DATABASE_URL` targets **helicraft**, not the archived MySQL databases. Compose derives the container URL from `POSTGRES_PASSWORD`; local migrations use `DATABASE_URL`, so keep them consistent. URL-encode special characters in database passwords when constructing a connection URL. Only Antares accesses PostgreSQL and S3; clients and plugins use its REST API. No secrets are exported through Vite variables.

The S3 adapter accepts an endpoint, region, access key, secret and bucket and uses path-style addressing. Compose supplies a persistent single-node SeaweedFS store with credentials and automatic bucket creation. A managed S3-compatible service can be substituted through Antares environment settings. Public presigned uploads and player identity are future API work.

Deneb bundles/relocates JTS and Caffeine; Paper supplies Adventure. Rigel uses the Velocity annotation processor for its plugin descriptor. Both plugins issue nonblocking HTTP health requests to `ANTARES_URL`. They contain no database driver. Restart a Minecraft service after rebuilding/replacing its plugin jar; do not rely on hot reload for authentication or world rules.

## Code quality

Projects use TypeScript 7.0.2. Only the Alhena generator has isolated TypeScript 6 for Compiler API compatibility; SDK checks/declarations explicitly use root TS7. All oxlint categories are errors, with type checking and zero warnings. Stack compatibility exceptions are documented in [setup research](docs/setup-research.md). Java uses Checkstyle, Spotless/google-java-format and compiler warnings as errors.

Compose is configured; container execution and Testcontainers remain unverified because Docker is unavailable in this environment.

## Documentation

- [Product map](docs/product-map.md) / [Карта продуктов](docs/product-map_RU.md)
- [Setup decisions and official sources](docs/setup-research.md) / [Решения и источники](docs/setup-research_RU.md)
- [Agent guide](AGENTS.md)
- [Archived applications and old documentation](archive/README.md)

Old Vesper, Teapot and Soon were moved to `archive/apps/` with their local changes. Their original instructions and documentation are preserved under `archive/`; they are excluded from the new workspace and Docker contexts. New APIs do not preserve the old contracts and do not migrate old MySQL/SQLite data.

The names refer to stars: Vega (Lyra), Antares (Scorpius), Deneb (Cygnus), Rigel (Orion), Atria (Triangulum Australe), Alhena (Gemini) and Altair (Aquila). [IAU star-name catalogue](https://iauarchive.eso.org/public/themes/naming_stars/). No server logo was present in the original READMEs, so none was added.

## License

The root [LICENSE](LICENSE) is PolyForm Noncommercial 1.0.0. Archived apps retain their own license files. Check third-party component licenses separately.
