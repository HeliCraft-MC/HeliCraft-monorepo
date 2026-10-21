[Русский](companies_RU.md) | [Repository](../../README.md) | [Taxation](taxation-improvements.md) | [Currency exchange](currency-exchange.md)

# Companies

Companies provide universal legal identity, ownership, Governance and official finance. They have no industry types or platform-defined business models. Antares owns all persistence and authority; Vega composes Atria controls and consumes generated Alhena REST contracts. Final release verification is tracked in [the implementation record](companies-fx-taxation-plan.md).

## Identity and registration

A company has a permanent UUID, a registration state, normalized localized identity and immutable charter revisions. PLAYER, COMPANY and STATE owners use stable legal-subject identities. Names are labels and never identify an account or confer authority.

Private drafts save with optimistic versions and can resume at any wizard step. Review pins the saved formation hash, exact shares, offices, charter, state policy and fee. Each personal founder and initial officer explicitly consents; a legal founder consents through its own executed Governance decision. Consent survives reload, can be revoked before execution and becomes unusable when the terms change. A corporate representative can read the selected formation without gaining another person's signing rights.

A state publishes FREE or APPROVAL registration through its actual Governance. Missing policy denies registration. The policy controls foreign players, corporate/state founders, branches and optional exact application fees. FREE activates atomically. APPROVAL creates a frozen application for state review. Rejection and paid fees remain historical; resubmission preserves the company's identity and creates a new application. Registration does not grant citizenship.

Administration can suspend or restore a registered company with a required reason and expected current status. It cannot replace state registration authority. UUIDs, capital, accounts, revisions and audit evidence survive suspension; new company actions and postings are blocked. Concurrent lifecycle commands cannot both extend the same status. Unsubmitted drafts can be withdrawn. Registered closure is refused while issued capital or other outstanding assets require unsupported liquidation/capital retirement.

## Corporate Governance

The machine-readable charter defines independent action procedures: single, alternative or multiple offices; shareholder or office voting; combined approvals; and an explicit documented manual procedure. Missing action authority is denied. Editable presets only initialize configuration. Formal charter Markdown is descriptive and cannot grant capabilities.

Offices have stable IDs, localized descriptions, holder limits, terms, appointment/removal procedures and recorded appointment intervals. Immutable decisions pin the payload, charter revision, proposer, approvals and shared Voting requirements. Execution rechecks current status, revision, appointment continuity and evidence. Reappointment cannot restore an old signature. Simple valid single-office decisions execute immediately. Financial bands select procedures using the exact full debit, including sender taxes.

Generic Voting freezes legal-subject identities and exact opening share weights. Personal and legal-entity ballots are distinct from the human executor. A company or state casts one ballot through its own Governance. Its authorized current representative retains access to a frozen electorate after the entity disposes of its shares; acquiring those shares does not acquire the old vote. Another representative cannot cast the same legal vote again. Quorum and thresholds use integer weights; headcounts remain separate. Private corporate votes are filtered from unrelated users' voting lists.

## Ownership and subsidiaries

Shares are positive whole decimal strings, up to 30 digits. PostgreSQL numeric and bigint calculations reconcile all balances with the immutable stock journal. Control means strictly more than half the issued shares. Direct, indirect and concurrent ownership cycles are rejected under the shared ownership lock.

New issuance and gifts bind one immutable operation UUID, issuer revision, exact quantity and recipients. Every recipient must consent to those terms: PLAYER personally, COMPANY by a corporate decision, STATE by a state directive. Legal owners dispose of shares through their own Governance. The issuer may additionally require an exact transfer approval. Settlement rechecks current proofs and consumes consents atomically with balanced stock postings. Revocation prevents a pending acquisition and never removes completed property. Issuance creates shares, never currency; paid securities trading is outside V1.

A subsidiary is an independent company, registered normally in its selected state. The parent's FOUND_COMPANY decision approves the exact draft; it does not bypass foreign registration policy. Parent ownership does not merge accounts, appointments, taxation or histories. Vega supports preparing the subsidiary draft, reviewing corporate/state founder consent and following the host application.

## Branches

A branch records the same company's presence in one host state. Its UUID, owner and jurisdiction are permanent. It has no independent legal subject or financial account.

REGISTER_BRANCH pins localized terms and the published host policy. FREE activates atomically; APPROVAL requires the actual host Governance. Both company source authority and host policy are rechecked. Rejected/superseded applications and all events remain immutable. Resubmission preserves the branch ID. CLOSE_BRANCH follows the company's separate procedure; a pending application is cancelled. A closed ID is not reused. Public lists contain approved active/closed presence, never pending applications or review reasons. Formation fees do not automatically become branch fees.

## Official finance and taxation

Official COMPANY accounts use the shared single-currency, double-entry ledger. Accounts appear on actual funding and can hold existing national or foreign currencies. Drafts and branches cannot own them. PLAYER→COMPANY, COMPANY→PLAYER and COMPANY→COMPANY ordinary transfers use the same Tax Engine as PLAYER→PLAYER. State bank/treasury funding and company remittance to an official treasury retain their explicit official-event semantics.

The server derives payer, payee, accounts and actual executor. Corporate payments bind a quote, the current charter and the approved full debit. Confirmation shows exact tax evidence and quote expiry. Execution recalculates under monetary/ownership locks; changed legal or fractional evidence cannot silently change the approved payment. Insufficient funds, late journal errors and competing payments roll back the complete operation. Idempotency returns the original result.

Financial access follows the explicit TRANSFER_FUNDS procedure and currency bands. Ownership alone does not grant access under an office-only financial policy. Holding a parent's shares never grants access to a subsidiary's funds. Administrators require actual states.manage permission. Financial decisions, quotes, balances and ledger history use protected, no-store endpoints. The immutable proposer, financial legal parties and executing player remain separately attributable.

Corporate jurisdiction uses registration and, only with confirmed source context, an approved branch. Special national EXEMPT, REPLACE and ADDITIONAL regimes pin the company, optional branch and applicable base law. They do not exempt foreign claims or propagate to subsidiaries. See [taxation improvements](taxation-improvements.md).

## Vega, API and publication

Public `/companies` and `/companies/:id` use cookie-free SSR with content, actual site branding and metadata in HTML. Catalogue search, jurisdiction/status filters, sorting and pagination work without JavaScript. Profiles show actual charters, officers, exact ownership, computed holdings/control, approved branches and allowlisted public decisions. Drafts, private approvals and financial details never enter public loaders, sitemaps or caches.

Protected routes include `/app/companies`, formation drafts/applications, `/app/companies/:id`, `/app/company-decisions/:id`, `/app/shares` and `/app/share-operations/:id`. The available-company directory follows current offices and actual ownership participation. Workspace sections cover governance, offices, shares, decisions, finance, subsidiaries, branches and history. State management exposes policy, applications, legal ownership and Governance decisions. `/admin/companies` exposes lifecycle moderation and decisions whose pinned requirements explicitly require manual review.

Antares uses additive migrations 0023–0042, append-only histories, guarded heads, scoped foreign keys and deferred consistency checks. REST handlers delegate to domain services. OpenAPI 3.1 generates Alhena; no client or published internal package imports application runtime implementation.

## Verification and extension boundaries

Disposable PostgreSQL tests cover registration, exact/frozen ownership, entity Governance, continuity, cycles, branches, finances, privacy, tax settlement, migrations and direct SQL tampering. Development and production browser scenarios cover resumable formation, persisted consents, corporate funding/payment, foreign branch and subsidiary registration, separate subsidiary balances, stock transfer/revocation/issuance, targeted tax exemption, administrative lifecycle and responsive screenshots. The implementation record and bilingual acceptance map retain the completed verification evidence.

External company applications, webhooks, additional typed events, physical assets, contracts, markets and Minecraft adapters may extend these stable identities and decision sources. V1 adds no application keys, OAuth, third-party JavaScript runtime, industry-specific services or alternate route around corporate authority.
