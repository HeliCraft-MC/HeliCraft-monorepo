[Русский](taxation_RU.md) | [Repository](../../README.md) | [Monetary](monetary.md) | [Diplomacy](../states/diplomacy.md) | [Detailed improvements](taxation-settings.md)

# Taxation

Antares owns tax institutions, immutable machine-readable laws, jurisdiction, quotes and settlement. Vega supplies state, administrative, player and company workflows through generated Alhena and existing Atria controls. Companies and ordinary corporate transfers are supported; [FX](currency-exchange.md) is a separate paired event. Physical geography, residency, debt collection and arbitrary confiscation remain outside this implementation.

## Institutions and authority

ESTABLISH_TAX_OFFICE uses the shared economic directive workflow and published State Governance. CREATE_INSTITUTION is preferred where configured; historical establishment-specific policy remains compatible. Missing authority denies the action. Explicit initial tax-office procedures can be adopted atomically with establishment in a pinned Governance/constitution revision; they cannot replace existing procedures or grant unrelated powers.

An applied state decision creates a PENDING web institution. Administration with states.manage can ratify/reject its actual source with a required reason and later suspend/restore it, preserving review/audit history. No physical building is asserted. Charter changes use CHANGE_TAX_OFFICE_CHARTER. ENACT_LAW, AMEND_TAX_LAW and REPEAL_LAW govern laws. Presets and constitution prose never grant capabilities.

Immutable directives pin their payload, normalized localized text and Governance revision. Execution rechecks active actors, uninterrupted office terms, actual approvals, generic Voting and configured manual evidence. A replaced or reappointed officer cannot revive an old signature.

## Laws, events and jurisdiction

Stable tax_laws have append-only numbered tax_law_revisions with approved directive, localized name/description/Markdown, supported events, category, taxpayer/base, allowance, rate, beneficiary, currency restrictions, effective date and optional company regime. Repeal appends a revision. Scheduled amendments do not replace predecessors early; effect starts no earlier than actual approval. Historical transfers are never recalculated.

The executable events are PLAYER_TRANSFER, PLAYER_COMPANY_TRANSFER, COMPANY_PLAYER_TRANSFER and COMPANY_TRANSFER. Antares derives them from actual legal parties. Issuance, burning, official bank/treasury remittances, tax journals, account creation and FX do not dispatch ordinary transfer tax. A law chooses one or more supported events and a stable category from the shared registry; senders cannot select a favorable category. Empty currency restrictions cover every active transfer currency without converting it.

For players, CITIZENSHIP and TERRITORIAL retain separate current membership evidence. The latter explicitly uses CITIZENSHIP_PROXY and does not assert verified location. Company registration and an approved branch supply their own legal evidence; the representative's citizenship is not substituted. Branch attribution requires the exact current corporate source/quote and approved presence. Multiple matching bases apply one law once; independent laws and states remain separate.

## Executable settings, regimes and treaties

SENDER taxes are added to the principal; RECIPIENT taxes are withheld atomically from that principal. Their combined withholding cannot exceed it. FULL_AMOUNT taxes the principal; EXCESS taxes only the amount above the exact per-event allowance. The approved beneficiary is the state treasury or its active central bank, with safe account creation in the transfer currency. An unavailable beneficiary causes an explicit failure, never silent redirection.

Company-specific EXEMPT, REPLACE and ADDITIONAL rules are state-approved law revisions. Replacement/exemption targets a compatible ordinary claim of that same state, taxpayer and category. Optional branch scope requires real approved presence. Conflicting replacements fail explicitly. Regimes apply before treaties, cannot erase foreign claims and are not inherited by subsidiaries.

Bilateral treaties explicitly identify covered categories/events, including category correspondence between parties. They reconcile only overlapping national claims against the same taxpayer. Exclusive rights suppress the covered competing claims; shared taxation uses the agreed rate and exact beneficiary shares. Third-state claims survive. Missing national claims cannot be invented by a treaty; incompatible intersecting agreements fail. See [Diplomacy](../states/diplomacy.md).

## Exact arithmetic and settlement

Money uses canonical integer-string minor units and bigint/numeric arithmetic, with two decimal display precision. Rates and distribution shares use integral basis points. Accrual is exact at denominator 100000000 per minor unit. Stable taxpayer/claim/currency/creditor/beneficiary balances collect whole units and retain every fraction. Counterparty, label, category or revision changes cannot reset the same obligation. Exemption, suspension or a changed beneficiary leaves prior fractions dormant without rewriting history. Shared beneficiaries retain independent fractions. See [the detailed conservation model](taxation-settings.md).

Ordinary quotes bind the authenticated actor, command, actual legal parties, laws/treaties/regimes and fractional evidence for five minutes. Confirmation shows principal, exact claims, jurisdictions, beneficiaries, total debit and net receipt. Execution recalculates under shared authority/ownership/monetary locks and rejects expired or changed terms. Corporate decisions additionally pin the charter, full approved debit and original proposal-time quote; later execution cannot silently alter the approved calculation. Idempotent replay returns the completed original operation before current quote expiry checks.

One economic_operations record groups the principal journal, immutable calculation, every assessment and tax journal. Each journal still has exactly two opposite postings in one currency. All accounts, assessments, fractional movements, principal and beneficiary transfers commit together. Insufficient funds, concurrent conflicts or a late posting failure roll back everything. PostgreSQL enforces nonnegative balances, supply conservation, scoped sources, exact allocation evidence and immutable completed histories. Tax journals do not recursively dispatch tax events.

## Suspension, UI and privacy

A SUSPENDED tax office cannot enact/amend laws, while its enacted laws continue under an ACTIVE state. A SUSPENDED state contributes no new claims; treaties cannot recreate them. Restoration applies prospectively, with no back-tax or changes to prior tax-free events. Public law pages retain institutional status.

The tax workspace edits all supported fields, previews actual server rules and approves them through existing Governance controls. Company treatment selects real published companies, supported claims, scope and dates. Receipts and paginated assessment histories retain zero/exempt outcomes and exact source revisions. Law/treaty lists and histories have bounded pages. Markdown is rendered and sanitized in Antares.

Public state taxation, law and treaty pages use cookie-free SSR and actual site settings. Drafts, private taxpayers, account balances, approvals and administrative reasons never enter public loaders, sitemaps or service-worker caches. Complete economic calculations require the actual personal taxpayer/withholding recipient or authorized company financial participation. Ownership alone does not grant financial access.

## Persistence and verification

Additive migrations preserve earlier monetary/tax/Voting data. Migrations 0020–0022 add executable liability/beneficiary and fractional integrity; 0038–0039 bind typed legal parties, corporate source decisions and regime evidence. Apply through the normal Drizzle runner to helicraft; never schema-push or reset user data. Old completed calculations/journals are not rewritten or backfilled with fractional debt.

[Companies](companies.md), [taxation improvements](taxation-settings.md) and [the verification record](../history/2026-10-18-companies-fx-taxation.md) describe current integration and observed tests. Future verified geography, company applications, assets, contracts and markets must use typed events and preserve authority, explicit confirmation, exact settlement and immutable evidence; they cannot write balances or set rates directly.
