# Nickname operators

The root `ops.json` is a JSON array of objects with a `name` field. The initial entry is `ms0ur`. Operators receive effective ADMIN in addition to stored roles. Matching is case-insensitive and uses the current account nickname, as explicitly requested; no UUID operator rule is used. Removal from the file or renaming away removes the operator-derived role while preserving separately assigned roles.

Antares reads the small local policy at every session/authorization boundary, so edits apply immediately. `OPS_FILE` can supply another server-side path. The default resolves the root file from either repository-root or Antares working directories. Docker includes a copy and Compose mounts the root file read-only. Invalid entries fail closed. The file is never served through Vega or placed in client configuration.

Add existing registered accounts to the list. Operator nicknames are reserved against public registration and ordinary account renaming; this prevents another player claiming an operator name. An existing operator can change the case of their own nickname, or rename away. Passwords, session expiry/revocation, account status, immutable user UUIDs and existing OWNER boundaries continue to apply. Operator privilege does not bypass authentication or elevate to OWNER.

The effective role is used in session principals, fresh transactional mutation checks and administration list/detail/boundary logic. Stored role changes do not disable a role granted by `ops.json`; edit the operator policy to remove that grant. Refresh the website to update its cached navigation/principal after editing the file.
