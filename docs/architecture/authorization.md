[Русский](authorization_RU.md) | [Repository](../../README.md)

# Authorization and administration

Roles and permissions are separate. PLAYER has account actions only; EDITOR has content.read/write/publish; MODERATOR has users.read/status.manage/sessions.revoke; ADMIN and OWNER add users.roles.manage and audit.read. Permissions are composed for multi-role users. Hiding UI is convenience; every API action enforces permissions. Authentication never relies on long-lived role claims.

Administrative mutations acquire one PostgreSQL transaction advisory lock and reload the actor's ACTIVE status and roles. Content writes take that authorization lock before the editorial lock. This serializes privilege changes with protected writes. ADMIN cannot manage ADMIN/OWNER identities or assign OWNER; only OWNER can manage that boundary. MODERATOR cannot act on peers or higher-ranked users. Transactions ensure at least one ACTIVE OWNER survives concurrent demotion, suspension or ban. Role/status changes and session revocations append audit rows with actor, target, action and safe metadata. PostgreSQL rejects audit/history/revision UPDATE and DELETE. Never record password/token/CSRF values.

The first OWNER is deliberately provisioned by CLI: register a real user, copy its UUID, then run `bun run admin:bootstrap-owner <UUID> --confirm <same UUID>` from the root. Read the script's usage output for flags. The command targets database helicraft, requires an active existing user, is idempotent for that user, and refuses creating another bootstrap owner once one exists. It neither creates default passwords nor exposes a public promotion endpoint. Subsequent roles are assigned by an OWNER through administration.

Admin screens show actual counts allowed by the viewer's permissions, paginated users with name/UUID/status/role filters, user details and name history, session revocation, role/status forms, and audit filters. There are no fabricated dashboard metrics. This foundation has global platform roles; future state/city offices require separate domain permissions.
