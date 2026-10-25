[English](README.md) | [Репозиторий](../../README_RU.md)

# Minecraft service client

Общая Gradle-библиотека Java 25 для Ригеля и Денеба: минимальные типизированные DTO Антареса и ограниченный асинхронный HTTP. Плагины не импортируют runtime друг друга; библиотека не обращается к PostgreSQL, S3 и browser cookies. Каждый плагин включает/изолирует Gson 2.13.2 через Shadow.

Сборка и проверки: `./gradlew :minecraft-client:build`. Корневые `build:java`, `test:java`, `lint:java`, `format:java`, `format:check:java` включают библиотеку. JUnit проверяет ошибки авторизации и неверные ответы через настоящий loopback HTTP-сервер, без имитации Minecraft.

Синхронизируйте DTO с [Minecraft OpenAPI](../../apps/antares/src/modules/minecraft/contracts.ts); после изменения контрактов генерируйте Альхену, выполняйте `bun run test:minecraft:contracts` и `bun run test:minecraft`. Ошибки и DTO `toString()` не должны раскрывать tokens, коды, verifier и тела ответов. См. [архитектуру](../../docs/architecture/minecraft-integration_RU.md) и [разработку](../../docs/development/minecraft-plugins_RU.md).
