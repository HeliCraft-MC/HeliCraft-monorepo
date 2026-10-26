[English](minecraft-sign-in-2026-10-26.md) | [Verification](README_RU.md)

# Minecraft confirmation links — 2026-10-26

Область: рабочее дерево на основе `3feabab`; одноразовые ссылки подтверждения Minecraft, приватные данные подключения и необязательный локальный GeoIP. Production deployment и изменения пользовательских миров/баз не выполнялись. Постоянный тестовый Compose-проект оставлен остановленным.

Действующие контракты: [архитектура](../architecture/minecraft-integration_RU.md#одноразовые-ссылки-и-данные-подключения), [вход игрока](../development/minecraft-authentication_RU.md), [настройка GeoIP](../development/minecraft-plugins_RU.md#optional-local-geoip).

## Выполненные проверки

| Проверка                                                      | Результат                                                                                                                                                       |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun run build:ts`, `bun run typecheck`                       | Успешно, TS7 и сгенерированный SDK                                                                                                                              |
| `bun run lint`, `bun run format:check`, `git diff --check`    | Успешно                                                                                                                                                         |
| `bun run test:unit`                                           | 229 успешных тестов четырёх workspace                                                                                                                           |
| `bun run test:minecraft:contracts`                            | 16 успешных тестов на временном PostGIS, включая фрагмент, metadata и владение                                                                                  |
| Gradle `:minecraft-client:build :rigel:build :deneb:build`    | Успешно, включая JUnit, Checkstyle, Spotless и warnings-as-errors                                                                                               |
| Корневые/dev/stand, per-app и изолированный Minecraft Compose | `config --quiet` успешно                                                                                                                                        |
| Native Minecraft после исправления теста ниже                 | Успешно: новый изолированный PostGIS, настоящие Velocity/Limbo/Paper 26.3 и production Вега с Chromium                                                          |
| Настоящий MMDB reader                                         | Официальная тестовая City-база MaxMind из `/tmp`: `81.2.69.160` разрешён в GB, London/Лондон, Europe/London; IP реального игрока внешним службам не отправлялся |

Native harness получил настоящую кликабельную ссылку из игрового пакета. Сначала проверил отказ для неправильного ручного кода, удалил только cookie авторизации, открыл ссылку, проверил отсутствие кода в query страницы входа, авторизовался через настоящую форму и просмотрел страницу с IP/протоколом. До явного нажатия подтверждения игровой сессии не было. Подтверждение убрало фрагмент и допустило в Paper тот же UUID. Также прошли ручной отказ/переподключение, недоступность API, lease expiry, перезапуски, неверный forwarding, недоступный Paper, устаревшие service tokens, forced-host rejection и восстановление. Полностью прошли существующие проверки территорий/squaremap/браузера; page errors отсутствовали.

Данные подключения возвращаются только владельцу с `no-store`. Отсутствие доказательства, cookie другого аккаунта и повторное подтверждение/consumption не дают допуска. Геолокация, присланная клиентом, отклоняется. Unit-тесты покрывают локальные, приватные и IPv4-mapped адреса, отсутствие и нечитаемость GeoIP-базы. Миграция `0048_minecraft_connection_details.sql` проверена (один nullable JSONB column) и применена цепочкой миграций на новой временной базе; schema push не использовался.

## Доказательства и ограничения

Успешная папка: `/tmp/helicraft-minecraft-v1-PK1egZ`; первая попытка: `/tmp/helicraft-minecraft-v1-oomKpn`. Первый `test:minecraft` собрал все исходники, но остановился на английской подписи входа: тест удалил языковую cookie вместе с авторизацией. Теперь тест удаляет только `helicraft_session`. Полный повтор через `bun --no-env-file apps/antares/tests/minecraft-runtime.ts` на свежесобранных артефактах прошёл. Первая ошибка не засчитана как успешный native-прогон.

[Точный результат runtime](assets/minecraft-sign-in-2026-10-26/runtime-result.json) и [скриншот подтверждения](assets/minecraft-sign-in-2026-10-26/confirmation.png) сохранены в репозитории. Скриншот просмотрен. Остальные `/tmp` логи/конфигурация локальны и могут содержать приватные тестовые credentials; публиковать папки целиком нельзя.

GeoIP проверен с [официальной тестовой MMDB](https://github.com/maxmind/MaxMind-DB/tree/main/test-data), без установки production-базы GeoLite. Оператор предоставляет собственную совместимую лицензированную City-базу; при отсутствии данных показывается недоступность. Приёмка человеком в графическом Minecraft и production deployment не выполнялись. Парольные команды не добавлялись.
