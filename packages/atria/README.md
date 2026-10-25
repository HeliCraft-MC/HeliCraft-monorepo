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

Storybook at localhost:6006 has primary, quiet and disabled stories, docs and accessibility checks. Vitest/Testing Library verifies keyboard and disabled behavior. Import components from `@helicraft/atria` and styles from `@helicraft/atria/styles.scss`. `dist/` contains ESM and declarations; workspace consumers intentionally resolve source for Vite HMR. Atria has no production service or Compose: it is part of each consumer bundle. The maintained catalogue covers forms, dialogs, tables, identity, feedback and workspace patterns.

From the root: `bun run lint` and `bun run format:check`. Rules and exceptions: [quality setup](../../docs/development/setup-research.md).

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

`Dialog` supports an optional trigger or controlled `open` / `onOpenChange` props for asynchronous previews and confirmations. Supply `closeLabel` for the interface language. Keyboard dismissal and focus management remain provided by Base UI. Storybook includes triggered and controlled states. Use `size="fullscreen"` for document previews; the default size remains appropriate for confirmations.

`StateCard.flag` accepts either an image URL or host-supplied flag artwork (`ReactNode`). Artwork occupies the main visual area for real state directories; the host supplies its accessible name and domain data. Storybook includes `CustomFlagArtwork`.

`MarkdownEditor` provides a controlled visual/source Markdown editor with headings, emphasis, lists/indentation, quotes, undo/redo and host-supplied insertion snippets. It stores Markdown, initializes TipTap only on the client and leaves preview sanitization to Antares. Source input retains literal whitespace; Escape then Tab exits its indentation mode. Labels are host-localized. Storybook includes a visual/source document.

`PlayerNickname` pairs a decorative Minecraft head with readable text. The host supplies the head URL and optional size; a failed image retains the nickname and fallback. Vega's wrapper accepts UUID/name/skin revision and builds the public avatar URL. The component is also used by gallery tiles and carousel author captions. Storybook includes loaded, fallback and long-name states.

`PlayerNickname.href` renders an accessible link whose name contains only the nickname. Vega links to the immutable player UUID by default; use `linked={false}` in selection buttons and checkbox labels. Gallery tiles place the author link outside the image/title link, and `PhotoCarousel` accepts `authorHref`. Storybook includes `ProfileLink`.

## Monetary system V1

[Domain model, Governance, exact accounting, API, screens and verification](../../docs/economy/monetary.md).

`MarkdownEditor.preview` and `previewLabel` add an exclusive third view using host-supplied sanitized content. Switching does not reset Markdown. Buttons and primary ActionLink share `--radius-medium`; quiet underlined ActionLink uses square corners. Linked PlayerNickname and StateName enable hover/focus previews by default. FieldHelp opens on hover; click pins until another click, outside press or Escape. Use `showLabel` for standalone section explanations so the subject stays visible beside the icon.

## Forms and company identity

`Form` creates a TanStack Form instance from a typed `FormModel` (including subclasses), default values, a Standard Schema validator such as Zod and field descriptors. Pass `onSubmit`, the language catalog and localized labels; `submitLabel` adds the managed submit action. `className` controls the form layout. `FormSection` groups related fields. For dynamic arrays, conditional controls, uploads or autosave, `useFormModel` exposes the typed library instance, which can also be passed to `Form`. Validation checks original form values; schema output transformations are not applied.

A single form-level content-language control governs generated localized inputs and nested `LocalizableTextInput` fields. Missing translations stay empty and explicit translations survive switching. Standalone localized inputs keep the primary language visible and reveal translations together. Schema errors are associated with fields and summarized; failed submissions retain values. Storybook includes a model subclass, validation and narrow-layout examples.

`CompanyName` shares the direct-link and keyboard/hover preview behavior of `PlayerNickname` and `StateName`. Supply published names, a square logo URL or decorative color and public facts. Use `linked={false}` inside existing buttons/card links. Domain fetching remains in Vega.

## Workspace composition

`WorkspaceNavigation` takes translated `label`/`currentLabel` and ordinary link children. It displays persistent desktop links and a disclosure below 60rem. Pass only authorized links and mark the selected one with `aria-current="page"`. `WorkspaceContent` supplies the protected-screen spacing and overflow baseline; `PageHeader` aligns a title, description and actions. `ActionPanel` keeps form state mounted behind a labelled disclosure, and `StepNavigation` revisits controlled editor stages without submitting. Storybook includes long labels, mobile navigation, editor stages and action forms.

Use `Form autoFields={false}` with `FormFields` to place generated fields within a custom workflow. `languageSelectorVisible={false}` hides the selector without resetting the shared translation context. `Tabs.label` names a tab group; arrow keys move focus and Enter/Space select. Dialogs keep their labelled Lucide close button in the header while content scrolls.

`WorkspaceLayout accent` owns entity surface, border and readable action/focus colors. Put the sidebar and body inside it; `Dialog` inherits the theme through its portal. `WorkflowLayout` accepts controlled stage IDs, labels and optional groups, keeps natural content height, and collapses its stage navigation on small screens. The host owns draft persistence and validation.

Use `Form embedded` for generated fields inside an existing native form; it adds no nested form. `FormLanguageScope` shares one language switch across arbitrary nested localized editors without adding a form. Supply translated labels, hints and the platform language catalog.

## Storybook reference

The sidebar is organized into Introduction, Foundations, Actions, Forms, Navigation, Identity, Data display, Feedback, Overlays, Media and Patterns. Start with Welcome, Design principles and Contributing; Foundations documents semantic tokens. Focused component examples live beside source, while composed workspaces and workflows live in Patterns.

Follow the mandatory [maintenance guide](AGENTS.md) for every component or public API change. Keep examples local and deterministic, describe host responsibilities and keyboard/responsive behavior, add meaningful states, and inspect representative desktop/mobile examples after a successful build. Do not recreate miscellaneous component dumps.
