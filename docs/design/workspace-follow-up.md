[Workspace rules](workspaces.md) | [Server identity](../architecture/site-settings.md)

# Workspace follow-up — 2026-10-18

This document records the completed 18-point workspace follow-up and its verification. Earlier release reports describe earlier revisions; the evidence below applies to these changes.

- Account editing uses the full available width with navigation near the left viewport edge. The current account section has a visible dot and `aria-current`.
- Constitution editing uses exclusive visual, Markdown source and document-preview modes. Switching preserves the controlled Markdown. Fullscreen reading remains available.
- Draft review labels the future public address and shows a color swatch. State decisions are spaced cards.
- Constitution HTML remains sanitized in Antares. Vega parses that sanitized document and turns internal player/state links into the ordinary shared entity components, retaining SSR document content and lazy cookie-free previews.
- State navigation uses the actual horizontal flag and no inset left stripe. Account state cards use the same Atria StateCard with real flags.
- The generated governance approval reason is localized when displayed; immutable history is retained.
- FieldHelp opens on hover and pins on click. Outside press, a second click and Escape dismiss it.
- Antares refuses voluntary departure by a current office holder, including optional offices. The workspace explains the requirement to end appointments first.
- The reform section is labelled State reforms. Diplomacy remains visible to citizens and distinguishes missing procedures from insufficient authority.
- `CREATE_INSTITUTION` provides general establishment authority. New decisions prefer it; legacy establishment policies remain readable for existing governance. Bank/tax procedures are grouped by institution in reforms. Establishment forms configure new bank/tax procedures together with the initial charter. Antares limits them to the selected institution, refuses rewriting existing rules, normalizes manual text and publishes a new immutable governance/constitution revision atomically. Further changes use the institution selector in reforms.
- Account overview displays the current skin; skin upload settings use a preview/control layout that collapses on smaller screens.
- Administration uses a full-height sidebar. Institutions share one section with a bank/tax selector. Server settings have their own protected section.
- Shared buttons and action links use one radius token. The home navbar fades its background over 180 ms and disables that transition for reduced motion.
- `compose.stand.yml` builds only the web stack and its PostgreSQL/S3 dependencies. Vega is named `helicraft-stand-vega` and joins external `intranet`; the reverse proxy connects to port 8080 on that network. No service publishes host ports. Antares, persistence and migrations remain on the project network. The external network must already exist. No Minecraft EULA is accepted.

## Requirement coverage

| Request | Implementation and evidence                                                                                                                                                                                                                                |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–2     | Full-width account container, left navigation and decorative current-page marker; desktop/mobile account browser scenario checks width and accessible link names.                                                                                          |
| 3       | Exclusive visual/source/document-preview modes in Atria MarkdownEditor and ConstitutionEditor; creation/reform flow retains Markdown and checks preview switching.                                                                                         |
| 4       | StateReview labels the future address, shows a swatch instead of hexadecimal text and spaces decision cards; account browser review checks the visible result.                                                                                             |
| 5       | Default PlayerNickname/StateName previews and parsed sanitized Constitution entity links; component tests, SSR structure checks, real hover and cookie-free fetch assertions.                                                                              |
| 6       | State navigation uses the configured flag with no inset stripe; account lists reuse Atria StateCard with actual banner/PNG data; institution browser scenario checks both surfaces.                                                                        |
| 7       | Revision reasons pass through localized display mapping without modifying immutable history.                                                                                                                                                               |
| 8       | Hover explanations, click pinning, repeated-click/outside/Escape dismissal; real browser controls and Storybook document the interaction.                                                                                                                  |
| 9       | Antares blocks every current office holder; the UI disables departure and explains succession. Persistent tests cover required and optional offices and successful departure after removal.                                                                |
| 10–11   | State reforms has a precise label and workflow explanation. Diplomacy shows missing procedures or missing authority; tested with a real active autocracy.                                                                                                  |
| 12      | Shared institution establishment policy, initial scoped procedure editor, normalized immutable references and atomic revision publication; PostgreSQL and browser tests verify the lifecycle and reject scope/overwrite violations.                        |
| 13      | Current 3D skin on account overview and separate preview/upload controls; desktop/mobile screenshots and the existing skin lifecycle.                                                                                                                      |
| 14      | Full-height administration sidebar, one Institutions section with bank/tax selection and legacy route redirects.                                                                                                                                           |
| 15      | Authorized persisted name/address/GitHub/logo settings, public SSR identity, favicon and dynamic installation manifest; PostgreSQL/S3, unit and JavaScript-free browser checks. Central display-name usage is also recorded in AGENTS.md and both READMEs. |
| 16–17   | Shared radius token for buttons/action links and native controls; responsive 180 ms navbar background transition with reduced-motion support.                                                                                                              |
| 18      | Effective Compose validation proves web services only, no published ports and named Vega on external intranet.                                                                                                                                             |

## Validation

Verification completed on 2026-10-18 with Docker and Chromium available:

- `build:ts`, TS7 `typecheck`, strict type-aware `lint` and `format:check` passed. Generated OpenAPI/Alhena files were refreshed through the ordinary generator.
- All 136 unit tests passed: Alhena 1, Antares 74, Atria 20 and Vega 41. Vitest used `--pool=threads --maxWorkers=1` as documented in [quality](../architecture/quality.md).
- All 33 PostgreSQL/S3 integration tests passed across 14 suites. They include current-office departure restrictions, settings authorization and storage failures, scoped initial institution procedures, immutable history and atomic publication.
- The complete dev/production browser suite passed 35 scenarios. The production-only service-worker scenario is intentionally skipped in development. An additional focused run passed all four account/settings scenarios after strengthening the skin assertion to await the actual 3D canvas and successful texture response.
- All 14 separate public-gallery browser scenarios passed, including JavaScript-free HTML, language changes, responsive layouts and malformed account responses. There were no remaining hydration mismatch diagnostics.
- `build:storybook` passed. Desktop/mobile account, document and settings screenshots were inspected.
- Root, development, Antares, Vega and stand Compose configurations passed validation. Effective stand configuration contains exactly PostgreSQL, storage, migrations, Antares and Vega; no service publishes ports. Named Vega joins the external `intranet` network.
- Migrations 0018 and 0019 were reviewed and applied through the migration runner to `helicraft`; the database now records 20 migrations. No schema push was used.

The browser run caught an active-page dot leaking into the accessible navigation name; the marker now uses an empty decorative shape. Public account-dependent controls wait for hydration even with a populated account cache, and guest authentication links avoid route-derived active attributes during SSR redirects. The wallet loading assertion targets the wallet's own status rather than global navigation progress. Production authentication limits remain unchanged; rate-limit isolation exists only in the disposable browser fixture.
