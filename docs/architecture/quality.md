[Repository](../../README.md) | [Setup](../setup-research.md)

# Web foundation quality exceptions

All oxlint categories remain errors, with TS7 type-aware checking, deny-warnings and unused-disable reporting. Existing repository exceptions remain in `.oxlintrc.json`. New exceptions are deliberately limited by path or an adjacent comment:

- Composed Vega/Atria JSX has depth 8; Vega component declarations permit 150 lines. OpenAPI route declaration functions permit 200 lines. These limits count declarative markup/schema; business logic stays in services.
- TanStack route modules allow throwing the framework's redirect/notFound responses. This follows the router contract rather than hiding unsafe application exceptions.
- Composition roots and cross-domain integration tests import their actual dependencies; their single-rule dependency-count exceptions do not relax typing.
- Atomic CMS save/featured transactions and app composition have local function-size exceptions. Administrative read models and skin storage operations are split into separate units.
- Integration/E2E assertions permit awaited result member access and up to 50 statements. Shared suite declarations have commented size exceptions; test cases exercise real behavior. One browser viewport loop is sequential to avoid racing the same page. Ports and fixtures use fixed numeric test data.
- Stories intentionally aggregate multiple demo components and inline demo objects/arrays/JSX; runtime UI still uses memoized handlers and stable props. Config files retain their prior exceptions.
- Minecraft UV coordinates, PNG signature bytes and authored texture RGB values are format constants; no-magic-numbers is scoped to the two image-format modules. Malicious URL fixtures permit literal javascript URLs solely to test removal.
- createServerFn modules read environment only in server handlers. No-process-env is scoped to those modules; credentials never enter Vite client variables.
- MarkdownContent's narrow no-danger exception is allowed only for sanitized server HTML. Inline authored SVG exposes an image role for accessibility. WebGL constructor failure may set fallback state from its effect. Native confirmation protects dirty document navigation. These comments explain the actual boundary.
- Hono's next callback is awaited as Promise<void>; a narrow callback-return exception avoids conflict with no-confusing-void-expression while preserving error propagation.

Required checks: `bun run build:ts`, `typecheck`, `lint`, `format:check`, `test:unit`, `test:integration`, Playwright against dev/built SSR, `build:storybook`, root/affected Compose validation. Docker tests use disposable persistence; no production data or volumes are deleted. Browser tests cover registration, stable UUID rename, skin upload/reset, permissions, publication, SSR and static-only PWA caching.

Formatter capability was checked using deliberately unformatted TS, TSX, JS, JSON, CSS, SCSS, Markdown and YAML probes: all eight were formatted and passed a second check. SQL is unsupported by oxfmt (an explicit SQL target reports no supported files). SQL migrations therefore use manual PostgreSQL/Drizzle style review and are validated by applying them to fresh Testcontainers and the disposable helicraft Compose database. Unchanged Java/Gradle files retain Spotless and Checkstyle rather than pretending oxfmt supports them.

Gallery additions keep the same strict checks. Narrow adjacent exceptions cover the combined OpenAPI declarations, sequential persistent lifecycle scenario, upload form markup, and carousel timer/preload/controls. Gallery schema numeric values are explicit upload/metadata/Minecraft bounds. Zod search `.catch(1)` is a schema default, not Promise chaining. Public browser fixtures and their ephemeral ports exist only in test modules; no mock world API is created. Component folders retain shared SCSS foundations and stable public exports.

Locale dictionaries have a narrowly scoped `max-lines` exception to keep each language in one complete file. The language selector uses `document.cookie` only for a non-sensitive language preference, with Path, SameSite and Max-Age; this supports browsers without Cookie Store API. Development port probing is sequential to select the first free port without holding additional sockets. Development children run in separate process groups so stopping the launcher also stops watchers and their descendants.

Multilingual field schemas use local numeric-bound exceptions matching their original-field constraints. All translated Markdown is rendered and sanitized in Antares; public DTOs omit raw Markdown. Tests cover per-field fallback, published/revision persistence, gallery ownership, malformed identity DTOs, language-specific SSR/metadata and client language changes preserving editor drafts.
