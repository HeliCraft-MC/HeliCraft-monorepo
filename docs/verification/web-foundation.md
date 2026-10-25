[Русский](web-foundation_RU.md) | [Repository](../../README.md)

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

## Gallery and photographic home — 2026-10-11

The replacement home, gallery domain, generated SDK, component folders and public routes pass `generate`, `build:ts`, `typecheck`, strict `lint`, `format:check`, `test:unit` (33 tests), and Storybook build. Root and affected Vega/Antares Compose definitions validate. After Docker became available, the production web images were rebuilt and the existing HeliCraft deployment was updated; PostgreSQL, S3, Antares and Vega are healthy. No Minecraft services were started or EULA accepted.

The dedicated public Playwright suite passes eight dev/production scenarios using test-only gallery fixtures: empty/five/six-image hero threshold, API outage, cookie omission, list/detail SSR, 404, ordinary pagination, JavaScript-disabled navigation, mobile menu/Escape, 360–1440px overflow and hydration checks. Desktop/mobile full-page and viewport screenshots are saved under `apps/vega/test-results/gallery-public/` and were visually inspected. Fixtures demonstrate public presentation, not live player records.

All 19 integration tests in six files pass with disposable PostgreSQL/PostGIS and private S3. Gallery coverage includes authenticated upload, invalid-file and anonymous rejection, public image delivery, ownership checks, S3 failure without a new database record, immutable author UUID after rename, and deletion returning 404. Migration 0003 applies both to fresh test databases and the existing test deployment's `helicraft` database; all four migrations are recorded and `gallery_images` exists. Deployment readiness, public gallery API and home/gallery SSR return HTTP 200. Existing database and storage volumes were retained; no data reset was necessary.

The complete authenticated Playwright suite passes 11 development/production tests with one intentional development skip for the production service worker. It exercises gallery upload, guest SSR and owner deletion alongside identity, skins, CMS publishing, administration, audit and private-response caching. The gallery test accepts the normal `page=1` query and verifies the deleted detail returns 404; the administration test waits for the role form refresh before changing status. Browser suites and source generation must run sequentially because their development servers share Vite's cache and generated files.

An additional smoke test through the actual Docker deployment on `http://localhost:8080` passes registration, authenticated gallery upload, public WebP retrieval from S3, guest detail SSR and owner deletion with subsequent detail/image 404. The deployment's allowed Origin was aligned with port 8080. This creates a test account and a soft-deleted photograph; no existing records were removed.
