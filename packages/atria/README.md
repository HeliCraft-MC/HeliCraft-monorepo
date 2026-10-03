[Русский](README_RU.md) | [HeliCraft](../../README.md)

# Atria

**Give all HeliCraft interfaces one visual and interaction language.**

React · TypeScript · Tailwind CSS 4 · Base UI · Storybook

A private source-exporting UI package shared by Vega and future Altair. `Button` composes the accessible Base UI primitive with primary/quiet styles, disabled states and keyboard activation. `@helicraft/atria/styles.css` imports Tailwind CSS 4, shared tokens and explicit library source scanning. Consumers use the Tailwind Vite plugin; React remains a peer dependency.

```sh
bun run dev:atria
bun run build:atria
bun run test:atria
bun run storybook
bun run build:storybook
```

Storybook at localhost:6006 has primary, quiet and disabled stories, docs and accessibility checks. Vitest/Testing Library verifies keyboard and disabled behavior. Import components from `@helicraft/atria` and styles from `@helicraft/atria/styles.css`. `dist/` contains ESM and declarations; workspace consumers intentionally resolve source for Vite HMR. Atria has no production service or Compose: it is part of each consumer bundle. Future primitives: forms, dialogs, tables, status feedback and animation rules.

From the root: `bun run lint` and `bun run format:check`. Rules and exceptions: [quality setup](../../docs/setup-research.md).

## Name

α Trianguli Australis, in the constellation Triangulum Australe. [IAU star-name catalogue](https://iauarchive.eso.org/public/themes/naming_stars/).
