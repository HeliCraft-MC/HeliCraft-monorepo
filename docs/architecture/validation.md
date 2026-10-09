[Русский](validation_RU.md) | [Repository](../../README.md)

# Web foundation validation

Validated on 2026-10-09 with Bun 1.4.2, TypeScript 7, Docker and Chromium. Tests use disposable persistence and do not start Minecraft.

| Check                                          | Result                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| generate and build:ts                          | Passed, including generated Alhena and Vega client/server/service worker       |
| typecheck                                      | Passed across all active TS workspaces                                         |
| lint and format:check                          | Passed, all configured categories/type-aware rules and unused-disable checking |
| test:unit                                      | 19 passed                                                                      |
| test:integration                               | 18 passed in 5 files with real PostgreSQL/PostGIS and S3                       |
| Playwright dev and built SSR                   | 9 passed; 1 intentional dev skip for production-only service worker            |
| build:storybook                                | Passed                                                                         |
| Root and affected existing Compose definitions | Validated                                                                      |
| Actual production web Compose                  | Images built, migrations applied to helicraft, services healthy                |

Production smoke checks exercised registration, HttpOnly session cookie, explicit first OWNER bootstrap and idempotence, private draft, publication without rebuild, custom/default skins and S3 avatar, password change with old-session revocation, robots/sitemap, real CMS rules SSR and /pages/rules → /rules HTTP 301 without duplicate sitemap entries. Responsive widths 360, 390, 768, 1024 and 1440 were checked; desktop/mobile screenshots were visually inspected.

The ordinary workspace has no .env or DATABASE_URL configured. Migrations were applied to disposable real helicraft databases; no unidentified user/production database was touched. For the intended deployment provide actual environment settings and run reviewed db:migrate (Compose runs its migration service). No mandatory tooling was unavailable. SQL is reviewed/applied rather than formatted by unsupported oxfmt. Temporary Compose is stopped without deleting volumes; Java/EULA and existing user services are preserved.

Operational limits: process-local rate limits require a shared store for replicas; expired-session and unused S3-version cleanup are not scheduled. Email/OAuth/recovery, game identity integration, World Engine and game institutions are outside this foundation. Start Rigel integration only with a reviewed proof/linking flow tied to permanent UUIDs, retaining standard authentication until then.
