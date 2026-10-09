[Русский](README_RU.md) | [HeliCraft](../../README.md)

# Vega

**See the world and manage your life in it.**

React 19 · TypeScript 7 · TanStack Start/Router/Query · Vite · Alhena · Atria · SCSS Modules · PWA

Vega renders public pages with SSR and `/app`/`admin` with CSR. Login, registration, profile/password/session/skin settings and administrative forms use generated Alhena. Public CMS pages and chronicle include SEO metadata; drafts and cookies never enter public SSR. The production Bun server runs Start and proxies the API. Service worker caches static assets only.

```sh
bun run dev:vega
bun run build:vega
bun run test:vega
bun run test:e2e
```

For API data, start Antares separately or use `bun run dev`. `bun run dev:vega` prepares and watches Atria/Alhena. Production: `docker compose --env-file .env -f apps/vega/compose.yml up -d --build` from the root (starts Antares and persistence too). Routes and generated `routeTree.gen.ts` are in `src/`; add routes there. The planned features include the world map, state management, laws, votes, markets, history, notifications; account security is implemented.

From the root: `bun run lint` and `bun run format:check`. Rules and exceptions: [quality setup](../../docs/setup-research.md).

## Name

α Lyrae, in the constellation Lyra. [IAU star-name catalogue](https://iauarchive.eso.org/public/themes/naming_stars/).

## Foundation routes

`/`, `/world`, `/rules`, `/start`, `/chronicle`, `/chronicle/:slug`, `/pages/:slug`, `/login`, `/register`, `/app`, `/app/settings/{profile,security,skin}`, `/admin`, `/admin/{pages,chronicle,users,audit}`.

[Rendering](../../docs/architecture/web-rendering.md) · [Identity](../../docs/architecture/identity.md) · [Design](../../docs/design/landing-page.md)

Before Compose set SITE_ORIGIN to the browser origin (locally http://localhost:8080); HTTPS requires SECURE_COOKIES=true.
