[Русский](taxation-verification_RU.md) | [Taxation](taxation.md) | [Diplomacy](diplomacy.md) | [Monetary verification](monetary-verification.md)

# Taxation & Diplomacy V1 verification

Implementation: 2026-10-18. Existing uncommitted Monetary V1 work was preserved as the baseline. No archive, Deneb, Rigel or Altair implementation was changed.

## 1. Delivered functions

Tax offices are established by state decision, separately ratified/rejected by administration with reasons, and suspend/restore without deleting history. States enact, amend and repeal localized machine-readable transfer-tax laws. Multiple citizenships, multiple independent laws, an explicit territorial citizenship proxy, foreign-currency treasuries, exact quotes, exemptions, shared revenue and immutable operation history work through Antares and Vega. Zero assessments retain evidence without zero journal postings and appear in protected state history.

## 2. Governance changes

The registry adds `ESTABLISH_TAX_OFFICE`, `CHANGE_TAX_OFFICE_CHARTER`, `AMEND_TAX_LAW`, `AMEND_TREATY` and `DENOUNCE_TREATY`. Existing `ENACT_LAW`, `REPEAL_LAW` and `SIGN_TREATY` are reused. Presets and published revisions receive no automatic additions. The existing immutable economic directives, office signatures, uninterrupted term checks, generic Voting, frozen electorate, combined proofs and reasoned manual administration are reused. Exact treaty text/structured terms accompany protected decision and frozen-voter review. Missing policy denies authority; constitution prose grants none.

## 3. Tax engine

`modules/taxation/engine.ts` is a pure bigint calculation over verified PLAYER_TRANSFER context, law revisions and active treaty revisions. Each law applies once, regardless of matching jurisdiction bases. National claims use the original principal and integral 0–10000 basis points. Tax floors to a minor unit; the first shared allocation floors and the second receives the exact remainder. The engine rejects total-debit overflow and overlapping treaty applications. A separate jurisdiction provider preserves CITIZENSHIP versus CITIZENSHIP_PROXY evidence. Only explicit personal-transfer dispatch starts taxation; internal journals do not recurse.

## 4. Treaty architecture

A stable treaty has ordered parties, immutable normalized revisions/hashes, independent state decisions and immutable activation history. V1 permits two distinct active states and TAX_TREATY only. Candidate edits never inherit signatures. Both current Governance procedures must approve the same revision/hash; removed/reappointed holders and stale Governance cannot activate an agreement. The previous active revision survives a pending amendment. Exclusive rights or one replacement shared rate settle only both parties' overlapping category claims; third-state claims survive. Conflicting activation/calculation is refused. Termination is explicitly bilateral. Expired proposals cannot obtain new ratifications. Private/public histories and treaty lists have bounded pages; private and public law/treaty history remains reachable beyond fifty records.

## 5. Ledger

The existing exactly-two-posting journal and all earlier supply/balance/immutability triggers remain. A principal journal and all tax-allocation journals execute in one PostgreSQL transaction identified by `economic_operations.id`, equal to the principal journal UUID. Relational assessment claims pin exact law revisions and enforce one law per event. Deferred checks reconcile principal recipient, taxpayer, currency, allocation journals, assessed totals and all recorded revision claims. Committed evidence cannot be rewritten or extended. Source funds must cover the entire debit. Actor/key retries return the original operation before quote-expiry checks; changed commands conflict. Five-minute actor/command/calculation-bound quotes reject legal or parameter changes before payment.

## 6. Migrations and API

`0016_taxation_diplomacy_v1.sql` adds fifteen tables for directive documents, tax institutions/reviews/laws/revisions, quotes, economic operations/assessments/claims/journal links, treaties/parties/revisions/decisions/activations. `0017_taxation_integrity.sql` adds restrictive references, append-only guards, bilateral consistency and deferred economic completeness checks. Existing monetary payload columns and financial history remain intact; the historical monetary-policy upgrade test still passes.

Both migrations were applied through the ordinary migrator to disposable PostgreSQL/PostGIS and configured local `helicraft`, without reset or schema push. Local read-only checks confirmed migration count 16 → 18 and unchanged journal count 0 → 0. No gameplay fixture was inserted into the user's database. PostgreSQL tests retain pre-upgrade policy content/identifiers/timestamps and reject mutation afterward.

Thin OpenAPI routes expose quotes, own operation evidence, state taxation/diplomacy, immutable state directives, tax-office administration, treaty drafts/revision history and public policy. `bun run generate` regenerates OpenAPI and Alhena; generated SDK sources were not authored manually.

## 7. Vega and Atria

State management adds Taxation and Diplomacy. Tax-office forms, law adoption/amendment/repeal, server-backed examples, independent treaty ratification, exact receipts/assessments, zero/exemption history and currencies use existing workspace composition. Treaty creation follows partner → supported type/text → terms → review, followed by independent state decisions. Active/pending revisions, parties' real flags/names, hashes and proof status remain visible. Public history uses normal GET pagination without JavaScript.

Wallet confirmation displays principal, total tax and total debit before the detailed legal breakdown, treasury shares, treaty replacements and proxy explanation. Own history can load the recorded calculation and journal links. Tax journal labels derive from economic-operation links, never user-entered payment purposes. Public `/states/:slug/taxation`, `/tax-laws/:id`, `/treaties` and `/treaties/:id` render sanitized content/metadata with cookie-free SSR. Protected account/admin routes remain CSR.

Existing Atria LocalizableTextInput, FieldHelp, Dialog, form controls, StateName and MoneyAmount are reused. New domain composition remains in Vega; no new shared design kit or banker/tax roles were introduced. Existing Atria tests/stories and Storybook continue to build.

## 8. Checks

| Check                                                       | Result                                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `bun run generate`                                          | Passed; OpenAPI and Alhena regenerated                                                            |
| `bun run build:ts`                                          | Passed, including production SSR assets                                                           |
| `bun run typecheck`                                         | Passed with TS7 in all workspaces                                                                 |
| `bun run lint`                                              | Passed with type-aware errors, zero warnings and unused-disable reporting                         |
| `bun run format:check`                                      | Passed on the completed source and documentation                                                  |
| `bun run test:unit -- --pool=threads --maxWorkers=1`        | 123 passed: Antares 70, Vega 35, Atria 17, Alhena 1                                               |
| `bun run test:integration -- --pool=threads --maxWorkers=1` | 31 passed in 12 suites on disposable PostgreSQL/S3                                                |
| `bun run test:e2e`                                          | 25 passed, 1 deliberate development-only skip; final UI rerun: 2 passed in development/production |
| `bun run build:storybook`                                   | Passed                                                                                            |
| Compose                                                     | Root, root development, Antares production/development and Vega definitions passed                |
| Local migrations                                            | Applied to `helicraft`; 18 migrations, unchanged journal count                                    |

Unit cases cover several independent laws, citizenship/proxy evidence, tiny/maximum amounts, exact rounding, overflow, unsupported events, exclusive/shared treaties, other categories, third states, odd allocation units and deterministic conflict refusal. PostgreSQL scenarios cover the real institution/Governance/ledger lifecycle, quote binding/expiry, retries, foreign treasuries, complete injected late rollback, concurrency, no recursive taxes, SQL immutability, suspension/restoration, independent ratification, edited proposals, reappointment, stale Governance, combined frozen voting, departed voter access and manual procedures. Real 52-revision scenarios verify both pages of law and private treaty history and private-draft isolation.

The real browser journey creates two states and tax offices, ratifies institutions, enacts two laws, transfers 100 with debit 108, independently ratifies a shared treaty and transfers 100 with debit 106. It verifies both treasuries (8 and 6), recipient principal (200), historical calculation after a scheduled law amendment, keyboard help, long localized names, mobile overflow and public tax/law/treaty HTML without JavaScript.

Initial sandbox worker/esbuild/Docker restrictions were resolved using thread workers or ordinary execution outside the sandbox. A parallel SDK-generation run invalidated the dev module graph and was discarded; release browser checks run without concurrent generation. Vite now scans its client entry and lazy route files for dependency discovery, warms its client entry, and Playwright waits for that transformed entry rather than an HTML response before starting navigation. Known non-failing observations remain the existing PostgreSQL driver deprecation and large build chunks.

## 9. Screenshots

Final production screenshots are saved in the task’s persistent visualization folder. Desktop and mobile views were visually inspected. Browser assertions also verify no horizontal overflow, keyboard help and public HTML without JavaScript.

| View                             | Desktop                                                                                                                              | Mobile                                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| National taxes: debit 108        | [PNG](/home/ms0ur/.codex/visualizations/2026/10/17/01a14b80-3ad0-7d91-a9ce-370b1fa11eaa/taxation/tax-quote-production-108-00.png)    | [PNG](/home/ms0ur/.codex/visualizations/2026/10/17/01a14b80-3ad0-7d91-a9ce-370b1fa11eaa/taxation/tax-quote-mobile-production-108-00.png)    |
| Treaty: debit 106                | [PNG](/home/ms0ur/.codex/visualizations/2026/10/17/01a14b80-3ad0-7d91-a9ce-370b1fa11eaa/taxation/tax-quote-production-106-00.png)    | [PNG](/home/ms0ur/.codex/visualizations/2026/10/17/01a14b80-3ad0-7d91-a9ce-370b1fa11eaa/taxation/tax-quote-mobile-production-106-00.png)    |
| Treaty terms                     | [PNG](/home/ms0ur/.codex/visualizations/2026/10/17/01a14b80-3ad0-7d91-a9ce-370b1fa11eaa/taxation/tax-treaty-terms-production.png)    | [PNG](/home/ms0ur/.codex/visualizations/2026/10/17/01a14b80-3ad0-7d91-a9ce-370b1fa11eaa/taxation/tax-treaty-terms-mobile-production.png)    |
| Independent ratifications        | [PNG](/home/ms0ur/.codex/visualizations/2026/10/17/01a14b80-3ad0-7d91-a9ce-370b1fa11eaa/taxation/tax-treaty-ratified-production.png) | [PNG](/home/ms0ur/.codex/visualizations/2026/10/17/01a14b80-3ad0-7d91-a9ce-370b1fa11eaa/taxation/tax-treaty-ratified-mobile-production.png) |
| Wallet and saved operations      | [PNG](/home/ms0ur/.codex/visualizations/2026/10/17/01a14b80-3ad0-7d91-a9ce-370b1fa11eaa/taxation/tax-wallet-production.png)          | [PNG](/home/ms0ur/.codex/visualizations/2026/10/17/01a14b80-3ad0-7d91-a9ce-370b1fa11eaa/taxation/tax-wallet-mobile-production.png)          |
| State tax history                | [PNG](/home/ms0ur/.codex/visualizations/2026/10/17/01a14b80-3ad0-7d91-a9ce-370b1fa11eaa/taxation/tax-state-production.png)           | [PNG](/home/ms0ur/.codex/visualizations/2026/10/17/01a14b80-3ad0-7d91-a9ce-370b1fa11eaa/taxation/tax-state-mobile-production.png)           |
| Public policy without JavaScript | [PNG](/home/ms0ur/.codex/visualizations/2026/10/17/01a14b80-3ad0-7d91-a9ce-370b1fa11eaa/taxation/tax-public-production.png)          | [PNG](/home/ms0ur/.codex/visualizations/2026/10/17/01a14b80-3ad0-7d91-a9ce-370b1fa11eaa/taxation/tax-public-mobile-production.png)          |

[Law editor](/home/ms0ur/.codex/visualizations/2026/10/17/01a14b80-3ad0-7d91-a9ce-370b1fa11eaa/taxation/tax-law-editor-production-500.png).

## 10. Limits and integration points

V1 intentionally serializes monetary commands through the existing authorization advisory lock; horizontal scaling needs equivalent locking and shared/gateway mutation limiting. Rates are 0–100% per independent law; event dispatch supports personal transfers only. Territorial evidence is a citizenship proxy, not verified geography. Treaty conflict prevention is conservative for a shared party/category/event/time window. Termination is bilateral; unilateral denunciation is not offered. Minecraft facts/buildings, actual territory, residency, companies, exchange, markets, loans, deposits, debt collection and confiscation are not implemented. Their future REST event/context providers must preserve state authority, consent, exact accounting and immutable historical evidence.
