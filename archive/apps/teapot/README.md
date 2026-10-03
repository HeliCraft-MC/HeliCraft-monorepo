# Teapot

REST API HeliCraft на Nitro и Bun. Маршруты находятся в `server/routes`, логика — в `server/utils`, доступ к данным — в `server/db` и `server/plugins`. OpenAPI доступен через Nitro (`/_openapi.json`, интерфейс `/_scalar`).

## Запуск

Из каталога `apps/teapot`:

```bash
bun install --frozen-lockfile
cp .env.example .env
bun run db:dev
bun run db:push
bun run db:push:forms
bun run dev
```

API слушает http://localhost:3000. Docker Compose поднимает MySQL и создаёт базы через `.dev/docker-init`. SQLite-файл создаётся Teapot по пути `NITRO_SQLITE_SKIN_PATH`. `db:push` выполняйте только после проверки целевой базы и схемы.

## Команды

| Команда | Назначение |
| --- | --- |
| `bun run dev` | Сервер разработки |
| `bun run build` | Сборка |
| `bun run typecheck` | Проверка типов TypeScript |
| `bun run test` | Модульные тесты без MySQL |
| `bun run test:integration` | Тесты с MySQL |
| `bun run test:api` | HTTP-тесты с запущенным API |
| `bun run lint` | ESLint |
| `bun audit` | Аудит зависимостей |

Конфигурация показана в [`.env.example`](.env.example). На рабочем сервере нужны собственный `NITRO_JWT_SECRET`, пароли MySQL и пути для хранимых данных. Маршрут `/dev/make-admin` требует режима разработки и явного `NITRO_ENABLE_DEV_ADMIN=true`; не включайте его в общедоступной среде.

Подробности: [архитектура](../../docs/architecture.md), [данные](../../docs/data.md), [авторизация и API](../../docs/api-and-auth.md), [проверки](../../docs/development.md).
