[Русский](2026-10-25-minecraft-integration-plan_RU.md) | [Documentation](../README.md)

# Minecraft Integration V1 implementation plan

Historical plan recorded before implementation on 2026-10-25. Subsequent implementation and results are in [verification](../verification/minecraft-integration-2026-10-25.md). Runtime acceptance remains separate from compilation.

## Existing components

Antares already owns immutable registration UUID v4, case-insensitive ASCII usernames (`[A-Za-z0-9_]{3,16}`), Argon2id credentials, revocable opaque browser sessions, exact-origin CSRF protection, account suspension, private audit and localized citizenship read models. Vega has protected CSR routes, Alhena and Atria. Java 25 plugins share Gradle 9.1.0, JUnit 5, Checkstyle and Spotless. Server locks pin Velocity 4.2.0 build 30 and Paper 26.2 build 129 with SHA-256. No second identity table or Minecraft registration is needed.

## Implementation sequence

1. Add a Minecraft domain in Antares: short-lived connection-bound challenges, one-time atomic approval/consumption, isolated service actors, leased game sessions and immutable private domain events. Reuse account UUID and username. Store verifier/code hashes only. Browser approval requires the owning active web session plus explicit entry of the code shown in Minecraft. Recheck that session at consumption; invalidate on rename, credential/status changes and revocation.
2. Integrate Rigel with a pinned LimboAPI artifact. Resolve identity during `PreLoginEvent`; set the authoritative profile during the pre-limbo `GameProfileRequestEvent`; register the isolated lobby in `LoginLimboRegisterEvent`; poll asynchronously, consume approval and leave limbo; verify admission in `LoginEvent` and every `ServerPreConnectEvent`; clean up in disconnect/shutdown. Never send an interim UUID to Paper. Reject all errors and unknown backends.
3. Deneb validates the active admission before gameplay, reads the minimal profile/citizenships asynchronously, welcomes the player and implements `/heli`, `/heli status`, `/heli profile`. Network callbacks return to the Paper thread before using player APIs. Deneb attests real joins and heartbeats; proxy disconnect/Paper quit/expiry close presence idempotently.
4. Add a protected Vega Minecraft page for pending challenges, explicit code approval/rejection, identity and recent private activity. Use generated Alhena, existing session conventions and Atria controls; no public loader or service-worker cache receives this data.
5. Add disposable test infrastructure with dedicated PostgreSQL, runtime directories/worlds, loopback proxy and network-isolated modern-forwarding Paper. Root scripts build fresh JARs, install them, start/stop/log/clean the test environment, and accept test EULA under the owner's explicit authorization.
6. Run real PostgreSQL contract/security tests, JUnit unit/HTTP tests, Vega browser tests, strict TS/Java quality gates, Compose validation and real server startup. Investigate an existing protocol client; report unsupported protocols honestly and retain reproducible manual acceptance criteria.

## Lobby and compatibility

LimboAPI API is MIT; its separately installed runtime is AGPL-3.0. Do not copy its internals or bundle its runtime in Rigel. Candidate: `1.1.27-SNAPSHOT`, source commit `bfef5799f21d73a80155035c3430f6654aa6b9f8`, artifact SHA-256 `5d541984b90ca7a88eb49ca5f8cc3a803f5ecdfa6d7ed30b605b72ff94156e40`. The upstream build declares Velocity 4.1.2-SNAPSHOT and Minecraft 26.3; this alone does not establish compatibility. Initial real Velocity 4.2.0 startup loaded it successfully. Client/lobby/backend-transition checks remain required. LimboAuth is reference only; do not install its independent registration/password database. `/login <password>` is deferred unless command isolation and secret-free logging can be demonstrated.

If LimboAPI cannot safely support this runtime, use the explicitly authorized disconnect/browser/reconnect fallback with a one-time possession proof on reconnect; approval by username or IP alone is forbidden. Never implement a custom protocol stack or open Paper lobby.

## Failure recovery

Use bounded HTTP timeouts, one outstanding poll per connection and no automatic admission retry after ambiguous consumption. Disconnect on backend errors; reconnect creates a fresh challenge. Cancel pending challenges on disconnect. Browser rejection, expiry, session revocation and account changes fail closed. Lease expiry closes crashed proxy/Paper presence without permanent online status. Cleanup targets only the named disposable project/directories, never user databases or worlds. Credentials rotate through environment configuration and process restart. All secret-bearing bodies stay out of logs and audit.

## Sources

- [LimboAPI](https://github.com/Elytrium/LimboAPI), [pinned source](https://github.com/Elytrium/LimboAPI/tree/bfef5799f21d73a80155035c3430f6654aa6b9f8), [API license](https://github.com/Elytrium/LimboAPI/blob/bfef5799f21d73a80155035c3430f6654aa6b9f8/api/LICENSE).
- [LimboAuth reference](https://github.com/Elytrium/LimboAuth).
- [Velocity events](https://docs.papermc.io/velocity/dev/event-api/), [modern forwarding](https://docs.papermc.io/velocity/player-information-forwarding/), [backend isolation](https://docs.papermc.io/velocity/security/).
- [Protocol client](https://github.com/PrismarineJS/node-minecraft-protocol), [MockBukkit](https://github.com/MockBukkit/MockBukkit).
