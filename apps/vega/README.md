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

For API data, start Antares separately or use `bun run dev`. `bun run dev:vega` prepares and watches Atria/Alhena and starts Storybook. Production: `docker compose --env-file .env -f apps/vega/compose.yml up -d --build` from the root (starts Antares and persistence too). Routes and generated `routeTree.gen.ts` are in `src/`; add routes there. The planned features include the world map, state management, laws, votes, markets, history, notifications; account security is implemented.

From the root: `bun run lint` and `bun run format:check`. Rules and exceptions: [quality setup](../../docs/development/setup-research.md).

## Name

α Lyrae, in the constellation Lyra. [IAU star-name catalogue](https://iauarchive.eso.org/public/themes/naming_stars/).

## Foundation routes

`/`, `/world`, `/rules`, `/start`, `/chronicle`, `/chronicle/:slug`, `/pages/:slug`, `/login`, `/register`, `/app`, `/app/settings/{profile,security,skin}`, `/admin`, `/admin/{pages,chronicle,users,audit}`.

[Rendering](../../docs/architecture/web-rendering.md) · [Identity](../../docs/architecture/identity.md) · [Design](../../docs/design/landing-page.md)

Before Compose set SITE_ORIGIN to the browser origin (locally http://localhost:8080); HTTPS requires SECURE_COOKIES=true.

## Gallery foundation

Public `/gallery` and `/gallery/:id` use SSR; `/app/gallery/new` uses existing sessions and CSR. Gallery flows through Alhena to a separate Antares private S3/PostgreSQL domain. [Gallery architecture](../../docs/architecture/gallery.md). Atria adds StateCard, GalleryTile, PhotoCarousel and ActionLink; each component has its own `src/components` folder.

Interface translations live in `src/locales/ru.ts` and `src/locales/en.ts`, using semantic English keys (`navigation.gallery`). Add a complete dictionary and register it in `src/locales/index.ts`; CMS and gallery forms derive available languages from this registry. The source language is stored alongside optional per-language fields. Public captions and sanitized CMS bodies resolve each field in client-language → EN → original-language order. Switching uses client navigation without reloading the document or discarding form drafts. Public SSR uses `?lang=ru/en` URLs, language-specific canonical/hreflang links and translated metadata; the cookie keeps the preference across navigation.

## Monetary system V1

[Domain model, Governance, exact accounting, API, screens and verification](../../docs/economy/monetary.md).

Taxation and diplomacy reuse existing Governance/Voting and exact ledger accounting. See [Taxation](../../docs/economy/taxation.md) and [Diplomacy](../../docs/states/diplomacy.md).

## Minecraft Integration V1

[Architecture](../../docs/architecture/minecraft-integration.md) · [development and tests](../../docs/development/minecraft-plugins.md) · [player authentication](../../docs/development/minecraft-authentication.md) · [verification](../../docs/verification/minecraft-integration-2026-10-25.md). Antares owns identity/challenges/leases/events; protected Vega `/app/minecraft` confirms the code and shows private presence.
