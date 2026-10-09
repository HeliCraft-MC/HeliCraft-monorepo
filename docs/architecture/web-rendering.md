[Русский](web-rendering_RU.md) | [Repository](../../README.md)

# Web rendering

Vega uses TanStack Start with Vite, React 19 and a fresh router/query cache for every server request. Public `/`, `/world`, `/rules`, `/start`, `/chronicle` and `/pages/:slug` are rendered as HTML, then hydrated for navigation. Public loaders call Antares through Alhena in server functions with credentials omitted. Drafts and account data never enter public loaders. `/app` and `/admin` use browser rendering and fresh cookie authentication; login and registration have noindex metadata.

Production builds contain `dist/client` assets and `dist/server/server.js`. `infra/serve-vega.ts` runs the Start handler under Bun and proxies `/api` to Antares. The browser uses relative API URLs. The server overwrites any inbound nonce header, creates a random CSP nonce per HTML request, and gives the same nonce to Start's scripts. HTML and API responses use no-store; hashed static assets use immutable caching. Private and missing pages receive X-Robots-Tag. Public canonical/OG/Twitter metadata and JSON-LD use SITE_ORIGIN and actual publication dates/authors. `/robots.txt` and `/sitemap.xml` proxy the public Antares sitemap; only published CMS records are listed.

The manifest is produced by vite-plugin-pwa. A separate Bun build step runs Workbox generateSW against the client assets after Vite finishes. It precaches scripts, styles, fonts and app icons; there is no HTML navigation fallback, API runtime cache or private response caching. This is an installable application shell, not offline account access.

Development uses `bun run dev`; production uses Compose's Vega service. Set API_PROXY_TARGET only on the server. SITE_ORIGIN must match the browser origin exactly, without a trailing slash. Set SECURE_COOKIES=true with HTTPS. Local HTTP can use false. Root Playwright runs the actual dev server and built SSR server against disposable API persistence. Tests inspect the HTTP HTML, metadata, hydration, responsive layout, published content and production service worker. Public data currently loads per request; a distributed public-content cache is deliberately absent.

The root loader fetches public navigation without credentials, so configured community links and published CMS pages are already present in the footer HTML. Navigation fetch errors yield empty link collections, without exposing protected data.
