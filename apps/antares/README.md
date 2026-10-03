[Русский](README_RU.md) | [HeliCraft](../../README.md)

# Antares

**Remember and understand the state of the world.**

TypeScript · Bun · Hono · Zod/OpenAPI · Drizzle · PostgreSQL/PostGIS · S3

The API owns persistence and world logic. Handlers live in `src/app.ts`, infrastructure in `src/db` and `src/storage.ts`; configuration is validated by Zod. `/api/hello?name=Vega` demonstrates input validation; `/api/health` is liveness; `/api/ready` checks PostGIS and the S3 bucket; `/openapi.json` exposes the contract. Errors do not expose connection details.

```sh
bun run infra:up
bun run db:migrate
bun run dev:antares
bun run build:antares
bun run test:antares
bun run test:integration
bun run generate
```

Copy root `.env.example` to `.env` first. Target database: `helicraft`, PostgreSQL 18/PostGIS 3.6. The initial migration enables PostGIS and creates `world_events` with an optional SRID 4326 point. This is a wiring example; Minecraft planar coordinates require a deliberate future coordinate model. Generate new migrations with `db:generate`, review them and apply with `db:migrate`; no destructive push command is configured.

S3 uses AWS SDK v3 with an endpoint and path-style addressing. Integration tests use Testcontainers for real PostGIS migrations/spatial persistence and S3 object round trips. Docker daemon is required. Unit tests inject readiness dependencies and do not need services.

Production from root: `docker compose --env-file .env -f apps/antares/compose.yml up -d --build`. Development external services: `docker compose --env-file .env -f apps/antares/compose.dev.yml up -d --wait`. The first exposes API on localhost:3000; root production exposes it through Vega only. API changes must regenerate Alhena. Old Teapot endpoints, credentials and data are not migrated.

From the root: `bun run lint` and `bun run format:check`. Rules and exceptions: [quality setup](../../docs/setup-research.md).

## Name

α Scorpii, in the constellation Scorpius. [IAU star-name catalogue](https://iauarchive.eso.org/public/themes/naming_stars/).
