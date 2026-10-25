[Русский](company-interface-2026-10-22_RU.md) | English | [Verification](README.md)

# Company interface and shared forms — 2026-10-22

Local verification on 2026-10-22 (Europe/Istanbul), against the working tree based on `ec8f0db`. This covers the company interface, approval inbox, company branding, shared Form/localized input, poll editor, navigation and entity identities. It does not establish a production deployment. Current contracts remain in [companies](../economy/companies.md), [workspace design](../design/workspaces.md) and [Atria](../../packages/atria/README.md).

## Completed checks

| Command or scenario                                                                        | Result                                                                                        |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `bun run build:ts`, `bun run typecheck`, `bun run lint`                                    | Passed                                                                                        |
| `bun run test:unit --pool=threads --maxWorkers=1`                                          | 208 tests: Atria 24, Vega 56, Antares 127, Alhena 1                                           |
| `bun run test:integration --pool=threads --maxWorkers=1`                                   | 32 files, 80 tests passed with disposable PostgreSQL/S3                                       |
| Focused `company-ux.integration.test.ts` rerun after adding scoped review images           | 3 tests passed: exact consent invalidation, entity Governance and private/public image access |
| `bunx --bun playwright test --config playwright.fx.config.ts company-formation.spec.ts`    | 2 passed, development and production                                                          |
| Main browser batch: `vega.spec.ts`, `states.spec.ts`, `voting.spec.ts`, `monetary.spec.ts` | 18 passed, 1 expected development skip, 1 fixture-count assertion corrected below             |
| `bunx --bun playwright test tests/e2e/states.spec.ts` after the correction                 | 2 passed, development and production; completes all 19 executable main-batch scenarios        |
| `bunx --bun playwright test --config playwright.companies.config.ts`                       | 10 passed, development and production                                                         |
| `bun run build:storybook`                                                                  | Passed                                                                                        |
| Compose configuration checks                                                               | Root production/development and Vega/Antares definitions passed using `.env.example`          |

`0043_company_branding.sql` was reviewed and applied with `bun run db:migrate` to the local `helicraft` database. The migration adds company-scoped media and preserves exact charter/profile integrity checks. No schema push was used.

`bun run format:check` and `git diff --check` passed after the documentation update.

## Acceptance evidence

The shared Form tests exercise automatic model construction, one language context, preserved independent translations, schema errors, asynchronous failure/retry and custom-field value notifications. Browser scenarios exercise survey autosave, preview, translation switching, publication and participation. Mobile fullscreen forms were visually inspected after reducing nested padding and repeated language labels.

The company browser journey exercises explicit preset replacement, saved formation consents, inbox entry/removal, state review reached from the inbox, real registration, section navigation without replacing the document, finance, branches, corporate subsidiaries and shares. Public company tests verify branded SSR HTML, cookie-free content loads, no-JavaScript reading and mobile overflow. Real image decode/cropping, company ownership boundaries and protected decision/application image reviews are covered separately against actual storage; public visual fixtures use representative images.

Desktop/mobile company profiles, management, formation, inbox, state review and poll/survey screenshots were inspected. Local artifacts include `/tmp/company-profile-{desktop,mobile}-{development,production}.png`, `/tmp/company-inbox-development.png`, `/tmp/company-state-review-development.png`, `/tmp/company-finance-desktop-development.png` and `/tmp/helicraft-{poll,survey}-editor-development.png`. These temporary files are evidence from this run, not tracked repository assets.

## Corrections and environment limits

Earlier browser runs exposed selectors tied to old navigation URLs and hidden registration settings. These now follow the grouped navigation and explicitly open the settings disclosure. Keyboard checks wait for client hydration before testing JavaScript Escape handling. The state preview assertion now derives its expected count from the actual public directory: development and production share the disposable database, so it may contain fewer than three states. All corrected scenarios passed their final reruns.

Same-origin image elements may send browser cookies; public content requests and SSR loaders still omit credentials. Catalogue privacy checks distinguish those image requests instead of treating ordinary image loading as SSR cookie forwarding.

Docker, Chromium and Storybook were available. Container-backed suites finished before browser suites to avoid host network-interface changes interrupting browser requests. Browser/Testcontainers and Storybook required execution outside the process/network sandbox. Single-worker thread pools were used for Vitest. Dependency chunk-size and PostgreSQL client deprecation warnings remain non-failing tooling output; no application failures remain from these checks. Local logs are under `/tmp/ui-*.log` and `/tmp/company-ux-integration.log` and are not expected in a fresh checkout.
