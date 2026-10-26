[Русский](minecraft-sign-in-2026-10-26_RU.md) | [Verification](README.md)

# Minecraft confirmation links — 2026-10-26

Scope: working tree based on `3feabab`; one-time Minecraft confirmation links, owner-private connection details and optional local GeoIP. No production deployment or changes to user worlds/databases were performed. The persistent Compose test project was left stopped.

Current contracts: [architecture](../architecture/minecraft-integration.md#one-time-links-and-connection-details), [player guide](../development/minecraft-authentication.md), [optional GeoIP setup](../development/minecraft-plugins.md#optional-local-geoip).

## Executed checks

| Check                                                                | Result                                                                                                                                              |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run build:ts`, `bun run typecheck`                              | Passed, TS7 and generated SDK                                                                                                                       |
| `bun run lint`, `bun run format:check`, `git diff --check`           | Passed                                                                                                                                              |
| `bun run test:unit`                                                  | 229 passed across the four workspaces                                                                                                               |
| `bun run test:minecraft:contracts`                                   | 16 passed on disposable PostGIS, including new fragment/metadata/ownership cases                                                                    |
| Gradle `:minecraft-client:build :rigel:build :deneb:build`           | Passed, including JUnit, Checkstyle, Spotless and compiler warnings as errors                                                                       |
| Root/dev/stand, per-app and isolated Minecraft Compose configuration | Passed `config --quiet`                                                                                                                             |
| Native Minecraft runtime after the test correction below             | Passed on fresh isolated PostGIS, real Velocity/Limbo/Paper 26.3 and production Vega with Chromium                                                  |
| Actual MMDB reader                                                   | Official MaxMind City test database read from `/tmp`: `81.2.69.160` resolved to GB, London/Лондон, Europe/London; no real player IP sent externally |

The native harness received the actual clickable URL from the game packet. It first verified wrong manual-code rejection, removed only the browser auth cookie, opened the link, verified the code stayed out of the login query, signed in through the real form and reviewed the IP/protocol page. No game session existed before the explicit confirmation button. Confirmation cleared the fragment and admitted the same account UUID to Paper. Manual rejection/reconnect, API outage, lease expiry, restarts, invalid forwarding, unavailable Paper, stale service tokens, forced-host rejection and recovery also passed. The full existing territorial/squaremap/browser scenarios passed; there were no page errors.

Private connection details are owner-only and `no-store`. Missing proof, another account's cookie and repeated approval/consumption cannot grant access. Client-provided location fields are rejected. Unit checks cover private, local and IPv4-mapped addresses and absent/unreadable GeoIP files. Migration `0048_minecraft_connection_details.sql` was reviewed (one nullable JSONB column) and applied by the fresh runtime migration chain; no schema push was used.

## Evidence and limits

Successful directory: `/tmp/helicraft-minecraft-v1-PK1egZ`; first attempt: `/tmp/helicraft-minecraft-v1-oomKpn`. The first `test:minecraft` built all sources but stopped at an English login-label assertion because the test cleared the language cookie along with authentication. The test now removes only `helicraft_session`. A full rerun using `bun --no-env-file apps/antares/tests/minecraft-runtime.ts` passed against the freshly built artifacts. The first failure is not counted as a successful native run.

The [exact runtime result](assets/minecraft-sign-in-2026-10-26/runtime-result.json) and [confirmation screenshot](assets/minecraft-sign-in-2026-10-26/confirmation.png) are retained in the repository. The screenshot was visually inspected. Remaining `/tmp` logs/configuration are local and may contain private test credentials; do not publish those directories wholesale.

GeoIP was verified with the [official sample MMDB](https://github.com/maxmind/MaxMind-DB/tree/main/test-data), not an installed production GeoLite database. Operators must supply their own compatible licensed City database; absent data is shown as unavailable. Human graphical Minecraft acceptance and production deployment were not performed. Password commands were not added.
