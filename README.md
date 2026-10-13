[Русский](README_RU.md) | English

# HeliCraft

HeliCraft is a persistent social, political and economic Minecraft world. Minecraft is where players physically live; Vega is the other half of the game; Antares keeps every product consistent.

The repository contains a working web foundation: public SSR pages, UUID accounts and server sessions, account/skin settings, a Markdown CMS, role-based administration and a shared UI kit. Game systems from the GDD, economy, territories, World Engine and custom Rigel game login remain future work.

The state system includes resumable server drafts, multilingual content, independent Minecraft banners/PNG flags, cofounders, configurable governance, immutable revisions, optional block constitutions, generic voting and administrative review. See [States](docs/states/overview.md), [Governance](docs/states/governance.md), [Constitution](docs/states/constitution.md), [Creation flow](docs/states/creation-flow.md), [Localized content](docs/platform/localized-content.md) and [Voting](docs/platform/voting.md).

Public state pages present flags, founders, citizenship, current offices, decision procedures and the Constitution in a responsive layout. Player nicknames link to public profiles at `/players/<UUID>`, showing registration date and affiliations with active states. Profiles never expose sessions, account roles or private state drafts.

## Projects

| Product                             | Directory         | Stack                                                                     |
| ----------------------------------- | ----------------- | ------------------------------------------------------------------------- |
| [Vega](apps/vega/README.md)         | `apps/vega`       | React 19 · TypeScript · Vite · TanStack Router/Query · Zod · Atria · PWA  |
| [Antares](apps/antares/README.md)   | `apps/antares`    | TypeScript · Bun · Hono · Zod/OpenAPI · Drizzle · PostgreSQL/PostGIS · S3 |
| [Deneb](apps/deneb/README.md)       | `apps/deneb`      | Java 25 · Paper 26.2 · Gradle Kotlin DSL · Adventure · JTS · Caffeine     |
| [Rigel](apps/rigel/README.md)       | `apps/rigel`      | Java 25 · Velocity 4.2.0 · Gradle Kotlin DSL                              |
| [Atria](packages/atria/README.md)   | `packages/atria`  | React · TypeScript · SCSS Modules · Base UI · Storybook                   |
| [Alhena](packages/alhena/README.md) | `packages/alhena` | Generated TypeScript SDK · native Fetch · zero runtime dependencies       |
| [Altair](apps/altair/README.md)     | `apps/altair`     | Planned: Tauri 2 · Rust · React · Vite · Atria · Alhena                   |

JavaScript/TypeScript projects share one private Bun workspace, one `bun.lock` and `workspace:*` dependencies. Java plugins share a checked-in Gradle wrapper and Kotlin DSL build. Internal packages do not need publication. Altair contains documentation only and is excluded from workspaces, builds and Compose.

## Quick start

Install **Bun 1.4.2+** and Docker with **Compose 2.24.4+** and a running daemon. **JDK 25** is needed only for explicit Java plugin tasks. Gradle 9.1.0 downloads automatically through `./gradlew` (or `gradlew.bat` on Windows). Run commands from the repository root.

```sh
bun install --frozen-lockfile
cp .env.example .env
bun run infra:up
bun run db:migrate
bun run dev
```

Vega: http://localhost:5173. Antares: http://localhost:3000. OpenAPI: http://localhost:3000/openapi.json. S3: http://localhost:8333. `dev` runs only the JS/TS packages and web applications. Java builds require explicit `build:java`, `build:deneb`, `build:rigel` or `dev:deneb`/`dev:rigel` commands. `dev` also starts Storybook at http://localhost:6006. If the API port is occupied, it selects the next free port and connects Vega to it; the selected port is printed at startup. `bun run storybook` remains available separately.

For frontend work only: `bun run dev:vega`. For the backend only: `bun run dev:antares`. The Hello World endpoint works without persistence once Antares has valid environment configuration; `/api/ready` checks PostGIS and the S3 bucket.

## Commands

| Command                               | Purpose                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| `bun run dev`                         | Build internal packages, watch Atria/Alhena, run Vega, Antares and Storybook |
| `bun run dev:vega`                    | Vega, Storybook and internal package watchers; API runs separately           |
| `bun run dev:antares`                 | Antares, Storybook and internal package watchers                             |
| `bun run dev:atria` / `dev:alhena`    | Watch and rebuild the selected package                                       |
| `bun run dev:deneb` / `dev:rigel`     | Gradle continuous build; no automatic plugin reload                          |
| `bun run storybook`                   | Atria playground on port 6006                                                |
| `bun run generate`                    | Export OpenAPI and regenerate Alhena                                         |
| `bun run build`                       | All TS applications/packages                                                 |
| `bun run build:ts` / `build:java`     | Build one ecosystem                                                          |
| `bun run build:<name>`                | Build a selected project, except the planned Altair                          |
| `bun run typecheck` / `lint`          | TS7 and strict oxlint checks; Java: `lint:java`                              |
| `bun run test`                        | Vitest unit/component tests; Java: `test:java`                               |
| `bun run test:<name>`                 | Tests for one project                                                        |
| `bun run test:integration`            | Disposable PostGIS and S3 containers; requires Docker                        |
| `bun run test:e2e`                    | Playwright Chromium, Vega and real Antares with disposable PostgreSQL/S3     |
| `bun run build:storybook`             | Static Atria documentation                                                   |
| `bun run infra:up` / `infra:down`     | Development PostgreSQL/PostGIS and S3                                        |
| `bun run db:generate` / `db:migrate`  | Generate/apply Drizzle migrations to `helicraft`                             |
| `bun run compose:up` / `compose:down` | Build/start the web stack or stop Compose                                    |

Use `bun run` for the package.json scripts (the npm-script convention). CLI tools are invoked with `bunx --bun`; Node.js is not required for the implemented JS workflow. Generic scripts never invoke Gradle; Java formatting uses `format:java` and `format:check:java`. `compose:up` builds only the web stack; Compose builds plugins without starting Minecraft servers. Plain `bun test` is not the configured Vitest command. Browser setup: `bunx --bun playwright install chromium` (Linux may also need browser system libraries).

## Production Compose

```sh
cp .env.example .env
# Edit credentials and set SITE_ORIGIN=http://localhost:8080 for local Compose.
# For a real HTTPS domain also set SECURE_COOKIES=true.
docker compose up -d --build --wait vega
```

The root stack starts the web services, includes PostGIS and SeaweedFS 4.48, applies migrations before Antares starts, and publishes web port 8080. Atria and Alhena are built into Vega. Deneb and Rigel use only the Dockerfile build stages in the `plugins` profile; Compose does not start Paper or Velocity. Build both plugins with `docker compose build deneb rigel`.

To run only the web stack without Minecraft/EULA: `docker compose up -d --build vega`. The API and storage dependencies start automatically. Production PWA installation needs HTTPS at your reverse proxy; localhost is sufficient for local testing. The Bun SSR server proxies `/api/*` and `/openapi.json` to Antares; generated clients use the same origin. API responses are not cached by the service worker.

Per-project stacks reuse the same definitions. From the root, for example:

```sh
docker compose --env-file .env -f apps/antares/compose.yml up -d --build
docker compose --env-file .env -f apps/vega/compose.yml up -d --build
docker compose --env-file .env -f apps/deneb/compose.yml build deneb
docker compose --env-file .env -f apps/rigel/compose.yml build rigel
```

Deneb/Rigel Compose builds only the selected plugin, without Antares dependencies or Minecraft runtime containers. Antares also has `compose.dev.yml` for external services. Libraries have no runtime containers. Different Compose project names create separate data volumes. `down` keeps data; `down -v` deletes it. Back up PostgreSQL and S3 before upgrades.

## Configuration and boundaries

Copy `.env.example` into the ignored `.env`. `DATABASE_URL` targets **helicraft**, not the archived MySQL databases. Compose derives the container URL from `POSTGRES_PASSWORD`; local migrations use `DATABASE_URL`, so keep them consistent. URL-encode special characters in database passwords when constructing a connection URL. Only Antares accesses PostgreSQL and S3; clients and plugins use its REST API. No secrets are exported through Vite variables.

The S3 adapter accepts an endpoint, region, access key, secret and bucket and uses path-style addressing. Compose supplies a persistent single-node SeaweedFS store with credentials and automatic bucket creation. A managed S3-compatible service can be substituted through Antares environment settings. Web identity and private skin uploads are implemented; public presigned uploads and Rigel game identity integration remain future work.

Deneb bundles/relocates JTS and Caffeine; Paper supplies Adventure. Rigel uses the Velocity annotation processor for its plugin descriptor. Both plugins issue nonblocking HTTP health requests to `ANTARES_URL`. They contain no database driver. Restart a Minecraft service after rebuilding/replacing its plugin jar; do not rely on hot reload for authentication or world rules.

## Code quality

Projects use TypeScript 7.0.2. Only the Alhena generator has isolated TypeScript 6 for Compiler API compatibility; SDK checks/declarations explicitly use root TS7. All oxlint categories are errors, with type checking and zero warnings. Stack compatibility exceptions are documented in [setup research](docs/setup-research.md). Java uses Checkstyle, Spotless/google-java-format and compiler warnings as errors.

Docker, Testcontainers and Chromium are available. Web Compose, migrations, PostgreSQL/S3 integration and dev/production browser journeys were verified on disposable infrastructure; see [validation](docs/architecture/validation.md).

## Documentation

- [Product map](docs/product-map.md) / [Карта продуктов](docs/product-map_RU.md)
- [Setup decisions and official sources](docs/setup-research.md) / [Решения и источники](docs/setup-research_RU.md)
- [Agent guide](AGENTS.md)
- [Archived applications and old documentation](archive/README.md)

Old Vesper, Teapot and Soon were moved to `archive/apps/` with their local changes. Their original instructions and documentation are preserved under `archive/`; they are excluded from the new workspace and Docker contexts. New APIs do not preserve the old contracts and do not migrate old MySQL/SQLite data.

The names refer to stars: Vega (Lyra), Antares (Scorpius), Deneb (Cygnus), Rigel (Orion), Atria (Triangulum Australe), Alhena (Gemini) and Altair (Aquila). [IAU star-name catalogue](https://iauarchive.eso.org/public/themes/naming_stars/). The web shell uses the archived HeliCraft logo copied into active Vega assets.

## License

The root [LICENSE](LICENSE) is PolyForm Noncommercial 1.0.0. Archived apps retain their own license files. Check third-party component licenses separately.

## Web foundation

See [rendering](docs/architecture/web-rendering.md), [identity](docs/architecture/identity.md), [authorization](docs/architecture/authorization.md), [skins](docs/architecture/skin-storage.md), [CMS](docs/architecture/content.md), [landing](docs/design/landing-page.md) and [quality](docs/architecture/quality.md).

For local development use SITE_ORIGIN=http://localhost:5173. Before production Compose set SITE_ORIGIN=http://localhost:8080 (or your actual HTTPS origin and SECURE_COOKIES=true). Registration grants only PLAYER. First OWNER: register an account, copy its UUID and run `bun run admin:bootstrap-owner <UUID> --confirm <same UUID>`. PRELAUNCH is the default; Minecraft address is shown only when OPEN and MINECRAFT_ADDRESS is configured. EULA is never accepted automatically.

The public home uses world photographs; `/gallery` and `/gallery/:id` render with SSR, while authenticated players publish and remove their photographs through `/app/gallery/new`. Gallery is a separate Antares PostgreSQL/private S3 domain. The homepage shows real approved states and links to `/states`, with search, citizenship/constitution filters and sorting. Economy previews remain labelled local demonstrations. [Gallery architecture](docs/architecture/gallery.md).

`bun run dev` and `dev:antares` apply reviewed database migrations before starting the services. PostgreSQL and S3 must be running (`bun run infra:up`). A failed migration stops startup; `dev:vega` uses an external API and does not migrate its database.

Operators are listed by nickname in root `ops.json` (`ms0ur` initially). They receive ADMIN through standard authenticated sessions; names are reserved against registration/rename takeover. File changes apply at the next authorization check. [Operator policy](docs/architecture/operators.md).
