# Teapot local guidance

- Nitro on Bun, TypeScript, MySQL through mysql2/Drizzle and SQLite through `bun:sqlite`.
- Place HTTP handlers in `server/routes`, business logic in `server/utils`, database queries in `server/db/repos` or focused services, and reusable DTOs in `server/interfaces`.
- Add `defineRouteMeta` with useful OpenAPI input and response information for new or modified routes.
- Nitro/H3 primitives and exports from `server/utils` are auto-imported; follow the existing pattern. Import ordinary external libraries explicitly.
- Use `useRuntimeConfig()` in runtime code. Build and Drizzle configuration may read `process.env`. Never put secrets in public config.
- Keep database operations scoped to the intended connection (`default`, `forms`, `banlist`, `states`, SQLite). `drizzle.config.ts` selects `default` or `forms` for CLI commands.
- Check authorization in every mutating operation. Global middleware only establishes a basic authenticated context.
- Keep handlers thin and data types explicit to support a future Go migration. Avoid `any` in new code.
- Run `bun run build`, relevant tests, and `bun run lint`; document known baseline failures.
