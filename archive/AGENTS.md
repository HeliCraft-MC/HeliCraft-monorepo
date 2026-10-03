# HeliCraft agent guide

## Repository

- `apps/vesper`: Nuxt 4 / Vue 3 frontend. Follow `apps/vesper/AGENTS.md` for local style.
- `apps/teapot`: Nitro / Bun REST API. Follow `apps/teapot/AGENTS.md` for local style.
- `apps/soon`: standalone Node.js coming-soon page. Follow `apps/soon/AGENTS.md` for local style and Docker workflow.
- `docs/`: architecture, setup, API, data, and dependency guidance. Keep docs aligned with code and commands.
- Each app has its own manifest and `bun.lock`; run Bun commands inside that app.

## Boundaries

- Do not import files across app boundaries. Exchange data through the REST API.
- Only Teapot accesses MySQL or SQLite. Vesper uses the API proxy.
- Read relevant code on both sides before changing API contracts. If an API change breaks a current consumer, explain the impact clearly.
- Limit changes to the user's requested scope. A repo-wide request may require changes in both apps.
- Teapot may be migrated to Go. Keep handlers thin, types explicit, and business logic separate from framework code.

## Code and validation

- Use explicit TypeScript types for new code and DTOs. Avoid `any` and unchecked casts.
- Keep secrets in environment variables, never in client-visible Nuxt config or committed `.env` files.
- Use English for code comments. Match existing local style for filenames and formatting.
- For Vesper run build and typecheck. For Teapot run build, relevant tests, and lint. Report pre-existing failures separately from regressions.
- Before database schema changes, identify the target database. `db:push` targets `mydb`; `db:push:forms` targets `forms`.
- Update `README.md` or `docs/` when setup, environment variables, commands, or API behaviour changes.
