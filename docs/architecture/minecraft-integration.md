[Русский](minecraft-integration_RU.md) | [Architecture](README.md)

# Minecraft Integration V1

Repository implementation of the Minecraft identity foundation. Dated execution results and remaining acceptance work belong in [verification](../verification/minecraft-integration-2026-10-25.md). [Development](../development/minecraft-plugins.md) describes the isolated runtime; [player authentication](../development/minecraft-authentication.md) explains the user journey.

## Ownership and identity

Minecraft is a game client of an existing Antares account. There is no independent Minecraft registration, account-linking requirement, password database or LimboAuth runtime. Antares assigns UUID v4 once at registration; PostgreSQL prevents UUID updates. That exact UUID becomes the Velocity GameProfile ID and reaches Paper through modern forwarding. Never admit an interim UUID and repair it later.

The existing account username already satisfies Minecraft's 3–16 ASCII letter/digit/underscore format. Lowercase normalization and a database unique constraint prevent case aliases and Unicode ambiguity. The canonical spelling comes from Antares. A password-confirmed rename retains UUID, records history and invalidates Minecraft admission. No extra Minecraft name field is needed.

Antares owns account status, authorization, citizenship and all political/economic state. Deneb owns verified facts about physical play and derives no authority from a name or preset. Citizenship lists contain only current memberships, exclude historical founder affiliations after departure, and may contain multiple states. They do not describe player location. The separate [Spatial domain](spatial.md) implements ratified state territory and the Deneb JTS cache; physical jurisdiction is independent of citizenship. Private claims, physical-institution evidence, Vault economy and World Engine remain future work.

## Connection and authentication lifecycle

1. Rigel handles `PreLoginEvent` asynchronously. A scoped service call resolves the normalized name, checks ACTIVE account and creates a connection UUID plus a challenge. Lookup establishes identity, not ownership. Unknown names receive a registration URL; errors never fall back to offline UUIDs.
2. LimboAPI runs Rigel's pre-limbo `GameProfileRequestEvent` handler before constructing the waiting player. Rigel sets both account UUID and canonical name, discarding client profile properties. `rigel` must be in `main.pre-limbo-profile-request-plugins`.
3. `LoginLimboRegisterEvent` adds a callback that spawns an isolated virtual lobby. The client sees configured server branding, a clickable one-time Vega confirmation link, a fallback random code and a 120-second deadline. No Paper server is involved.
4. The owner follows the link from their own Minecraft client, signs into Vega if needed, reviews the connection details and explicitly approves or rejects. The fragment supplies the same possession code without retyping; manual entry remains available. A link or username without the owner web session is insufficient. A different account cannot list or approve this challenge. Rejection does not require knowing the code.
5. Rigel polls with its verifier and connection ID. Approval is atomically consumed once under account/challenge locks. Antares rechecks ACTIVE status, unchanged name, TTL, proxy binding and the approving browser session, including revocation and both expiries. It creates one short-lived backend admission.
6. Only after consumption does Rigel leave limbo. Limbo re-fires the profile event with the same authoritative UUID. `LoginEvent` checks local admission; each `ServerPreConnectEvent` denies by default, verifies the target backend and refreshes admission through Antares before allowing it. Forced hosts, `/server` and transfers pass through the same gate.
7. Deneb's explicitly asynchronous pre-login event checks the exact forwarded UUID/name against active admission before gameplay/playerdata. Join attests actual Paper presence, reads localized profile/citizenships and sends a welcome. `/heli`, `/heli status` and `/heli profile` expose this verified information.
8. Proxy disconnect or Paper quit closes the exact session ID idempotently. Each complete reconnect needs a fresh challenge. There is no remembered trust by IP.

States are `WAITING_AUTH → APPROVED → CONSUMED`, with terminal `REJECTED`, `EXPIRED` or `DISCONNECTED`. Admission is distinct from actual online presence. Late approval after disconnect cannot revive a closed Rigel attempt. One account cannot have multiple pending/admitted connections; conflicting attempts fail rather than silently evicting the owner.

## Secrets, browser and service boundaries

A challenge has a random UUID, account/name snapshot, proxy/connection IDs, creation/expiry/poll times, attempt count and optional approving web-session reference. Verifiers have 32 cryptographically random bytes; client codes have 8 random bytes rendered as 16 hex characters. Only SHA-256 hashes are stored. Code comparison is constant-time, at most five incorrect attempts are allowed, creation/decisions have bounded rate limits, and a challenge without a proxy poll for 15 seconds becomes unusable. A challenge is never a permanent access token.

Vega uses existing HttpOnly, SameSite browser sessions and exact-Origin/Fetch Metadata mutation checks. Protected Minecraft data is CSR-only, `no-store`, absent from public profiles/loaders, sitemaps and service-worker caches. The account view returns only the owner's UUID/name, pending attempts, current lease, last successful join and the latest 20 private events. Pending attempts additionally expose the owner-only connection IP/port, protocol version and optional approximate GeoIP location. It exposes no verifier, raw possession code, code hash or service credentials.

`MINECRAFT_SERVICE_ACTORS` defines distinct RIGEL and DENEB actors with backend binding and private bearer tokens. RIGEL may create/inspect/consume only its own connection challenges and maintain its sessions. DENEB may inspect admission/profile and attest/heartbeat/close sessions for its backend. Neither actor gets web administration, credentials, finance or direct persistence access. Cookie-bearing internal requests are rejected. The CSRF exemption applies only to the exact internal Minecraft namespace, which always requires service authentication; bearer tokens do not bypass ordinary browser CSRF.

The Java client has bounded connect/request timeouts, no redirects, minimal DTOs and sanitized errors. Remote origins require HTTPS; HTTP is accepted only for localhost/loopback or the `antares` container hostname. Keep the test network private; use TLS or an encrypted network between hosts. Rotate credentials in environment and restart the affected service. Never log request bodies, passwords, codes, verifiers, bearer tokens or full command arguments. Failed service authentication/role checks return generic errors without revealing private data; challenge decisions/transitions append safe account audit evidence.

Password `/login` is deliberately unavailable in V1. Its arguments can survive in client history or be intercepted by other plugins. Browser confirmation fully implements the identity flow without forwarding the account password through Minecraft. Do not install LimboAuth as a second account system.

## One-time links and connection details

The confirmation URL is `/app/minecraft#challenge=<UUID>&code=<code>`. Both identifiers are bound to the existing challenge; the code is the same hashed, short-lived possession proof used by manual entry. It is not a browser login token. A GET, link preview, login or page mount never approves a request. Only an explicit POST with the owner session, exact Origin and matching code can approve it. Wrong-account links expose no target metadata. Expiry, rejection, cancellation, one-time consumption and account/session revocation remain enforced by Antares.

The fragment is not sent in HTTP requests or Referer headers. The protected route strips it from the login `returnTo` query while preserving it as the login page fragment; successful login restores it to the protected page. An explicit decision clears it with replacement navigation. Do not log full links or copy fragments into query strings, SSR, analytics, storage or public loaders.

Rigel derives optional connection metadata from the actual `InboundConnection`, never an HTTP forwarding header: socket IP/port, numeric protocol and the versions supported by that protocol. The client protocol does not verify an OS, device, mod list or exact client build. Migration `0048_minecraft_connection_details.sql` adds nullable JSON metadata to challenges, leaving older attempts compatible. Only the scoped RIGEL creation endpoint accepts validated socket/protocol metadata; clients cannot submit their own GeoIP result. Pending details are returned only to the owner and are never public or evidence of ownership. Docker NAT, VPNs and proxies may obscure the original client IP.

Antares optionally reads a server-local City MMDB using `maxmind` (`GEOIP_DATABASE_PATH`). It makes no GeoIP HTTP requests. Local/private/reserved addresses are labelled without lookup. Country, localized city and time zone are approximate; missing, unmatched or unreadable databases yield an unavailable location without weakening admission. The database is operator-supplied, not downloaded or committed automatically. See [development setup](../development/minecraft-plugins.md#optional-local-geoip).

## Presence, events and recovery

Proxy and Paper each refresh a 45-second lease every ten seconds. An admission starts with an initial Paper lease deadline; proxy heartbeats cannot preserve a crashed or never-joined Paper indefinitely. `online` requires an actual join, no end timestamp and both live leases. Expiry closes stale sessions; the production scheduler and account reads perform cleanup. API outages reject new logins and disconnect existing players on failed heartbeat. Failed cleanup requests are covered by lease expiry. Server shutdown is not a reason to mint a new UUID or grant access.

`minecraft_events` records `MINECRAFT_SESSION_STARTED` only on actual Paper join and `MINECRAFT_SESSION_ENDED` only for a previously joined session. Events contain ID, stable actor/account UUID, session ID, trusted source, timestamp, schema version 1, PRIVATE visibility and an allowlisted reason. A unique session/type index prevents duplicates; a PostgreSQL trigger rejects update/delete. These are separate from editorial content and the earlier `world_events` wiring example. They provide a small future event boundary without an event bus.

Account rename/password change, suspension/ban, browser logout/revocation and administrative revocation invalidate corresponding pending approvals/admissions. Consumption and heartbeats independently recheck the browser session and status. Ambiguous consumption timeouts are never automatically retried into admission; reconnect waits for cleanup/expiry and requests a fresh challenge. No HTTP runs on a Velocity network event loop or a Paper movement/block event. Bukkit/player work is marshalled to the main thread; only the explicitly async pre-login event waits for a bounded request.

## REST contract and persistence

All routes have Zod/OpenAPI schemas and generated Alhena operations:

| Boundary        | Routes                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Owner browser   | `GET /api/v1/account/minecraft`, `POST /api/v1/account/minecraft/challenges/{id}/decision`                                  |
| Rigel challenge | `POST /api/v1/internal/minecraft/challenges`, `POST .../challenges/{id}/{status,consume,cancel}`                            |
| Rigel session   | `POST /api/v1/internal/minecraft/rigel/{heartbeat,close}`                                                                   |
| Deneb           | `POST /api/v1/internal/minecraft/paper/{admission,profile}`, `POST /api/v1/internal/minecraft/deneb/{join,heartbeat,close}` |

Migration `0044_uneven_annihilus.sql` adds `minecraft_challenges`, `minecraft_sessions` and `minecraft_events`, foreign keys, state/attempt checks, one open session per account and immutable events. It does not rewrite existing accounts, monetary data or worlds. Review and apply migrations, never schema-push a live database. Test databases/worlds are disposable and isolated.

## Runtime and dependency decisions

Velocity is pinned at 4.2.0 build 30, Paper at 26.3 build 223, Java at 25 and Gradle at 9.1.0. LimboAPI is pinned by source commit, version and SHA-256 in `infra/minecraft/limboapi.properties`. Rigel compiles against its MIT API but does not shade the AGPL-3.0 runtime. The separately downloaded runtime retains upstream license/source obligations; no upstream internals are copied. A mutable upstream `dev-build` URL is protected by mandatory checksum validation: replacement fails and requires a reviewed new pin. The initial research and sources are in the [implementation plan](../history/2026-10-25-minecraft-integration-plan.md).

Modern forwarding uses a private generated secret, Paper `online-mode=false`, enabled Velocity forwarding and a matching proxy online-mode setting. The isolated Compose stack publishes only loopback web/proxy ports, never Paper, PostgreSQL or storage. Forwarding authentication supplements network isolation. The native runtime test binds Paper to loopback and verifies direct login denial.

The test-only maintained MCProtocolLib 26.3 codec drives native Minecraft 26.3/protocol 777 login/configuration/play traffic and modern forwarding. No ViaVersion/ViaBackwards is installed by the current harness or Compose. The old translation lock is historical reference only. Human graphical-client acceptance remains separately recorded in the [territories verification](../verification/territories-2026-10-25.md).

## Language preference

On successful explicit browser approval, Vega supplies its selected site locale. Migration `0047_minecraft_approval_locale.sql` stores this nullable preference on the exact approved challenge; a wrong code or rejected request cannot store it. The admitted session links to that challenge. The scoped profile response resolves the approved site language first, then the Minecraft client language, then English for unsupported client languages. Deneb uses this verified result for welcome, profile and territory notifications and waits for the verified profile before announcing initial jurisdiction. Changing the site language takes effect at the next explicit game approval. Identity, one-time consumption, Origin and lease checks are unchanged.
