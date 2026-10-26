[English](README.md) | [HeliCraft](../../README_RU.md)

# Deneb

**Материализовать HeliCraft внутри Minecraft.**

Java 25 · Paper 26.3 build 223 · Gradle Kotlin DSL · Adventure · JTS · Caffeine

Денеб проверяет точный допуск UUID/имени Антареса, переданный Velocity, до игры. Он подтверждает реальные входы в Paper, поддерживает lease с TTL и закрывает точную сессию при выходе. Игрок видит название из настроек, проверенный профиль и все действительные гражданства либо нейтральный ответ. Команды: `/heli`, `/heli status`, `/heli profile`. Гражданство не означает физическое местоположение.

```sh
bun run build:deneb
bun run test:deneb
bun run dev:deneb
bun run minecraft:up
bun run minecraft:logs deneb
bun run test:minecraft:contracts
bun run test:minecraft
```

JAR: `apps/deneb/build/libs/deneb.jar`. Используйте Java 25 и корневой Gradle 9.1.0 wrapper. Paper/Adventure подключены compile-only; JTS, Caffeine и Gson общего клиента включены и изолированы. `WorldGeometry` остаётся независимым пространственным примитивом на будущее, без территориальных полномочий. Общий [Java-клиент](../../packages/minecraft-client/README_RU.md) выполняет ограниченный REST с приватными `DENEB_SERVICE_TOKEN`, `ANTARES_URL`. Действия Bukkit/игрока возвращаются на главный поток; явно асинхронный pre-login может ожидать ограниченный запрос.

У Денеба нет регистрации/login/паролей, прямого PostgreSQL/S3 и экономических полномочий. Государственная юрисдикция использует проверенные локальные JTS snapshots без HTTP в movement hot path. Private claims остаются будущей работой. Paper остаётся приватным с modern forwarding и случайным secret. Disposable Docker собирает свежие исходники и принимает тестовую EULA по явному разрешению владельца. Gradle continuous mode только пересобирает; после изменения нужен перезапуск Paper.

[Архитектура](../../docs/architecture/minecraft-integration_RU.md) · [разработка/runtime/debugging](../../docs/development/minecraft-plugins_RU.md) · [авторизация](../../docs/development/minecraft-authentication_RU.md) · [проверки](../../docs/verification/minecraft-integration-2026-10-25_RU.md) · [правила агента](AGENTS.md)

Обязательны JUnit, строгие TS/Java проверки и реальные contract/runtime tests; компиляция не доказывает игровой допуск. У MockBukkit есть ветка 26.2, но V1 проверяет чистую логику и настоящий Paper без ещё одной изменяемой snapshot-зависимости.

`SpatialEngine` асинхронно сверяет версию/integrity, проверяет целый snapshot и атомарно меняет STRtree. `TerritorialRuntime` на main thread обрабатывает движение, teleport, смену мира, транспорт и неподвижных игроков; `/heli whereami` и `/heli borders` показывают физическую юрисдикцию. Предпочтение языка из подтверждения Веги имеет приоритет. [Spatial architecture](../../docs/architecture/spatial_RU.md) и [проверки](../../docs/verification/territories-2026-10-25_RU.md).

## Название

Денеб — α Лебедя. [Каталог названий звёзд IAU](https://iauarchive.eso.org/public/themes/naming_stars/).
