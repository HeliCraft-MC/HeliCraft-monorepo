[Русский](taxation-improvements_RU.md) | [Taxation V1](taxation.md) | [Implementation plan](companies-fx-taxation-plan.md)

# Taxation improvements

The shared Tax Engine handles ordinary transfers between players and companies, executable law settings, company regimes and exact fractional obligations. [Companies](companies.md) and [FX](currency-exchange.md) describe the related legal and financial domains. Final verification is tracked separately in the implementation record.

## Executable law settings

Tax law revisions select SENDER or RECIPIENT liability. Sender tax is added to the principal. Recipient tax is withheld from the principal after its credit in the same database transaction. Both can apply simultaneously, using the selected taxpayer's own active citizenship/territorial-proxy evidence. Combined recipient tax may not exceed this principal, regardless of the recipient's existing balance. All applicable liabilities, actual sender debit and actual recipient credit appear in the confirmed quote and saved calculation.

A missing `base` on historical laws means the full principal. New revisions can select FULL_AMOUNT or EXCESS with an exact nonnegative minor-unit allowance. EXCESS applies to the part above the allowance, once per economic event; it is not a periodic income allowance. Rates and all money remain exact. Updating a form restores both configured jurisdictions and the complete allowance without converting through Number.

The state can direct tax to its treasury or its active central bank. The selected legal beneficiary is validated at law approval and again during calculation. Its account is created idempotently in the transfer currency, including foreign currency. An unavailable bank causes an explicit failure; tax is never silently redirected to a treasury. Treaty distributions use the beneficiaries of their covered national claims. Conflicting beneficiaries within one state's shared claim require a legal amendment rather than an arbitrary choice.

The shared category registry exposes TRANSFER, INCOME and CONTRIBUTION with localized names and practical descriptions. New laws choose registered stable codes; unchanged historical codes remain readable. Treaty scope can explicitly map each party's national category and supported events. A changed category changes actual matching. A treaty replaces only overlapping claims against the same taxpayer and never combines sender liability with recipient liability. Shared treaty rates retain the agreed principal-base semantics.

## Corporate parties and regimes

All four ordinary transfer directions share one calculation and settlement path: PLAYER→PLAYER, PLAYER→COMPANY, COMPANY→PLAYER and COMPANY→COMPANY. Participant identity and accounts come from the authenticated server context. Player citizenship is never substituted for a company's jurisdiction. COMPANY_REGISTRATION uses its legal registration; BRANCH_REGISTRATION requires an active approved branch and an explicit, current corporate source decision/quote. No physical territory or subsidiary residence is invented.

A national rule can target one registered company, optionally one approved source branch. EXEMPT and REPLACE bind a compatible ordinary law of that same state, taxpayer and category; ADDITIONAL is a separate claim. Incompatible simultaneous replacements fail explicitly. The regime is applied before bilateral treaty resolution, cannot erase another state's claims and is never inherited by subsidiaries. Rates, event lists, base/allowance, beneficiary and pinned regime evidence all affect the actual quote and immutable history. Zero/exempt assessments remain visible. Replacing a national rule preserves the stable base claim's fractional balance.

Corporate payment authority evaluates the approved full sender debit, including tax. Quote expiry prevents a new proposal from using expired terms. Existing pending decisions retain their exact approved debit and are revalidated at execution; changed financial conditions cannot silently expand authorization. FX is an independently typed paired exchange, not an ordinary transfer event, and does not run this transfer tax path.

## Fractional obligations

Exact allocations use numerator / 100000000 of one minor unit: principal or excess base × rate basis points × beneficiary share basis points. For each stable taxpayer, currency, national law (or shared treaty), creditor state and approved beneficiary, settlement adds the exact numerator to its previous remainder, collects whole minor units and retains the rest. No zero financial journal is written. Shared beneficiaries accumulate independently; every collected unit and every fractional entitlement remains accounted for.

The key excludes the counterparty, displayed names, law/treaty revision, tax rate, category label and initiator role. These changes cannot reset the same obligation. A revision changes only future accrual. A replacement treaty has its own obligation while the national residual remains recorded. Exemption, repeal, suspension or a change to another beneficiary leaves the old sub-unit entitlement dormant and immutable; it is not reassigned to a different creditor or silently discarded. If the same obligation/beneficiary becomes applicable again, its retained fraction resumes. V1 does not force settlement of an indivisible sub-unit amount or retrospectively collect it during an exemption.

Each allocation records exact accrual, denominator, previous remainder, collected amount and next remainder alongside the pinned national/treaty revisions. `tax_fractional_movements` is append-only. PostgreSQL derives and locks `tax_fractional_balances` from those movements and rejects direct insertion, update or deletion. Conservation checks require previous + accrued = collected × denominator + next. Deferred operation checks require every allocation's exact evidence and prohibit additional movements after commit.

Quotes include current residuals. Confirmation recalculates under the existing authorization/monetary locks and rejects a changed residual even if rounded tax happens to be the same. Idempotent replay returns the completed original operation before quote validation. A late journal failure rolls back the principal, tax journals, assessments and residuals together. Historical transfers are not backfilled with new fractional debt.

## Suspension and visibility

A SUSPENDED tax office cannot adopt or amend laws, but its enacted laws continue while its state is ACTIVE. Public law pages remain available with the institution's suspended status. A SUSPENDED state has no new applicable national claims; treaties cannot recreate them. Restoration resumes future taxation only. Past payments and suspended-period tax-free operations are never rewritten. A recipient with withholding can read its saved calculation; unrelated accounts remain denied.

## Migrations and evidence

Migration 0020 extends the deferred operation verifier for exact liability, bases and approved beneficiaries while retaining historical defaults. Migration 0021 adds fractional balances and movements; migration 0022 adds their append-only, conservation, atomicity and completeness guards. Existing ledger journals still contain exactly two opposing postings in one currency; their supply/balance guards are unchanged.

Unit tests cover exact bases, mixed liability, withholding limits, state-separated treaty liabilities, fragmentation, revised rates/categories and dormant beneficiaries. PostgreSQL scenarios cover actual money destinations, unavailable recipients, office/state suspension, repeated commands, changed quotes, late rollback and direct SQL mutation guards. The upgrade scenario creates an old-schema taxed transfer, compares laws/operations/assessments/journals/postings after migration, and confirms prospective accrual from zero. Browser coverage changes category, taxpayer, base and recipient through the real editor and verifies the resulting balances, immutable history, restored form values and public SSR without JavaScript. Release-wide verification is recorded in [the implementation record](companies-fx-taxation-plan.md).
