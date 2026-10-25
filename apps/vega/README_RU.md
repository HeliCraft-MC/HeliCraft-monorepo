[English](README.md) | [HeliCraft](../../README_RU.md)

# Vega

**Видеть мир и управлять своей жизнью в нём.**

React 19 · TypeScript 7 · TanStack Start/Router/Query · Vite · Alhena · Atria · SCSS Modules · PWA

Вега использует SSR для публичных страниц и CSR для `/app`/`admin`. Вход, регистрация, настройки профиля/пароля/сессий/скина и административные формы работают через generated Альхену. Публичные CMS-страницы и летопись имеют SEO metadata; черновики и cookies не попадают в public SSR. Bun production server запускает Start и проксирует API. Service worker кэширует только статические ресурсы.

```sh
bun run dev:vega
bun run build:vega
bun run test:vega
bun run test:e2e
```

Для данных API запустите Antares отдельно либо используйте `bun run dev`. `dev:vega` готовит пакеты Atria/Alhena, запускает watch и Storybook. Продакшен из корня: `docker compose --env-file .env -f apps/vega/compose.yml up -d --build` (с API и хранилищами). Маршруты и генерируемый `routeTree.gen.ts` находятся в `src/`. Будущие функции: карта мира, управление государством, законы, голосования, рынки, история, уведомления ; безопасность аккаунта реализована.

Из корня: `bun run lint` и `bun run format:check`. Правила и исключения: [настройка проверок](../../docs/development/setup-research_RU.md).

## Название

Вега — α Лиры, звезда в созвездии Лиры. [Каталог названий звёзд IAU](https://iauarchive.eso.org/public/themes/naming_stars/).

## Foundation routes

`/`, `/world`, `/rules`, `/start`, `/chronicle`, `/chronicle/:slug`, `/pages/:slug`, `/login`, `/register`, `/app`, `/app/settings/{profile,security,skin}`, `/admin`, `/admin/{pages,chronicle,users,audit}`.

[Rendering](../../docs/architecture/web-rendering.md) · [Identity](../../docs/architecture/identity.md) · [Design](../../docs/design/landing-page.md)

Перед Compose выставьте SITE_ORIGIN под адрес браузера (локально http://localhost:8080), для HTTPS — SECURE_COOKIES=true.

## Gallery foundation

Публичные `/gallery` и `/gallery/:id` используют SSR; `/app/gallery/new` — существующую сессию и CSR. Галерея проходит через Alhena к отдельному домену Antares и private S3/PostgreSQL. [Архитектура галереи](../../docs/architecture/gallery_RU.md). В Atria добавлены StateCard, GalleryTile, PhotoCarousel и ActionLink; каждый компонент расположен в собственной папке `src/components`.

Переводы интерфейса находятся в `src/locales/ru.ts` и `src/locales/en.ts`; ключи семантические, на английском (`navigation.gallery`). Новый полный словарь регистрируется в `src/locales/index.ts`; формы CMS и галереи берут список языков из этого реестра. Хранятся язык оригинала и необязательные переводы полей. Подписи и очищенный HTML публикаций выбираются для каждого поля в порядке язык клиента → EN → язык оригинала. Смена языка работает через клиентскую навигацию без перезагрузки документа и потери черновика формы. Публичный SSR использует адреса `?lang=ru/en`, canonical/hreflang и переведённые метаданные; cookie сохраняет выбор при навигации.

## Monetary system V1

[Доменная модель, Governance, точный учёт, API, интерфейс и проверки](../../docs/economy/monetary_RU.md).

Налоги и дипломатия используют существующие Governance/Voting и точный ledger. Подробности: [Taxation](../../docs/economy/taxation_RU.md), [Diplomacy](../../docs/states/diplomacy_RU.md).

## Minecraft Integration V1

[Архитектура](../../docs/architecture/minecraft-integration_RU.md) · [разработка и тесты](../../docs/development/minecraft-plugins_RU.md) · [авторизация игрока](../../docs/development/minecraft-authentication_RU.md) · [проверки](../../docs/verification/minecraft-integration-2026-10-25_RU.md). Антарес владеет identity/challenges/leases/events; защищённая Вега `/app/minecraft` подтверждает код и показывает приватное присутствие.
