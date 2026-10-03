[English](README.md) | [HeliCraft](../../README_RU.md)

# Vega

**Видеть мир и управлять своей жизнью в нём.**

React 19 · TypeScript · Vite · TanStack Router/Query · Zod · Atria · PWA

Стартовая страница использует файловые маршруты TanStack Router, запрос TanStack Query с отменой, проверку ответа Zod и Atria. API использует относительные URL; Vite и продакшен Bun-сервер проксируют запросы. PWA содержит manifest, PNG-иконки 192/512 и сгенерированный service worker. Простые иконки звезды — иконки приложения, а не логотип сервера. Кешируется только статика.

```sh
bun run dev:vega
bun run build:vega
bun run test:vega
bun run test:e2e
```

Для данных API запустите Antares отдельно либо используйте `bun run dev`. `dev:vega` готовит пакеты Atria/Alhena и запускает watch. Продакшен из корня: `docker compose --env-file .env -f apps/vega/compose.yml up -d --build` (с API и хранилищами). Маршруты и генерируемый `routeTree.gen.ts` находятся в `src/`. Будущие функции: карта мира, управление государством, законы, голосования, рынки, история, уведомления и безопасность аккаунта.

Из корня: `bun run lint` и `bun run format:check`. Правила и исключения: [настройка проверок](../../docs/setup-research_RU.md).

## Название

Вега — α Лиры, звезда в созвездии Лиры. [Каталог названий звёзд IAU](https://iauarchive.eso.org/public/themes/naming_stars/).
