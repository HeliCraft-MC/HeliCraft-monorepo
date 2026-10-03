[English](setup-research.md) | [HeliCraft](../README_RU.md)

# Настройка и исследование

Проверено по официальной документации и метаданным релизов **3 октября 2026 года**. Это воспроизводимая базовая основа. Конкретные версии JS-пакетов закреплены в manifests и едином `bun.lock`, Gradle и серверы — в wrapper и `server-lock.json`.

## Bun и внутренние пакеты

Bun **1.4.2** запускает скрипты, CLI, dev-серверы, Vitest, Playwright, генерацию и сервер Antares. Workspace использует isolated linker и `workspace:*`; архив и Altair исключены. Общий Gradle wrapper обслуживает Java отдельно. [Bun workspaces](https://bun.sh/docs/pm/workspaces), [Bun runtime](https://bun.sh/docs/runtime).

Проверка типов и декларации проектов используют **TypeScript 7.0.2**. Единственное исключение — dev-зависимость `typescript@6.0.3` внутри Alhena для **Hey API 0.99.0**. Этот генератор обращается к прежнему Compiler API (`SyntaxKind`), которого нет на прежнем пути TS7. В isolated workspace он получает TS6, а `typecheck` и декларации Alhena явно запускают корневой TS7. Отступать от TS7 во всех проектах не требуется. Это решение проверено генерацией, сборкой и проверкой типов. [Hey API](https://heyapi.dev/docs/openapi/typescript/get-started).

## Web и UI

Vega использует React 19.3, Vite 8.3, файловые маршруты TanStack Router, TanStack Query для загрузки/отмены/обновления, Zod для проверки ответа и Atria для кнопки. Vite-плагин генерирует дерево маршрутов. API запрашивается с текущего origin; dev-прокси и prod-сервер Bun направляют запросы в Antares. [TanStack Router](https://tanstack.com/router/latest/docs/quick-start), [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview).

PWA содержит manifest, иконки и precache статических ресурсов. `/api/*` и OpenAPI исключены из SPA navigation fallback; API не кешируется service worker. Для установки на публичном домене нужен HTTPS. [Vite PWA](https://vite-pwa-org.netlify.app/guide/).

Atria использует Tailwind CSS 4 через официальный Vite-плагин и Base UI. CSS явно сканирует исходники библиотеки. Storybook 10.6 использует `react-docgen`, чтобы не зависеть от прежнего TypeScript Compiler API. Кнопка сохраняет клавиатурную доступность и disabled-состояние. [Tailwind Vite](https://tailwindcss.com/docs/installation/using-vite), [Base UI](https://base-ui.com/react/overview/quick-start), [Storybook React/Vite](https://storybook.js.org/docs/get-started/frameworks/react-vite/).

Altair остаётся документацией. Его будущая сборка потребует Rust и системные компоненты Tauri; это не часть текущего Bun workspace. [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/), [Tauri Vite](https://v2.tauri.app/start/frontend/vite/).

## API, БД и S3

Hono и `@hono/zod-openapi` получают маршруты, валидацию и OpenAPI из одних схем. `/api/health` проверяет процесс, `/api/ready` — PostGIS и доступность S3-бакета. Ошибки зависимостей не раскрывают детали подключения. Alhena генерирует DTO, SDK и встроенный Fetch-транспорт без runtime-зависимостей. Типы SDK не заменяют runtime-валидацию входящих ответов. [Hono Zod OpenAPI](https://hono.dev/examples/zod-openapi), [Hey API Fetch](https://heyapi.dev/docs/openapi/typescript/clients/fetch).

Drizzle использует PostgreSQL через `pg`; целевая БД — **helicraft**. Первая миграция включает PostGIS и создаёт минимальную таблицу пространственных событий. Compose применяет миграции до API. Учебная геометрия использует SRID 4326; координаты Minecraft плоские, их нельзя без преобразования считать географическими. Перед территориальными механиками нужно определить отдельную систему координат. [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql), [Drizzle geometry](https://orm.drizzle.team/docs/column-types/pg#geometry).

Compose использует `postgis/postgis:18-3.6`; том PostgreSQL 18 монтируется в `/var/lib/postgresql`. S3 предоставляет SeaweedFS **4.48** в режиме `mini` с ключами и автоматическим созданием бакета. Antares использует AWS SDK с path-style endpoint, регион берётся из окружения. Это заменяемый S3-адаптер, не привязка продуктовой логики к хранилищу. [PostGIS Docker](https://github.com/postgis/docker-postgis), [SeaweedFS mini](https://github.com/seaweedfs/seaweedfs/wiki/Quick-Start-with-weed-mini).

## Java и Minecraft

Java **25**, Gradle **9.1.0**, Kotlin DSL. Paper **26.2 build 129** и Velocity **4.2.0 build 30** выбраны из официальных stable-релизов; URL и SHA-256 закреплены в `server-lock.json`. Docker скачивает сервер и сверяет checksum. [Gradle 9.1](https://docs.gradle.org/9.1.0/release-notes.html), [Paper downloads](https://docs.papermc.io/misc/downloads-service/).

Deneb использует compile-only Paper/Adventure; JTS и Caffeine включены в jar через Shadow и relocated. Rigel использует compile-only Velocity API и annotation processor для дескриптора. Неблокирующий HTTP health-запрос показывает соединение с Antares, не реализуя World Engine или авторизацию. [Paper project setup](https://docs.papermc.io/paper/dev/project-setup/), [Velocity plugin](https://docs.papermc.io/velocity/dev/creating-your-first-plugin/).

Velocity сохраняет `online-mode=true`. Paper доступен только во внутренней сети с modern forwarding и общим секретом. Поддержка неофициальных клиентов и MFA — будущая работа, её нельзя подменять отключением проверки аккаунтов. Запуск Paper требует самостоятельно принятой EULA. [Velocity forwarding](https://docs.papermc.io/velocity/player-information-forwarding/), [Velocity security](https://docs.papermc.io/velocity/security/).

## Строгие проверки и форматирование

**oxlint 1.86.0 + oxlint-tsgolint 7.0.2003**: все категории (`correctness`, `suspicious`, `pedantic`, `perf`, `restriction`, `style`) включены как ошибки. Включены проверки типов и запрет предупреждений, проверка неиспользованных disable-директив, плагины TypeScript, React, React performance, accessibility, imports, Promise, Node, JSDoc, Unicorn и OXC; Vitest применяется к тестам. **oxfmt 0.71.0** отвечает за единое форматирование. [Oxlint config](https://oxc.rs/docs/guide/usage/linter/config), [Type-aware linting](https://oxc.rs/docs/guide/usage/linter/type-aware.html), [Oxfmt config](https://oxc.rs/docs/guide/usage/formatter/config.html).

Максимальная строгость требует согласованного набора правил, поэтому конкретные исключения записаны в `.oxlintrc.json`:

- Современный JSX не требует импорта React; литералы текста, `className`, `onClick` и spread props необходимы для UI-компонентов.
- Именованные экспорты приняты в библиотечных пакетах. Обязательный default export разрешён только конфигурациям и Storybook. Родительские относительные импорты разрешены внутри приложений и генератора; границы приложений описаны в AGENTS.md.
- Async/await, optional chaining, rest/spread, ternary, `null`, `undefined`, `void` и top-level await — разрешённые возможности TypeScript/Bun. Promise-callbacks нужны API фреймворков. Правило `strict-void-return` конфликтует с их стандартными callback-сигнатурами; проверки потерянных promises и опасных типов остаются включены.
- `prefer-readonly-parameter-types` требует менять контракты сторонних React/Hono/API-типов; оно исключено. Типы собственных DTO и readonly-полей остаются явными.
- Сортировка ключей/импортов не конкурирует с форматтером. Раздельные type imports разрешены. Magic numbers разрешены только конфигурациям, тестам и небольшому HTTP-серверу статики; ограничения размера функций и вложенности сохраняются.
- Vitest использует явные импорты и hoisted mocks, поэтому запреты импорта globals и обязательного hook исключены. У watcher Alhena разрешён один вручную созданный promise, намеренно удерживающий процесс между изменениями контракта.
- Доступ к окружению, Node builtin-модулям, завершению процесса и серверному логированию разрешён только серверным/инструментальным файлам. Архив, сгенерированный SDK, дерево маршрутов и результаты сборок исключены из линтера и форматтера.

Для Java подключены **Checkstyle 14.3.0** и **Spotless 8.10.3 / google-java-format 1.30.0**. Checkstyle проверяет именование, импорты, блоки, ошибки управления потоком и сложность с нулём предупреждений. Компилятор использует `-Xlint:all,-processing -Werror`; только предупреждения о неполностью заявленных annotation processors исключены для штатного процессора Velocity. Версия форматтера выбрана по совместимости с JDK 25 и проверена запуском. [Checkstyle](https://checkstyle.org/), [Spotless Gradle](https://github.com/diffplug/spotless/tree/main/plugin-gradle), [Совместимость google-java-format](https://github.com/diffplug/spotless/blob/main/lib/src/main/java/com/diffplug/spotless/java/GoogleJavaFormatStep.java).

Команды: `bun run lint`, `bun run lint:fix`, `bun run format`, `bun run format:check`. Java `build` также выполняет Checkstyle и Spotless check.

## Проверки и границы подтверждённого

Проверены TS7 typecheck, сборки приложений/пакетов, строгий oxlint, oxfmt, пять Vitest unit/компонентных тестов, JUnit, Java checks и сборка Storybook. Playwright проверяет цепочку Vega → Alhena → Antares в dev и prod, manifest, регистрацию service worker и отсутствие кеширования API через prod-прокси. Тесты интерфейса используют Testing Library и Happy DOM, весь JS запускается через Bun.

**Docker в текущем окружении недоступен.** Проверена только сборка конфигураций Compose (`config -q`), без запуска контейнеров. Testcontainers-тесты PostGIS и S3, Docker build, запуск Paper/Velocity, healthchecks, persistence и forwarding предстоит проверить в окружении с Docker. [Testcontainers PostgreSQL](https://node.testcontainers.org/modules/postgresql/).

Compose использует include/extends, общие определения сервисов, healthchecks, зависимости миграций и отдельные named volumes. Нет автоматического переноса старых данных или совместимости с API архива. Архив сохранён для последующего осознанного переноса функциональности.
