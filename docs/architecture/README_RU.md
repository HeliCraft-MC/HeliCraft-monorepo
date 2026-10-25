[English](README.md) | Русский | [Документация](../README_RU.md)

# Architecture

Здесь находятся действующие общие контракты и границы приложений. Правила предметных областей — в [States](../states/overview.md), [Economy](../economy/README_RU.md) и [Platform](../platform/voting.md). Завершённые планы и отчёты о проверках — в [History](../history/README_RU.md) и [Verification](../verification/README_RU.md).

| Область            | Справочник                                                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Границы продуктов  | [Карта продуктов](../product-map_RU.md): только Антарес обращается к PostgreSQL/PostGIS и S3; приложения используют REST                                                    |
| Отображение сайта  | [Публичный SSR, защищённый CSR и границы кэширования](web-rendering_RU.md)                                                                                                  |
| Аккаунты           | [UUID и серверные сессии](identity_RU.md), [доступ и администрация](authorization_RU.md), [операторы по нику](operators.md), [публичные профили](public-player-profiles.md) |
| Публикация и файлы | [Редакционный Markdown](content_RU.md), [галерея](gallery_RU.md), [хранение скинов](skin-storage_RU.md)                                                                     |
| Идентичность сайта | [Общие настройки и отображаемое имя сервера](site-settings.md)                                                                                                              |
| Качество           | [Требования и адресные исключения](../development/quality.md)                                                                                                               |

- [Minecraft Integration V1](minecraft-integration_RU.md) — единая identity, авторизация, forwarding, сессии и события.
