[English](validation.md) | [Репозиторий](../../README_RU.md)

# Web foundation validation

Проверено 2026-10-09: Bun 1.4.2, TypeScript 7, Docker и Chromium. Тесты используют временную БД/хранилище; Minecraft не запускается.

| Проверка                                         | Результат                                                       |
| ------------------------------------------------ | --------------------------------------------------------------- |
| generate / build:ts                              | Прошли, включая Альхену и client/server/service worker Веги     |
| typecheck / lint / format:check                  | Прошли во всех активных TS-workspaces                           |
| test:unit                                        | 19 passed                                                       |
| test:integration                                 | 18 passed, 5 файлов с настоящими PostgreSQL/PostGIS и S3        |
| Playwright dev / built SSR                       | 9 passed; 1 ожидаемый dev skip для production service worker    |
| build:storybook                                  | Прошёл                                                          |
| Root и существующие affected Compose definitions | Валидны                                                         |
| Production web Compose                           | Образы собраны, миграции применены к helicraft, сервисы здоровы |

Проверены регистрация, HttpOnly-cookie, CLI первого OWNER и повторный вызов, приватный черновик, публикация без пересборки, загрузка/сброс скина и S3-аватар, смена пароля с отзывом старой сессии, robots/sitemap, SSR CMS rules и HTTP 301 /pages/rules → /rules без дубля в sitemap. Адаптивность проверена на 360/390/768/1024/1440; desktop/mobile screenshots просмотрены визуально.

Основной .env/DATABASE_URL не настроен. Миграции применялись к настоящим временным БД helicraft; неизвестная пользовательская/production БД не затрагивалась. Для целевого запуска задайте окружение и выполните db:migrate либо migration service Compose. Все обязательные инструменты доступны. SQL проверяется вручную и применением, поскольку oxfmt его не поддерживает. Временный Compose остановлен без удаления volumes; существующие пользовательские сервисы, Java authentication и EULA сохранены.

Ограничения: rate limits живут в одном процессе; для реплик нужен общий store. Очистка истёкших сессий и неиспользуемых S3-версий не запланирована автоматически. Email/OAuth/recovery, игровая identity-интеграция, World Engine и игровые институты — следующие этапы. Ригель интегрируется только через проверенную схему подтверждения/связывания постоянного UUID с сохранением стандартной аутентификации до её готовности.
