[Repository](../../README.md) | [Monetary system](monetary.md)

# Taxation & Diplomacy V1 implementation plan

Status: completed on 2026-10-18. See the [verification report](taxation-verification.md) and [Russian report](taxation-verification_RU.md) for delivered behavior, validation and limits.

1. Preserve the existing two-posting journal and all deferred integrity constraints. Group the principal journal and tax journals in one PostgreSQL transaction identified by an economic operation. Reuse account creation for foreign-currency treasuries.
2. Extend the existing immutable monetary/state economic directive mechanism rather than create parallel approval or ballot tables. Reuse its Governance revision pin, office-term evidence, generic Voting, frozen electorate, manual review, audit and idempotency. Keep existing action codes ENACT_LAW, REPEAL_LAW and SIGN_TREATY; add only missing actions. Existing presets and revisions grant no new authority.
3. Add ratified tax offices, append-only law revisions and bilateral treaty revisions. Store display text through normalized Localized Content. Bind each party's independent directive to the same revision and hash; recheck both parties' current evidence before activation. Preserve an active revision while an amendment is pending.
4. Implement a pure exact bigint engine for PLAYER_TRANSFER, distinct citizenship/territorial-proxy evidence, deduplicated laws, exclusive rights and replacement shared rates. Reject ambiguous treaty overlap. Persist short-lived actor-bound quotes and compare the locked recalculation on execution.
5. Expose thin Antares routes and generated Alhena methods. Compose existing Atria controls in Vega tax/diplomacy state workspaces, moderation, wallet confirmation/history and cookie-free public SSR.
6. Verify arithmetic and treaty cases with unit tests, real PostgreSQL upgrades/constraints/rollback/concurrency with integration tests, and development/production browser journeys including mobile, keyboard and JavaScript-free public pages. Update English/Russian documentation with actual results and limitations.

Scope excludes archive changes, Deneb/Rigel, physical geography/building assertions, companies, exchange, debt collection and unsupported taxable events. Existing uncommitted Monetary V1 work is the implementation baseline and must be preserved.
