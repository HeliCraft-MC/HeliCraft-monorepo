[Русский](minecraft-authentication_RU.md) | [Development](minecraft-plugins.md)

# Signing into Minecraft

Minecraft uses your existing website account. Register through Vega, then use that account's username in your Minecraft client. There is no second registration or mandatory `/link`. Your permanent account UUID is also your game UUID; renaming your account does not replace inventory identity.

Connect to the address published by the site's administrator. The isolated development stack uses `127.0.0.1:25575` and [Vega](http://localhost:8096). An unknown name receives a registration URL and never enters the Paper game world. A known name is only an identity lookup, not proof that the connecting person owns the account.

The waiting space displays the configured server name, a clickable confirmation link and a fallback 16-character code. Open the link from **your own game client**, sign into **your own account** in Vega if needed, and review the account, time, connection IP/port, Minecraft protocol version and optional approximate location. Press **Confirm Minecraft sign-in** only for a connection you started. The link carries the code: you do not need to retype it. Opening a link or signing into the website does not approve anything. Never open links or enter codes sent by another person. You can still open `/app/minecraft` and enter the code manually; rejection requires no code.

A request expires after 120 seconds, becomes unusable when disconnected or when the proxy stops polling, and can be consumed once for its original connection. Wrong-code attempts are limited. If it expires, is rejected or a service fails, reconnect for a fresh code. Another simultaneous connection cannot reuse it. Each full reconnect requires new confirmation; matching IP addresses do not grant trust.

The sign-in page prioritizes the current request and its remaining time. The account identifier, detailed connection information and private activity use labelled disclosures. Approval and rejection lead to separate result screens; an empty page explains how to start from Minecraft. The waiting space uses the same visual hierarchy, with a clickable link, a copyable code and a live countdown.

After approval, Rigel admits the exact connection through modern forwarding and Deneb checks its UUID before gameplay. `/heli` shows server information, `/heli status` confirms infrastructure admission and `/heli profile` shows your UUID and actual citizenships (or a neutral message). Several citizenships are shown together and do not mean you are physically in those states.

Your protected Minecraft page shows identity, presence, last successful connection and recent private start/end activity. Connection details are private to the account owner. GeoIP is approximate and may be unavailable; the IP observed by Rigel can belong to a VPN, proxy or Docker gateway. Protocol information is client-reported, not a verified device identity. IPs and service credentials are not public. Disconnect closes presence. A crashed proxy or Paper loses its 45-second lease; stale sessions become offline. Site logout/revocation, rename, password change, suspension or ban invalidates game access. If the API/site is unavailable, new authorization cannot finish; existing sessions close on heartbeat failure. Restore the service and reconnect rather than changing UUID or playerdata.

Password `/login <password>` is unavailable in V1. Minecraft command history and other plugins can expose its arguments. Use browser confirmation; your website password is never sent to Deneb or stored by Rigel. Official-account linking, premium auto-login, MFA and Altair are future work.

For developers: [architecture and REST contracts](../architecture/minecraft-integration.md), [reproducible tests and native-client checklist](minecraft-plugins.md), [dated evidence](../verification/minecraft-integration-2026-10-25.md). This guide describes repository behavior, not a claim that a public production server is deployed.
