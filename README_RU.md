[English](README.md) | Русский

# HeliCraft

HeliCraft — постоянный социальный, политический и экономический мир Minecraft. Minecraft позволяет физически жить в нём, Vega становится второй половиной игры, а Antares обеспечивает последовательное состояние всех продуктов.

Репозиторий содержит рабочий web foundation: публичный SSR-сайт, аккаунты с UUID и серверными сессиями, кабинет со скинами, Markdown CMS, ролевую админку и общий UI-kit. Территории, рынки, World Engine и собственный игровой вход через Ригель остаются будущей работой.

Система государств включает серверные черновики с продолжением работы, мультиязычные тексты, независимые Minecraft-баннеры/PNG-флаги, сооснователей, настраиваемое устройство, неизменяемые редакции, необязательную блочную Конституцию, гибридные анкеты сообщества/голосования по решениям и административную проверку. Документация: [States](docs/states/overview.md), [Governance](docs/states/governance.md), [Constitution](docs/states/constitution.md), [Creation flow](docs/states/creation-flow.md), [Localized content](docs/platform/localized-content.md) и [Voting](docs/platform/voting.md).
Личный кабинет и администрация используют постоянную боковую навигацию. Панель государства, отдельное чтение конституции, общие карточки с цветом государства, подсказки и многоязычный ввод описаны в [Workspace design](docs/design/workspaces.md). Опросы сообщества поддерживают несколько вопросов; снимки галереи — связи с государствами. Панель государства поддерживает отдельные предложения о должностях с действующими одобрениями, общими голосованиями с одним вопросом и проверяемой ручной процедурой.

Страница государства показывает флаги, основателей, гражданство, действующие должности, порядок принятия решений и Конституцию в адаптивной компоновке. Ники ведут на публичные профили `/players/<UUID>` с датой регистрации и участием в активных государствах. Сессии, роли аккаунта и непубличные черновики в профили не попадают.

[Денежная система V1](docs/architecture/monetary_RU.md): Центральные банки через Governance и административное одобрение, национальные валюты, неизменяемые политики, двойная запись, казна и личные кошельки. Весь сценарий доступен в Веге без Minecraft: `/app/states/:id/manage`, `/app/wallet`, `/admin/central-banks` и публичные SSR-страницы `/currencies`. Финансовые полномочия настраиваются явно через реформу.

## Проекты

| Продукт                                | Каталог           | Стек                                                                      |
| -------------------------------------- | ----------------- | ------------------------------------------------------------------------- |
| [Vega](apps/vega/README_RU.md)         | `apps/vega`       | React 19 · TypeScript · Vite · TanStack Router/Query · Zod · Atria · PWA  |
| [Antares](apps/antares/README_RU.md)   | `apps/antares`    | TypeScript · Bun · Hono · Zod/OpenAPI · Drizzle · PostgreSQL/PostGIS · S3 |
| [Deneb](apps/deneb/README_RU.md)       | `apps/deneb`      | Java 25 · Paper 26.2 · Gradle Kotlin DSL · Adventure · JTS · Caffeine     |
| [Rigel](apps/rigel/README_RU.md)       | `apps/rigel`      | Java 25 · Velocity 4.2.0 · Gradle Kotlin DSL                              |
| [Atria](packages/atria/README_RU.md)   | `packages/atria`  | React · TypeScript · SCSS Modules · Base UI · Storybook                   |
| [Alhena](packages/alhena/README_RU.md) | `packages/alhena` | Generated TypeScript SDK · native Fetch · zero runtime dependencies       |
| [Altair](apps/altair/README_RU.md)     | `apps/altair`     | Planned: Tauri 2 · Rust · React · Vite · Atria · Alhena                   |

Все JS/TS-проекты входят в один приватный Bun workspace с общим `bun.lock` и зависимостями `workspace:*`. Java-плагины используют общий Gradle wrapper и Kotlin DSL. Публиковать внутренние пакеты не нужно. Altair содержит только документацию и исключён из workspace, сборок и Compose.

## Быстрый старт

Нужны **Bun 1.4.2+**, Docker с **Compose 2.24.4+** и работающим daemon. **JDK 25** требуется только для явных команд Java-плагинов. Gradle 9.1.0 автоматически скачивается через `./gradlew` (`gradlew.bat` на Windows). Команды выполняются из корня репозитория.

```sh
bun install --frozen-lockfile
cp .env.example .env
bun run infra:up
bun run db:migrate
bun run dev
```

Vega: http://localhost:5173. Antares: http://localhost:3000. OpenAPI: http://localhost:3000/openapi.json. S3: http://localhost:8333. `dev` запускает только JS/TS-пакеты и веб-приложения. Для сборки Java явно вызывайте `build:java`, `build:deneb`, `build:rigel` или `dev:deneb`/`dev:rigel`. `dev` также запускает Storybook на http://localhost:6006. Если порт API занят, скрипт выбирает следующий свободный порт и подключает к нему Вегу; выбранный порт выводится при запуске. Storybook можно запустить отдельно через `bun run storybook`.

Только фронтенд: `bun run dev:vega`. Только бэкенд: `bun run dev:antares`. Приветствие работает без сохранения данных при корректном окружении Antares; `/api/ready` проверяет PostGIS и S3-бакет.

## Команды

| Команда                               | Назначение                                                                              |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| `bun run dev`                         | Сборка пакетов, watch Atria/Alhena, dev-серверы Vega и Antares, Storybook               |
| `bun run dev:vega`                    | Vega, Storybook и watch внутренних пакетов; API запускается отдельно                    |
| `bun run dev:antares`                 | Antares, Storybook и watch внутренних пакетов                                           |
| `bun run dev:atria` / `dev:alhena`    | Watch и пересборка выбранного пакета                                                    |
| `bun run dev:deneb` / `dev:rigel`     | Непрерывная сборка Gradle; без автоматической перезагрузки плагина                      |
| `bun run storybook`                   | Каталог компонентов Atria на порту 6006                                                 |
| `bun run generate`                    | Экспорт OpenAPI и генерация Alhena                                                      |
| `bun run build`                       | Все TS-приложения/пакеты                                                                |
| `bun run build:ts` / `build:java`     | Сборка одной экосистемы                                                                 |
| `bun run build:<name>`                | Сборка выбранного проекта, кроме запланированного Altair                                |
| `bun run typecheck` / `lint`          | TS7 и строгий oxlint; Java: `lint:java`                                                 |
| `bun run test`                        | Unit/компонентные тесты Vitest; Java: `test:java`                                       |
| `bun run test:<name>`                 | Тесты одного проекта                                                                    |
| `bun run test:integration`            | Временные контейнеры PostGIS и S3; нужен Docker                                         |
| `bun run test:e2e`                    | Playwright Chromium: dev/prod Vega, API с временными PostgreSQL и S3, PWA и prod-прокси |
| `bun run build:storybook`             | Статическая документация Atria                                                          |
| `bun run infra:up` / `infra:down`     | PostgreSQL/PostGIS и S3 для разработки                                                  |
| `bun run db:generate` / `db:migrate`  | Генерация/применение миграций Drizzle к БД `helicraft`                                  |
| `bun run compose:up` / `compose:down` | Сборка/запуск веб-стека или остановка Compose                                           |

Используйте `bun run` для скриптов package.json в обычном формате npm scripts. CLI-инструменты запускаются через `bunx --bun`; Node.js для реализованного JS-процесса не нужен. Общие скрипты не вызывают Gradle; форматирование Java запускается через `format:java` и `format:check:java`. `compose:up` собирает только веб-стек; Compose собирает плагины без запуска Minecraft-серверов. `bun test` не является настроенной командой Vitest. Установка браузера: `bunx --bun playwright install chromium` (Linux также могут понадобиться системные библиотеки браузера).

## Продакшен через Compose

```sh
cp .env.example .env
# Edit credentials and set SITE_ORIGIN=http://localhost:8080 for local Compose.
# For a real HTTPS domain also set SECURE_COOKIES=true.
docker compose up -d --build --wait vega
```

Корневой стек запускает веб-сервисы, включает PostGIS и SeaweedFS 4.48, применяет миграции до запуска Antares и публикует веб на 8080. Atria и Alhena входят в сборку Vega. Денеб и Ригель используют только сборочные стадии Dockerfile в профиле `plugins`; Compose не запускает Paper и Velocity. Сборка обоих плагинов: `docker compose build deneb rigel`.

Только веб без Minecraft/EULA: `docker compose up -d --build vega`. API и зависимости запускаются автоматически. Для установки PWA в продакшене нужен HTTPS на reverse proxy; локально достаточно localhost. Bun-сервер статики проксирует `/api/*` и `/openapi.json` к Antares, клиент обращается к текущему origin. Service worker не кеширует ответы API.

Compose отдельных приложений использует общие определения. Примеры из корня:

```sh
docker compose --env-file .env -f apps/antares/compose.yml up -d --build
docker compose --env-file .env -f apps/vega/compose.yml up -d --build
docker compose --env-file .env -f apps/deneb/compose.yml build deneb
docker compose --env-file .env -f apps/rigel/compose.yml build rigel
```

Compose Денеба/Ригеля собирает только выбранный плагин, без зависимостей Antares и контейнеров Minecraft-серверов. У Antares есть `compose.dev.yml` для внешних сервисов. Библиотекам отдельные контейнеры не нужны. Разные имена Compose-проектов создают разные тома. `down` сохраняет данные, `down -v` удаляет их. Перед обновлениями сохраняйте PostgreSQL и S3.

## Окружение и границы

Скопируйте `.env.example` в игнорируемый `.env`. `DATABASE_URL` указывает на **helicraft**, а не на архивные MySQL-базы. Compose формирует контейнерный URL из `POSTGRES_PASSWORD`; локальные миграции берут `DATABASE_URL` — эти значения должны согласовываться. Спецсимволы пароля в URL нужно кодировать. Только Antares обращается к PostgreSQL и S3; интерфейсы и плагины используют REST API. Секреты не экспортируются через Vite-переменные.

S3-адаптер принимает endpoint, регион, ключ, секрет и бакет, используя path-style addressing. Compose предоставляет постоянное хранилище SeaweedFS на одном узле с авторизацией и автоматическим созданием бакета. Подключение к другому S3-совместимому сервису задаётся окружением Antares. Web identity и приватная загрузка скинов реализованы; публичные presigned URL и игровая интеграция с Ригелем остаются будущей работой.

Deneb включает и изолирует JTS и Caffeine, Adventure предоставляет Paper. Rigel генерирует дескриптор плагина через annotation processor Velocity. Оба плагина неблокирующе запрашивают health у `ANTARES_URL`, драйверов БД в них нет. После замены jar перезапускайте Minecraft-сервис; hot reload не используется для авторизации и правил мира.

## Качество кода

Проекты используют TypeScript 7.0.2. Только генератор Alhena получает изолированный TypeScript 6 для совместимости Compiler API; проверка и декларации SDK используют корневой TS7. Все категории oxlint включены как ошибки с проверками типов и запретом предупреждений. Совместимые со стеком исключения перечислены в [исследовании](docs/setup-research_RU.md). Java: Checkstyle, Spotless/google-java-format и предупреждения компилятора как ошибки.

Docker, Testcontainers и Chromium доступны. Web Compose, миграции, PostgreSQL/S3 и browser-сценарии проверены на временном стенде; см. [validation](docs/architecture/validation_RU.md).

## Документация

- [Карта продуктов](docs/product-map_RU.md) / [Product map](docs/product-map.md)
- [Решения и официальные источники](docs/setup-research_RU.md) / [Setup research](docs/setup-research.md)
- [Правила работы с репозиторием](AGENTS.md)
- [Старые приложения и документация](archive/README.md)

Vesper, Teapot и Soon перенесены в `archive/apps/` вместе с локальными изменениями. Старые инструкции и документация сохранены в `archive/`; архив исключён из нового workspace и Docker-контекста. Новый API не сохраняет старые контракты и не переносит данные MySQL/SQLite автоматически.

Названия связаны со звёздами: Vega (Лира), Antares (Скорпион), Deneb (Лебедь), Rigel (Орион), Atria (Южный Треугольник), Alhena (Близнецы), Altair (Орёл). [Каталог названий звёзд IAU](https://iauarchive.eso.org/public/themes/naming_stars/). Веб-интерфейс использует архивный логотип HeliCraft, скопированный в активные assets Vega.

## Лицензия

Корневой [LICENSE](LICENSE) — PolyForm Noncommercial 1.0.0. Архивные приложения сохраняют собственные лицензии. Лицензии сторонних компонентов проверяются отдельно.

## Web foundation

См. [rendering](docs/architecture/web-rendering_RU.md), [identity](docs/architecture/identity_RU.md), [authorization](docs/architecture/authorization_RU.md), [skins](docs/architecture/skin-storage_RU.md), [CMS](docs/architecture/content_RU.md), [landing](docs/design/landing-page_RU.md) и [quality](docs/architecture/quality.md).

Для локальной разработки SITE_ORIGIN=http://localhost:5173. Перед production Compose установите SITE_ORIGIN=http://localhost:8080 (или настоящий HTTPS origin и SECURE_COOKIES=true). Регистрация создаёт только PLAYER. Первый OWNER: зарегистрируйте аккаунт, скопируйте UUID и выполните `bun run admin:bootstrap-owner <UUID> --confirm <тот же UUID>`. По умолчанию PRELAUNCH; адрес Minecraft показывается только в OPEN и при заданном MINECRAFT_ADDRESS. Не принимаем EULA автоматически.

Публичная главная использует фотографии мира; `/gallery` и `/gallery/:id` отображаются через SSR, а авторизованные игроки публикуют и удаляют свои снимки через `/app/gallery/new`. Галерея хранится отдельным доменом Antares в PostgreSQL/private S3. Главная показывает реальные одобренные государства и ведёт на `/states` с поиском, фильтрами по гражданству/конституции и сортировкой. Экономика остаётся подписанным демонстрационным примером. [Архитектура галереи](docs/architecture/gallery_RU.md).

`bun run dev` и `dev:antares` применяют миграции базы перед запуском сервисов. PostgreSQL и S3 должны работать (`bun run infra:up`). Ошибка миграции останавливает запуск; `dev:vega` использует внешний API и не применяет миграции его базы.

Операторы перечислены по нику в корневом `ops.json` (изначально `ms0ur`). Они получают ADMIN в обычных авторизованных сессиях; операторские ники защищены от регистрации и переименования других игроков. Изменения файла применяются при следующей проверке доступа. [Политика операторов](docs/architecture/operators.md).

## Taxation and diplomacy

Государственные налоговые службы, неизменяемые законы о налогах на переводы, двусторонние налоговые договоры и точное атомарное исполнение работают через Антарес и Вегу. До подтверждения личного перевода показывается серверный расчёт налогов. Учреждения и законы следуют опубликованному Governance; администрация ратифицирует учреждения, не назначая ставки. См. [Taxation](docs/architecture/taxation_RU.md), [Diplomacy](docs/architecture/diplomacy_RU.md) и [проверки](docs/architecture/taxation-verification.md). География Minecraft и взыскание задолженности остаются за пределами реализации.

[Текущие улучшения налогов](docs/architecture/taxation-improvements_RU.md) добавляют выбор отправителя или получателя как плательщика, точный необлагаемый порог, утверждённое направление в казну или ЦБ и накопление дробных обязательств. Приостановка налоговой службы сохраняет действующие законы; приостановка государства прекращает новые начисления без пересчёта прошлого. Общий движок также учитывает корпоративные переводы, регистрацию/подтверждённый филиал, явные категории и национальные корпоративные режимы. [Companies](docs/architecture/companies_RU.md) предоставляют возобновляемую регистрацию, гибкий Governance, точные акции, дочерние компании, филиалы, официальные финансы и публичные SSR-профили. [Обмен валют](docs/architecture/currency-exchange_RU.md) поддерживает двусторонние сделки ЦБ и конечные обеспеченные предложения игрокам. См. [таблицу приёмки](docs/architecture/companies-fx-taxation-verification_RU.md) и [результаты проверок](docs/architecture/companies-fx-taxation-plan.md).

## Stand deployment

Запуск: `docker compose --env-file .env -f compose.stand.yml up -d --build`. Reverse proxy должен быть подключён к существующей внешней сети `intranet` и обращаться к `helicraft-stand-vega:8080`. Порты на хост не публикуются, плагины не включены. Укажите точный публичный HTTPS `SITE_ORIGIN` и рабочие учётные данные. Отображаемые названия сервера подставляются только из [общих настроек](docs/architecture/site-settings.md), доступных в `/admin/settings`; жёстко заданные названия в интерфейсе запрещены.
