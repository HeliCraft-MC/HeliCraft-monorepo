[Русский](README_RU.md) | [Active HeliCraft](../README.md)

> Archived applications and original documentation; excluded from active builds. Original content follows.

# HeliCraft

Монорепозиторий сайта и API Minecraft-сервера HeliCraft.

| Приложение | Каталог | Стек | Локальный адрес |
| --- | --- | --- | --- |
| Vesper, сайт | [`apps/vesper`](apps/vesper/README.md) | Nuxt 4, Vue 3, Tailwind CSS | http://localhost:3020 |
| Teapot, API | [`apps/teapot`](apps/teapot/README.md) | Nitro, Bun, MySQL, SQLite | http://localhost:3000 |
| Coming Soon, страница-заглушка | [`apps/soon`](apps/soon/README.md) | Node.js, Docker Compose | http://localhost:3080 |

## Быстрый старт

Нужны Bun 1.4.2+, Node.js 22+ и Docker с Compose для локальных MySQL-баз и контейнерных приложений. У Bun-приложений собственные `package.json` и `bun.lock`; устанавливайте зависимости в каждом каталоге отдельно.

Для отдельной страницы-заглушки:

```bash
cd apps/soon
docker compose up --build -d
```

Откройте http://localhost:3080. Остановка и удаление контейнера с образом: `docker compose down --rmi local --remove-orphans` из того же каталога.

```bash
cd apps/teapot
bun install --frozen-lockfile
cp .env.example .env
bun run db:dev
bun run db:push
bun run db:push:forms
bun run dev
```

В другом терминале:

```bash
cd apps/vesper
bun install --frozen-lockfile
cp .env.example .env
bun run dev
```

Образец окружения Teapot использует пароль из `docker-compose.dev.yml`. Перед внешним развёртыванием задайте собственные пароли баз и `NITRO_JWT_SECRET`. Для работы с уже существующими данными сначала проверьте схему и миграции: `db:push` может менять таблицы.

## Документация

- [Архитектура и границы приложений](docs/architecture.md)
- [Локальная разработка и проверки](docs/development.md)
- [Авторизация и API](docs/api-and-auth.md)
- [Данные и миграции](docs/data.md)
- [Зависимости и безопасность](docs/dependencies-and-security.md)

Описание конкретных команд и функций: [Vesper](apps/vesper/README.md), [Teapot](apps/teapot/README.md). Правила для изменений кода находятся в [`AGENTS.md`](AGENTS.md).

## Лицензии

Корневой [`LICENSE`](LICENSE) — PolyForm Noncommercial 1.0.0. В каталогах [Vesper](apps/vesper/LICENSE) и [Teapot](apps/teapot/LICENSE) находятся отдельные файлы EUPL 1.2; при использовании конкретного приложения сверяйтесь с его файлом лицензии.
