[Repository](../../README.md) | [Companies](companies.md) | [Taxation](taxation-improvements.md) | [Currency exchange](currency-exchange.md)

# Companies, currency exchange and taxation implementation record

Status: implementation, final release verification and acceptance audit completed. The acceptance contract is the Companies V1 / Currency Exchange V1 / Taxation Improvements request dated 2026-10-18. Results below refer to executed checks against the final implementation.

## Architecture delivered

Antares owns legal identity, normalized localized revisions, authority, PostgreSQL and financial storage. Vega consumes generated OpenAPI 3.1 / Alhena contracts and composes existing Atria controls. Shared Governance compilation and generic Voting handle corporate office/shareholder/combined/manual procedures. Presets do not grant runtime powers. There are no industry-specific company types, archived runtime dependencies or Minecraft changes.

Companies include resumable private drafts, exact founder/officer consent, state registration policy/fees, FREE/APPROVAL, rejection/resubmission, immutable corporate charters/decisions, stable offices/appointment intervals, exact shares, entity-owner approvals, reciprocal-cycle protection, subsidiaries, approved foreign branches, official multi-currency accounts, protected finance and lifecycle moderation/history. Public catalogue/profiles use cookie-free SSR with actual published identities, exact ownership and allowlisted history.

All four ordinary player/company transfer directions share one Tax Engine. Executable liability, full/excess bases, allowances, registry categories, event scope, treasury/central-bank beneficiaries, confirmed company/branch jurisdiction and national EXEMPT/REPLACE/ADDITIONAL regimes affect real settlement. Stable exact fractional obligations persist across revisions and counterparties. Tax-office suspension preserves enacted laws; state suspension stops new claims prospectively. Treaty mapping remains bilateral and cannot erase unrelated claims.

FX groups two actual single-currency journals atomically, preserves supply and remains separate from ordinary transfer tax. Foreign central-bank holdings use the actual source state's authority. Bilateral deals require both current Governance proofs. Finite offers protect funds on the official bank account with a domain and immediate-SQL reserve guard. This is an escrow-equivalent protected balance, not a separate escrow account. Quote/fill/replay/cancel/expiry and public/private evidence are implemented through REST and Vega.

## Migration application

All migrations through 0042 were executed repeatedly on disposable PostgreSQL/PostGIS by the integration scenarios, including monetary, Voting and taxation upgrade histories. SQL 0035/0039 CASE expressions were corrected during verification before application.

The configured user database `helicraft` was updated through `bun run db:migrate`, from 23 to 43 migration records. Control snapshots of original columns in 21 existing user/state/Voting/monetary/tax tables matched before and after the update. Original rows, balances, journals, revisions and assessments were preserved. No fixture data, schema push, reset or EULA change was applied to the user's database.

## Completed checks

- Root `build:ts` and `typecheck` pass on TS7 with generated Alhena. The latest root unit run passes all 202 tests: Antares 125, Vega 56, Atria 20, Alhena 1.
- Full `test:integration --pool=threads --maxWorkers=1` passes 77 tests across 31 suites. This includes migrations, exact calculations, real PostgreSQL constraints, atomic rollback, concurrency, source authority and HTTP privacy.
- Targeted company Governance tests also verify that a disposed legal shareholder retains its frozen vote through its own current authority, while unrelated users cannot read or list that vote.
- The separate final company/FX browser run passes all four cases in development and production. Company journeys cover persisted formation/consents, exact large shares, actual player funding and corporate payment, host-reviewed foreign branch/subsidiary, separate subsidiary accounts, personal stock transfer with consent revocation/regrant, additional issuance and unchanged money. They also enact a real corporate transfer tax, verify the exact treasury receipt, approve a targeted EXEMPT regime, reconcile the next payment and exercise administrative suspension/restoration/history.
- Real FX browser journeys cover independent two-state approval, foreign reserves, finite publication, quote/confirmation, player fill, exact holdings/supply, cancellation/history and no-JavaScript directional search/filter forms. The final cases assert exact minimum/current maximum amounts from public SSR.
- Storybook builds successfully outside the sandbox. The first sandbox attempt stopped the esbuild process before component compilation.
- Root, development, stand, Antares production/development and Vega Compose definitions validate with `.env.example` without starting Minecraft services.
- The final root `test:e2e` run passes 35 browser cases across development and production. One production-asset assertion is intentionally skipped in development; its production counterpart passes.
- All ten standalone company catalogue/profile scenarios pass across development and production, including cookie-free SSR, GET filters, keyboard use, outage/empty states and long mobile identities.
- Root strict lint, formatting and the Drizzle migration graph check pass.

Screenshots are retained under the local ignored `run/verification/` directory. They include desktop/mobile formation, company finances, foreign branches/subsidiaries, shares and FX. Only successful scenario outputs are used as evidence.

## Browser environment and final audit

An earlier general Playwright run overlapped PostgreSQL container creation/removal. Chromium reported `net::ERR_NETWORK_CHANGED`, aborting development module requests. The complete serialized root rerun passes without suppressing errors or changing application loading behavior. Container-heavy integration and browser suites run sequentially.

Vitest uses `--pool=threads --maxWorkers=1` because this environment's default Bun fork workers can stall before starting a test. Browser verification runs after generation/build finishes; concurrent SDK generation invalidates Vite's module graph and is not a valid browser test run.

The requirement-to-implementation acceptance map is available in [English](companies-fx-taxation-verification.md) and [Russian](companies-fx-taxation-verification_RU.md). The three final browser suites total 49 successful cases and one intentional development skip. Local logs are `run/verification/final-root-browser.log`, `company-complete-browser.log` and `company-public-browser.log`; build, types, lint, format, unit, PostgreSQL, Storybook, Compose and migration evidence are retained in the same directory. Screenshots capture real desktop/mobile layouts with the page reset to its top before FX captures, so sticky navigation does not cover offscreen content in a full-page image.

## Supported limits and future boundaries

Registered-company closure is safely refused while outstanding issued shares/assets require future capital retirement and liquidation. Unsubmitted formation drafts can be withdrawn; branch closure is implemented. V1 supports consented stock gifts/issuance, not paid securities trading. It does not infer physical territory, create sector-specific businesses, provide credit/liquidation/markets or expose third-party application credentials/runtime execution.

Stable legal identities, typed events, shared policy compilation, immutable decisions and grouped journals form extension boundaries for external company applications, webhooks, additional assets/contracts/markets and Minecraft adapters. Such extensions must preserve current authorization, explicit consent, exact accounting and public/private separation.
