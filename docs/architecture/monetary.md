[Русский](monetary_RU.md) | [Repository](../../README.md) | [Governance](../states/governance.md)

# Monetary system V1

Antares owns national currencies, central banks, monetary policy, exact balances and an append-only double-entry journal. Vega operates the system through generated Alhena REST methods. No Minecraft process is required. There is no universal currency, conversion, backing requirement, mandatory transfer fee, lending, deposits, market or monetary administration faucet.

## Authority and decisions

Optional Governance actions are `ESTABLISH_CENTRAL_BANK`, `CHANGE_BANK_CHARTER`, `CREATE_CURRENCY`, `CHANGE_MONETARY_POLICY`, `ISSUE_CURRENCY`, `BURN_CURRENCY`, `TRANSFER_CENTRAL_BANK` and `SPEND_TREASURY`. Existing presets and published revisions are unchanged. Missing policy denies the action. Add policies through the ordinary immutable reform procedure; editing the constitution text grants no authority.

Monetary directives reuse the office-decision policy compiler and the generic Voting persistence, frozen electorate and result calculation. There are no bank employees, special banker roles or bank ballot tables. Office, any-office, all-office, citizen/council votes, combined decisions and documented manual procedures follow their configured requirements. An initiator must have current citizenship and the corresponding office authority, or citizenship for a citizen/manual procedure. A council initiator must hold a specified council office.

A directive fixes its state, Governance revision, exact payload hash, normalized localized text, creator, monetary-policy revision and idempotency key. Submitted payloads cannot be edited. Signers may revoke their own approvals before execution, retaining both audit events. Approvals count only within the same uninterrupted and unexpired office-holder interval and while the signer has an active account. Reappointment never revives an old signature. Execution rechecks the creator's uninterrupted authority, all proofs, current state and bank, currency, policy, balances and limits. A changed Governance revision or changed monetary policy for a financial directive requires a new directive. A single authorized office may execute immediately; multiple proofs remain pending. Manual review requires `states.manage` and a recorded reason and cannot replace a required office approval or vote.

Frozen eligible voters can read the approved monetary payload even after losing current citizenship. That endpoint checks the actual voting binding and the frozen voter row; it does not expose state configuration or financial balances. Nonparticipants cannot retrieve it.

## Institutions and revisions

`central_banks.state_id`, `currencies.state_id`, the issuer bank and currency code have PostgreSQL unique constraints. Bank and currency UUIDs cannot change or be deleted. A bank application is an already applied immutable establishment directive. Only then does a PENDING bank exist for administrative review. `states.manage` ratifies or rejects the exact establishment directive with a mandatory reason. Ratification grants no issuance or spending authority. Rejected applications may be replaced by a fresh state-approved establishment directive on the same bank identity; all old directives and reviews remain.

Bank transitions are PENDING → ACTIVE/REJECTED, ACTIVE → SUSPENDED and SUSPENDED → ACTIVE. Activation requires an ACTIVE state. A charter change is another state directive. Currency creation is a separate decision and creates zero supply plus issuance, bank and treasury accounts. Each monetary-policy change appends an immutable policy revision; old policies and the policy used by each issuance remain readable. Lowering a ceiling never removes existing money. Each currency has a unique, monotonically increasing policy revision number, assigned under its command lock. Migration `0015_monetary_policy_revision_numbers.sql` backfills existing versions in chronological order while preserving their payloads, identifiers and timestamps; the history guard is re-enabled before commit.

A suspended state or bank prevents new bank/treasury operations. Existing player transfers continue while the currency itself is ACTIVE. The currency has a separate BLOCKED status; no automatic freeze or destruction follows suspension. Web ratification does not claim that a physical Minecraft building has been inspected.

## Exact accounting

All API money uses canonical nonnegative integer strings in minor units. Precision is always two decimals. Positive commands reject zero, signs, fractions, exponents, leading zeroes and more than thirty digits. PostgreSQL `numeric(38,0)` and server `bigint` arithmetic preserve exactness. The technical maximum supply is `999999999999999999999999999999` minor units. This storage bound is separate from state policy.

Accounts have immutable currency, owner and kind: PLAYER, CENTRAL_BANK, TREASURY or ISSUANCE. A unique `(currency_id, kind, owner_id)` creates one wallet per player/currency. Incoming transfers create recipient wallets transactionally; citizenship is irrelevant to wallet ownership. Future corporate/escrow owners can extend this account boundary without changing the journal.

Every journal transaction has two equal and opposite postings in one currency. Issuance debits the special issuance account and credits the central bank, burning reverses that flow, and transfers move existing funds between ordinary accounts. The bank can burn only its own available balance. Treasury spending requires its own policy. Ordinary balances cannot be negative. Transfer totals never change supply.

Migration `0013_awesome_outlaw_kid.sql` adds ten monetary tables, restrictive foreign keys, unique/check constraints and integrity triggers. Posting insertion updates account balances in the same PostgreSQL transaction. Deferred constraints require balanced journals and reconcile account balances with immutable postings and supply with ordinary/issuance accounts. Composite foreign keys reject cross-currency postings. Migration `0014_monetary_supply_integrity.sql` additionally reconciles supply on every inserted journal, including an erroneous writer that omits the currency-row update. Committed journals/postings cannot be updated, deleted or extended later. Correction requires a compensating journal, rather than rewriting history; no general privileged correction API is exposed.

## Concurrency and limits

V1 deliberately acquires the existing platform authorization advisory lock before monetary command/read locks. This serializes monetary commands across this deployment and orders them consistently with account-role/status mutations. State and currency row locks protect authority revisions, bank state, policy, rolling issuance and balances. This favors a clear integrity boundary over maximum throughput; future scaling can narrow monetary locks only with equivalent concurrency tests. Other users' money cannot be spent by supplying a different source account: the server derives every source from the authenticated actor or approved directive kind.

An approved policy explicitly enables or disables three ceilings: current supply, gross issuance during the preceding 30 × 24 hours, and one issuance. No approved policy means no issuance. Burning never subtracts from gross issuance. Antares returns the actual rolling gross, remaining aggregate capacity and maximum available single issuance using the same policy arithmetic. Aggregate gross can exceed the thirty-digit supply ceiling after burning and reissuing; it remains an exact integer string. The policy screen shows these values, revision numbers and paginated immutable history. The locked currency transaction checks all enabled limits together and rolls back the entire directive, accounts and postings on failure.

A unique creator/key constraint binds a directive to its canonical payload and state. A wallet transaction similarly binds actor/key to the complete command. Identical retries return the original result; changed payloads conflict. Applying a directive again returns its completed result without another journal; concurrent execution cannot duplicate posting.

Monetary HTTP mutations additionally use the platform rate limiter: 300 authenticated mutations per actor in a 15-minute window per API process. Reads are excluded. This technical protection is independent of state monetary ceilings. A deployment with multiple API processes must share this limiter or enforce an equivalent gateway limit.

## REST and screens

- `/api/v1/account/states/:stateId/monetary` reads protected institution, policy, accounts, directives and bank/treasury history.
- `/account/states/:stateId/monetary/directives` submits; `/account/monetary/directives/:id` reads; `/approve/:officeId`, `/revoke/:officeId`, `/apply` and `/cancel` record decisions.
- `/account/wallet` reads the caller's per-currency wallets and journal; `/account/wallet/transfers` submits a confirmed idempotent personal transfer.
- `/account/votings/:id/monetary-directive` exposes the immutable proposal to its frozen voters or authorized state administrators.
- `/admin/central-banks` lists applications/status history; `/:id/review` records ratification, rejection, suspension or restoration. `/admin/monetary/directives` supplies pending state decisions for configured manual review.
- `/public/currencies` and `/public/currencies/:code` allowlist currency/bank identity, supply, approved policy and issuance/burning history. They omit balances, private transfer purposes, administrative reasons and protected state data. Inactive states retain historical currency information with state name/slug withheld.

Vega state management adds bank, currency, monetary policy, issuance, bank finances and treasury sections. Account `/app/wallet` supports player search, a separate confirmation, success receipt with transaction UUID and transaction details. State commands likewise show the directive UUID and resulting journal UUID after execution. Administration adds `/admin/central-banks` and `/admin/monetary-directives`. Public `/currencies` and `/currencies/:code` render content/metadata through SSR with cookies omitted. Private account/admin routes remain CSR and API responses remain no-store.

All institution/currency display text uses normalized Localized Content and existing `LocalizableTextInput`. Complex terms use Atria FieldHelp. Atria MoneyAmount is a presentation primitive with Storybook states and exact formatting/parsing tests; it never converts amounts to floating point. Page composition and business rules remain in Vega and Antares respectively.

## Verification and future integration

`monetary.test.ts` covers exact boundaries, independent enabled limits and canonical hashes. The real PostgreSQL scenario covers adding authority through a reform, ratification, national currency uniqueness, policy, issuance into the bank, treasury spending, personal transfers, concurrent spending/issuance, retries, gross limits after burning, rollback, immutable SQL history, suspension and office succession. Its governance scenario covers combined approvals/votes, uninterrupted signatures, stale Governance and monetary-policy revisions, manual procedure and concurrent apply. A separate upgrade scenario starts with the old immutable policy schema, migrates its history and publishes the next numbered revision. HTTP tests check the actor rate limit independently of financial ceilings. Playwright exercises the real web lifecycle in development and production, public HTML without JavaScript and desktop/mobile screens.

Minecraft integrations may later submit authenticated REST commands and physical-infrastructure observations. Antares must continue to decide institutional capabilities, authority and accounting. No public game-action simulator, plugin change, physical building assertion, Vault dependency or direct database access is introduced.

[Verification report](monetary-verification.md).
