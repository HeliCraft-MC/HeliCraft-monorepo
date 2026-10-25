[English](README.md) | [HeliCraft](../../README_RU.md)

# Rigel

**Знать, кто входит в мир, и защищать личность игрока.**

Java 25 · Velocity 4.2.0 build 30 · pinned LimboAPI · Gradle Kotlin DSL

Ригель определяет существующий аккаунт Антареса, назначает неизменяемый UUID до auth lobby, ожидает явное подтверждение в браузере с кодом и однократно использует допуск конкретного соединения. `LoginEvent` и каждый переход на backend закрыты при ошибках. LimboAPI предоставляет виртуальное ожидание; неавторизованный игрок не попадает в Paper. Отдельной регистрации, обязательной `/link`, парольной БД, premium bypass и парольной `/login` нет.

```sh
bun run build:rigel
bun run test:rigel
bun run dev:rigel
bun run minecraft:up
bun run minecraft:logs rigel
bun run test:minecraft:contracts
bun run test:minecraft
```

JAR: `apps/rigel/build/libs/rigel.jar`. Используются Java 25 и корневой Gradle 9.1.0 wrapper. Дескриптор генерируется annotation processor Velocity. Общий Java-[клиент](../../packages/minecraft-client/README_RU.md) предоставляет ограниченный асинхронный REST. Настройте приватные `RIGEL_SERVICE_TOKEN`, `ANTARES_URL`, `SITE_ORIGIN`; role/backend binding задаёт Антарес. User cookies и экспорт секретов через Vite запрещены.

LimboAPI `1.1.27-SNAPSHOT` фиксируется commit/checksum в `infra/minecraft/limboapi.properties`. MIT API подключается compile-only, AGPL-3.0 runtime устанавливается отдельно, без Shadow. Сохраните `rigel` в pre-limbo profile list. Paper должен оставаться приватным с modern forwarding и одинаковыми secrets; offline mode допустим только при полной описанной границе допуска. Hot reload авторизации запрещён: пересоберите и перезапустите. Disposable Docker собирает текущие исходники и принимает тестовую EULA по явному разрешению владельца.

[Архитектура](../../docs/architecture/minecraft-integration_RU.md) · [разработка/runtime/debugging](../../docs/development/minecraft-plugins_RU.md) · [авторизация](../../docs/development/minecraft-authentication_RU.md) · [проверки](../../docs/verification/minecraft-integration-2026-10-25_RU.md) · [правила агента](AGENTS.md)

Обязательны корневые `build:ts`, `typecheck`, `lint`, `format:check`, `test:unit`, `lint:java`, `format:check:java` и соответствующие integration/browser/runtime tests. Компиляции JAR недостаточно для проверки входа.

## Название

Ригель — β Ориона. [Каталог названий звёзд IAU](https://iauarchive.eso.org/public/themes/naming_stars/).
