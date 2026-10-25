# Atria and Storybook maintenance

Applies to this package in addition to the repository guide. Storybook is the maintained component reference, not a collection of experiments.

## Information architecture

- Use the established top-level groups: Introduction, Foundations, Actions, Forms, Navigation, Identity, Data display, Feedback, Overlays, Media, Patterns. Component pages use the exported component name in PascalCase. Do not create `Atria/*`, `Components/*`, personal or feature-specific buckets.
- Keep component stories beside their source. Cross-component examples belong to Patterns; control/state galleries may live under their corresponding category. Guides live in `src/docs/`; keep them in the configured sidebar order.
- Keep Welcome, Design principles and Contributing accurate when public composition patterns change. Update the English/Russian package README pair when the public API changes.

## Useful documentation and examples

- Every public component documents its purpose, when to use it, host-owned data, key props, keyboard behavior, localization and responsive constraints. Explain significant limits and side effects. No placeholder prose.
- Provide a focused default and meaningful states: long labels, narrow viewport, disabled, validation/error, loading and empty states where applicable. Avoid unrelated controls or duplicate galleries on a component page.
- Use Atria primitives and Lucide icons. Examples must be deterministic, local and usable without accounts, production APIs, secrets or invented live world state.
- Model-driven forms use one content-language context. Preserve explicit translations and keep native forms unnested; use `embedded` only for generated field groups inside an existing form. FormLanguageScope shares localization through nested editors without adding a form.
- WorkspaceLayout owns the entity accent and shares it with portalled dialogs. WorkflowLayout shows the current stage and permits returning to completed work. New compositions must reuse these patterns or document a concrete reason for another approach.

## Acceptance

- Keep strict type-aware lint, TS7, formatting, unit tests and `build:storybook` passing. No global quality-rule relaxation to accommodate examples.
- Inspect representative desktop and mobile stories. Exercise keyboard focus, Enter/Space, Escape, focus return, disabled states and reduced motion. A successful static build does not establish interaction or visual correctness.
- Run relevant product browser scenarios when a shared component changes. Record actual current evidence in the repository verification domain; do not present old screenshots or test runs as fresh checks.
- Remove obsolete examples when replacing a pattern, preserving useful states in the appropriate new home. Broken or misleading stories are unfinished work.
