# Данные и миграции

## Хранилища

| Подключение | Конфигурация | Назначение |
| --- | --- | --- |
| `default` MySQL | `NITRO_DATABASE_DEFAULT_OPTIONS_*` | `AUTH`, учётные записи |
| `forms` MySQL | `NITRO_DATABASE_FORMS_OPTIONS_*` | Формы, вопросы и ответы |
| `banlist` MySQL | `NITRO_DATABASE_BANLIST_OPTIONS_*` | Данные LiteBans |
| `states` MySQL | `NITRO_DATABASE_STATES_OPTIONS_*` | Исторические данные государств |
| SQLite | `NITRO_SQLITE_SKIN_PATH` | Скины, галерея, связанные файлы |

MySQL-пулы создаются в `server/plugins/mySql.ts`; SQLite и её локальные таблицы — в `server/plugins/skinSqlite.ts`. Схемы Drizzle находятся в `server/db/<подключение>/schema.ts`, репозитории — в `server/db/repos`. Плагины и маршруты Teapot запускаются только на сервере.

## Локальная база

`apps/teapot/docker-compose.dev.yml` поднимает MySQL 8 и создаёт четыре пустые базы скриптом `.dev/docker-init/00-create-databases.sql`. `bun run db:push` применяет только схему `default` к `mydb`; `bun run db:push:forms` — только схему `forms` к `forms`. Это намеренное разделение: смешивать схемы разных баз в одном вызове опасно.

Снимки в `.dev/dbs/*.sql` не являются последовательной системой миграций. Они могут содержать данные и не всегда совпадают с актуальными типами Drizzle. Перед импортом просматривайте их содержимое и используйте отдельную тестовую базу. Для рабочего окружения сначала сделайте резервную копию и сверяйте изменения схемы вручную.

SQLite и каталог загрузок должны лежать на постоянном диске. Значения путей задаются `NITRO_SQLITE_SKIN_PATH` и `NITRO_UPLOAD_DIR`.
