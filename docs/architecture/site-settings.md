[Repository](../../README.md) | [Workspaces](../design/workspaces.md)

# Server identity settings

Antares owns the singleton `site_settings` record. `/admin/settings` permits current ADMIN/OWNER users with `site.manage` to change the display name, Minecraft host/IP (with an optional port), HTTPS GitHub URL and logo. Writes recheck current authorization under the platform mutation lock and append an audit event. Other administrative roles have no settings authority.

`GET /api/v1/public/site` is the single public source of server identity. Vega reads it without credentials for SSR and provides its values to the application shell. Use `useSiteBranding().serverName` in components, `{serverName}` in UI translation strings, and the loader's `site.serverName` for metadata. Never hardcode a server display name in a screen, translated message or metadata. The initial default is HeliCraft; package identifiers, cookie names, infrastructure names and historical player-authored content are not server display strings and retain their identities. Server names are proper names and are not automatically translated.

The saved Minecraft address overrides the environment default. It is public only when `SITE_PHASE=OPEN`. A blank GitHub URL hides the link; a saved URL must use HTTPS and github.com. `SITE_ORIGIN`, authentication, secrets and infrastructure endpoints remain deployment settings, not editable public branding.

Logos accept static PNG/JPEG/WebP, at most 2 MiB and 4,194,304 decoded pixels. Antares decodes and reencodes to PNG, strips input metadata and fits the artwork into a transparent 512×512 square. Only Antares accesses private S3. An object is written and read back before the current pointer changes; failed storage preserves the previous logo. Public clients use `/api/v1/public/site/logo.png` with a version query. Reset restores the bundled default logo. Uploaded objects have immutable UUID keys; orphan cleanup remains a storage maintenance concern.

The same public identity supplies the HTML favicon and the dynamic `/manifest.webmanifest` (proxied to Antares), including the installed application name and icon. Branding and the manifest are never service-worker data caches.

Migration `0018_dazzling_bushwacker.sql` adds the singleton without changing published governance or identity records. Apply through the ordinary migration runner against `helicraft`; never use schema push.
