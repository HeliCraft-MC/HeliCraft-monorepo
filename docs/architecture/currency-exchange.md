[Русский](currency-exchange_RU.md) | [Repository](../../README.md) | [Monetary](monetary.md) | [Companies](companies.md)

# Currency exchange

Currency Exchange V1 uses existing currencies, official central-bank accounts, state Governance and the monetary ledger. There is no independent issuer, company bank type or implicit permission. Antares owns settlement; Vega uses generated Alhena contracts and Atria controls.

## Settlement and official holdings

An FX_EXCHANGE contains two different currencies and two actual opposite exchanges of value. Each currency leg is a normal balanced two-posting journal, grouped by immutable exchange evidence. Both legs, reserve updates, approval consumption and receipts commit in one PostgreSQL transaction. A failure in either leg rolls everything back. Supply does not change. FX is a typed exchange event and does not dispatch ordinary transfer taxation; it cannot be used as an arbitrary one-currency transfer.

Central banks can receive and hold foreign currency in their own official account. State balances distinguish national/foreign holdings and available/reserved amounts. Foreign holdings can be transferred using the actual source bank's Governance. Issuance and burning remain restricted to the national issuer; knowing an account or currency ID grants no authority.

## Bilateral interbank exchange

An immutable proposal pins both active states, banks, currency amounts and expiry. Each state independently approves identical terms through APPROVE_INTERBANK_EXCHANGE and its own published policy. The second valid approval settles both legs atomically. The first side's current source evidence is checked again; a replaced/reappointed officer does not revive an old approval. Fresh valid approval can complete a pending deal. Deadline, balances, currencies and both authorities are rechecked at execution. Idempotency prevents duplicate settlement.

Vega's state FX section selects actual public banks/currencies, displays exact amounts, reviews immutable terms and exposes incoming approvals through existing directive controls. It does not ask for manual UUIDs or grant missing permissions.

## Finite reserved offers

PUBLISH_FX_OFFER pins the two currencies, positive exact minor units per lot, finite total lots, minimum fill and deadline. CANCEL_FX_OFFER is a separate state Governance action. Published terms never change; a new rate requires a new offer. Public terms show publication/expiry dates and exact minimum and current maximum amounts in both currencies. A remainder below the minimum lot stays reserved until cancellation or expiry but is excluded from executable public offers.

The implementation uses a protected reserve on the existing official account rather than moving funds to a separate escrow account. `bank_reserved_minor` sums remaining offered lots multiplied by provided units for active unexpired offers. Available balance is the account balance minus this reserve. Domain checks and the immediate PostgreSQL posting guard both enforce it. This is the V1 escrow-equivalent guarantee: the same money cannot fund another offer, bank transfer or exchange. Cancelling or filling updates reserve under the same locks.

Expiry releases availability according to the database clock even before a persisted expiry event is requested. Public readers report EXPIRED; an explicit idempotent expiry command can append audit evidence. No refund journal is needed because reserved funds stayed in the bank's account. Suspending institutions or states does not delete historical evidence or create money.

A player requests an exact quote in whole lots. The quote binds the authenticated player, offer hash, both exact amounts and a short expiry capped by the offer deadline. Confirmation shows the actual bank, currencies, amounts and expiry. Fill derives both player accounts on the server and checks remaining lots, reserve, funds and current availability. Competing fills serialize; an oversized/late/changed quote fails completely. Replaying a completed fill returns its original receipt before current offer status is checked.

## Publication and privacy

`/exchange` and `/exchange/:id` render public offers and actual site metadata through cookie-free SSR. Search covers published bank/state/currency names and currency codes. Directional pair filters and pagination run before results are selected. GET forms work without JavaScript. Filter options derive from available published offers. Filtered/paginated/unavailable results use noindex; the sitemap includes the catalogue and currently available offers.

Public fills expose opaque event IDs and exact lots/amounts, without player identities, account balances, private quote IDs or exchange receipts. Protected `/app/exchange`, `/app/exchange/:id` and state management show personal history, confirmation and authorized bank operations. Protected receipts identify both immutable journals. Public loaders never forward session cookies.

## Integrity, verification and limits

Migrations 0040–0042 add FX records and relational/deferred integrity guards without rewriting existing journals. SQL verifies source scope, both currencies/legs, exact terms, reserve limits, current source evidence and single-use approvals. Existing nonnegative balances, single-currency journal balancing and issuance restrictions remain mandatory.

Disposable integration tests exercise bilateral continuity, foreign holdings, reservation/spending conflicts, partial/full/concurrent fills, cancellation, expiry, late second-leg rollback, replay and HTTP privacy. Development and production browser scenarios exercise actual two-state approval, offer publication, player exchange, exact balances/supply, cancellation, responsive layouts and public filters without JavaScript. See [the verification record](companies-fx-taxation-plan.md) for release-wide status.

V1 provides exact finite lot offers, not an order book, floating-rate feed, infinite liquidity, credit, margin or automatic market-making. External providers and future typed economic events must preserve the same authority, paired settlement and immutable evidence boundaries.
