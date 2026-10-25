[Русский](README_RU.md) | English | [Repository](../README.md)

# Documentation

Start with the audience and the question. Current system contracts, product intentions and dated verification evidence have separate homes.

## Start here

- **For administration:** [illustrated overview in Russian](overview/administration_RU.md) — six small Mermaid diagrams, system connections and explicit implementation limits as of 2026-10-21.
- **Product roles and intentions:** [Product map](product-map.md) / [Карта продуктов](product-map_RU.md).
- **Development:** repository [Quick start](../README.md#quick-start), [setup decisions](development/setup-research.md) and [quality policy](development/quality.md).
- **Documentation changes:** [agent rules](AGENTS.md).
- **Interface verification — 2026-10-22:** [companies, shared forms and navigation](verification/company-interface-2026-10-22.md).
- **Workspace UX — 2026-10-23, follow-up 2026-10-25:** [responsive workspaces and poll workflows](verification/workspace-ux-2026-10-23.md).

## Reference map

| Section                                | Contents and entry points                                                                                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Architecture](architecture/README.md) | Cross-cutting application boundaries, rendering, identity, permissions, publishing and storage                                                                                                    |
| States                                 | [Lifecycle](states/overview.md), [creation](states/creation-flow.md), [Governance](states/governance.md), [Constitution](states/constitution.md), [diplomacy](states/diplomacy.md)                |
| [Economy](economy/README.md)           | Money, companies, currency exchange and taxation                                                                                                                                                  |
| Platform                               | Shared [Voting](platform/voting.md) and [Localized Content](platform/localized-content.md) services                                                                                               |
| Design                                 | [Landing page](design/landing-page.md) and [account/state/administration workspaces](design/workspaces.md)                                                                                        |
| Development                            | [Stack decisions and sources](development/setup-research.md); [quality requirements and targeted exceptions](development/quality.md)                                                              |
| [Verification](verification/README.md) | Dated implementation checks, acceptance evidence, screenshots and environment limitations                                                                                                         |
| [History](history/README.md)           | Completed implementation plans and records, retained as historical context                                                                                                                        |
| GDD                                    | Authoritative game-system design: [English](GDD/deep-research-report.md), [Russian](GDD/deep-research-report-ru.md), [color tokens](GDD/helicraft-color-tokens.json), [logo](GDD/logo_noback.png) |

GDD describes intended game systems. Feature references describe their implemented web scope and explicitly documented release amendments. A future intention is not evidence that Minecraft already implements it. If sources disagree, document the discrepancy or an explicit amendment; never silently turn a proposal into an implemented claim.

`archive/` at the repository root contains older products and documentation. It remains read-only reference and is outside active documentation maintenance. Existing English/Russian document pairs link to one another; unpaired references retain their current language. The administration overview is intentionally written in Russian for its audience.
