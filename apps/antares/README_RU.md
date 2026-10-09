[English](README.md) | [HeliCraft](../../README_RU.md)

# Antares

**Помнить и понимать состояние мира.**

TypeScript · Bun · Hono · Zod/OpenAPI · Drizzle · PostgreSQL/PostGIS · S3

API владеет сохранением данных и логикой мира. Обработчики находятся в `src/app.ts`, инфраструктура — в `src/db` и `src/storage.ts`, окружение проверяет Zod. `/api/hello?name=Vega` демонстрирует валидацию запроса; `/api/health` — liveness; `/api/ready` проверяет PostGIS и S3-бакет; `/openapi.json` отдаёт контракт. Ошибки не раскрывают параметры подключения.

```sh
bun run infra:up
bun run db:migrate
bun run dev:antares
bun run build:antares
bun run test:antares
bun run test:integration
bun run generate
```

Предварительно скопируйте корневой `.env.example` в `.env`. Целевая БД: `helicraft`, PostgreSQL 18/PostGIS 3.6. Начальная миграция включает PostGIS и создаёт `world_events` с необязательной точкой SRID 4326. Это пример подключения; плоским координатам Minecraft в будущем потребуется осознанная модель координат. Создавайте миграции через `db:generate`, проверяйте и применяйте через `db:migrate`; разрушительный push не настроен.

S3 использует AWS SDK v3 с endpoint и path-style addressing. Интеграционные тесты Testcontainers проверяют настоящие миграции PostGIS, пространственные данные и запись/чтение S3-объекта; нужен Docker daemon. Unit-тесты подставляют проверку готовности и не требуют сервисов.

Продакшен из корня: `docker compose --env-file .env -f apps/antares/compose.yml up -d --build`. Внешние dev-сервисы: `docker compose --env-file .env -f apps/antares/compose.dev.yml up -d --wait`. Отдельный prod-compose публикует API на localhost:3000; корневой продакшен предоставляет его через Vega. При изменении API регенерируйте Alhena. Старые маршруты Teapot, аккаунты и данные не перенесены.

Из корня: `bun run lint` и `bun run format:check`. Правила и исключения: [настройка проверок](../../docs/setup-research_RU.md).

## Название

Антарес — α Скорпиона, звезда в созвездии Скорпиона. [Каталог названий звёзд IAU](https://iauarchive.eso.org/public/themes/naming_stars/).

## Web foundation

Домены находятся в `src/modules`: identity, sessions, permissions, administration, skins, content. API v1 обслуживает реальные аккаунты, opaque cookies, RBAC, CMS и изображения. Миграция 0001 добавляет таблицы identity/CMS; 0002 запрещает изменение UUID и переписывание аудита/истории/редакций. Схема world_events остаётся отдельной. Тесты используют временные настоящие PostgreSQL/PostGIS и S3.

[Identity](../../docs/architecture/identity.md) · [Authorization](../../docs/architecture/authorization.md) · [Skins](../../docs/architecture/skin-storage.md) · [Content](../../docs/architecture/content.md)
