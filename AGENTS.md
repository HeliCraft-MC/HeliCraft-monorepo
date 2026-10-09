# HeliCraft agent guide

## Repository

- Active Bun workspaces: `apps/vega`, `apps/antares`, `packages/atria`, `packages/alhena`. Install once at the root; use the root lockfile and `workspace:*` for internal packages.
- `apps/deneb` and `apps/rigel`: Java 25 Gradle Kotlin DSL plugins, built with the root wrapper. Use JUnit 5.
- `apps/altair`: documentation only until explicitly requested for implementation.
- `archive/`: preserved Vesper, Teapot, Soon and old docs. Archived local AGENTS.md apply only there. Do not include archived projects in active builds or rewrite their files without a specific request.
- Keep README.md and README_RU.md in sync, with language switches at the top. Product roles are in `docs/product-map.md`.

## Boundaries

- Only Antares accesses PostgreSQL/PostGIS and S3. Vega and plugins communicate through REST.
- Do not import application implementation into another application's runtime. Shared UI comes from Atria; TS API consumers use Alhena.
- Code generation and tests may inspect/import API contracts to export OpenAPI or exercise the real app. No published internal packages are required.
- Antares is the source of truth for social, political, legal and economic world state. Keep handlers thin and business logic framework-independent.
- Rigel's custom identity authentication is not implemented. Preserve secure standard authentication until a reviewed identity flow exists.

## Code and validation

- Explicit TypeScript types and DTOs; no `any` or unchecked casts in authored code. Generated SDK code is generator-owned.
- Secrets belong in environment variables; never client-visible Vite config or tracked .env files.
- Use Russian star names in Russian conversation; keep English project identifiers/headings.
- TS7 is the compiler; TS6 is isolated only for the Alhena generator Compiler API. Do not downgrade project compilers.
- JS/TS: oxlint with type-aware rules and all categories as errors; oxfmt formatting. Document targeted exceptions. Java: Checkstyle and Spotless/google-java-format, compiler warnings are errors.
- English code comments. Limit changes to the requested scope.
- Use Bun for JS scripts/CLIs. Run `build:ts`, `typecheck`, `lint`, `format:check`, `test:unit` for TS changes; relevant Playwright/Testcontainers tests for integration changes.
- Java changes: build and relevant JUnit tests through Gradle. Continuous build does not reload live plugins.
- Target database is `helicraft` (PostgreSQL). Review generated SQL and apply migrations; do not run schema push against live databases.
- Validate root and affected per-app Compose definitions. Never accept Minecraft EULA on the user's behalf.
- Report unavailable Docker/browser/native tooling separately from code regressions.

## Web foundation

- `docs/GDD/` is authoritative for game systems. Account UUIDs, editorial content and game/world events are separate domains; do not invent live game state for public UI.
- Vega uses TanStack Start SSR for public pages and CSR for protected `/app` and `/admin`. Public content and metadata must exist in the HTML response without JavaScript. Never forward session cookies into public SSR loaders.
- Antares owns identity. Player UUIDs are immutable; names are mutable labels. Rigel/Velocity identity authentication requires a separate security review before implementation.
- Reusable UI belongs in Atria, with meaningful documentation and Storybook states. Vega contains product composition. Preserve keyboard navigation, labelled fields and reduced motion.
- Consult Context7, official documentation and installed sources when framework APIs or compatibility are uncertain.
- Markdown is rendered and sanitized by Antares. Drafts and protected data must never enter public loaders, sitemaps or service-worker caches.
- Exercise meaningful identity, authorization, storage, publishing and SSR scenarios. Keep strict oxlint/oxfmt, build and tests mandatory; document narrowly scoped exceptions in `docs/architecture/quality.md`.
