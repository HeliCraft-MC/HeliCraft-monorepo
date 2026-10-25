[Русский](README_RU.md) | English | [Documentation](../README.md)

# Architecture

Current cross-cutting contracts and application boundaries belong here. Domain rules live in [States](../states/overview.md), [Economy](../economy/README.md) and [Platform](../platform/voting.md). Completed plans and test reports belong in [History](../history/README.md) and [Verification](../verification/README.md).

| Area                 | Reference                                                                                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product boundaries   | [Product map](../product-map.md): only Antares accesses PostgreSQL/PostGIS and S3; applications use REST                                                                                        |
| Web delivery         | [Public SSR, protected CSR and cache boundaries](web-rendering.md)                                                                                                                              |
| Accounts             | [UUID identity and server sessions](identity.md), [authorization and administration](authorization.md), [nickname operators](operators.md), [public player profiles](public-player-profiles.md) |
| Publishing and files | [Editorial Markdown](content.md), [gallery](gallery.md), [skin storage](skin-storage.md)                                                                                                        |
| Site identity        | [Public server settings and display branding](site-settings.md)                                                                                                                                 |
| Quality              | [Requirements and narrowly scoped exceptions](../development/quality.md)                                                                                                                        |
