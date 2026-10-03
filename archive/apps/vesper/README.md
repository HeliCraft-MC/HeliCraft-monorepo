# Vesper

Сайт HeliCraft на Nuxt 4 и Vue 3. Страницы находятся в `app/pages`, компоненты в `app/components`, авторизация и запросы к API — в `app/composables`. Контент Markdown расположен в `content/` и обрабатывается `@nuxt/content`.

## Запуск

Из каталога `apps/vesper`:

```bash
bun install --frozen-lockfile
cp .env.example .env
bun run dev
```

Сайт будет доступен по адресу http://localhost:3020. Для работы с локальным API сначала запустите Teapot на порту 3000. Основные настройки перечислены в [`.env.example`](.env.example).

## Команды

| Команда | Назначение |
| --- | --- |
| `bun run dev` | Сервер разработки |
| `bun run build` | Сборка для развёртывания |
| `bun run preview` | Просмотр собранного приложения |
| `bunx nuxt typecheck` | Проверка типов |
| `bun audit` | Проверка lock-файла по npm advisory API |

`/distant-api/**` проксируется на `NUXT_PUBLIC_BACKEND_URL`. `/plan-api/**` проксируется на `NUXT_PLAN_UPSTREAM_URL`. Они конфигурируются во время сборки; при смене upstream пересоберите приложение. Прямой доступ к базам из Vesper не допускается.

Авторизация реализована локально через `useAuthSystem`, `auth:uuid` cookie и маршруты Teapot `/auth/*`; пакет `@sidebase/nuxt-auth` сейчас не используется. В `nuxt.config.ts` логика государств по умолчанию отключена; установите `NUXT_PUBLIC_STATES_DISABLED=false`, чтобы включить её.

Общие сведения: [архитектура](../../docs/architecture.md), [авторизация](../../docs/api-and-auth.md), [зависимости](../../docs/dependencies-and-security.md).
