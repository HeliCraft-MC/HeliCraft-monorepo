[Repository](../../README.md) | [Governance](../states/governance.md) | [Monetary](monetary.md) | [Taxation](taxation.md)

# Companies, currency exchange and taxation implementation plan

Status: in progress. This is an implementation plan, not a release report. The full acceptance contract is the Companies V1 / Currency Exchange V1 / Taxation Improvements request dated 2026-10-18.

## Existing boundaries and findings

Antares owns persistence and authorization. Vega consumes generated Alhena REST contracts and composes Atria controls. Published state revisions, monetary decisions, taxes, treaties and journals are immutable. Preserve the existing working-tree changes, including migrations 0018/0019, site identity and institution policies. No archive, Altair or Minecraft changes belong to this work.

Reuse the existing policy requirement compiler, office-term checks, immutable payload hashes, normalized localized text, authorization lock and generic Voting. Corporate offices require separate identities and appointments. Existing voting weights are stored but not consumed by result calculation; weighted legal-subject electorates need an exact shared implementation and frozen owner identities, rather than duplicate ballot tables or one ballot per representative.

Existing monetary journals have exactly two opposite postings in a single currency. Keep these guarantees. Extend economic operations to group typed multi-party/multi-currency settlement with relational evidence, without rewriting historical operations. Ordinary balances remain nonnegative; issuance remains restricted to the national issuer. Company ownership never grants access to another legal subject's financial accounts.

Existing taxation has sender-only liability, principal-only bases and treasury-only recipients. The category is already persisted and used for treaty scope but needs explicit legal identity/mapping. Tax calculation currently excludes a SUSPENDED tax office, contrary to the required distinction between institutional administration and law validity. Percentage rounding occurs per transfer and loses fractional obligations.

## Implementation sequence

1. Correct independent taxation suspension behavior with persistent lifecycle tests. Keep active laws applicable while a tax office is SUSPENDED; exclude SUSPENDED states, preserve history, and resume prospectively.
2. Add exact liability/base/recipient contracts, immutable revision evidence and settlement behavior. Preserve defaults for historical laws and operations. Display every supported setting and its actual server-calculated effect before confirmation.
3. Add exact accumulated obligations with stable taxpayer/claim/currency identity, immutable before/after evidence, deterministic allocation, locked quote validation, idempotency and rollback tests. Legal revisions change future accrual, never old collected payments.
4. Add Companies core: stable identity, versioned state registration policies through Governance, resumable private drafts, consent and registration approval, lifecycle and public history. Missing policy denies registration.
5. Add corporate charters, separate offices/appointments and immutable decisions. Extend shared policy/Voting primitives for corporate approvals, exact frozen shareholder weights and authorized legal-subject representatives. Verify uninterrupted authority and revision pins at execution.
6. Add exact share issuance/transfers, append-only ownership history, graph-derived control, serialized cycle prevention, subsidiaries and policy-approved branches. Closure must reject outstanding assets/ownership obligations unsupported by V1 liquidation.
7. Extend official accounts and typed settlement for company transfers in every supported currency. Add company jurisdictions and Governance-approved EXEMPT/REPLACE/ADDITIONAL regimes before treaty application. Derive all participants on the server.
8. Add exact FX settlement, foreign-currency bank accounts, two-state-approved interbank trades and finite offers backed by ledger escrow. Quotes bind immutable terms; fills/cancellation/expiry serialize and never mint money or dispatch ordinary transfer tax events.
9. Complete Vega registration wizard, public SSR catalogue/profiles, protected company workspace, state registration/tax/FX workflows and player exchange. Reuse localized input, FieldHelp, MoneyAmount, selection, Dialog, conflict and draft patterns. Add stories/tests only for new reusable Atria components.
10. Regenerate OpenAPI/Alhena, verify disposable database upgrades/constraints/concurrency, real browser journeys, SSR without credentials, keyboard/mobile/long text, all root checks and relevant Compose definitions. Update bilingual implementation documentation and record actual evidence separately from pending scope.

## Migration and verification rules

Use additive Drizzle migrations and review their SQL. Never schema-push or reset user data. Test upgrade paths against the preceding schema and apply reviewed migrations using the normal runner. Fixtures belong only to disposable databases. Financial and ownership tests ship with their invariants, not after UI completion. Report unavailable infrastructure separately from regressions; do not claim unrun checks passed.

Future company applications, webhooks, physical assets, contracts, markets and Minecraft integrations remain documented extension boundaries. They are not industry-specific company types or unfinished production endpoints.
