[English](README.md) | Русский

# HeliCraft

HeliCraft — постоянный социальный, политический и экономический мир Minecraft. Minecraft позволяет физически жить в нём, Vega становится второй половиной игры, а Antares обеспечивает последовательное состояние всех продуктов.

Этот репозиторий содержит новую **базовую основу**, а не функциональность старого сервера. Рабочий пример: Vega → Alhena → Antares, кнопка Atria, схема пространственного события, команда-приветствие Paper и обработчик запуска Velocity. Собственная авторизация, экономика, территориальные правила и будущий World Engine пока не реализованы.

## Проекты

| Продукт                                | Каталог           | Стек                                                                      |
| -------------------------------------- | ----------------- | ------------------------------------------------------------------------- |
| [Vega](apps/vega/README_RU.md)         | `apps/vega`       | React 19 · TypeScript · Vite · TanStack Router/Query · Zod · Atria · PWA  |
| [Antares](apps/antares/README_RU.md)   | `apps/antares`    | TypeScript · Bun · Hono · Zod/OpenAPI · Drizzle · PostgreSQL/PostGIS · S3 |
| [Deneb](apps/deneb/README_RU.md)       | `apps/deneb`      | Java 25 · Paper 26.2 · Gradle Kotlin DSL · Adventure · JTS · Caffeine     |
| [Rigel](apps/rigel/README_RU.md)       | `apps/rigel`      | Java 25 · Velocity 4.2.0 · Gradle Kotlin DSL                              |
| [Atria](packages/atria/README_RU.md)   | `packages/atria`  | React · TypeScript · Tailwind CSS 4 · Base UI · Storybook                 |
| [Alhena](packages/alhena/README_RU.md) | `packages/alhena` | Generated TypeScript SDK · native Fetch · zero runtime dependencies       |
| [Altair](apps/altair/README_RU.md)     | `apps/altair`     | Planned: Tauri 2 · Rust · React · Vite · Atria · Alhena                   |

Все JS/TS-проекты входят в один приватный Bun workspace с общим `bun.lock` и зависимостями `workspace:*`. Java-плагины используют общий Gradle wrapper и Kotlin DSL. Публиковать внутренние пакеты не нужно. Altair содержит только документацию и исключён из workspace, сборок и Compose.

## Быстрый старт

Нужны **Bun 1.4.2+**, **JDK 25**, Docker с **Compose 2.24.4+** и работающим daemon. Gradle 9.1.0 автоматически скачивается через `./gradlew` (`gradlew.bat` на Windows). Команды выполняются из корня репозитория.

```sh
bun install --frozen-lockfile
cp .env.example .env
bun run infra:up
bun run db:migrate
bun run dev
```

Vega: http://localhost:5173. Antares: http://localhost:3000. OpenAPI: http://localhost:3000/openapi.json. S3: http://localhost:8333. `dev` следит за Java-исходниками и собирает jar, но не запускает Minecraft и не принимает его EULA. Для Storybook отдельно выполните `bun run storybook`, адрес http://localhost:6006.

Только фронтенд: `bun run dev:vega`. Только бэкенд: `bun run dev:antares`. Приветствие работает без сохранения данных при корректном окружении Antares; `/api/ready` проверяет PostGIS и S3-бакет.

## Команды

| Команда                               | Назначение                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| `bun run dev`                         | Сборка пакетов, watch Atria/Alhena и Java-плагинов, dev-серверы Vega и Antares |
| `bun run dev:vega`                    | Vega и watch внутренних пакетов; API запускается отдельно                      |
| `bun run dev:antares`                 | Antares и watch внутренних пакетов                                             |
| `bun run dev:atria` / `dev:alhena`    | Watch и пересборка выбранного пакета                                           |
| `bun run dev:deneb` / `dev:rigel`     | Непрерывная сборка Gradle; без автоматической перезагрузки плагина             |
| `bun run storybook`                   | Каталог компонентов Atria на порту 6006                                        |
| `bun run generate`                    | Экспорт OpenAPI и генерация Alhena                                             |
| `bun run build`                       | Все TS-приложения/пакеты и оба Java-плагина                                    |
| `bun run build:ts` / `build:java`     | Сборка одной экосистемы                                                        |
| `bun run build:<name>`                | Сборка выбранного проекта, кроме запланированного Altair                       |
| `bun run typecheck` / `lint`          | TS7, строгий oxlint и Checkstyle для Java                                      |
| `bun run test`                        | Unit/компонентные тесты Vitest и тесты JUnit 5                                 |
| `bun run test:<name>`                 | Тесты одного проекта                                                           |
| `bun run test:integration`            | Временные контейнеры PostGIS и S3; нужен Docker                                |
| `bun run test:e2e`                    | Playwright Chromium: dev/prod Vega, настоящий stateless API, PWA и prod-прокси |
| `bun run build:storybook`             | Статическая документация Atria                                                 |
| `bun run infra:up` / `infra:down`     | PostgreSQL/PostGIS и S3 для разработки                                         |
| `bun run db:generate` / `db:migrate`  | Генерация/применение миграций Drizzle к БД `helicraft`                         |
| `bun run compose:up` / `compose:down` | Сборка/запуск или остановка prod-стека Compose                                 |

Используйте `bun run` для скриптов package.json в обычном формате npm scripts. CLI-инструменты запускаются через `bunx --bun`; Node.js для реализованного JS-процесса не нужен. `bun test` не является настроенной командой Vitest. Установка браузера: `bunx --bun playwright install chromium` (Linux также могут понадобиться системные библиотеки браузера).

## Продакшен через Compose

```sh
cp .env.example .env
# Измените .env: пароли, forwarding secret и адреса публикации.
# Укажите EULA=true только после прочтения и принятия Minecraft EULA.
docker compose build
docker compose up -d --wait
```

Корневой стек собирает Vega, Antares, Deneb и Rigel; включает PostGIS и SeaweedFS 4.48; применяет миграции до запуска Antares; публикует веб на 8080 и Minecraft на 25565. Atria и Alhena входят в сборку Vega. Minecraft-порт открыт только у Velocity; Paper работает во внутренней сети с modern forwarding. Стандартная проверка официальных аккаунтов включена до реализации собственной идентичности Rigel.

Только веб без Minecraft/EULA: `docker compose up -d --build vega`. API и зависимости запускаются автоматически. Для установки PWA в продакшене нужен HTTPS на reverse proxy; локально достаточно localhost. Bun-сервер статики проксирует `/api/*` и `/openapi.json` к Antares, клиент обращается к текущему origin. Service worker не кеширует ответы API.

Compose отдельных приложений использует общие определения. Примеры из корня:

```sh
docker compose --env-file .env -f apps/antares/compose.yml up -d --build
docker compose --env-file .env -f apps/vega/compose.yml up -d --build
docker compose --env-file .env -f apps/deneb/compose.yml up -d --build
```

Compose Deneb/Rigel запускает пару Minecraft-сервисов и зависимости Antares. У Antares есть `compose.dev.yml` для внешних сервисов. Библиотекам отдельные контейнеры не нужны. Разные имена Compose-проектов создают разные тома. `down` сохраняет данные, `down -v` удаляет их. Перед обновлениями сохраняйте PostgreSQL, S3 и Minecraft-миры.

## Окружение и границы

Скопируйте `.env.example` в игнорируемый `.env`. `DATABASE_URL` указывает на **helicraft**, а не на архивные MySQL-базы. Compose формирует контейнерный URL из `POSTGRES_PASSWORD`; локальные миграции берут `DATABASE_URL` — эти значения должны согласовываться. Спецсимволы пароля в URL нужно кодировать. Только Antares обращается к PostgreSQL и S3; интерфейсы и плагины используют REST API. Секреты не экспортируются через Vite-переменные.

S3-адаптер принимает endpoint, регион, ключ, секрет и бакет, используя path-style addressing. Compose предоставляет постоянное хранилище SeaweedFS на одном узле с авторизацией и автоматическим созданием бакета. Подключение к другому S3-совместимому сервису задаётся окружением Antares. Загрузка через публичные presigned URL и идентичность игрока — будущая работа над API.

Deneb включает и изолирует JTS и Caffeine, Adventure предоставляет Paper. Rigel генерирует дескриптор плагина через annotation processor Velocity. Оба плагина неблокирующе запрашивают health у `ANTARES_URL`, драйверов БД в них нет. После замены jar перезапускайте Minecraft-сервис; hot reload не используется для авторизации и правил мира.

## Качество кода

Проекты используют TypeScript 7.0.2. Только генератор Alhena получает изолированный TypeScript 6 для совместимости Compiler API; проверка и декларации SDK используют корневой TS7. Все категории oxlint включены как ошибки с проверками типов и запретом предупреждений. Совместимые со стеком исключения перечислены в [исследовании](docs/setup-research_RU.md). Java: Checkstyle, Spotless/google-java-format и предупреждения компилятора как ошибки.

Compose настроен, но запуск контейнеров и Testcontainers пока не проверен: Docker недоступен в текущем окружении.

## Документация

- [Карта продуктов](docs/product-map_RU.md) / [Product map](docs/product-map.md)
- [Решения и официальные источники](docs/setup-research_RU.md) / [Setup research](docs/setup-research.md)
- [Правила работы с репозиторием](AGENTS.md)
- [Старые приложения и документация](archive/README.md)

Vesper, Teapot и Soon перенесены в `archive/apps/` вместе с локальными изменениями. Старые инструкции и документация сохранены в `archive/`; архив исключён из нового workspace и Docker-контекста. Новый API не сохраняет старые контракты и не переносит данные MySQL/SQLite автоматически.

Названия связаны со звёздами: Vega (Лира), Antares (Скорпион), Deneb (Лебедь), Rigel (Орион), Atria (Южный Треугольник), Alhena (Близнецы), Altair (Орёл). [Каталог названий звёзд IAU](https://iauarchive.eso.org/public/themes/naming_stars/). В исходных README логотипа сервера не было, поэтому он не добавлен.

## Лицензия

Корневой [LICENSE](LICENSE) — PolyForm Noncommercial 1.0.0. Архивные приложения сохраняют собственные лицензии. Лицензии сторонних компонентов проверяются отдельно.
