[Русский](setup-research_RU.md) | [HeliCraft](../README.md)

# Setup research and decisions

Reviewed against official documentation and release metadata on **October 3, 2026**. This is a reproducible baseline. JS manifests and one `bun.lock` pin dependencies; the Gradle wrapper and server lockfiles pin Java tools and server artifacts.

## Bun and TypeScript

Bun **1.4.2** runs scripts, CLIs, dev servers, Vitest, Playwright, generation and Antares. An isolated workspace with `workspace:*` keeps internal packages private. Archive and documentation-only Altair are excluded. Java uses the root Gradle wrapper. [Bun workspaces](https://bun.sh/docs/pm/workspaces), [Bun runtime](https://bun.sh/docs/runtime).

Projects use **TypeScript 7.0.2** for checks and declarations. Alhena has an isolated **TypeScript 6.0.3** development dependency because **Hey API 0.99.0** uses the previous Compiler API (`SyntaxKind`). Alhena's typecheck and declaration build explicitly invoke root TS7. Generation, builds and typechecks verify this separation; application projects do not need to downgrade. [Hey API](https://heyapi.dev/docs/openapi/typescript/get-started).

## Frontend and UI

Vega combines React 19.3, Vite 8.3, file-based TanStack Router, TanStack Query cancellation/refetch, Zod response validation and Atria. Its same-origin requests go through a Vite development proxy or the production Bun static server. [TanStack Router](https://tanstack.com/router/latest/docs/quick-start), [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview).

The PWA has a manifest, icons and static precache. API/OpenAPI paths are excluded from navigation fallback and API responses are not cached by the service worker. Public installation requires HTTPS. [Vite PWA](https://vite-pwa-org.netlify.app/guide/).

Atria and Vega use SCSS Modules compiled by Vite with Sass; Atria contains only SCSS styles and uses Base UI. Global tokens and base styles are exported as `@helicraft/atria/styles.scss`. Storybook 10.6 uses `react-docgen` to avoid legacy TypeScript Compiler API dependencies. The button preserves keyboard and disabled behavior. [Vite CSS preprocessors](https://vite.dev/guide/features.html#css-pre-processors), [Base UI](https://base-ui.com/react/overview/quick-start), [Storybook React/Vite](https://storybook.js.org/docs/get-started/frameworks/react-vite/).

Altair remains documentation only. Future implementation will require Rust and platform Tauri prerequisites. [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/), [Tauri Vite](https://v2.tauri.app/start/frontend/vite/).

## API and infrastructure

Hono's Zod/OpenAPI integration supplies routes, validation and the exported API contract from shared schemas. Health reports process liveness; readiness checks PostGIS and the S3 bucket. Alhena generates DTOs, SDK methods and a bundled native Fetch transport with no runtime dependencies. SDK types do not replace runtime response validation. [Hono OpenAPI](https://hono.dev/examples/zod-openapi), [Hey API Fetch](https://heyapi.dev/docs/openapi/typescript/clients/fetch).

Drizzle uses `pg`, targeting the **helicraft** PostgreSQL database. The first migration enables PostGIS and creates a minimal spatial-event table; Compose runs migrations before API startup. The sample geometry uses SRID 4326. Minecraft coordinates are planar and require a separately defined coordinate system for future territory mechanics. [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql), [Drizzle geometry](https://orm.drizzle.team/docs/column-types/pg#geometry).

`postgis/postgis:18-3.6` mounts PostgreSQL 18 data at `/var/lib/postgresql`. SeaweedFS **4.48** mini provides persistent single-node S3 with credentials and automatic bucket creation. Antares uses the AWS S3 SDK with a configured endpoint, region and path-style addressing. [PostGIS Docker](https://github.com/postgis/docker-postgis), [SeaweedFS mini](https://github.com/seaweedfs/seaweedfs/wiki/Quick-Start-with-weed-mini).

## Java

Java **25** uses Gradle **9.1.0** and Kotlin DSL. Stable Paper **26.2 build 129** and Velocity **4.2.0 build 30** URLs and SHA-256 are pinned in server lockfiles and checked during container builds. [Gradle 9.1](https://docs.gradle.org/9.1.0/release-notes.html), [Paper downloads](https://docs.papermc.io/misc/downloads-service/).

Deneb compiles against Paper/Adventure and shades/relocates JTS and Caffeine. Rigel uses Velocity's annotation processor for its plugin descriptor. Both issue nonblocking Antares health requests. [Paper setup](https://docs.papermc.io/paper/dev/project-setup/), [Velocity plugins](https://docs.papermc.io/velocity/dev/creating-your-first-plugin/).

Velocity retains `online-mode=true`; Paper stays internal with modern forwarding and a shared secret. Custom identity, unlicensed-client support and MFA remain future work. The user must accept Minecraft EULA before launching Paper. [Forwarding](https://docs.papermc.io/velocity/player-information-forwarding/), [Velocity security](https://docs.papermc.io/velocity/security/).

## Strict lint and formatting

**oxlint 1.86.0 / oxlint-tsgolint 7.0.2003** enable every category as errors, type-aware/type-check modes, zero warnings and unused-disable detection. Plugins cover TypeScript, React/performance, accessibility, imports, promises, Node, JSDoc, Unicorn, OXC and Vitest tests. **oxfmt 0.71.0** formats authored files. [Oxlint configuration](https://oxc.rs/docs/guide/usage/linter/config), [Type-aware linting](https://oxc.rs/docs/guide/usage/linter/type-aware.html), [Oxfmt configuration](https://oxc.rs/docs/guide/usage/formatter/config.html).

The explicit exceptions in `.oxlintrc.json` make the rules consistent with this stack:

- Automatic JSX needs no React namespace import. UI text, standard component props and prop forwarding are permitted.
- Side-effect imports are allowed for CSS/SCSS global styles and the Vitest DOM matcher setup.
- Libraries use named exports; default exports are allowed only for configuration and Storybook conventions. Parent-relative imports remain available for application-local code and tooling.
- Async/await, optional chaining, spread, ternaries, null, undefined, void and Bun top-level await are supported language features. Framework promise callbacks and standard void callback signatures are allowed; unsafe types and lost promises remain checked.
- Readonly parameter requirements cannot rewrite third-party React/Hono contracts. Own DTOs and readonly fields retain explicit types.
- Import/key sorting does not compete with the formatter. Separate type imports are allowed. Numeric literals are permitted in configuration, tests and the small static HTTP server; function-size and nesting limits remain.
- Vitest uses explicit imports and hoisted mocks, so mandatory hooks and the global-import ban are excluded. Alhena's watcher has one deliberately pending promise to preserve process lifetime between contract changes.
- Environment access, Node builtins, process exits and server logging are scoped to server/tooling files. Archive, generated SDK/router files and build outputs are excluded.

Java uses **Checkstyle 14.3.0**, **Spotless 8.10.3 / google-java-format 1.30.0**, zero Checkstyle warnings and `-Xlint:all,-processing -Werror`. Naming, imports, braces, control flow and complexity are checked. Processing warnings are excluded because Velocity's normal processor does not claim every accompanying annotation. The formatter version is chosen for JDK 25 compatibility and verified by running it. [Checkstyle](https://checkstyle.org/), [Spotless](https://github.com/diffplug/spotless/tree/main/plugin-gradle), [Formatter compatibility](https://github.com/diffplug/spotless/blob/main/lib/src/main/java/com/diffplug/spotless/java/GoogleJavaFormatStep.java).

Use `bun run lint`, `lint:fix`, `format` and `format:check`. Java builds include Checkstyle and Spotless checks.

## Validation limits

Verified: TS7 checks, TS builds, strict lint/formatting, five Vitest tests using Testing Library/Happy DOM where needed, Java/JUnit/checks, Storybook and Playwright. Browser tests cover development and production Vega → Alhena → Antares, the production proxy, manifest and service-worker activation.

**Docker is unavailable in this environment.** Only Compose configuration resolution is checked. Testcontainers PostGIS/S3 tests, image builds, Paper/Velocity startup, healthchecks, persistence and forwarding await a Docker-enabled environment. [Testcontainers PostgreSQL](https://node.testcontainers.org/modules/postgresql/).

Compose shares definitions through include/extends, migration dependencies, healthchecks and named volumes. Archived contracts/data are preserved for deliberate future migration; the baseline does not automatically import them.
