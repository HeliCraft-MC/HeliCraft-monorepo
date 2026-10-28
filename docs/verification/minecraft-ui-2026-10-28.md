[Русский](minecraft-ui-2026-10-28_RU.md) | [Verification](README.md)

# Minecraft interfaces — 2026-10-28

Scope: working-tree changes based on `2234031`, covering Vega's public political map, territorial workspace and administrative review, website Minecraft confirmation, and player-facing Deneb/Rigel interfaces. Checks below were executed on 2026-10-28. This records local repository acceptance, not production deployment.

## Resulting interactions

- The public atlas prioritizes actual squaremap terrain, state selection and readable territory details. Layers, coordinate navigation and guidance are disclosures. Sharing preserves the current center and zoom; coordinate copying matches the displayed point.
- Territory preparation separates drawing from reasoning/validation/submission. Existing drafts and creation share a collapsed panel. Unsaved or in-flight work requires an explicit decision before switching drafts. Published neighboring shapes remain read-only; submission and administrative ratification remain separate confirmations.
- Website confirmation prioritizes the account, connection and deadline, with separate approval/rejection outcomes. The possession code remains in the fragment, survives website login and is cleared after an explicit decision. UUID/history/technical details are secondary disclosures.
- Deneb/Rigel use consistent Adventure presentation, clickable navigation/confirmation, copyable codes and coordinates, an actual countdown, localized profile/status/jurisdiction messages and actionable recovery guidance. Identity, forwarding, admission and territorial authority contracts are unchanged.

Current contracts: [territories](../states/territories.md), [signing in](../development/minecraft-authentication.md), [plugins](../development/minecraft-plugins.md).

## Executed checks

| Check                                                                           | Result                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bun run build:ts` through `bun run test:minecraft`; final `bun run build:vega` | Passed                                                                                                                                                                                                 |
| `bun run typecheck`, `lint`, `format:check`; `git diff --check`                 | Passed                                                                                                                                                                                                 |
| `bun run test:unit --pool=threads --maxWorkers=1`                               | 240 tests passed: Alhena 1, Atria 29, Antares 135, Vega 75                                                                                                                                             |
| `./gradlew :minecraft-client:build :rigel:build :deneb:build --rerun-tasks`     | Passed; 33 JUnit tests, Checkstyle and Spotless, no skipped tests                                                                                                                                      |
| `bun run test:minecraft:contracts`                                              | 16 tests passed against disposable PostgreSQL                                                                                                                                                          |
| `bunx --bun playwright test tests/e2e/territory-policy.spec.ts`                 | Both development and built-production scenarios passed                                                                                                                                                 |
| `bun run build:storybook` and browser QA                                        | Five FlatMap stories at 1366/390px; no horizontal overflow or page errors; Russian zoom labels, keyboard navigation, Escape cancellation, preserved geometry, missing tiles and reduced motion checked |
| Root, Vega, Antares, Deneb, Rigel and Minecraft Compose configuration           | Passed using non-secret placeholder values, without starting production services                                                                                                                       |
| `bun --no-env-file apps/antares/tests/minecraft-runtime.ts`                     | Full native 26.3/protocol 777 acceptance passed                                                                                                                                                        |

The native run exercised real Paper 26.3-223, Velocity 4.2.0-30 and pinned LimboAPI: unknown/direct connections, incorrect possession code, fragment-preserving website login, explicit approval/rejection, stable UUID forwarding, profile/presence, Russian locale, reconnect, lease expiry, service failures, wrong forwarding, real restarts and recovery.

Territorial acceptance exercised real squaremap PNGs and a native block-break background update; pointer polygon/vertex/hole edits; undo/redo; save/reload; PostGIS validation; Governance; independent administrative ratification; cookie-free public SSR; layers, clipboard, current-view links and mobile layout; movement/shared edges/holes/dimensions; stationary revision replacement and missed-revision recovery after an outage.

## Corrections during verification

Earlier attempts exposed stale heading expectations and JSON-based text matching in the native test client, ambiguous ratification text selectors, and a pixel-exact clipboard expectation incompatible with fractional map dimensions. Tests now inspect visible Adventure text, the published result, displayed clipboard content and coordinate alignment within one rendered CSS pixel. The squaremap test now breaks a block through the native client: console `/fill` does not emit a player block event. No background-update assertion was removed.

Real browser checks also exposed and fixed map resizing after the first coordinate click and Geoman mode reset during controlled reconciliation. Escape cancellation remains available without resetting normal vertex editing. Screenshot capture now waits for renderer resize and returns to the top of the page before full-page capture.

## Screenshots and limits

These are real browser captures of the disposable acceptance world; its small rendered area and fixture states are test data, not public game state.

- [Public map — desktop](assets/minecraft-ui-2026-10-28/political-map-desktop.png) / [mobile](assets/minecraft-ui-2026-10-28/political-map-mobile.png).
- [Territory editor — desktop](assets/minecraft-ui-2026-10-28/territory-editor-desktop.png) / [mobile](assets/minecraft-ui-2026-10-28/territory-editor-mobile.png).
- [Sign-in confirmation — desktop](assets/minecraft-ui-2026-10-28/minecraft-confirmation.png) / [mobile](assets/minecraft-ui-2026-10-28/minecraft-confirmation-mobile.png).

Local logs and Storybook captures are under `build/ui-2026-10-28/` and are not tracked. The native client verifies protocol behavior and visible component text; a human visual playthrough of the in-game HUD/chat was not performed. Browser and server checks use disposable data and do not establish production deployment. The TS suite uses Vitest threads because the default fork worker failed to start in the restricted environment; production test configuration was not weakened.
