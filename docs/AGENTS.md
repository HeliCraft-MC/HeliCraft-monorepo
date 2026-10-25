# Documentation agent guide

Applies to all files under `docs/` in addition to the root `AGENTS.md`. Root repository instructions and explicit user instructions take precedence.

## Read before editing

- Start at `README.md` / `README_RU.md` in this directory, then read the relevant domain reference and the affected implementation. Find an existing canonical document before creating another file.
- `GDD/` is authoritative for game-system intent. Current domain references describe implemented scope and explicit release amendments. Code and executable contracts establish what is actually implemented. Record conflicts explicitly; do not silently rewrite design intent to match an accident in code.
- `product-map.md` / `product-map_RU.md` define product roles, including future roles. Keep target behavior distinct from current implementation. Describe planned features as planned, not shipped or deployed.
- Historical test results are evidence of the dated run only. Do not copy them into a new report as if rerun, or assume Docker/browser availability from an old document.

## Where documents belong

| Directory       | Purpose                                                                                      | Keep out                                                    |
| --------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `overview/`     | Audience-oriented explanations and small system diagrams                                     | Detailed API/schema contracts and release logs              |
| `architecture/` | Cross-cutting runtime boundaries, identity, authorization, rendering, publishing and storage | Feature implementation plans and test transcripts           |
| `states/`       | State lifecycle, citizenship, Governance, constitutions and diplomacy                        | Generic platform implementations                            |
| `economy/`      | Money, ledger, companies, FX and taxation contracts                                          | Dated delivery narratives                                   |
| `platform/`     | Reusable domain services such as Voting and Localized Content                                | Feature-specific duplicate ballot/localization systems      |
| `design/`       | Current interaction, accessibility and presentation rules                                    | Completed follow-up acceptance reports                      |
| `development/`  | Setup/compatibility decisions, contributor practices and narrow quality exceptions           | Product design and test-run evidence                        |
| `verification/` | Dated checks, acceptance maps, failures, skips and environment limits                        | Undated claims that a release is currently healthy          |
| `history/`      | Completed implementation plans and delivery records                                          | Current normative contracts and active unrelated TODO lists |
| `GDD/`          | Authoritative game-system design and its assets                                              | Routine delivery logs or speculative edits to game rules    |

Keep root `docs/` limited to navigation, these rules and the product map. Add a new section only when none of the existing purposes fits. Do not create a miscellaneous, temporary or generic notes bucket. Repository-root `archive/` is read-only reference unless the user specifically requests changes there; `docs/history/` is the maintained history of the active platform.

## Structure and language

- Give each current document one responsibility and a clear title. Open with its scope and implementation limits. Link the source module, public contract or detailed reference when that helps verify a material claim.
- For new designs/proposals, state status explicitly: proposed, implemented in the repository, or verified on a stated date/environment. Never imply production deployment from a local build or test.
- Existing English/Russian pairs must stay in sync, with language switches at the top. New `README.md` indexes require `README_RU.md` counterparts. Preserve existing unpaired documents; audience-specific documents may use one explicitly identified language, as with `overview/administration_RU.md`.
- Keep project identifiers, filenames, API codes and routes in English. Use Russian star names in Russian prose. Use lower-case kebab-case filenames with `_RU` for new Russian counterparts; preserve legacy GDD names and assets.
- Link to the canonical explanation rather than reproducing it. Current references describe final behavior; release chronology belongs in history or verification. If a document combines them, extract the historical material and link it instead of losing it.
- Do not create routine `*-improvements.md`, `*-follow-up.md`, `*-final.md` reference chains. Update the current reference. Use descriptive, dated filenames for separate historical records when necessary.
- A verification record states the run date, revision or scope, commands/scenarios, results and material limitations. Keep earlier failures/skips attributable; append a dated follow-up when needed. Distinguish absent artifacts/tooling from code regressions. Never fabricate logs or screenshots.
- Do not change game mechanics, broaden product promises, or delete historical decisions as a side effect of organizing files. For a real design change, document the explicit amendment and keep English/Russian versions aligned.

## Mermaid diagrams

- Use fenced `mermaid` blocks so diagrams stay editable in Git. Keep one question per diagram; prefer roughly 5–10 nodes for an administration overview and split a crowded graph.
- Label nodes and arrows in the audience's language. Use stable camelCase IDs and quote labels containing punctuation. Do not rely on color alone, HTML labels or escaped line breaks.
- Distinguish existing behavior, proposals and future integrations in both prose and a local legend. For the administration overview, solid edges mean existing connections and dotted edges mean future connections.
- Trace material relationships to code or canonical references. Do not invent a direct database connection, hidden authority or implemented Minecraft mechanic to make a graph look complete.
- Explain consequential simplifications immediately below a diagram, including optional approvals and scope limits. Diagrams summarize contracts; they do not replace them.

## Moves and validation

- Move related language versions together. Preserve content and dated evidence; normalize misleading reference titles separately and deliberately.
- Update relative links from moved documents and incoming links throughout the active repository, including application/package READMEs, root instructions, indexes, GDD amendments and literal paths. Leave root `archive/` untouched.
- Add or update the nearest index and the main documentation index. Update both root READMEs when entry points change. Avoid permanent redirect stubs and duplicate copies when all active references can be updated together.
- Before finishing, check local Markdown links/images resolve, heading anchors exist, language switches match, all documents are reachable from the indexes, and old paths no longer occur in active files. Check relative links in the new location, not only in the source location.
- Parse Mermaid with an available Mermaid renderer/parser and visually inspect rendered diagrams when available. If tooling is unavailable, say so explicitly; do not claim a rendering check from source review alone.
- Run `bun run format:check` and `git diff --check` for documentation-only edits. Application builds/tests are required by root instructions when code changes, but not for a pure documentation move. Validate Compose if its definitions change. Report actual checks and any unavailable tools accurately.
