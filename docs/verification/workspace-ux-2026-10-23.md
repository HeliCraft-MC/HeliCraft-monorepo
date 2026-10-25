[Русский](workspace-ux-2026-10-23_RU.md) | English | [Verification](README.md)

# Workspace UX verification — 2026-10-23

Scope: the existing working checkout, including changes already present before this task. This records local implementation checks, not deployment. The landing-page modules and archived applications were not edited for this redesign.

## Implemented and checked

- Shared Atria navigation/content, page headings, action disclosures and editor stages, documented in Storybook and the package README pair.
- Account, administration, company and state menus; mobile current-section disclosure, capability-filtered links and client section navigation.
- Compact forms for monetary decisions, payments, company branches/subsidiaries, office changes, charter amendments and share issuance. Shared directive lists for money, FX, taxes and diplomacy.
- Tax records split into Laws, Decisions and Assessments/receipts tabs, with a focused law-editing dialog that preserves the selected tab.
- Poll stages, retained questions across format switches, one editing-language control, interactive preview, publication readiness, compact voting directories and native radio/checkbox ballots.
- Lucide controls, compact option rows and sticky dialog close/editor actions.

The current interaction contract is [Workspace design](../design/workspaces.md). Existing Antares authorization, private/public data boundaries, immutable publications and exact financial accounting remain authoritative.

## Checks

`bun run build:ts`, `bun run typecheck` and `bun run lint` passed. `bun run test:unit --pool=threads --maxWorkers=1` passed 210 tests: 127 Antares, 58 Vega, 24 Atria and 1 Alhena. The unbounded default fork run initially failed to start workers in the constrained environment; the single-worker thread run completed without application test failures.

`bun run build:storybook` passed outside the process sandbox. Root and Vega Compose configuration validation passed with temporary placeholder values for required secret variables; no services were deployed by that check.

Browser evidence includes the real PostgreSQL/S3 Voting lifecycle in both development and production (6 passing scenarios), the real monetary/appointment lifecycle in development (1 passing scenario), and bilateral exchange/offer/fill/cancellation in both runtimes (2 passing scenarios). The full company lifecycle also passed in both runtimes (2 scenarios): formation consents, registration, finance, branches, foreign subsidiary formation, shares and company taxation. Public catalogue/profile checks cover cookie-free SSR, reading without JavaScript, filtering, pagination, error/empty states and mobile overflow. Protected UI fixtures exercise the actual Vega routes/components while intercepting account responses, and are separate from persistence tests.

The final public/protected-fixture suite passed all 18 scenarios in both runtimes, including keyboard tab activation and widths 360, 390, 768 and 1280. Together with Voting (6), monetary (1), FX (2) and company (2), this task has 29 passing browser scenarios. Desktop/mobile poll, company and tax screenshots were visually inspected. `bun run format:check` and `git diff --check` passed after documentation updates.

## Environment and corrections

Docker, Chromium and Storybook are available outside the process/network sandbox. Test servers create fresh disposable Testcontainers; they do not connect to the user's persistent database. An automatic approval review initially rejected the monetary test as a potential live financial operation; inspection of `browser-server.ts` established the newly created PostgreSQL/S3 endpoints and the isolated run was then approved and passed.

Early browser failures identified old text-arrow selectors, mobile-menu assumptions, a poll publication race when Continue reused the Publish button, and tab intrinsic-width overflow. The UI/tests were corrected. Keyboard tab checks use arrows to move focus and Enter to activate, matching the shared Base UI control. Starting container infrastructure concurrently with another browser run caused a development module-fetch failure; final browser checks run after container setup has finished.

Temporary logs and screenshots are under `/tmp/ux-*.log` and `/tmp/workspace-*.png`; they are local run artifacts and need not exist in a fresh checkout. Earlier dated verification records retain their own scope and results.

## Follow-up — 2026-10-25

Scope: the continued uncommitted workspace implementation. The results above retain their original date; the checks below were executed on 25 October. This is repository verification, not a deployment.

The shared `WorkspaceLayout` now owns state/company surfaces, borders and readable action/focus colors, including portalled dialogs. Institutions have one main-menu entry, an authorized catalogue with explanations and compact inner navigation. Existing deep links still work. `WorkflowLayout` groups state formation/reform and company formation stages, preserves work and provides direct stage navigation. Review issues link to their settings. Company charter editing separates offices, authority, voting and share transfers into tabs; the amendment action comes before the collapsible current charter.

Ordinary internal anchors and gallery upload/deletion use SPA navigation. Modified/external/download/API/native links retain browser behavior. Draft editors initialize from fresh snapshots after returning from approvals, and both save queues flush before client navigation. Model-driven localized groups and shared language scopes cover state identity, institution identity, tax documents, company formal charters and nested Governance editors. Mobile workspace rows keep their natural height; tab labels remain intact in a locally scrollable strip.

Choice voting closes atomically at full turnout. Optional `closeWhenDecided` additionally closes irreversible outcomes after quorum, using all remaining exact weight and abstentions. New state/company drafts enable it; existing immutable revisions without the property retain their rule until changed through the authorized reform/charter procedure. Published windows remain unchanged. Surveys retain scheduled/manual/repeated-response behavior. The current contract is [Voting](../platform/voting.md).

Storybook has a dark, categorized catalogue, introductory guidance, token documentation and focused examples. The mandatory maintenance checklist is [Atria AGENTS.md](../../packages/atria/AGENTS.md). Both package READMEs document the public layout/form APIs.

Fresh checks:

- `bun run build:ts`, `bun run typecheck`, `bun run lint` and `bun run build:storybook` passed.
- `bun run test:unit --pool=threads --maxWorkers=1`: **218 passed** — Antares 132, Vega 61, Atria 24 and Alhena 1. Completion tests compare all remaining ballot combinations, strict thresholds, abstentions and exact large share weights.
- Targeted PostgreSQL Testcontainers suites `voting-completion.integration.test.ts` and `company-governance.integration.test.ts`: **5 passed**. They verify atomic completion, rejected late ballots, unchanged publication deadlines, weighted corporate decisions and legal-entity voters.
- Real PostgreSQL/S3 browser journeys `states.spec.ts` and `gallery.spec.ts`: **4 passed**, development and production. This includes a resumed mobile reform, persisted completion rule, retained translations, JavaScript-free public pages and upload/deletion without replacing the document.
- `playwright.companies.config.ts`: **22 passed**, development and production. Public/protected fixtures verify SSR/cookie boundaries, stable SPA shells, institution navigation, themed dialogs, translations, charter tabs, keyboard controls and widths 360/390/768/1280. Extra checks prevent empty gaps between mobile workspace rows and labels wrapping into individual letters.
- All **74 Storybook stories** rendered without browser exceptions or nested buttons/links/forms. Representative checks exercised documentation tables, mobile workflow retention with reduced motion, entity theme propagation, Escape/focus return and arrow/Enter/disabled tab behavior. Desktop/mobile screenshots were visually inspected.
- Root, development, stand, Vega and Antares Compose configuration checks passed with temporary placeholder secrets. No service was deployed by configuration validation.

The final formatting and local-link checks cover this follow-up. Logs and screenshots use `/tmp/ux3-*.log`, `/tmp/ux3-storybook-*.png`, `/tmp/ux2-company-charter-*.png` and `/tmp/ux2-state-reform-*.png`; these are temporary run artifacts. Earlier October 23 runs are not counted as fresh October 25 checks.
