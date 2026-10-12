[Русский](README_RU.md) | [HeliCraft](../../README.md)

# Atria

**Give all HeliCraft interfaces one visual and interaction language.**

React · TypeScript · SCSS Modules · Base UI · Storybook

A private source-exporting UI package shared by Vega and future Altair. `Button` composes the accessible Base UI primitive with primary/quiet styles, disabled states and keyboard activation. All styles are written in SCSS: `components/Button/button.module.scss` scopes component classes, while `@helicraft/atria/styles.scss` provides shared color tokens and base styles. Vite compiles SCSS and SCSS Modules using the `sass` development dependency, with no extra plugin. React remains a peer dependency.

```sh
bun run dev:atria
bun run build:atria
bun run test:atria
bun run storybook
bun run build:storybook
```

Storybook at localhost:6006 has primary, quiet and disabled stories, docs and accessibility checks. Vitest/Testing Library verifies keyboard and disabled behavior. Import components from `@helicraft/atria` and styles from `@helicraft/atria/styles.scss`. `dist/` contains ESM and declarations; workspace consumers intentionally resolve source for Vite HMR. Atria has no production service or Compose: it is part of each consumer bundle. Future primitives: forms, dialogs, tables, status feedback and animation rules.

From the root: `bun run lint` and `bun run format:check`. Rules and exceptions: [quality setup](../../docs/setup-research.md).

## Name

α Trianguli Australis, in the constellation Triangulum Australe. [IAU star-name catalogue](https://iauarchive.eso.org/public/themes/naming_stars/).

## Web foundation UI

Shared tokens cover warm surfaces, text, primary/accent, feedback, focus, spacing/radii and motion. The host loads local Onest and IBM Plex Mono. Components use SCSS Modules, keyboard interaction, labelled fields and reduced motion. Storybook demonstrates form, feedback, Markdown and overlay states; unit tests exercise passwords, avatar fallback and dialog Escape.

`Button`, `IconButton`, `TextField`, `PasswordField`, `FormField`, `Textarea`, `Select`, `Checkbox`, `Card`, `Badge`, `Alert`, `ToastProvider`/`useToast`, `Dialog`, `DropdownMenu`, `Tabs`, `Tooltip`, `Skeleton`, `Spinner`, `EmptyState`, `Avatar`, `MinecraftAvatar`, `Table`, `Pagination`, `Breadcrumbs`, `MarkdownContent`, `PageContainer`.

MarkdownContent accepts only Antares-sanitized HTML. MinecraftAvatar accepts a head image URL, never a full texture. Keep application business logic outside Atria.

## Gallery foundation

Public `/gallery` and `/gallery/:id` use SSR; `/app/gallery/new` uses existing sessions and CSR. Gallery flows through Alhena to a separate Antares private S3/PostgreSQL domain. [Gallery architecture](../../docs/architecture/gallery.md). Atria adds StateCard, GalleryTile, PhotoCarousel and ActionLink; each component has its own `src/components` folder.

`CompanyCard` presents a company image, decorative logo, sector, description and labelled facts in the same layout as `StateCard`. All text is supplied by the host; it does not fetch or invent company data. Storybook includes default, long-name and English examples.

`FileDropzone` provides a keyboard-accessible file chooser and drag-and-drop target, showing the selected filename and a disabled state. The host owns file type/size validation, preview URLs and upload requests. It accepts one file at a time. Storybook includes empty, selected, disabled and English states.
