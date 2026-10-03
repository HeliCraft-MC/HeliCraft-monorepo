# Разработка и проверки

## Подготовка

Используйте Bun 1.4.2+ и Docker Compose. Команды ниже запускаются из корня репозитория. Каждое приложение имеет отдельный lock-файл.

```bash
cd apps/teapot
bun install --frozen-lockfile
cp .env.example .env
bun run db:dev
bun run db:push
bun run db:push:forms
bun run dev
```

Затем в отдельном терминале:

```bash
cd apps/vesper
bun install --frozen-lockfile
cp .env.example .env
bun run dev
```

Страницу-заглушку можно запустить в собственном Compose-проекте, не поднимая остальные сервисы:

```bash
cd apps/soon
docker compose up --build -d
```

Она доступна на `http://localhost:3080`. После локальной проверки удаляйте её контейнер и образ командой `docker compose down --rmi local --remove-orphans` из `apps/soon`.

`db:push` работает с `mydb`, `db:push:forms` — с `forms`. Перед запуском на существующих данных проверьте план Drizzle и сделайте резервную копию. Базы `bans` и `states` создаются, но их таблицы не разворачиваются этими командами: `bans` обычно управляется LiteBans, а функционал государств на сайте выключен по умолчанию. Для локальных сценариев, которым нужны эти таблицы, изучите SQL-снимки в `apps/teapot/.dev/dbs`; снимки могут содержать тестовые записи и старую структуру.

## Проверки

| Каталог | Команда | Что проверяет |
| --- | --- | --- |
| `apps/vesper` | `bun run build` | Сборка Nuxt, включая серверный рендеринг |
| `apps/vesper` | `bunx nuxt typecheck` | Типы Vue и TypeScript |
| `apps/teapot` | `bun run build` | Сборка Nitro |
| `apps/teapot` | `bun run typecheck` | Проверка типов TypeScript |
| `apps/teapot` | `bun run test` | Модульные тесты |
| `apps/teapot` | `bun run test:integration` | MySQL-интеграция, нужен Docker |
| `apps/teapot` | `bun run test:api` | HTTP-тесты, нужен работающий Teapot |
| `apps/teapot` | `bun run lint` | ESLint |
| `apps/soon` | `docker compose up --build -d` | Сборка и запуск отдельной Node.js-страницы |
| оба | `bun audit` | Опубликованные advisories по `bun.lock` |

`bun run test:all` пытается поднять БД и сервер автоматически. Перед ним проверьте целевые порты и `.env`. Если тесты, сборка или аудит не проходят, фиксируйте конкретный вывод и не считайте проект готовым к публикации только по успешной установке пакетов.

## Контейнеры

У каждого приложения собственный Dockerfile. Teapot использует Bun при сборке и запуске. Vesper собирается в образе Node и исполняется на Bun. Проверяйте пути для SQLite и загрузок как постоянные тома; файлы внутри контейнера без тома будут потеряны при его пересоздании.
