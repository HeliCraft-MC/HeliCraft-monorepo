[Русский](README_RU.md) | [HeliCraft](../../README.md)

# Vega

**See the world and manage your life in it.**

React 19 · TypeScript · Vite · TanStack Router/Query · Zod · Atria · PWA

The starter page uses file-based TanStack Router, a TanStack Query request with cancellation, Zod response validation and Atria. API URLs remain relative; Vite and the production Bun server proxy requests. PWA uses a manifest, 192/512 PNG app icons and a generated service worker. These primitive star icons are application icons, not the server logo. Only static assets are precached.

```sh
bun run dev:vega
bun run build:vega
bun run test:vega
bun run test:e2e
```

For API data, start Antares separately or use `bun run dev`. `bun run dev:vega` prepares and watches Atria/Alhena. Production: `docker compose --env-file .env -f apps/vega/compose.yml up -d --build` from the root (starts Antares and persistence too). Routes and generated `routeTree.gen.ts` are in `src/`; add routes there. The planned features include the world map, state management, laws, votes, markets, history, notifications and account security.

From the root: `bun run lint` and `bun run format:check`. Rules and exceptions: [quality setup](../../docs/setup-research.md).

## Name

α Lyrae, in the constellation Lyra. [IAU star-name catalogue](https://iauarchive.eso.org/public/themes/naming_stars/).
