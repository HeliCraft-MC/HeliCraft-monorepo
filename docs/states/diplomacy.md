[Русский](diplomacy_RU.md) | [Repository](../../README.md) | [Taxation](../economy/taxation.md) | [Governance](governance.md)

# Bilateral diplomacy V1

The treaty domain is separate from the tax engine. Stable treaty identity, parties, immutable numbered revisions, localized text, content hashes, independent state decisions and activation history provide the foundation for future treaty types. V1 accepts only `TAX_TREATY`, exactly two distinct ACTIVE states, `PLAYER_TRANSFER` and an explicit national-claim category. Other treaty types and multilateral ratification are not exposed.

## Proposal and ratification

An authorized citizen creates a private state draft, chooses a partner and configures localized name, description, optional Markdown, structured tax terms, effective/expiry dates and bilateral termination. `SIGN_TREATY` is the existing Governance action for the first ratification; `AMEND_TREATY` is required for changing an active agreement. Missing authority denies drafting and submission as well as state approval. Administrative status authority cannot replace either state's diplomatic authority.

Saving/editing always appends a normalized immutable revision; the stable current-revision pointer changes. Submission sends exactly that revision to the partner. A party may suggest a revised draft; it never inherits earlier signatures. Both state directives bind the treaty ID, same revision UUID and canonical content hash. The current revision must still match at execution. Each party independently follows its own published office/council/citizen/combined/manual decision policy through the existing economic directives and generic Voting. Frozen voters can inspect exact treaty text and structured terms even after leaving current citizenship. Protected state-decision cards also include these exact terms for manual review without a vote.

A first applied ratification remains pending internationally. Before activation, the second side's execution rechecks the first decision's current Governance revision, uninterrupted unexpired creator/holder authority, approvals and successful frozen vote. Removed/reappointed holders do not revive earlier signatures. A changed Governance revision requires a new decision; the other state cannot approve on its behalf. Once both current ratifications exist, an immutable activation row publishes that revision. Later office changes do not retroactively undo a legitimately activated treaty.

An existing active revision remains in force while a new amendment is DRAFT, PROPOSED or REJECTED. Only independently ratified amendments replace it. Public DTOs expose activated revisions only; unratified draft histories and internal approval identities remain private.

## Scope and conflicts

Treaties act only on simultaneous national tax claims of both parties in the same supported event and category. `EXCLUSIVE` keeps each covered law of the named party and records the other party's exemption. `SHARED` replaces all covered laws of both states with one agreed percentage. Its first-party share is 0–10000 basis points; the second receives the remainder to 10000. The first receives floored minor units, and the second receives the indivisible remainder. Party ordering is immutable and visible throughout review.

Third-state laws, other categories, and events without both parties' claims remain unchanged. A treaty cannot independently tax an unrelated person or cause recursive taxation of treasury payments. Antares rejects activation of agreements sharing a party/category/event during overlapping effective windows. This is deliberately conservative V1 conflict prevention. The engine also rejects overlapping applications to the same national claim at calculation; it never chooses an arbitrary winner. Expiry is evaluated when reading/calculating, without rewriting immutable revisions or past settlements.

## Lifecycle and termination

Stored proposal states are DRAFT, PROPOSED, ACTIVE, REJECTED and TERMINATED; EXPIRED is derived from the active revision's expiry. Each state can reject an offered revision through its own decision procedure. Completed treaties are never deleted.

V1 uses the explicitly agreed BILATERAL termination rule. `DENOUNCE_TREATY` requests termination through a separate directive from each state, bound to the same active revision/hash. One side's request does not end the agreement. Completion revalidates both parties' live evidence before setting TERMINATED, retaining all revisions/ratifications and earlier tax calculations. Unilateral denunciation is not implemented or advertised.

## Integration

`/account/states/:stateId/treaties` creates drafts; PUT on a treaty appends a candidate revision and `/submit` offers it. State `diplomacy` reads expose relevant drafts, revisions, participant identity and independent decision status. Ratify/amend/reject/terminate use the shared immutable economic-directive API, approval, revocation, generic votes and reasoned manual review. Public treaty list/detail endpoints and Vega SSR show only ratified histories of publicly active states. Inactive participants are not used to leak private state configuration.

The tax engine consumes the separate active-treaty provider. Future trade, transit, borders or recognition can add typed treaty content and domain consumers while retaining the same revision and bilateral evidence model. The treaty scope supports explicit national-category correspondence and supported player/company transfer events. [Company regimes](../economy/taxation-settings.md) resolve national claims before treaty application. [FX](../economy/currency-exchange.md) is a separate paired event and does not dispatch ordinary transfer tax. Military and verified physical-territory behavior remain outside this implementation.
